import httpx

from app.config import settings


class ShopifyRefundTool:
    def __init__(self):
        self.base_url = f"{settings.shopify_store_url}/admin/api/2024-01"
        self.headers = {
            "X-Shopify-Access-Token": settings.shopify_api_key,
            "Content-Type": "application/json",
        }

    def create_refund(
        self,
        order_id: str,
        amount: float,
        currency: str,
        note: str = "",
    ) -> dict:
        url = f"{self.base_url}/orders/{order_id}/refunds.json"
        payload = {
            "refund": {
                "currency": currency,
                "notify": True,
                "note": note,
                "transactions": [
                    {
                        "amount": amount,
                        "kind": "refund",
                        "gateway": "shopify_payments",
                    }
                ],
            }
        }
        with httpx.Client(timeout=30) as client:
            resp = client.post(url, json=payload, headers=self.headers)
            resp.raise_for_status()
            return resp.json()
