from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Integer, Float, Text, Boolean, DateTime, JSON, create_engine,
)
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class TraceSpan(Base):
    __tablename__ = "trace_spans"

    span_id = Column(String(64), primary_key=True)
    trace_id = Column(String(128), nullable=False, index=True)
    node_name = Column(String(128), nullable=False)
    start_time = Column(String(64))
    end_time = Column(String(64))
    input_payload = Column(Text)
    output_payload = Column(Text)
    error_stack = Column(Text)
    tokens_input = Column(Integer, default=0)
    tokens_output = Column(Integer, default=0)


class Trace(Base):
    __tablename__ = "traces"

    trace_id = Column(String(128), primary_key=True)
    order_id = Column(String(128), nullable=False, index=True)
    status = Column(String(32), nullable=False)
    total_duration_ms = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    nodes_executed = Column(JSON)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AuditLog(Base):
    __tablename__ = "audit_logs"

    audit_id = Column(String(128), primary_key=True)
    order_id = Column(String(128), nullable=False, index=True)
    decision_type = Column(String(32), nullable=False)
    decision_maker = Column(String(128))
    compliance_reasoning = Column(Text)
    claim_amount = Column(Float, default=0.0)
    rag_policy_snapshot = Column(JSON)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    retention_days = Column(Integer, default=180)
