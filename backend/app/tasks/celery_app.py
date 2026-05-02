from celery import Celery

from app.config import settings

celery_app = Celery(
    "ecom_workflow",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    worker_concurrency=settings.max_concurrent_workers,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_default_queue="ecom_workflow",
    task_queues={
        "ecom_workflow": {"exchange": "ecom_workflow", "routing_key": "ecom_workflow"},
        "dead_letter": {"exchange": "dead_letter", "routing_key": "dead_letter"},
    },
)
