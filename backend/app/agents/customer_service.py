from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.runnables import RunnableConfig

from app.config import settings
from app.graph.state import WorkflowState


class CustomerServiceOutput(BaseModel):
    proposed_solution: str = Field(
        description="为客户提出的完整解决方案描述，包括退款/换货/补偿等具体操作"
    )
    claim_amount: float = Field(
        description="建议的赔偿或退款金额 (单位与原始订单货币一致)"
    )
    confidence_score: float = Field(
        ge=0.0, le=1.0,
        description="对该方案的置信度评分"
    )
    reasoning: str = Field(
        description="决策推理过程"
    )
    needs_human_review: bool = Field(
        description="是否建议由人工复核此方案"
    )


CUSTOMER_SERVICE_SYSTEM_PROMPT = """\
你是一位经验丰富的电商客服专家。你的职责是分析客户的差评或投诉，并提出合理的解决方案。

## 你的行为准则：
1. 始终站在客户角度考虑问题，态度诚恳
2. 方案必须具体可执行：明确退款金额、补偿方式、折扣码面额等
3. 根据客户等级 (VIP/Regular/New) 适当调整补偿力度
4. VIP 客户：可适当上浮补偿 10-20%
5. 如果订单金额超过 {auto_approve_threshold} {currency}，建议标记为需要人工复核
6. 你的方案将提交给合规 Agent 审查，请确保方案合理且可追溯

## 你必须以结构化 JSON 格式输出。
"""

CUSTOMER_SERVICE_HUMAN_TEMPLATE = """\
请分析以下工单并提出解决方案：

- 事件类型: {event_type}
- 订单号: {order_id}
- 订单金额: {order_total} {currency}
- 客户等级: {customer_tier}
- 差评/投诉内容: {review_text}
- 评分: {review_rating}/5
- 商品明细: {line_items}
{reflection_context}
"""


def build_customer_service_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.2,
        max_tokens=2048,
        timeout=60,
        max_retries=3,
        api_key=settings.openai_api_key,
    ).with_structured_output(CustomerServiceOutput)


def customer_service_node(
    state: WorkflowState,
    config: RunnableConfig,
) -> dict:
    llm = build_customer_service_llm()

    reflection_context = ""
    if state.get("reflection_count", 0) > 0:
        reflection_context = f"""

【重要】合规 Agent 已驳回你上一次的方案，驳回理由如下：
"{state.get('compliance_reason', '')}"
当前是第 {state['reflection_count']} 次重写。请根据驳回理由修改方案。
"""

    messages = [
        SystemMessage(content=CUSTOMER_SERVICE_SYSTEM_PROMPT.format(
            auto_approve_threshold=settings.auto_approve_threshold,
            currency=state["currency"],
        )),
        HumanMessage(content=CUSTOMER_SERVICE_HUMAN_TEMPLATE.format(
            event_type=state["event_type"],
            order_id=state["order_id"],
            order_total=state["order_total"],
            currency=state["currency"],
            customer_tier=state.get("customer_tier", "Regular"),
            review_text=state["review_text"],
            review_rating=state.get("review_rating", "N/A"),
            line_items=state["line_items"],
            reflection_context=reflection_context,
        )),
    ]

    try:
        result: CustomerServiceOutput = llm.invoke(messages, config=config)
        return {
            "proposed_solution": result.proposed_solution,
            "claim_amount": result.claim_amount,
            "solution_confidence": result.confidence_score,
            "solution_reasoning": result.reasoning,
            "human_review_required": result.needs_human_review,
            "current_node": "customer_service_agent",
        }
    except Exception as e:
        return {
            "proposed_solution": "",
            "claim_amount": 0.0,
            "current_node": "customer_service_agent",
            "error_log": [f"CustomerServiceAgent error: {str(e)}"],
        }
