import httpx

from app.config import settings


def send_slack_notification(
    order_id: str,
    claim_amount: float,
    currency: str,
    proposed_solution: str,
    compliance_reason: str,
    status: str = "PENDING_REVIEW",
) -> None:
    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"{'已完成' if status == 'COMPLETED' else '需要人工审批'} — 工单 {order_id}",
            },
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*订单号:*\n{order_id}"},
                {"type": "mrkdwn", "text": f"*索赔金额:*\n{claim_amount} {currency}"},
                {"type": "mrkdwn", "text": f"*AI 方案:*\n{proposed_solution[:200]}"},
                {"type": "mrkdwn", "text": f"*合规审查:*\n{compliance_reason[:200]}"},
            ],
        },
    ]
    payload = {"blocks": blocks}
    with httpx.Client(timeout=10) as client:
        client.post(settings.slack_webhook_url, json=payload)
