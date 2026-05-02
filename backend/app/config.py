from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # LLM
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    cohere_api_key: str = ""

    # Shopify
    shopify_api_key: str = ""
    shopify_api_secret: str = ""
    shopify_store_url: str = "https://your-store.myshopify.com"
    shopify_webhook_secret: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    # PostgreSQL
    database_url: str = "postgresql+psycopg://user:pass@localhost:5432/ecom_workflow"
    langgraph_checkpoint_db: str = "postgresql://user:pass@localhost:5432/ecom_workflow"

    # Milvus
    milvus_host: str = "localhost"
    milvus_port: int = 19530
    milvus_collection: str = "policy_documents"

    # Klaviyo / Slack
    klaviyo_api_key: str = ""
    slack_webhook_url: str = ""

    # LangSmith
    langchain_tracing_v2: bool = True
    langchain_api_key: str = ""
    langchain_project: str = "ecom-ai-workflow"

    # PII
    pii_vault_encryption_key: str = ""
    pii_vault_ttl_seconds: int = 7200

    # 业务参数
    max_reflections: int = 3
    auto_approve_threshold: float = 100.00
    max_concurrent_workers: int = 20


settings = Settings()
