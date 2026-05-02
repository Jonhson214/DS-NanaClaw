from celery import Task
from langgraph.checkpoint.postgres import PostgresSaver

from app.tasks.celery_app import celery_app
from app.graph.builder import build_graph
from app.graph.state import WorkflowState
from app.pii.interceptor import PIIInterceptor
from app.pii.vault import PIIVault
from app.config import settings
from app.utils.idempotency import IdempotencyLock


class WorkflowTask(Task):
    autoretry_for = (ConnectionError, TimeoutError)
    retry_backoff = True
    retry_backoff_max = 60
    max_retries = 3
    retry_jitter = True


@celery_app.task(
    base=WorkflowTask,
    bind=True,
    name="execute_workflow",
    queue="ecom_workflow",
)
def execute_workflow(self, payload: dict) -> dict:
    order_id = payload["order_id"]
    event_type = payload["event_type"]

    lock = IdempotencyLock()
    if not lock.acquire(f"{order_id}:{event_type}"):
        return {"status": "duplicate", "order_id": order_id}

    try:
        vault = PIIVault()
        interceptor = PIIInterceptor(vault)
        anonymized_payload, _ = interceptor.anonymize_payload(
            payload=payload,
            order_id=order_id,
        )

        initial_state: WorkflowState = {
            "order_id": anonymized_payload["order_id"],
            "customer_id": anonymized_payload["customer_id"],
            "event_type": anonymized_payload["event_type"],
            "region": anonymized_payload["region"],
            "customer_tier": anonymized_payload.get("customer_tier", "Regular"),
            "review_text": anonymized_payload.get("review_text", ""),
            "review_rating": anonymized_payload.get("review_rating", 0),
            "order_total": anonymized_payload["order_total"],
            "currency": anonymized_payload["currency"],
            "line_items": anonymized_payload.get("line_items", []),
            "proposed_solution": "",
            "claim_amount": 0.0,
            "solution_confidence": 0.0,
            "solution_reasoning": "",
            "rag_query": "",
            "rag_retrieved_policies": [],
            "compliance_result": "",
            "compliance_reason": "",
            "compliance_confidence": 0.0,
            "human_review_required": False,
            "human_review_notes": "",
            "human_decision": "",
            "execution_status": "PENDING",
            "execution_result": {},
            "notification_sent": False,
            "current_node": "START",
            "reflection_count": 0,
            "max_reflections": settings.max_reflections,
            "error_log": [],
        }

        checkpointer = PostgresSaver.from_conn_string(
            settings.langgraph_checkpoint_db
        )
        graph = build_graph(checkpointer=checkpointer)

        config = {"configurable": {"thread_id": f"workflow-{order_id}"}}
        final_state = graph.invoke(initial_state, config=config)

        return {
            "status": final_state.get("execution_status", "UNKNOWN"),
            "order_id": order_id,
            "thread_id": f"workflow-{order_id}",
        }

    except Exception as exc:
        if self.request.retries >= self.max_retries:
            celery_app.send_task(
                "dead_letter_handler",
                args=[payload, str(exc)],
                queue="dead_letter",
            )
        raise exc
    finally:
        lock.release(f"{order_id}:{event_type}")
