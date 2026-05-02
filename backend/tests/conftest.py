import os
from unittest.mock import MagicMock, patch

import pytest


@pytest.fixture(autouse=True)
def mock_settings(monkeypatch):
    """Mock all external service settings for testing."""
    env_vars = {
        "OPENAI_API_KEY": "sk-test-key",
        "ANTHROPIC_API_KEY": "sk-ant-test",
        "COHERE_API_KEY": "test-cohere-key",
        "SHOPIFY_API_KEY": "test-shopify-key",
        "SHOPIFY_API_SECRET": "test-shopify-secret",
        "SHOPIFY_STORE_URL": "https://test-store.myshopify.com",
        "SHOPIFY_WEBHOOK_SECRET": "test-webhook-secret",
        "REDIS_URL": "redis://localhost:6379/0",
        "CELERY_BROKER_URL": "redis://localhost:6379/1",
        "CELERY_RESULT_BACKEND": "redis://localhost:6379/2",
        "DATABASE_URL": "sqlite:///test.db",
        "LANGGRAPH_CHECKPOINT_DB": "sqlite:///test_checkpoint.db",
        "MILVUS_HOST": "localhost",
        "MILVUS_PORT": "19530",
        "MILVUS_COLLECTION": "test_policy_documents",
        "KLAVIYO_API_KEY": "test-klaviyo-key",
        "SLACK_WEBHOOK_URL": "https://hooks.slack.com/test",
        "LANGCHAIN_API_KEY": "ls-test",
        "LANGCHAIN_PROJECT": "test-project",
        "PII_VAULT_ENCRYPTION_KEY": "dGVzdC1lbmNyeXB0aW9uLWtleS0xMjM0NTY3OA==",
        "PII_VAULT_TTL_SECONDS": "7200",
        "MAX_REFLECTIONS": "3",
        "AUTO_APPROVE_THRESHOLD": "100.00",
        "MAX_CONCURRENT_WORKERS": "2",
    }
    for key, value in env_vars.items():
        monkeypatch.setenv(key, value)


@pytest.fixture
def sample_workflow_state():
    """Provide a sample WorkflowState for testing."""
    return {
        "order_id": "ORD-TEST-001",
        "customer_id": "CUST-TEST-001",
        "event_type": "negative_review",
        "region": "US",
        "customer_tier": "VIP",
        "review_text": "收到的耳机坏了，要求退款！",
        "review_rating": 1,
        "order_total": 299.00,
        "currency": "USD",
        "line_items": [
            {
                "sku": "SKU-TEST-001",
                "product_name": "无线蓝牙耳机 Pro",
                "product_category": "Electronics",
                "quantity": 1,
                "price": 299.00,
            }
        ],
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
        "max_reflections": 3,
        "error_log": [],
    }


@pytest.fixture
def sample_webhook_payload():
    """Provide a sample Shopify webhook payload."""
    return {
        "order_id": "ORD-TEST-001",
        "customer_id": "CUST-TEST-001",
        "customer_name": "John Doe",
        "customer_email": "john.doe@example.com",
        "customer_phone": "555-0198",
        "shipping_address": "123 Main St, New York",
        "review_text": "Product was broken on arrival, very disappointed!",
        "review_rating": 1,
        "order_total": 299.00,
        "currency": "USD",
        "line_items": [
            {
                "sku": "SKU-9982",
                "product_name": "Wireless Headphones Pro",
                "product_category": "Electronics",
                "quantity": 1,
                "price": 299.00,
            }
        ],
        "event_type": "negative_review",
        "region": "US",
        "customer_tier": "VIP",
    }


@pytest.fixture
def mock_redis():
    """Provide a mock Redis client."""
    redis_mock = MagicMock()
    redis_mock.set.return_value = True
    redis_mock.get.return_value = None
    redis_mock.delete.return_value = 1
    redis_mock.setex.return_value = True
    return redis_mock
