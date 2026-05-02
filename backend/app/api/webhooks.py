import hashlib
import hmac as hmac_mod

from fastapi import APIRouter, Request, HTTPException

from app.config import settings

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])


def verify_shopify_hmac(body: bytes, hmac_header: str) -> bool:
    digest = hmac_mod.new(
        settings.shopify_webhook_secret.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac_mod.compare_digest(digest, hmac_header)


@router.post("/shopify")
async def shopify_webhook(request: Request):
    body = await request.body()
    hmac_header = request.headers.get("X-Shopify-Hmac-SHA256", "")

    if not verify_shopify_hmac(body, hmac_header):
        raise HTTPException(status_code=401, detail="Invalid HMAC signature")

    payload = await request.json()

    required_fields = ["order_id", "customer_id", "event_type", "region"]
    for field in required_fields:
        if not payload.get(field):
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")

    allowed_events = {"negative_review", "refund_request", "complaint"}
    if payload["event_type"] not in allowed_events:
        raise HTTPException(status_code=422, detail=f"Unsupported event_type: {payload['event_type']}")

    from app.tasks.workflow_task import execute_workflow
    execute_workflow.delay(payload)

    return {"status": "accepted", "order_id": payload["order_id"]}
