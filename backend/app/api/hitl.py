from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings

router = APIRouter(prefix="/api/hitl", tags=["HITL"])


class HITLResumeRequest(BaseModel):
    thread_id: str
    decision: str
    notes: str = ""


@router.post("/resume")
async def resume_workflow(req: HITLResumeRequest):
    if req.decision not in ("APPROVED", "REJECTED"):
        raise HTTPException(400, "decision must be APPROVED or REJECTED")

    from langgraph.checkpoint.postgres import PostgresSaver
    from langgraph.types import Command
    from app.graph.builder import build_graph

    checkpointer = PostgresSaver.from_conn_string(settings.langgraph_checkpoint_db)
    graph = build_graph(checkpointer=checkpointer)

    config = {"configurable": {"thread_id": req.thread_id}}

    graph.invoke(
        Command(resume={"decision": req.decision, "notes": req.notes}),
        config=config,
    )

    return {"status": "resumed", "thread_id": req.thread_id}
