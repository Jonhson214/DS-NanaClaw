import httpx

from app.config import settings


class KlaviyoEmailTool:
    API_URL = "https://a.klaviyo.com/api/events/"

    def send_resolution_email(
        self,
        email: str,
        first_name: str,
        order_id: str,
        resolution_summary: str,
        discount_code: str = "",
        discount_percentage: int = 0,
    ) -> dict:
        payload = {
            "data": {
                "type": "event",
                "attributes": {
                    "metric": {
                        "data": {
                            "type": "metric",
                            "attributes": {"name": "AI_Resolution_Email"},
                        }
                    },
                    "profile": {
                        "data": {
                            "type": "profile",
                            "attributes": {
                                "email": email,
                                "first_name": first_name,
                            },
                        }
                    },
                    "properties": {
                        "order_id": order_id,
                        "resolution_summary": resolution_summary,
                        "discount_code": discount_code,
                        "discount_percentage": discount_percentage,
                    },
                },
            }
        }
        headers = {
            "Authorization": f"Klaviyo-API-Key {settings.klaviyo_api_key}",
            "Content-Type": "application/json",
            "revision": "2024-02-15",
        }
        with httpx.Client(timeout=30) as client:
            resp = client.post(self.API_URL, json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json()
