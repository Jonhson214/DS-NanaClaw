from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

from app.graph.state import WorkflowState
from app.graph.router import compliance_router, reflection_router, hitl_router
from app.agents.customer_service import customer_service_node
from app.agents.compliance import compliance_node
from app.agents.execution import execution_node
from app.agents.hitl_node import hitl_node
from app.tools.policy_rag import policy_rag_node


def reflection_increment_node(state: WorkflowState) -> dict:
    return {"reflection_count": state.get("reflection_count", 0) + 1}


def cancellation_node(state: WorkflowState) -> dict:
    return {
        "execution_status": "CANCELLED",
        "current_node": "cancelled",
    }


def build_graph(checkpointer=None):
    graph = StateGraph(WorkflowState)

    # ═══ 注册所有节点 ═══
    graph.add_node("customer_service_agent", customer_service_node)
    graph.add_node("policy_rag_tool", policy_rag_node)
    graph.add_node("compliance_agent", compliance_node)
    graph.add_node("hitl_review", hitl_node)
    graph.add_node("execution_agent", execution_node)
    graph.add_node("reflection_increment", reflection_increment_node)
    graph.add_node("cancellation", cancellation_node)

    # ═══ 直连边 ═══
    graph.add_edge(START, "customer_service_agent")
    graph.add_edge("customer_service_agent", "policy_rag_tool")
    graph.add_edge("policy_rag_tool", "compliance_agent")
    graph.add_edge("execution_agent", END)
    graph.add_edge("cancellation", END)

    # ═══ 条件边 ═══
    graph.add_conditional_edges(
        source="compliance_agent",
        path=compliance_router,
        path_map={
            "execution_agent": "execution_agent",
            "reflection_router": "reflection_increment",
            "hitl_review": "hitl_review",
        },
    )

    graph.add_conditional_edges(
        source="reflection_increment",
        path=reflection_router,
        path_map={
            "customer_service_agent": "customer_service_agent",
            "hitl_review": "hitl_review",
        },
    )

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
