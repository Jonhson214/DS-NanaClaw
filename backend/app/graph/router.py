from app.config import settings
from app.graph.state import WorkflowState


def compliance_router(state: WorkflowState) -> str:
    result = state.get("compliance_result", "ESCALATE")
    if result == "APPROVED":
        return "execution_agent"
    elif result == "REJECTED":
        return "reflection_router"
    else:
        return "hitl_review"


def reflection_router(state: WorkflowState) -> str:
    count = state.get("reflection_count", 0)
    max_ref = state.get("max_reflections", settings.max_reflections)
    if count < max_ref:
        return "customer_service_agent"
    else:
        return "hitl_review"


def hitl_router(state: WorkflowState) -> str:
    decision = state.get("human_decision", "REJECTED")
    if decision == "APPROVED":
        return "execution_agent"
    else:
        return "end"
