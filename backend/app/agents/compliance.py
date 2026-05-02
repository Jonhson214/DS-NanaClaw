from enum import Enum

from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.runnables import RunnableConfig

from app.config import settings
from app.graph.state import WorkflowState


class ComplianceDecision(str, Enum):
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    ESCALATE = "ESCALATE"


class ComplianceOutput(BaseModel):
    decision: ComplianceDecision = Field(
        description=(
            "APPROVED=方案合规通过; "
            "REJECTED=方案不合规需重写; "
            "ESCALATE=无法判定需人工介入"
        )
    )
    reason: str = Field(
        description="审查理由，必须引用具体的政策条款编号"
    )
    confidence: float = Field(
        ge=0.0, le=1.0,
        description="审查置信度"
    )
    policy_references: list[str] = Field(
        description="引用的政策条款 doc_id 列表"
    )
    risk_flags: list[str] = Field(
        default_factory=list,
        description="风险标记 (如: 超额赔偿、疑似欺诈等)"
    )


COMPLIANCE_SYSTEM_PROMPT = """\
你是一位严谨的电商合规审查官。你的职责是审查客服 Agent 提出的解决方案是否符合公司政策。

## 审查规则：
1. 方案中的退款金额不得超过订单原始金额的 120%（VIP 客户放宽至 150%）
2. 必须有明确的政策条款支撑方案中的每一项操作
3. 如果检索到的政策条款无法完全覆盖方案内容，判定为 ESCALATE
4. 如果方案明显违反政策（如对不符条件的订单退款），判定为 REJECTED，并写明原因
5. 金额超过 {auto_approve_threshold} {currency} 的方案自动 ESCALATE
6. 在 REJECTED 时，你的理由必须足够具体，让客服 Agent 能据此修改

## 你必须引用具体的政策条款编号 (doc_id) 作为决策依据。
"""

COMPLIANCE_HUMAN_TEMPLATE = """\
请审查以下解决方案：

## 客服 Agent 方案
- 方案描述: {proposed_solution}
- 索赔金额: {claim_amount} {currency}
- 客服置信度: {solution_confidence}
- 推理过程: {solution_reasoning}

## 订单信息
- 订单金额: {order_total} {currency}
- 地区: {region}
- 客户等级: {customer_tier}

## 检索到的政策条款
{policy_text}

请基于以上政策条款，审查方案的合规性。
"""


def build_compliance_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model="gpt-4o",
        temperature=0.0,
        max_tokens=2048,
        timeout=60,
        max_retries=3,
        api_key=settings.openai_api_key,
    ).with_structured_output(ComplianceOutput)


def compliance_node(state: WorkflowState, config: RunnableConfig) -> dict:
    llm = build_compliance_llm()

    policies = state.get("rag_retrieved_policies", [])
    policy_text = "\n".join(
        f"- [{p['doc_id']}] {p['section_title']}: {p['content_snippet']}"
        for p in policies
    ) if policies else "（未检索到相关政策条款）"

    messages = [
        SystemMessage(content=COMPLIANCE_SYSTEM_PROMPT.format(
            auto_approve_threshold=settings.auto_approve_threshold,
            currency=state["currency"],
        )),
        HumanMessage(content=COMPLIANCE_HUMAN_TEMPLATE.format(
            proposed_solution=state["proposed_solution"],
            claim_amount=state["claim_amount"],
            currency=state["currency"],
            solution_confidence=state.get("solution_confidence", "N/A"),
            solution_reasoning=state.get("solution_reasoning", ""),
            order_total=state["order_total"],
            region=state["region"],
            customer_tier=state.get("customer_tier", "Regular"),
            policy_text=policy_text,
        )),
    ]

    try:
        result: ComplianceOutput = llm.invoke(messages, config=config)
        return {
            "compliance_result": result.decision.value,
            "compliance_reason": result.reason,
            "compliance_confidence": result.confidence,
            "current_node": "compliance_agent",
        }
    except Exception as e:
        return {
            "compliance_result": "ESCALATE",
            "compliance_reason": f"合规 Agent 执行异常，自动升级人工: {str(e)}",
            "current_node": "compliance_agent",
            "error_log": [f"ComplianceAgent error: {str(e)}"],
        }
