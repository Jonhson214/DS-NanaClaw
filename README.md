# 基于 LangGraph 的电商异常处理多智能体工作流 

---

## 目录

1. [系统总体架构与技术栈](#1-系统总体架构与技术栈)
2. [项目工程结构](#2-项目工程结构)
3. [核心依赖与环境配置](#3-核心依赖与环境配置)
4. [共享状态定义 (WorkflowState)](#4-共享状态定义-workflowstate)
5. [Agent 节点详细搭建](#5-agent-节点详细搭建)
   - 5.1 [PII 脱敏预处理节点](#51-pii-脱敏预处理节点)
   - 5.2 [客服 Agent (CustomerService Agent)](#52-客服-agent-customerservice-agent)
   - 5.3 [Policy RAG 检索工具节点](#53-policy-rag-检索工具节点)
   - 5.4 [合规 Agent (Compliance Agent)](#54-合规-agent-compliance-agent)
   - 5.5 [HITL 人工审批节点](#55-hitl-人工审批节点)
   - 5.6 [执行 Agent (Execution Agent)](#56-执行-agent-execution-agent)
6. [Agent 间连接与路由设计](#6-agent-间连接与路由设计)
7. [LangGraph 图构建完整实现](#7-langgraph-图构建完整实现)
8. [异步任务层搭建 (FastAPI + Celery)](#8-异步任务层搭建-fastapi--celery)
9. [可观测性集成 (LangSmith + Callbacks)](#9-可观测性集成-langsmith--callbacks)
10. [部署与运维](#10-部署与运维)



![image-20260425015725622](C:\Users\Jonson-cc\AppData\Roaming\Typora\typora-user-images\image-20260425015725622.png)

![image-20260425015752110](C:\Users\Jonson-cc\AppData\Roaming\Typora\typora-user-images\image-20260425015752110.png)

![image-20260425015822914](C:\Users\Jonson-cc\AppData\Roaming\Typora\typora-user-images\image-20260425015822914.png)



![image-20260425015850228](C:\Users\Jonson-cc\AppData\Roaming\Typora\typora-user-images\image-20260425015850228.png)

![image-20260425015925259](C:\Users\Jonson-cc\AppData\Roaming\Typora\typora-user-images\image-20260425015925259.png)

![image-20260425015950095](C:\Users\Jonson-cc\AppData\Roaming\Typora\typora-user-images\image-20260425015950095.png)

![image-20260425020011841](C:\Users\Jonson-cc\AppData\Roaming\Typora\typora-user-images\image-20260425020011841.png)

## 1. 系统总体架构与技术栈

### 1.1 架构全景

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              系统技术架构全景图                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌───────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐  │
│  │  Shopify   │────▶│   FastAPI    │────▶│ Redis Queue  │────▶│Celery Worker │  │
│  │  Webhook   │     │   Gateway    │     │  (Broker)    │     │  (Consumer)  │  │
│  └───────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘  │
│                                                                      │          │
│                    ┌─────────────────────────────────────────────────▼────────┐ │
│                    │              LangGraph StateGraph                        │ │
│                    │                                                          │ │
│                    │  ┌─────────┐    ┌──────────┐    ┌────────────────────┐  │ │
│                    │  │   PII   │───▶│ 客服Agent │───▶│  Policy RAG Tool  │  │ │
│                    │  │脱敏节点  │    │          │    │ (Embed+BM25+Rerank)│  │ │
│                    │  └─────────┘    └──────────┘    └────────┬───────────┘  │ │
│                    │                                          │              │ │
│                    │                      ┌───────────────────▼──────────┐   │ │
│                    │                      │        合规 Agent            │   │ │
│                    │                      │   (Self-RAG + 文档评分)      │   │ │
│                    │                      └─────┬──────┬──────┬─────────┘   │ │
│                    │                  APPROVED   │ REJECTED   │ ESCALATE    │ │
│                    │                      │      │      │     │             │ │
│                    │                      │  ┌───▼──┐   │  ┌──▼─────────┐  │ │
│                    │                      │  │反思重写│   │  │ HITL 人工  │  │ │
│                    │                      │  │循环   │   │  │  审批节点  │  │ │
│                    │                      │  └──────┘   │  └──┬─────────┘  │ │
│                    │                      ▼              │     │            │ │
│                    │                 ┌────────────┐      │     │            │ │
│                    │                 │  执行 Agent │◀─────┘─────┘            │ │
│                    │                 │(PII还原+API)│                         │ │
│                    │                 └──┬───┬───┬─┘                         │ │
│                    │                    │   │   │                            │ │
│                    └────────────────────┼───┼───┼────────────────────────────┘ │
│                                         │   │   │                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──▼───▼───▼───┐  ┌──────────────────┐  │
│  │  PostgreSQL   │  │    Milvus    │  │  Shopify API  │  │    LangSmith     │  │
│  │ (Checkpointer │  │ (向量数据库)  │  │  Klaviyo API  │  │   (Tracing)      │  │
│  │  + 审计)      │  │              │  │  Slack API    │  │                  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 核心技术栈清单

| 层级 | 技术选型 | 版本要求 | 职责 |
|---|---|---|---|
| **编排框架** | LangGraph | ≥ 0.2.x | 多智能体状态图编排、条件路由、断点续跑 |
| **LLM 框架** | LangChain | ≥ 0.3.x | LLM 统一接口、Prompt 模板、结构化输出 |
| **Web 框架** | FastAPI | ≥ 0.110 | Webhook 接收、HMAC 鉴权、REST API |
| **任务队列** | Celery + Redis | Celery ≥ 5.3 | 异步任务分发、重试、死信队列 |
| **向量数据库** | Milvus | ≥ 2.4 | 混合检索 (Dense + Sparse)、Metadata 过滤 |
| **关系数据库** | PostgreSQL | ≥ 15 | LangGraph Checkpointer、审计日志、Trace 存储 |
| **缓存/锁** | Redis | ≥ 7.0 | 消息队列、分布式锁、PII Vault 映射表 |
| **PII 脱敏** | Microsoft Presidio | ≥ 2.2 | 个人隐私信息识别与占位符替换 |
| **可观测性** | LangSmith | SaaS | Agent 链路追踪、Prompt 调试、Token 统计 |
| **密钥管理** | AWS Secrets Manager / HashiCorp Vault | — | API Key 统一托管 |
| **容器化** | Docker + Docker Compose | — | 本地开发与生产部署 |

---

## 2. 项目工程结构

```
ecom-ai-workflow/
│
├── docker-compose.yml                 # 容器编排 (FastAPI + Celery + Redis + Milvus + Postgres)
├── Dockerfile                         # Python 应用镜像
├── pyproject.toml                     # 依赖管理 (推荐 Poetry 或 uv)
├── .env.example                       # 环境变量模板
│
├── app/
│   ├── __init__.py
│   ├── main.py                        # FastAPI 入口
│   ├── config.py                      # 全局配置 (Pydantic Settings)
│   │
│   ├── api/                           # API 层
│   │   ├── __init__.py
│   │   ├── webhooks.py                # Shopify Webhook 接收端点
│   │   ├── hitl.py                    # HITL 人工审批 REST API
│   │   └── middleware/
│   │       ├── __init__.py
│   │       └── hmac_auth.py           # HMAC 签名验证中间件
│   │
│   ├── tasks/                         # Celery 异步任务
│   │   ├── __init__.py
│   │   ├── celery_app.py              # Celery 实例配置
│   │   └── workflow_task.py           # LangGraph 执行任务
│   │
│   ├── graph/                         # LangGraph 核心 (多智能体编排)
│   │   ├── __init__.py
│   │   ├── state.py                   # WorkflowState 定义
│   │   ├── builder.py                 # Graph 构建与编译
│   │   └── router.py                  # 条件路由函数
│   │
│   ├── agents/                        # 各 Agent 节点实现
│   │   ├── __init__.py
│   │   ├── customer_service.py        # 客服 Agent
│   │   ├── compliance.py              # 合规 Agent
│   │   ├── execution.py               # 执行 Agent
│   │   └── hitl_node.py               # HITL 人工审批节点
│   │
│   ├── tools/                         # Agent 工具 (LangChain Tools)
│   │   ├── __init__.py
│   │   ├── policy_rag.py              # Policy RAG 检索工具
│   │   ├── shopify_api.py             # Shopify Admin API 工具
│   │   ├── klaviyo_api.py             # Klaviyo 邮件工具
│   │   └── slack_notify.py            # Slack/飞书 通知工具
│   │
│   ├── rag/                           # RAG 子系统
│   │   ├── __init__.py
│   │   ├── embeddings.py              # Embedding 模型封装
│   │   ├── chunker.py                 # 文档切片策略
│   │   ├── indexer.py                 # 向量数据库写入
│   │   ├── retriever.py               # 混合检索 (Dense + Sparse)
│   │   ├── reranker.py                # 重排序模型封装
│   │   └── self_rag.py                # Self-RAG (查询重写 + 文档评分)
│   │
│   ├── pii/                           # PII 脱敏子系统
│   │   ├── __init__.py
│   │   ├── interceptor.py             # PII 拦截与脱敏引擎
│   │   └── vault.py                   # 加密映射表管理 (Redis Vault)
│   │
│   ├── observability/                 # 可观测性
│   │   ├── __init__.py
│   │   ├── callbacks.py               # LangGraph 自定义 Callback Handler
│   │   ├── trace_store.py             # Trace/Span 持久化
│   │   └── metrics.py                 # Prometheus 指标导出
│   │
│   ├── models/                        # 数据模型 (Pydantic / SQLAlchemy)
│   │   ├── __init__.py
│   │   ├── schemas.py                 # Pydantic 请求/响应 Schema
│   │   └── db_models.py              # SQLAlchemy ORM 模型
│   │
│   └── utils/
│       ├── __init__.py
│       ├── secrets.py                 # 密钥管理工具
│       └── idempotency.py            # Redis 幂等性锁
│
├── scripts/
│   ├── ingest_policies.py             # 政策文档导入向量数据库脚本
│   └── init_db.py                     # 数据库初始化脚本
│
└── tests/
    ├── test_agents/
    ├── test_rag/
    ├── test_api/
    └── conftest.py
```

---

## 3. 核心依赖与环境配置

### 3.1 Python 依赖 (pyproject.toml)

```toml
[project]
name = "ecom-ai-workflow"
version = "1.0.0"
requires-python = ">=3.11"
dependencies = [
    # === LangGraph / LangChain 核心 ===
    "langgraph>=0.2.60",
    "langgraph-checkpoint-postgres>=2.0.0",
    "langchain>=0.3.12",
    "langchain-openai>=0.3.0",
    "langchain-anthropic>=0.3.0",
    "langchain-community>=0.3.10",
    "langchain-cohere>=0.3.0",

    # === Web 框架 ===
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.32.0",
    "httpx>=0.27.0",

    # === 任务队列 ===
    "celery[redis]>=5.4.0",

    # === 向量数据库 ===
    "pymilvus>=2.4.0",

    # === 数据库 ===
    "psycopg[binary]>=3.2.0",
    "sqlalchemy>=2.0.30",
    "alembic>=1.13.0",

    # === Redis ===
    "redis>=5.0.0",

    # === PII 脱敏 ===
    "presidio-analyzer>=2.2.0",
    "presidio-anonymizer>=2.2.0",
    "spacy>=3.7.0",

    # === 可观测性 ===
    "langsmith>=0.2.0",
    "prometheus-client>=0.21.0",

    # === 密钥管理 ===
    "boto3>=1.34.0",

    # === 工具 ===
    "pydantic>=2.9.0",
    "pydantic-settings>=2.6.0",
    "python-dotenv>=1.0.0",
    "cryptography>=43.0.0",
]
```

### 3.2 环境变量 (.env)

```bash
# === LLM API Keys ===
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
COHERE_API_KEY=...

# === Shopify ===
SHOPIFY_API_KEY=...
SHOPIFY_API_SECRET=...
SHOPIFY_STORE_URL=https://your-store.myshopify.com
SHOPIFY_WEBHOOK_SECRET=...                    # HMAC 验签密钥

# === Redis ===
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2

# === PostgreSQL ===
DATABASE_URL=postgresql+psycopg://user:pass@localhost:5432/ecom_workflow
LANGGRAPH_CHECKPOINT_DB=postgresql://user:pass@localhost:5432/ecom_workflow

# === Milvus ===
MILVUS_HOST=localhost
MILVUS_PORT=19530
MILVUS_COLLECTION=policy_documents

# === Klaviyo ===
KLAVIYO_API_KEY=...

# === Slack ===
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# === LangSmith ===
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=ls__...
LANGCHAIN_PROJECT=ecom-ai-workflow

# === PII Vault ===
PII_VAULT_ENCRYPTION_KEY=...                  # AES-256 对称加密密钥
PII_VAULT_TTL_SECONDS=7200

# === 业务参数 ===
MAX_REFLECTIONS=3                             # 最大反思重写次数
AUTO_APPROVE_THRESHOLD=100.00                 # 自动审批金额上限 (USD)
MAX_CONCURRENT_WORKERS=20                     # 最大并发 Worker 数
```

### 3.3 全局配置类

```python
# app/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # LLM
    openai_api_key: str
    anthropic_api_key: str
    cohere_api_key: str

    # Shopify
    shopify_api_key: str
    shopify_api_secret: str
    shopify_store_url: str
    shopify_webhook_secret: str

    # Redis
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    # PostgreSQL
    database_url: str
    langgraph_checkpoint_db: str

    # Milvus
    milvus_host: str = "localhost"
    milvus_port: int = 19530
    milvus_collection: str = "policy_documents"

    # Klaviyo / Slack
    klaviyo_api_key: str
    slack_webhook_url: str

    # LangSmith
    langchain_tracing_v2: bool = True
    langchain_api_key: str
    langchain_project: str = "ecom-ai-workflow"

    # PII
    pii_vault_encryption_key: str
    pii_vault_ttl_seconds: int = 7200

    # 业务参数
    max_reflections: int = 3
    auto_approve_threshold: float = 100.00
    max_concurrent_workers: int = 20


settings = Settings()
```

---

## 4. 共享状态定义 (WorkflowState)

`WorkflowState` 是贯穿整个 LangGraph 图的共享数据上下文。所有 Agent 节点通过读取和写入此状态对象实现信息传递。

```python
# app/graph/state.py
from __future__ import annotations

import operator
from typing import Annotated, TypedDict


class PolicyChunk(TypedDict):
    doc_id: str
    section_title: str
    relevance_score: float
    content_snippet: str


class WorkflowState(TypedDict):
    """
    LangGraph 全局共享状态。
    每个 Agent 节点返回的 dict 会被合并到此状态中。
    使用 Annotated + operator.add 的字段支持追加语义 (如 error_log)。
    """

    # ─── 基础工单信息 (PII 脱敏后，由初始化阶段写入，后续只读) ───
    order_id: str
    customer_id: str
    event_type: str
    region: str
    customer_tier: str
    review_text: str
    review_rating: int
    order_total: float
    currency: str
    line_items: list[dict]

    # ─── 客服 Agent 输出 ───
    proposed_solution: str
    claim_amount: float
    solution_confidence: float
    solution_reasoning: str

    # ─── RAG 检索结果 ───
    rag_query: str
    rag_retrieved_policies: list[PolicyChunk]

    # ─── 合规 Agent 输出 ───
    compliance_result: str          # APPROVED / REJECTED / ESCALATE
    compliance_reason: str
    compliance_confidence: float

    # ─── HITL 人工审批 ───
    human_review_required: bool
    human_review_notes: str
    human_decision: str             # APPROVED / REJECTED / ""

    # ─── 执行 Agent 输出 ───
    execution_status: str           # PENDING / COMPLETED / FAILED / SUSPENDED / CANCELLED
    execution_result: dict
    notification_sent: bool

    # ─── 流程控制 ───
    current_node: str
    reflection_count: int
    max_reflections: int
    error_log: Annotated[list[str], operator.add]   # 追加语义：各节点的错误自动合并
```

**关键设计说明：**

| 设计点 | 说明 |
|---|---|
| `Annotated[list[str], operator.add]` | `error_log` 使用追加语义，每个节点返回的错误条目自动合并到列表中，不会互相覆盖 |
| 基础信息只读 | `order_id`、`review_text` 等字段在初始化后不再被任何 Agent 修改 |
| 每个 Agent 只写自己的字段 | 客服 Agent 只写 `proposed_solution` 系列字段，合规 Agent 只写 `compliance_*` 字段，避免跨 Agent 状态污染 |
| `current_node` | 由路由函数自动更新，用于可观测性追踪 |

---

## 5. Agent 节点详细搭建

### 5.1 PII 脱敏预处理节点

#### 5.1.1 技术框架

- **核心引擎：** Microsoft Presidio (Analyzer + Anonymizer)
- **NER 后端：** spaCy `zh_core_web_trf` (中文) + `en_core_web_trf` (英文)
- **加密存储：** Redis + AES-256-GCM 对称加密
- **接入位置：** Celery Worker 内部，在 `graph.invoke()` 之前执行

#### 5.1.2 PII Interceptor 实现

```python
# app/pii/interceptor.py
from presidio_analyzer import AnalyzerEngine, RecognizerRegistry
from presidio_analyzer.nlp_engine import NlpEngineProvider
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig

from app.pii.vault import PIIVault


class PIIInterceptor:
    """
    在数据进入 LangGraph 之前，识别并替换所有 PII 字段。
    """

    SUPPORTED_ENTITIES = [
        "PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER",
        "LOCATION", "CREDIT_CARD", "IBAN_CODE",
        "US_SSN", "IP_ADDRESS",
    ]

    ENTITY_PREFIX_MAP = {
        "PERSON": "PERSON",
        "EMAIL_ADDRESS": "EMAIL",
        "PHONE_NUMBER": "PHONE",
        "LOCATION": "LOCATION",
        "CREDIT_CARD": "CARD",
        "US_SSN": "SSN",
        "IP_ADDRESS": "IP",
        "IBAN_CODE": "IBAN",
    }

    def __init__(self, vault: PIIVault):
        self.vault = vault
        nlp_config = {
            "nlp_engine_name": "spacy",
            "models": [
                {"lang_code": "en", "model_name": "en_core_web_trf"},
                {"lang_code": "zh", "model_name": "zh_core_web_trf"},
            ],
        }
        provider = NlpEngineProvider(nlp_configuration=nlp_config)
        nlp_engine = provider.create_engine()
        registry = RecognizerRegistry()
        registry.load_predefined_recognizers(nlp_engine=nlp_engine)
        self.analyzer = AnalyzerEngine(
            nlp_engine=nlp_engine,
            registry=registry,
        )
        self.anonymizer = AnonymizerEngine()

    def anonymize_payload(
        self,
        payload: dict,
        order_id: str,
        fields_to_scan: list[str] | None = None,
    ) -> tuple[dict, dict]:
        """
        对 payload 中的指定字段执行 PII 脱敏。

        Returns:
            (anonymized_payload, pii_mapping)
        """
        if fields_to_scan is None:
            fields_to_scan = [
                "customer_name", "customer_email", "customer_phone",
                "shipping_address", "review_text",
            ]

        pii_mapping: dict[str, str] = {}
        entity_counters: dict[str, int] = {}
        anonymized = dict(payload)

        for field in fields_to_scan:
            if field not in payload or not payload[field]:
                continue

            text = str(payload[field])
            results = self.analyzer.analyze(
                text=text,
                entities=self.SUPPORTED_ENTITIES,
                language="en",
            )
            results = sorted(results, key=lambda r: r.start)

            offset = 0
            anonymized_text = text
            for result in results:
                entity_type = result.entity_type
                prefix = self.ENTITY_PREFIX_MAP.get(entity_type, entity_type)
                entity_counters.setdefault(prefix, 0)
                entity_counters[prefix] += 1
                placeholder = f"[{prefix}_{entity_counters[prefix]}]"
                original_value = text[result.start:result.end]

                if original_value not in pii_mapping.values():
                    pii_mapping[placeholder] = original_value

                start = result.start + offset
                end = result.end + offset
                anonymized_text = (
                    anonymized_text[:start] + placeholder + anonymized_text[end:]
                )
                offset += len(placeholder) - (result.end - result.start)

            anonymized[field] = anonymized_text

        self.vault.store(order_id, pii_mapping)
        return anonymized, pii_mapping
```

#### 5.1.3 PII Vault (加密映射表)

```python
# app/pii/vault.py
import json

from cryptography.fernet import Fernet
from redis import Redis

from app.config import settings


class PIIVault:
    """
    将 PII 映射表加密存储到 Redis，仅限 Execution Agent 解密。
    """

    def __init__(self, redis_client: Redis | None = None):
        self.redis = redis_client or Redis.from_url(settings.redis_url)
        self.fernet = Fernet(settings.pii_vault_encryption_key.encode())

    def _key(self, order_id: str) -> str:
        return f"vault:{order_id}"

    def store(self, order_id: str, mapping: dict[str, str]) -> None:
        encrypted = self.fernet.encrypt(json.dumps(mapping).encode())
        self.redis.setex(
            self._key(order_id),
            settings.pii_vault_ttl_seconds,
            encrypted,
        )

    def retrieve(self, order_id: str) -> dict[str, str]:
        raw = self.redis.get(self._key(order_id))
        if raw is None:
            raise KeyError(f"PII vault expired or not found: {order_id}")
        return json.loads(self.fernet.decrypt(raw).decode())

    def restore_text(self, order_id: str, text: str) -> str:
        mapping = self.retrieve(order_id)
        for placeholder, real_value in mapping.items():
            text = text.replace(placeholder, real_value)
        return text

    def delete(self, order_id: str) -> None:
        self.redis.delete(self._key(order_id))
```

---

### 5.2 客服 Agent (CustomerService Agent)

#### 5.2.1 职责定义

| 项目 | 说明 |
|---|---|
| **角色** | 电商客服专家，负责分析工单并生成初步解决方案 |
| **输入** | 从 `WorkflowState` 读取：`review_text`、`order_total`、`line_items`、`customer_tier`、`event_type` |
| **输出** | 写入 `WorkflowState`：`proposed_solution`、`claim_amount`、`solution_confidence`、`solution_reasoning` |
| **LLM** | `gpt-4o-mini` / `claude-sonnet-4-6` (中等模型) |
| **温度** | `0.2` (需要一定创造性来撰写安抚话术，但不能太发散) |

#### 5.2.2 结构化输出 Schema

```python
# app/agents/customer_service.py
from pydantic import BaseModel, Field


class CustomerServiceOutput(BaseModel):
    proposed_solution: str = Field(
        description="为客户提出的完整解决方案描述，包括退款/换货/补偿等具体操作"
    )
    claim_amount: float = Field(
        description="建议的赔偿或退款金额 (单位与原始订单货币一致)"
    )
    confidence_score: float = Field(
        ge=0.0, le=1.0,
        description="对该方案的置信度评分"
    )
    reasoning: str = Field(
        description="决策推理过程"
    )
    needs_human_review: bool = Field(
        description="是否建议由人工复核此方案"
    )
```

#### 5.2.3 Agent 节点完整实现

```python
# app/agents/customer_service.py (续)
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.runnables import RunnableConfig

from app.config import settings
from app.graph.state import WorkflowState


CUSTOMER_SERVICE_SYSTEM_PROMPT = """\
你是一位经验丰富的电商客服专家。你的职责是分析客户的差评或投诉，并提出合理的解决方案。

## 你的行为准则：
1. 始终站在客户角度考虑问题，态度诚恳
2. 方案必须具体可执行：明确退款金额、补偿方式、折扣码面额等
3. 根据客户等级 (VIP/Regular/New) 适当调整补偿力度
4. VIP 客户：可适当上浮补偿 10-20%
5. 如果订单金额超过 {auto_approve_threshold} {currency}，建议标记为需要人工复核
6. 你的方案将提交给合规 Agent 审查，请确保方案合理且可追溯

## 你必须以结构化 JSON 格式输出。
"""

CUSTOMER_SERVICE_HUMAN_TEMPLATE = """\
请分析以下工单并提出解决方案：

- 事件类型: {event_type}
- 订单号: {order_id}
- 订单金额: {order_total} {currency}
- 客户等级: {customer_tier}
- 差评/投诉内容: {review_text}
- 评分: {review_rating}/5
- 商品明细: {line_items}
{reflection_context}
"""


def build_customer_service_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.2,
        max_tokens=2048,
        timeout=60,
        max_retries=3,
        api_key=settings.openai_api_key,
    ).with_structured_output(CustomerServiceOutput)


def customer_service_node(
    state: WorkflowState,
    config: RunnableConfig,
) -> dict:
    """
    客服 Agent 节点函数。
    读取工单信息，调用 LLM 生成解决方案，写回 State。
    """
    llm = build_customer_service_llm()

    reflection_context = ""
    if state.get("reflection_count", 0) > 0:
        reflection_context = f"""

【重要】合规 Agent 已驳回你上一次的方案，驳回理由如下：
"{state.get('compliance_reason', '')}"
当前是第 {state['reflection_count']} 次重写。请根据驳回理由修改方案。
"""

    messages = [
        SystemMessage(content=CUSTOMER_SERVICE_SYSTEM_PROMPT.format(
            auto_approve_threshold=settings.auto_approve_threshold,
            currency=state["currency"],
        )),
        HumanMessage(content=CUSTOMER_SERVICE_HUMAN_TEMPLATE.format(
            event_type=state["event_type"],
            order_id=state["order_id"],
            order_total=state["order_total"],
            currency=state["currency"],
            customer_tier=state.get("customer_tier", "Regular"),
            review_text=state["review_text"],
            review_rating=state.get("review_rating", "N/A"),
            line_items=state["line_items"],
            reflection_context=reflection_context,
        )),
    ]

    try:
        result: CustomerServiceOutput = llm.invoke(messages, config=config)
        return {
            "proposed_solution": result.proposed_solution,
            "claim_amount": result.claim_amount,
            "solution_confidence": result.confidence_score,
            "solution_reasoning": result.reasoning,
            "human_review_required": result.needs_human_review,
            "current_node": "customer_service_agent",
        }
    except Exception as e:
        return {
            "proposed_solution": "",
            "claim_amount": 0.0,
            "current_node": "customer_service_agent",
            "error_log": [f"CustomerServiceAgent error: {str(e)}"],
        }
```

**Agent-Agent 衔接点：** 客服 Agent 写入 `proposed_solution` 和 `claim_amount` 后，LangGraph 的边 (Edge) 自动将控制权传递给 **Policy RAG Tool 节点**，由其检索与该方案相关的合规政策。

---

### 5.3 Policy RAG 检索工具节点

#### 5.3.1 职责定义

| 项目 | 说明 |
|---|---|
| **角色** | 政策知识库检索引擎，为合规 Agent 提供相关政策条款 |
| **输入** | 从 `WorkflowState` 读取：`proposed_solution`、`region`、`line_items[].product_category`、`customer_tier` |
| **输出** | 写入 `WorkflowState`：`rag_query`、`rag_retrieved_policies` |
| **核心技术** | Milvus 混合检索 (Dense + Sparse) → Cohere Reranker → Self-RAG 文档评分 |
| **LLM (查询重写)** | `gpt-4o-mini` (轻量模型) |

#### 5.3.2 混合检索器

```python
# app/rag/retriever.py
from pymilvus import Collection, connections, AnnSearchRequest, WeightedRanker
from langchain_openai import OpenAIEmbeddings

from app.config import settings


class HybridPolicyRetriever:
    """
    混合检索器：Dense (语义向量) + Sparse (BM25 关键字) + Metadata 前置过滤。
    """

    def __init__(self):
        connections.connect(
            alias="default",
            host=settings.milvus_host,
            port=settings.milvus_port,
        )
        self.collection = Collection(settings.milvus_collection)
        self.collection.load()
        self.embedder = OpenAIEmbeddings(
            model="text-embedding-3-large",
            api_key=settings.openai_api_key,
        )

    def retrieve(
        self,
        query: str,
        region: str,
        product_category: str,
        customer_tier: str = "ALL",
        top_k: int = 20,
    ) -> list[dict]:
        """
        执行混合检索，返回粗排结果。

        1. 将 query 向量化 (Dense)
        2. 构建 BM25 稀疏检索请求 (Sparse)
        3. 应用 Metadata 前置过滤
        4. 两路检索结果通过 WeightedRanker 融合
        """
        query_vector = self.embedder.embed_query(query)

        # Metadata 前置过滤表达式
        filter_expr = (
            f'region in ["{ region}", "GLOBAL"] '
            f'and product_category in ["{product_category}", "ALL"] '
            f'and customer_tier in ["{customer_tier}", "ALL"]'
        )

        # Dense 向量检索请求
        dense_req = AnnSearchRequest(
            data=[query_vector],
            anns_field="dense_vector",
            param={"metric_type": "COSINE", "params": {"nprobe": 16}},
            limit=top_k,
            expr=filter_expr,
        )

        # Sparse BM25 检索请求
        sparse_req = AnnSearchRequest(
            data=[self._text_to_sparse(query)],
            anns_field="sparse_vector",
            param={"metric_type": "IP"},
            limit=top_k,
            expr=filter_expr,
        )

        # 混合检索 + 加权融合 (Dense 权重 0.7，Sparse 权重 0.3)
        ranker = WeightedRanker(0.7, 0.3)
        results = self.collection.hybrid_search(
            reqs=[dense_req, sparse_req],
            ranker=ranker,
            limit=top_k,
            output_fields=[
                "doc_id", "section_title", "content",
                "parent_chunk_id", "region", "product_category",
            ],
        )

        return [
            {
                "doc_id": hit.entity.get("doc_id"),
                "section_title": hit.entity.get("section_title"),
                "content": hit.entity.get("content"),
                "parent_chunk_id": hit.entity.get("parent_chunk_id"),
                "score": hit.distance,
            }
            for hit in results[0]
        ]

    def _text_to_sparse(self, text: str) -> dict:
        """将文本转为稀疏向量 (BM25)。"""
        # 实际生产中使用 Milvus 内置的 BM25 Function
        # 或预训练的稀疏编码器 (如 SPLADE / BGE-M3 Sparse)
        from pymilvus.model.sparse import BM25EmbeddingFunction

        bm25 = BM25EmbeddingFunction()
        return bm25.encode_queries([text])[0]
```

#### 5.3.3 重排序器

```python
# app/rag/reranker.py
import cohere

from app.config import settings


class PolicyReranker:
    """
    使用 Cohere Rerank 对粗排结果进行精排。
    """

    def __init__(self):
        self.client = cohere.Client(api_key=settings.cohere_api_key)

    def rerank(
        self,
        query: str,
        documents: list[dict],
        top_n: int = 3,
        relevance_threshold: float = 0.5,
    ) -> list[dict]:
        doc_texts = [doc["content"] for doc in documents]

        response = self.client.rerank(
            model="rerank-v3.5",
            query=query,
            documents=doc_texts,
            top_n=top_n,
        )

        reranked = []
        for result in response.results:
            if result.relevance_score >= relevance_threshold:
                doc = documents[result.index]
                doc["relevance_score"] = result.relevance_score
                reranked.append(doc)

        return reranked
```

#### 5.3.4 Self-RAG (查询重写 + 文档评分)

```python
# app/rag/self_rag.py
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel, Field

from app.config import settings


class RewrittenQuery(BaseModel):
    rewritten_query: str = Field(description="精炼后的检索查询")
    search_intent: str = Field(description="检索意图说明")


class DocumentGradeResult(BaseModel):
    is_relevant: bool = Field(description="该文档是否能回答当前工单的问题")
    reason: str = Field(description="判断理由")


class SelfRAGEngine:
    """
    Self-RAG 引擎：
    1. 查询重写 (Query Rewrite) - 将冗长工单精炼为检索词
    2. 文档评分 (Document Grading) - 判断检索结果是否真正相关
    """

    def __init__(self):
        self.rewrite_llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.0,
            api_key=settings.openai_api_key,
        ).with_structured_output(RewrittenQuery)

        self.grading_llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.0,
            api_key=settings.openai_api_key,
        ).with_structured_output(DocumentGradeResult)

    def rewrite_query(
        self,
        review_text: str,
        proposed_solution: str,
        region: str,
        product_category: str,
    ) -> str:
        messages = [
            SystemMessage(content=(
                "你是一个检索查询优化专家。将客户工单和 AI 方案提炼为"
                "一句精准的政策检索查询。查询应包含：地区、商品类别、"
                "具体需求（退款/换货/保修等）。"
            )),
            HumanMessage(content=(
                f"客户投诉: {review_text}\n"
                f"AI 建议方案: {proposed_solution}\n"
                f"地区: {region}\n"
                f"商品类别: {product_category}\n\n"
                f"请生成精准的政策检索查询。"
            )),
        ]
        result = self.rewrite_llm.invoke(messages)
        return result.rewritten_query

    def grade_documents(
        self,
        query: str,
        documents: list[dict],
    ) -> list[dict]:
        graded = []
        for doc in documents:
            messages = [
                SystemMessage(content=(
                    "你是文档相关性评审员。判断给定的政策文档"
                    "是否能直接回答检索查询的问题。"
                )),
                HumanMessage(content=(
                    f"检索查询: {query}\n\n"
                    f"政策文档:\n标题: {doc['section_title']}\n"
                    f"内容: {doc['content']}\n\n"
                    f"该文档是否与查询直接相关？"
                )),
            ]
            grade = self.grading_llm.invoke(messages)
            if grade.is_relevant:
                graded.append(doc)
        return graded
```

#### 5.3.5 RAG 节点组装

```python
# app/tools/policy_rag.py
from langchain_core.runnables import RunnableConfig

from app.graph.state import WorkflowState
from app.rag.retriever import HybridPolicyRetriever
from app.rag.reranker import PolicyReranker
from app.rag.self_rag import SelfRAGEngine


retriever = HybridPolicyRetriever()
reranker = PolicyReranker()
self_rag = SelfRAGEngine()

MAX_RAG_RETRIES = 2


def policy_rag_node(state: WorkflowState, config: RunnableConfig) -> dict:
    """
    Policy RAG 检索节点。

    流程: 查询重写 → 混合检索 → 重排序 → 文档评分 → (不合格则重写重试)
    """
    product_category = "ALL"
    if state.get("line_items"):
        product_category = state["line_items"][0].get("product_category", "ALL")

    query = self_rag.rewrite_query(
        review_text=state["review_text"],
        proposed_solution=state["proposed_solution"],
        region=state["region"],
        product_category=product_category,
    )

    for attempt in range(MAX_RAG_RETRIES + 1):
        raw_results = retriever.retrieve(
            query=query,
            region=state["region"],
            product_category=product_category,
            customer_tier=state.get("customer_tier", "ALL"),
            top_k=20,
        )

        reranked = reranker.rerank(query=query, documents=raw_results, top_n=5)
        graded = self_rag.grade_documents(query=query, documents=reranked)

        if graded:
            break

        query = self_rag.rewrite_query(
            review_text=state["review_text"],
            proposed_solution=f"{state['proposed_solution']} (第 {attempt + 2} 次检索尝试)",
            region=state["region"],
            product_category=product_category,
        )

    policies = [
        {
            "doc_id": doc["doc_id"],
            "section_title": doc["section_title"],
            "relevance_score": doc.get("relevance_score", 0.0),
            "content_snippet": doc["content"][:500],
        }
        for doc in graded
    ] if graded else []

    return {
        "rag_query": query,
        "rag_retrieved_policies": policies,
        "current_node": "policy_rag_tool",
    }
```

**Agent-Agent 衔接点：** RAG 节点将检索到的 `rag_retrieved_policies` 写入 State 后，控制权传递给 **合规 Agent**，合规 Agent 将同时读取客服 Agent 的方案和 RAG 返回的政策条款进行比对审查。

---

### 5.4 合规 Agent (Compliance Agent)

#### 5.4.1 职责定义

| 项目 | 说明 |
|---|---|
| **角色** | 合规审查官，对客服 Agent 的方案进行政策合规性审查 |
| **输入** | 从 `WorkflowState` 读取：`proposed_solution`、`claim_amount`、`rag_retrieved_policies`、`order_total`、`region` |
| **输出** | 写入 `WorkflowState`：`compliance_result` (APPROVED/REJECTED/ESCALATE)、`compliance_reason`、`compliance_confidence` |
| **LLM** | `gpt-4o` / `claude-opus-4-7` (高等模型，核心决策节点) |
| **温度** | `0.0` (严格推理，不允许任何创造性偏差) |

#### 5.4.2 结构化输出 Schema

```python
# app/agents/compliance.py
from enum import Enum
from pydantic import BaseModel, Field


class ComplianceDecision(str, Enum):
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    ESCALATE = "ESCALATE"


class ComplianceOutput(BaseModel):
    decision: ComplianceDecision = Field(
        description=(
            "APPROVED=方案合规通过; "
            "REJECTED=方案不合规需重写; "
            "ESCALATE=无法判定需人工介入"
        )
    )
    reason: str = Field(
        description="审查理由，必须引用具体的政策条款编号"
    )
    confidence: float = Field(
        ge=0.0, le=1.0,
        description="审查置信度"
    )
    policy_references: list[str] = Field(
        description="引用的政策条款 doc_id 列表"
    )
    risk_flags: list[str] = Field(
        default_factory=list,
        description="风险标记 (如: 超额赔偿、疑似欺诈等)"
    )
```

#### 5.4.3 Agent 节点完整实现

```python
# app/agents/compliance.py (续)
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.runnables import RunnableConfig

from app.config import settings
from app.graph.state import WorkflowState


COMPLIANCE_SYSTEM_PROMPT = """\
你是一位严谨的电商合规审查官。你的职责是审查客服 Agent 提出的解决方案是否符合公司政策。

## 审查规则：
1. 方案中的退款金额不得超过订单原始金额的 120%（VIP 客户放宽至 150%）
2. 必须有明确的政策条款支撑方案中的每一项操作
3. 如果检索到的政策条款无法完全覆盖方案内容，判定为 ESCALATE
4. 如果方案明显违反政策（如对不符条件的订单退款），判定为 REJECTED，并写明原因
5. 金额超过 {auto_approve_threshold} {currency} 的方案自动 ESCALATE
6. 在 REJECTED 时，你的理由必须足够具体，让客服 Agent 能据此修改

## 你必须引用具体的政策条款编号 (doc_id) 作为决策依据。
"""

COMPLIANCE_HUMAN_TEMPLATE = """\
请审查以下解决方案：

## 客服 Agent 方案
- 方案描述: {proposed_solution}
- 索赔金额: {claim_amount} {currency}
- 客服置信度: {solution_confidence}
- 推理过程: {solution_reasoning}

## 订单信息
- 订单金额: {order_total} {currency}
- 地区: {region}
- 客户等级: {customer_tier}

## 检索到的政策条款
{policy_text}

请基于以上政策条款，审查方案的合规性。
"""


def build_compliance_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model="gpt-4o",
        temperature=0.0,
        max_tokens=2048,
        timeout=60,
        max_retries=3,
        api_key=settings.openai_api_key,
    ).with_structured_output(ComplianceOutput)


def compliance_node(state: WorkflowState, config: RunnableConfig) -> dict:
    """
    合规 Agent 节点函数。
    对客服 Agent 的方案进行政策合规性审查。
    """
    llm = build_compliance_llm()

    policies = state.get("rag_retrieved_policies", [])
    policy_text = "\n".join(
        f"- [{p['doc_id']}] {p['section_title']}: {p['content_snippet']}"
        for p in policies
    ) if policies else "（未检索到相关政策条款）"

    messages = [
        SystemMessage(content=COMPLIANCE_SYSTEM_PROMPT.format(
            auto_approve_threshold=settings.auto_approve_threshold,
            currency=state["currency"],
        )),
        HumanMessage(content=COMPLIANCE_HUMAN_TEMPLATE.format(
            proposed_solution=state["proposed_solution"],
            claim_amount=state["claim_amount"],
            currency=state["currency"],
            solution_confidence=state.get("solution_confidence", "N/A"),
            solution_reasoning=state.get("solution_reasoning", ""),
            order_total=state["order_total"],
            region=state["region"],
            customer_tier=state.get("customer_tier", "Regular"),
            policy_text=policy_text,
        )),
    ]

    try:
        result: ComplianceOutput = llm.invoke(messages, config=config)
        return {
            "compliance_result": result.decision.value,
            "compliance_reason": result.reason,
            "compliance_confidence": result.confidence,
            "current_node": "compliance_agent",
        }
    except Exception as e:
        return {
            "compliance_result": "ESCALATE",
            "compliance_reason": f"合规 Agent 执行异常，自动升级人工: {str(e)}",
            "current_node": "compliance_agent",
            "error_log": [f"ComplianceAgent error: {str(e)}"],
        }
```

**Agent-Agent 衔接点（核心路由分支）：**

合规 Agent 写入 `compliance_result` 后，LangGraph 的条件路由函数读取该字段，实现三路分叉：

| compliance_result | 下一个节点 | 说明 |
|---|---|---|
| `APPROVED` | → Execution Agent | 直接自动执行 |
| `REJECTED` | → CustomerService Agent (反思重写) | `reflection_count += 1`，重新生成方案 |
| `ESCALATE` | → HITL 人工审批节点 | 挂起等待人工介入 |

---

### 5.5 HITL 人工审批节点

#### 5.5.1 职责定义

| 项目 | 说明 |
|---|---|
| **角色** | 人在回路 (Human-in-the-Loop) 断点，暂停工作流等待人工决策 |
| **触发条件** | 合规 Agent 判定 `ESCALATE`，或客服 Agent 标记 `needs_human_review=True` |
| **技术实现** | LangGraph `interrupt()` 内建断点 + PostgreSQL Checkpointer 持久化状态 |
| **恢复方式** | 人工通过 REST API 或 Web UI 提交审批结果，调用 `graph.update_state()` + 续跑 |

#### 5.5.2 节点实现

```python
# app/agents/hitl_node.py
from langgraph.types import interrupt
from langchain_core.runnables import RunnableConfig

from app.graph.state import WorkflowState
from app.tools.slack_notify import send_slack_notification


class HITLApproval:
    """HITL 中断时传递给人工审批的数据包。"""

    def __init__(self, state: WorkflowState):
        self.order_id = state["order_id"]
        self.proposed_solution = state["proposed_solution"]
        self.claim_amount = state["claim_amount"]
        self.compliance_reason = state["compliance_reason"]
        self.policies = state.get("rag_retrieved_policies", [])


def hitl_node(state: WorkflowState, config: RunnableConfig) -> dict:
    """
    HITL 人工审批节点。

    执行流程:
    1. 向 Slack 发送审批通知
    2. 调用 interrupt() 挂起工作流
    3. 人工通过 API 恢复后，读取审批结果
    """
    send_slack_notification(
        order_id=state["order_id"],
        claim_amount=state["claim_amount"],
        currency=state["currency"],
        proposed_solution=state["proposed_solution"],
        compliance_reason=state["compliance_reason"],
    )

    # 调用 LangGraph 内建中断 —— 工作流在此暂停
    # 状态自动持久化到 PostgreSQL Checkpointer
    # 当人工调用 graph.update_state() 恢复时，interrupt() 返回人工输入的数据
    human_input = interrupt({
        "message": "等待人工审批",
        "order_id": state["order_id"],
        "proposed_solution": state["proposed_solution"],
        "claim_amount": state["claim_amount"],
        "compliance_reason": state["compliance_reason"],
    })

    human_decision = human_input.get("decision", "REJECTED")
    human_notes = human_input.get("notes", "")

    return {
        "human_review_required": True,
        "human_decision": human_decision,
        "human_review_notes": human_notes,
        "current_node": "hitl_review",
        "execution_status": "SUSPENDED" if human_decision == "REJECTED" else "PENDING",
    }
```

#### 5.5.3 人工恢复 API

```python
# app/api/hitl.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from langgraph.checkpoint.postgres import PostgresSaver

from app.config import settings
from app.graph.builder import build_graph

router = APIRouter(prefix="/api/hitl", tags=["HITL"])


class HITLResumeRequest(BaseModel):
    thread_id: str
    decision: str       # APPROVED / REJECTED
    notes: str = ""


@router.post("/resume")
async def resume_workflow(req: HITLResumeRequest):
    """
    人工审批结果提交端点。
    恢复被 interrupt() 挂起的工作流。
    """
    if req.decision not in ("APPROVED", "REJECTED"):
        raise HTTPException(400, "decision must be APPROVED or REJECTED")

    checkpointer = PostgresSaver.from_conn_string(settings.langgraph_checkpoint_db)
    graph = build_graph(checkpointer=checkpointer)

    config = {"configurable": {"thread_id": req.thread_id}}

    # 使用 Command 恢复中断的节点，传入人工审批数据
    from langgraph.types import Command
    graph.invoke(
        Command(resume={"decision": req.decision, "notes": req.notes}),
        config=config,
    )

    return {"status": "resumed", "thread_id": req.thread_id}
```

**Agent-Agent 衔接点：** HITL 节点恢复后，`human_decision` 字段进入条件路由：
- `APPROVED` → 流转至 Execution Agent
- `REJECTED` → 流程标记为 `CANCELLED`，终止

---

### 5.6 执行 Agent (Execution Agent)

#### 5.6.1 职责定义

| 项目 | 说明 |
|---|---|
| **角色** | 最终执行者，调用外部 API 落地合规通过的解决方案 |
| **输入** | 从 `WorkflowState` 读取：`proposed_solution`、`claim_amount`、`order_id`、全部审查结果 |
| **输出** | 写入 `WorkflowState`：`execution_status`、`execution_result`、`notification_sent` |
| **外部调用** | Shopify Admin API (退款)、Klaviyo API (邮件)、Slack API (通知) |
| **特殊职责** | **PII 还原** — 从 Redis Vault 解密真实客户信息，用于 API 调用 |
| **LLM** | `gpt-4o-mini` (轻量模型，仅用于解析方案为 API 参数) |

#### 5.6.2 结构化输出 Schema

```python
# app/agents/execution.py
from pydantic import BaseModel, Field


class ExecutionPlan(BaseModel):
    actions: list[str] = Field(
        description="需要执行的动作列表，如 ['refund', 'send_email', 'notify_slack']"
    )
    refund_amount: float = Field(description="实际退款金额")
    refund_type: str = Field(description="退款类型: full / partial / none")
    email_template: str = Field(description="安抚邮件正文内容")
    discount_code: str = Field(default="", description="赠送的折扣码 (如有)")
    discount_percentage: int = Field(default=0, description="折扣百分比")
```

#### 5.6.3 Agent 节点完整实现

```python
# app/agents/execution.py (续)
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.runnables import RunnableConfig

from app.config import settings
from app.graph.state import WorkflowState
from app.pii.vault import PIIVault
from app.tools.shopify_api import ShopifyRefundTool
from app.tools.klaviyo_api import KlaviyoEmailTool
from app.tools.slack_notify import send_slack_notification


EXECUTION_SYSTEM_PROMPT = """\
你是一个执行计划解析器。将客服方案解析为可执行的 API 调用参数。
只输出结构化 JSON，不要添加额外文字。
"""

EXECUTION_HUMAN_TEMPLATE = """\
请将以下方案解析为执行计划：
- 方案: {proposed_solution}
- 索赔金额: {claim_amount} {currency}
- 订单金额: {order_total} {currency}
"""


def build_execution_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.0,
        max_tokens=1024,
        api_key=settings.openai_api_key,
    ).with_structured_output(ExecutionPlan)


def execution_node(state: WorkflowState, config: RunnableConfig) -> dict:
    """
    执行 Agent 节点函数。

    流程:
    1. LLM 解析方案为执行计划
    2. PII Vault 还原真实客户信息
    3. 调用 Shopify API 执行退款
    4. 调用 Klaviyo API 发送安抚邮件
    5. 发送 Slack 通知
    """
    llm = build_execution_llm()
    vault = PIIVault()
    shopify = ShopifyRefundTool()
    klaviyo = KlaviyoEmailTool()

    # Step 1: LLM 解析执行计划
    messages = [
        SystemMessage(content=EXECUTION_SYSTEM_PROMPT),
        HumanMessage(content=EXECUTION_HUMAN_TEMPLATE.format(
            proposed_solution=state["proposed_solution"],
            claim_amount=state["claim_amount"],
            currency=state["currency"],
            order_total=state["order_total"],
        )),
    ]

    try:
        plan: ExecutionPlan = llm.invoke(messages, config=config)
    except Exception as e:
        return {
            "execution_status": "FAILED",
            "execution_result": {"error": f"Plan parsing failed: {str(e)}"},
            "current_node": "execution_agent",
            "error_log": [f"ExecutionAgent plan parse error: {str(e)}"],
        }

    results = {}

    # Step 2: PII 还原
    try:
        pii_mapping = vault.retrieve(state["order_id"])
    except KeyError:
        return {
            "execution_status": "FAILED",
            "execution_result": {"error": "PII vault expired"},
            "current_node": "execution_agent",
            "error_log": ["PII vault expired, cannot restore customer data"],
        }

    # Step 3: Shopify 退款 (使用还原后的真实数据)
    if "refund" in plan.actions:
        try:
            refund_result = shopify.create_refund(
                order_id=state["order_id"],
                amount=plan.refund_amount,
                currency=state["currency"],
                note=f"AI Auto-Refund ({state['order_id']})",
            )
            results["refund"] = refund_result
        except Exception as e:
            return {
                "execution_status": "FAILED",
                "execution_result": {"error": f"Shopify refund failed: {str(e)}"},
                "current_node": "execution_agent",
                "error_log": [f"Shopify API error: {str(e)}"],
            }

    # Step 4: Klaviyo 邮件 (使用还原后的真实邮箱和姓名)
    notification_sent = False
    if "send_email" in plan.actions:
        try:
            real_email = pii_mapping.get("[EMAIL_1]", "")
            real_name = pii_mapping.get("[PERSON_1]", "Customer")
            email_body = vault.restore_text(state["order_id"], plan.email_template)

            klaviyo.send_resolution_email(
                email=real_email,
                first_name=real_name,
                order_id=state["order_id"],
                resolution_summary=email_body,
                discount_code=plan.discount_code,
                discount_percentage=plan.discount_percentage,
            )
            notification_sent = True
            results["email"] = "sent"
        except Exception as e:
            results["email_error"] = str(e)

    # Step 5: Slack 通知
    if "notify_slack" in plan.actions:
        send_slack_notification(
            order_id=state["order_id"],
            claim_amount=state["claim_amount"],
            currency=state["currency"],
            proposed_solution=state["proposed_solution"],
            compliance_reason=state.get("compliance_reason", ""),
            status="COMPLETED",
        )

    # 清理 PII Vault
    vault.delete(state["order_id"])

    return {
        "execution_status": "COMPLETED",
        "execution_result": results,
        "notification_sent": notification_sent,
        "current_node": "execution_agent",
    }
```

#### 5.6.4 Shopify API 工具

```python
# app/tools/shopify_api.py
import httpx

from app.config import settings


class ShopifyRefundTool:
    """Shopify Admin API 退款工具。"""

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
```

#### 5.6.5 Klaviyo 邮件工具

```python
# app/tools/klaviyo_api.py
import httpx

from app.config import settings


class KlaviyoEmailTool:
    """Klaviyo 客户安抚邮件工具。"""

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
                    "metric": {"data": {"type": "metric", "attributes": {"name": "AI_Resolution_Email"}}},
                    "profile": {"data": {"type": "profile", "attributes": {"email": email, "first_name": first_name}}},
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
```

#### 5.6.6 Slack 通知工具

```python
# app/tools/slack_notify.py
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
```

---

## 6. Agent 间连接与路由设计

### 6.1 连接拓扑总览

```
                          ┌──────────────────────────────────────────────────┐
                          │              LangGraph StateGraph                │
                          │                                                  │
    ┌─────────┐  直连边   │  ┌──────────────┐   直连边   ┌──────────────┐   │
    │  START   │─────────▶│  │  客服 Agent   │──────────▶│ Policy RAG   │   │
    └─────────┘           │  └──────────────┘            └──────┬───────┘   │
                          │        ▲                             │           │
                          │        │ 反思重写                直连边│           │
                          │        │ (reflection_count += 1)     ▼           │
                          │        │                     ┌──────────────┐   │
                          │        │                     │  合规 Agent   │   │
                          │        │                     └──────┬───────┘   │
                          │        │                             │           │
                          │        │               ┌─────────── 条件路由 ──────────┐
                          │        │               │             │            │     │
                          │        │          APPROVED      REJECTED     ESCALATE  │
                          │        │               │             │            │     │
                          │        │               ▼             │            ▼     │
                          │        │       ┌────────────┐        │    ┌────────┐   │
                          │        │       │ 执行 Agent  │        │    │ HITL   │   │
                          │        │       └─────┬──────┘        │    │ 人工审批│   │
                          │        │             │               │    └───┬────┘   │
                          │        │             │               │        │        │
                          │        │             │               │    条件路由      │
                          │        │             │               │    │       │    │
                          │        │             │            APPROVED  REJECTED   │
                          │        │             │               │       │         │
                          │        │             ▼               ▼       ▼         │
                          │        │         ┌──────┐     ┌──────────┐            │
                          │        └─────────│ 反思  │     │ 执行Agent │            │
                          │      (超限→END)  │ 路由  │     └────┬─────┘            │
                          │                  └──────┘          │                  │
                          │                                    ▼                  │
                          │                                ┌──────┐               │
                          │                                │  END  │               │
                          │                                └──────┘               │
                          └──────────────────────────────────────────────────────┘
```

### 6.2 边类型定义

本系统使用两种 LangGraph 边类型：

| 边类型 | 说明 | 使用场景 |
|---|---|---|
| **直连边 (Normal Edge)** | 无条件直接流转到下一个节点 | 客服 Agent → RAG、RAG → 合规 Agent |
| **条件边 (Conditional Edge)** | 根据 State 中的字段值动态选择下一个节点 | 合规 Agent → (三路分支)、HITL → (二路分支)、反思路由 |

### 6.3 路由函数实现

```python
# app/graph/router.py
from app.graph.state import WorkflowState
from app.config import settings


def compliance_router(state: WorkflowState) -> str:
    """
    合规 Agent 输出后的三路条件路由。

    读取 state["compliance_result"]，决定下一个节点：
      APPROVED  → execution_agent
      REJECTED  → reflection_router (判断是否超过最大反思次数)
      ESCALATE  → hitl_review
    """
    result = state.get("compliance_result", "ESCALATE")

    if result == "APPROVED":
        return "execution_agent"
    elif result == "REJECTED":
        return "reflection_router"
    else:
        return "hitl_review"


def reflection_router(state: WorkflowState) -> str:
    """
    反思次数控制路由。

    如果 reflection_count < max_reflections:
        回到客服 Agent 重写方案 (reflection_count += 1)
    否则:
        升级为人工审批 (HITL)
    """
    count = state.get("reflection_count", 0)
    max_ref = state.get("max_reflections", settings.max_reflections)

    if count < max_ref:
        return "customer_service_agent"
    else:
        return "hitl_review"


def hitl_router(state: WorkflowState) -> str:
    """
    HITL 人工审批后的二路条件路由。

    APPROVED → execution_agent
    REJECTED → end (流程终止，标记 CANCELLED)
    """
    decision = state.get("human_decision", "REJECTED")

    if decision == "APPROVED":
        return "execution_agent"
    else:
        return "end"
```

### 6.4 Agent 间数据传递契约

每个 Agent 通过 `WorkflowState` 实现隐式通信。下表明确了各个连接的数据契约：

| 连接 (From → To) | 传递的关键字段 | 写方 | 读方 |
|---|---|---|---|
| **START → 客服 Agent** | `order_id`, `review_text`, `order_total`, `customer_tier`, `event_type`, `line_items` | 初始化 | 客服 Agent |
| **客服 Agent → RAG** | `proposed_solution`, `claim_amount`, `region`, `line_items[].product_category` | 客服 Agent | RAG |
| **RAG → 合规 Agent** | `rag_retrieved_policies`, `rag_query` | RAG | 合规 Agent |
| **合规 Agent → 反思路由** | `compliance_result`, `compliance_reason` | 合规 Agent | 路由函数 |
| **反思路由 → 客服 Agent (重写)** | `compliance_reason`, `reflection_count` | 合规 Agent + 反思路由 | 客服 Agent |
| **合规 Agent → 执行 Agent** | `proposed_solution`, `claim_amount`, `order_id`, `compliance_result` | 前置节点 | 执行 Agent |
| **HITL → 执行 Agent** | `human_decision`, `human_review_notes` | HITL | 执行 Agent |

---

## 7. LangGraph 图构建完整实现

```python
# app/graph/builder.py
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.checkpoint.memory import MemorySaver

from app.graph.state import WorkflowState
from app.graph.router import compliance_router, reflection_router, hitl_router
from app.agents.customer_service import customer_service_node
from app.agents.compliance import compliance_node
from app.agents.execution import execution_node
from app.agents.hitl_node import hitl_node
from app.tools.policy_rag import policy_rag_node
from app.config import settings


def reflection_increment_node(state: WorkflowState) -> dict:
    """反思计数器递增节点。"""
    return {"reflection_count": state.get("reflection_count", 0) + 1}


def cancellation_node(state: WorkflowState) -> dict:
    """流程取消终结节点。"""
    return {
        "execution_status": "CANCELLED",
        "current_node": "cancelled",
    }


def build_graph(checkpointer=None) -> StateGraph:
    """
    构建并编译完整的 LangGraph 多智能体工作流。

    图结构:
        START
          │
          ▼
        customer_service_agent ──▶ policy_rag_tool ──▶ compliance_agent
          ▲                                                │
          │                                    ┌───────────┼───────────┐
          │                                 APPROVED    REJECTED    ESCALATE
          │                                    │           │           │
          │                                    ▼           ▼           ▼
          │                              execution    reflection    hitl_review
          │                              _agent       _router          │
          │                                 │           │    │    ┌────┴────┐
          │                                 │       ≤max │  >max APPROVED REJECTED
          │                                 │           │    │     │        │
          │                                 ▼           │    ▼     ▼        ▼
          │                                END          │  hitl  exec.   cancel
          │                                             │        agent    _node
          └─────────────────────────────────────────────┘          │       │
                                                                   ▼       ▼
                                                                  END     END
    """
    graph = StateGraph(WorkflowState)

    # ═══ 注册所有节点 ═══
    graph.add_node("customer_service_agent", customer_service_node)
    graph.add_node("policy_rag_tool", policy_rag_node)
    graph.add_node("compliance_agent", compliance_node)
    graph.add_node("hitl_review", hitl_node)
    graph.add_node("execution_agent", execution_node)
    graph.add_node("reflection_increment", reflection_increment_node)
    graph.add_node("cancellation", cancellation_node)

    # ═══ 直连边 (Normal Edges) ═══
    # START → 客服 Agent
    graph.add_edge(START, "customer_service_agent")

    # 客服 Agent → Policy RAG
    graph.add_edge("customer_service_agent", "policy_rag_tool")

    # Policy RAG → 合规 Agent
    graph.add_edge("policy_rag_tool", "compliance_agent")

    # 执行 Agent → END
    graph.add_edge("execution_agent", END)

    # 取消节点 → END
    graph.add_edge("cancellation", END)

    # ═══ 条件边 (Conditional Edges) ═══

    # 合规 Agent 输出后 → 三路分支
    graph.add_conditional_edges(
        source="compliance_agent",
        path=compliance_router,
        path_map={
            "execution_agent": "execution_agent",
            "reflection_router": "reflection_increment",
            "hitl_review": "hitl_review",
        },
    )

    # 反思计数器递增 → 反思路由判断
    graph.add_conditional_edges(
        source="reflection_increment",
        path=reflection_router,
        path_map={
            "customer_service_agent": "customer_service_agent",
            "hitl_review": "hitl_review",
        },
    )

    # HITL 审批结果 → 二路分支
    graph.add_conditional_edges(
        source="hitl_review",
        path=hitl_router,
        path_map={
            "execution_agent": "execution_agent",
            "end": "cancellation",
        },
    )

    # ═══ 编译 ═══
    if checkpointer is None:
        checkpointer = MemorySaver()

    compiled = graph.compile(checkpointer=checkpointer)
    return compiled
```

### 7.1 图的可视化验证

```python
# 开发阶段可使用以下方式输出图结构
if __name__ == "__main__":
    graph = build_graph()

    # 方式 1: 打印 ASCII 图
    graph.get_graph().print_ascii()

    # 方式 2: 生成 Mermaid 图表 (可粘贴到 Mermaid Live Editor 查看)
    print(graph.get_graph().draw_mermaid())

    # 方式 3: 保存为 PNG 图片 (需安装 graphviz)
    graph.get_graph().draw_mermaid_png(output_file_path="docs/workflow_graph.png")
```

---

## 8. 异步任务层搭建 (FastAPI + Celery)

### 8.1 Celery 实例配置

```python
# app/tasks/celery_app.py
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
    # 并发控制
    worker_concurrency=settings.max_concurrent_workers,
    worker_prefetch_multiplier=1,
    # 重试配置
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    # 死信队列
    task_default_queue="ecom_workflow",
    task_queues={
        "ecom_workflow": {"exchange": "ecom_workflow", "routing_key": "ecom_workflow"},
        "dead_letter": {"exchange": "dead_letter", "routing_key": "dead_letter"},
    },
)
```

### 8.2 工作流执行任务

```python
# app/tasks/workflow_task.py
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
    retry_backoff = True            # 指数退避
    retry_backoff_max = 60          # 最大退避 60 秒
    max_retries = 3
    retry_jitter = True


@celery_app.task(
    base=WorkflowTask,
    bind=True,
    name="execute_workflow",
    queue="ecom_workflow",
)
def execute_workflow(self, payload: dict) -> dict:
    """
    Celery 异步任务：接收 Webhook Payload，执行完整的 LangGraph 工作流。
    """
    order_id = payload["order_id"]
    event_type = payload["event_type"]

    # 幂等性检查
    lock = IdempotencyLock()
    if not lock.acquire(f"{order_id}:{event_type}"):
        return {"status": "duplicate", "order_id": order_id}

    try:
        # PII 脱敏
        vault = PIIVault()
        interceptor = PIIInterceptor(vault)
        anonymized_payload, _ = interceptor.anonymize_payload(
            payload=payload,
            order_id=order_id,
        )

        # 初始化 WorkflowState
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

        # 构建 Graph (使用 PostgreSQL Checkpointer)
        checkpointer = PostgresSaver.from_conn_string(
            settings.langgraph_checkpoint_db
        )
        graph = build_graph(checkpointer=checkpointer)

        # 执行
        config = {"configurable": {"thread_id": f"workflow-{order_id}"}}
        final_state = graph.invoke(initial_state, config=config)

        return {
            "status": final_state.get("execution_status", "UNKNOWN"),
            "order_id": order_id,
            "thread_id": f"workflow-{order_id}",
        }

    except Exception as exc:
        if self.request.retries >= self.max_retries:
            # 超过最大重试次数，推送到死信队列
            celery_app.send_task(
                "dead_letter_handler",
                args=[payload, str(exc)],
                queue="dead_letter",
            )
        raise exc
    finally:
        lock.release(f"{order_id}:{event_type}")
```

### 8.3 幂等性锁

```python
# app/utils/idempotency.py
from redis import Redis

from app.config import settings


class IdempotencyLock:
    """基于 Redis 的分布式幂等性锁。"""

    def __init__(self, ttl: int = 3600):
        self.redis = Redis.from_url(settings.redis_url)
        self.ttl = ttl

    def acquire(self, key: str) -> bool:
        return bool(self.redis.set(f"idempotent:{key}", "1", nx=True, ex=self.ttl))

    def release(self, key: str) -> None:
        self.redis.delete(f"idempotent:{key}")
```

### 8.4 FastAPI Webhook 端点

```python
# app/api/webhooks.py
import hashlib
import hmac

from fastapi import APIRouter, Request, HTTPException

from app.config import settings
from app.tasks.workflow_task import execute_workflow

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])


def verify_shopify_hmac(body: bytes, hmac_header: str) -> bool:
    digest = hmac.new(
        settings.shopify_webhook_secret.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(digest, hmac_header)


@router.post("/shopify")
async def shopify_webhook(request: Request):
    """
    Shopify Webhook 接收端点。
    职责: HMAC 验签 → 字段校验 → 推送 Celery 队列 → 返回 200
    """
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

    execute_workflow.delay(payload)

    return {"status": "accepted", "order_id": payload["order_id"]}
```

### 8.5 FastAPI 主入口

```python
# app/main.py
from fastapi import FastAPI

from app.api.webhooks import router as webhook_router
from app.api.hitl import router as hitl_router

app = FastAPI(
    title="E-Commerce AI Workflow",
    version="1.0.0",
    description="基于 LangGraph 的电商异常处理多智能体工作流",
)

app.include_router(webhook_router)
app.include_router(hitl_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
```



---

## 9. 部署与运维

### 9.1 Docker Compose 编排

```yaml
# docker-compose.yml
version: "3.9"

services:
  # === 应用层 ===
  api:
    build: .
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000
    ports:
      - "8000:8000"
    env_file: .env
    depends_on:
      - redis
      - postgres
      - milvus
    restart: unless-stopped

  worker:
    build: .
    command: >
      celery -A app.tasks.celery_app worker
      --loglevel=info
      --concurrency=20
      --queues=ecom_workflow,dead_letter
    env_file: .env
    depends_on:
      - redis
      - postgres
      - milvus
    restart: unless-stopped
    deploy:
      replicas: 2

  # === 基础设施 ===
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ecom
      POSTGRES_PASSWORD: ecom_password
      POSTGRES_DB: ecom_workflow
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data
    restart: unless-stopped

  milvus:
    image: milvusdb/milvus:v2.4-latest
    ports:
      - "19530:19530"
    volumes:
      - milvus_data:/var/lib/milvus
    environment:
      ETCD_USE_EMBED: "true"
      COMMON_STORAGETYPE: local
    restart: unless-stopped

volumes:
  redis_data:
  pg_data:
  milvus_data:
```

### 9.2 启动命令

```bash
# 1. 启动基础设施
docker compose up -d redis postgres milvus

# 2. 初始化数据库
python scripts/init_db.py

# 3. 导入政策文档到 Milvus
python scripts/ingest_policies.py --source ./data/policies/

# 4. 下载 spaCy 模型 (PII 识别需要)
python -m spacy download en_core_web_trf
python -m spacy download zh_core_web_trf

# 5. 启动 API 服务
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# 6. 启动 Celery Worker (另一个终端)
celery -A app.tasks.celery_app worker --loglevel=info --concurrency=20

# 或使用 Docker Compose 一键启动全部
docker compose up -d
```

### 9.3 生产环境监控检查清单

| 监控项 | 工具 | 告警阈值 |
|---|---|---|
| Webhook 接收成功率 | Prometheus + Grafana | < 99% 触发告警 |
| Celery 队列积压量 | Celery Flower / Redis Monitor | > 500 未消费任务触发告警 |
| LLM API 平均延迟 | LangSmith | 单次调用 > 30s 告警 |
| 每日 Token 消耗 | LangSmith | 超过预算 80% 告警 |
| 死信队列未处理数 | Redis Monitor | > 0 立即告警 |
| PII Vault Redis 可用性 | Redis Sentinel | 节点不可用立即告警 |
| PostgreSQL Checkpointer 写入延迟 | pg_stat_statements | > 500ms 告警 |
| 自动流转成功率 | 自研业务看板 | < 85% 触发运营复盘 |

