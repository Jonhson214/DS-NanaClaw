from pydantic import BaseModel, Field


class WebhookPayload(BaseModel):
    order_id: str
    customer_id: str
    customer_name: str = ""
    customer_email: str = ""
    customer_phone: str = ""
    shipping_address: str = ""
    review_text: str = ""
    review_rating: int = 0
    order_total: float
    currency: str = "USD"
    line_items: list[dict] = Field(default_factory=list)
    order_created_at: str = ""
    event_type: str
    region: str
    customer_tier: str = "Regular"


class WorkflowResponse(BaseModel):
    status: str
    order_id: str
    thread_id: str = ""


class HITLResumeRequest(BaseModel):
    thread_id: str
    decision: str
    notes: str = ""


class TraceRecord(BaseModel):
    trace_id: str
    order_id: str
    status: str
    total_duration_ms: int = 0
    total_tokens: int = 0
    nodes_executed: list[str] = Field(default_factory=list)


class AuditRecord(BaseModel):
    audit_id: str
    order_id: str
    decision_type: str
    decision_maker: str
    compliance_reasoning: str = ""
    claim_amount: float = 0.0
    rag_policy_snapshot: list[dict] = Field(default_factory=list)
