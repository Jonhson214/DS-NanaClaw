from prometheus_client import Counter, Histogram, Gauge

WORKFLOW_REQUESTS_TOTAL = Counter(
    "workflow_requests_total",
    "Total number of workflow requests",
    ["event_type", "region"],
)

WORKFLOW_DURATION_SECONDS = Histogram(
    "workflow_duration_seconds",
    "Workflow execution duration in seconds",
    ["event_type"],
    buckets=[1, 5, 10, 30, 60, 120, 300],
)

WORKFLOW_STATUS = Counter(
    "workflow_status_total",
    "Workflow final status counts",
    ["status"],
)

LLM_TOKENS_TOTAL = Counter(
    "llm_tokens_total",
    "Total LLM tokens consumed",
    ["model", "direction"],
)

LLM_CALL_DURATION_SECONDS = Histogram(
    "llm_call_duration_seconds",
    "LLM API call duration in seconds",
    ["model", "agent"],
)

CELERY_QUEUE_SIZE = Gauge(
    "celery_queue_size",
    "Current Celery queue size",
    ["queue_name"],
)

HITL_PENDING_REVIEWS = Gauge(
    "hitl_pending_reviews",
    "Number of workflows pending human review",
)
