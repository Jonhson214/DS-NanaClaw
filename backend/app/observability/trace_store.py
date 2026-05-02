import json
from datetime import datetime, timezone

from sqlalchemy import create_engine, text

from app.config import settings


class TraceStore:
    def __init__(self):
        self.engine = create_engine(settings.database_url)

    def save_span(self, span: dict) -> None:
        with self.engine.connect() as conn:
            conn.execute(
                text("""
                    INSERT INTO trace_spans (
                        span_id, trace_id, node_name,
                        start_time, end_time,
                        input_payload, output_payload,
                        error_stack, tokens_input, tokens_output
                    ) VALUES (
                        :span_id, :trace_id, :node_name,
                        :start_time, :end_time,
                        :input_payload, :output_payload,
                        :error_stack, :tokens_input, :tokens_output
                    )
                """),
                {
                    "span_id": span.get("span_id"),
                    "trace_id": span.get("trace_id"),
                    "node_name": span.get("node_name"),
                    "start_time": span.get("start_time"),
                    "end_time": span.get("end_time"),
                    "input_payload": json.dumps(span.get("input_payload"), default=str),
                    "output_payload": json.dumps(span.get("output_payload"), default=str),
                    "error_stack": span.get("error_stack"),
                    "tokens_input": span.get("tokens_input", 0),
                    "tokens_output": span.get("tokens_output", 0),
                },
            )
            conn.commit()

    def save_trace(
        self,
        trace_id: str,
        order_id: str,
        status: str,
        total_duration_ms: int,
        total_tokens: int,
        nodes_executed: list[str],
    ) -> None:
        with self.engine.connect() as conn:
            conn.execute(
                text("""
                    INSERT INTO traces (
                        trace_id, order_id, status,
                        total_duration_ms, total_tokens,
                        nodes_executed, created_at
                    ) VALUES (
                        :trace_id, :order_id, :status,
                        :total_duration_ms, :total_tokens,
                        :nodes_executed, :created_at
                    )
                """),
                {
                    "trace_id": trace_id,
                    "order_id": order_id,
                    "status": status,
                    "total_duration_ms": total_duration_ms,
                    "total_tokens": total_tokens,
                    "nodes_executed": json.dumps(nodes_executed),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                },
            )
            conn.commit()
