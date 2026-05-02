import uuid
from datetime import datetime, timezone

from langchain_core.callbacks import BaseCallbackHandler

from app.observability.trace_store import TraceStore


class WorkflowCallbackHandler(BaseCallbackHandler):
    def __init__(self, trace_id: str, store: TraceStore):
        self.trace_id = trace_id
        self.store = store
        self._span_stack: dict[str, dict] = {}

    def on_chain_start(self, serialized, inputs, *, run_id, **kwargs):
        self._span_stack[str(run_id)] = {
            "span_id": f"span-{uuid.uuid4().hex[:8]}",
            "trace_id": self.trace_id,
            "node_name": serialized.get("name", "unknown"),
            "start_time": datetime.now(timezone.utc).isoformat(),
            "input_payload": inputs,
        }

    def on_chain_end(self, outputs, *, run_id, **kwargs):
        span = self._span_stack.pop(str(run_id), None)
        if span:
            span["end_time"] = datetime.now(timezone.utc).isoformat()
            span["output_payload"] = outputs
            self.store.save_span(span)

    def on_chain_error(self, error, *, run_id, **kwargs):
        span = self._span_stack.pop(str(run_id), None)
        if span:
            span["end_time"] = datetime.now(timezone.utc).isoformat()
            span["error_stack"] = str(error)
            self.store.save_span(span)

    def on_llm_start(self, serialized, prompts, *, run_id, **kwargs):
        self._span_stack[str(run_id)] = {
            "span_id": f"llm-{uuid.uuid4().hex[:8]}",
            "trace_id": self.trace_id,
            "node_name": serialized.get("id", ["unknown"])[-1],
            "start_time": datetime.now(timezone.utc).isoformat(),
            "type": "llm_call",
        }

    def on_llm_end(self, response, *, run_id, **kwargs):
        span = self._span_stack.pop(str(run_id), None)
        if span:
            span["end_time"] = datetime.now(timezone.utc).isoformat()
            if hasattr(response, "llm_output") and response.llm_output:
                token_usage = response.llm_output.get("token_usage", {})
                span["tokens_input"] = token_usage.get("prompt_tokens", 0)
                span["tokens_output"] = token_usage.get("completion_tokens", 0)
            self.store.save_span(span)
