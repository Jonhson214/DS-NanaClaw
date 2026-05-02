from __future__ import annotations

import operator
from typing import Annotated, TypedDict


class PolicyChunk(TypedDict):
    doc_id: str
    section_title: str
    relevance_score: float
    content_snippet: str


class WorkflowState(TypedDict):
    # ─── 基础工单信息 (PII 脱敏后) ───
    order_id: str
    customer_id: str
    event_type: str
    region: str
    customer_tier: str
    review_text: str
    review_rating: int
    order_total: float
    currency: str
    line_items: list[dict]

    # ─── 客服 Agent 输出 ───
    proposed_solution: str
    claim_amount: float
    solution_confidence: float
    solution_reasoning: str

    # ─── RAG 检索结果 ───
    rag_query: str
    rag_retrieved_policies: list[PolicyChunk]

    # ─── 合规 Agent 输出 ───
    compliance_result: str
    compliance_reason: str
    compliance_confidence: float

    # ─── HITL 人工审批 ───
    human_review_required: bool
    human_review_notes: str
    human_decision: str

    # ─── 执行 Agent 输出 ───
    execution_status: str
    execution_result: dict
    notification_sent: bool

    # ─── 流程控制 ───
    current_node: str
    reflection_count: int
    max_reflections: int
    error_log: Annotated[list[str], operator.add]
