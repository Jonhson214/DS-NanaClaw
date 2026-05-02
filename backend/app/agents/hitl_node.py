from langgraph.types import interrupt
from langchain_core.runnables import RunnableConfig

from app.graph.state import WorkflowState
from app.tools.slack_notify import send_slack_notification


def hitl_node(state: WorkflowState, config: RunnableConfig) -> dict:
    send_slack_notification(
        order_id=state["order_id"],
        claim_amount=state["claim_amount"],
        currency=state["currency"],
        proposed_solution=state["proposed_solution"],
        compliance_reason=state["compliance_reason"],
    )

    human_input = interrupt({
        "message": "等待人工审批",
        "order_id": state["order_id"],
        "proposed_solution": state["proposed_solution"],
        "claim_amount": state["claim_amount"],
        "compliance_reason": state["compliance_reason"],
    })

    human_decision = human_input.get("decision", "REJECTED")
    human_notes = human_input.get("notes", "")

    return {
        "human_review_required": True,
        "human_decision": human_decision,
        "human_review_notes": human_notes,
        "current_node": "hitl_review",
        "execution_status": "SUSPENDED" if human_decision == "REJECTED" else "PENDING",
    }
