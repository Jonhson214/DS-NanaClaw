from langchain_core.runnables import RunnableConfig

from app.graph.state import WorkflowState


MAX_RAG_RETRIES = 2

_retriever = None
_reranker = None
_self_rag = None


def _get_components():
    global _retriever, _reranker, _self_rag
    if _retriever is None:
        from app.rag.retriever import HybridPolicyRetriever
        from app.rag.reranker import PolicyReranker
        from app.rag.self_rag import SelfRAGEngine
        _retriever = HybridPolicyRetriever()
        _reranker = PolicyReranker()
        _self_rag = SelfRAGEngine()
    return _retriever, _reranker, _self_rag


def policy_rag_node(state: WorkflowState, config: RunnableConfig) -> dict:
    retriever, reranker, self_rag = _get_components()

    product_category = "ALL"
    if state.get("line_items"):
        product_category = state["line_items"][0].get("product_category", "ALL")

    query = self_rag.rewrite_query(
        review_text=state["review_text"],
        proposed_solution=state["proposed_solution"],
        region=state["region"],
        product_category=product_category,
    )

    graded = []
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
