import hashlib
import hmac
import json
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def _make_hmac(body: bytes, secret: str = "test-webhook-secret") -> str:
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


class TestShopifyWebhook:
    def test_valid_webhook(self, client, sample_webhook_payload):
        body = json.dumps(sample_webhook_payload).encode()
        hmac_sig = _make_hmac(body)

        with patch("app.api.webhooks.execute_workflow") as mock_task:
            mock_task.delay.return_value = None

            resp = client.post(
                "/api/webhooks/shopify",
                content=body,
                headers={
                    "Content-Type": "application/json",
                    "X-Shopify-Hmac-SHA256": hmac_sig,
                },
            )

            assert resp.status_code == 200
            assert resp.json()["status"] == "accepted"
            mock_task.delay.assert_called_once()

    def test_invalid_hmac(self, client, sample_webhook_payload):
        body = json.dumps(sample_webhook_payload).encode()

        resp = client.post(
            "/api/webhooks/shopify",
            content=body,
            headers={
                "Content-Type": "application/json",
                "X-Shopify-Hmac-SHA256": "invalid-hmac",
            },
        )

        assert resp.status_code == 401

    def test_missing_required_field(self, client):
        payload = {"order_id": "ORD-001"}
        body = json.dumps(payload).encode()
        hmac_sig = _make_hmac(body)

        resp = client.post(
            "/api/webhooks/shopify",
            content=body,
            headers={
                "Content-Type": "application/json",
                "X-Shopify-Hmac-SHA256": hmac_sig,
            },
        )

        assert resp.status_code == 400

    def test_unsupported_event_type(self, client, sample_webhook_payload):
        sample_webhook_payload["event_type"] = "unknown_event"
        body = json.dumps(sample_webhook_payload).encode()
        hmac_sig = _make_hmac(body)

        resp = client.post(
            "/api/webhooks/shopify",
            content=body,
            headers={
                "Content-Type": "application/json",
                "X-Shopify-Hmac-SHA256": hmac_sig,
            },
        )

        assert resp.status_code == 422


class TestHealthCheck:
    def test_health(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}
