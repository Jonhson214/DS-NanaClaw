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
