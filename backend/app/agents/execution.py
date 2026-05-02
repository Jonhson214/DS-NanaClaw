from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.runnables import RunnableConfig

from app.config import settings
from app.graph.state import WorkflowState
from app.pii.vault import PIIVault
from app.tools.shopify_api import ShopifyRefundTool
from app.tools.klaviyo_api import KlaviyoEmailTool
from app.tools.slack_notify import send_slack_notification


class ExecutionPlan(BaseModel):
    actions: list[str] = Field(
        description="需要执行的动作列表，如 ['refund', 'send_email', 'notify_slack']"
    )
    refund_amount: float = Field(description="实际退款金额")
    refund_type: str = Field(description="退款类型: full / partial / none")
    email_template: str = Field(description="安抚邮件正文内容")
    discount_code: str = Field(default="", description="赠送的折扣码 (如有)")
    discount_percentage: int = Field(default=0, description="折扣百分比")


EXECUTION_SYSTEM_PROMPT = """\
你是一个执行计划解析器。将客服方案解析为可执行的 API 调用参数。
只输出结构化 JSON，不要添加额外文字。
"""

EXECUTION_HUMAN_TEMPLATE = """\
请将以下方案解析为执行计划：
- 方案: {proposed_solution}
- 索赔金额: {claim_amount} {currency}
- 订单金额: {order_total} {currency}
"""


def build_execution_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.0,
        max_tokens=1024,
        api_key=settings.openai_api_key,
    ).with_structured_output(ExecutionPlan)


def execution_node(state: WorkflowState, config: RunnableConfig) -> dict:
    llm = build_execution_llm()
    vault = PIIVault()
    shopify = ShopifyRefundTool()
    klaviyo = KlaviyoEmailTool()

    messages = [
        SystemMessage(content=EXECUTION_SYSTEM_PROMPT),
        HumanMessage(content=EXECUTION_HUMAN_TEMPLATE.format(
            proposed_solution=state["proposed_solution"],
            claim_amount=state["claim_amount"],
            currency=state["currency"],
            order_total=state["order_total"],
        )),
    ]

    try:
        plan: ExecutionPlan = llm.invoke(messages, config=config)
    except Exception as e:
        return {
            "execution_status": "FAILED",
            "execution_result": {"error": f"Plan parsing failed: {str(e)}"},
            "current_node": "execution_agent",
            "error_log": [f"ExecutionAgent plan parse error: {str(e)}"],
        }

    results = {}

    try:
        pii_mapping = vault.retrieve(state["order_id"])
    except KeyError:
        return {
            "execution_status": "FAILED",
            "execution_result": {"error": "PII vault expired"},
            "current_node": "execution_agent",
            "error_log": ["PII vault expired, cannot restore customer data"],
        }

    if "refund" in plan.actions:
        try:
            refund_result = shopify.create_refund(
                order_id=state["order_id"],
                amount=plan.refund_amount,
                currency=state["currency"],
                note=f"AI Auto-Refund ({state['order_id']})",
            )
            results["refund"] = refund_result
        except Exception as e:
            return {
                "execution_status": "FAILED",
                "execution_result": {"error": f"Shopify refund failed: {str(e)}"},
                "current_node": "execution_agent",
                "error_log": [f"Shopify API error: {str(e)}"],
            }

    notification_sent = False
    if "send_email" in plan.actions:
        try:
            real_email = pii_mapping.get("[EMAIL_1]", "")
            real_name = pii_mapping.get("[PERSON_1]", "Customer")
            email_body = vault.restore_text(state["order_id"], plan.email_template)

            klaviyo.send_resolution_email(
                email=real_email,
                first_name=real_name,
                order_id=state["order_id"],
                resolution_summary=email_body,
                discount_code=plan.discount_code,
                discount_percentage=plan.discount_percentage,
            )
            notification_sent = True
            results["email"] = "sent"
        except Exception as e:
            results["email_error"] = str(e)

    if "notify_slack" in plan.actions:
        send_slack_notification(
            order_id=state["order_id"],
            claim_amount=state["claim_amount"],
            currency=state["currency"],
            proposed_solution=state["proposed_solution"],
            compliance_reason=state.get("compliance_reason", ""),
            status="COMPLETED",
        )

    vault.delete(state["order_id"])

    return {
        "execution_status": "COMPLETED",
        "execution_result": results,
        "notification_sent": notification_sent,
        "current_node": "execution_agent",
    }
