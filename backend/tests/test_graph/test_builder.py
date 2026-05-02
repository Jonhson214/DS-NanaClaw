from unittest.mock import patch, MagicMock

import pytest


class TestGraphBuilder:
    def test_graph_builds_successfully(self):
        with patch("app.tools.policy_rag.HybridPolicyRetriever"), \
             patch("app.tools.policy_rag.PolicyReranker"), \
             patch("app.tools.policy_rag.SelfRAGEngine"):
            from app.graph.builder import build_graph

            graph = build_graph()
            assert graph is not None

    def test_graph_has_expected_nodes(self):
        with patch("app.tools.policy_rag.HybridPolicyRetriever"), \
             patch("app.tools.policy_rag.PolicyReranker"), \
             patch("app.tools.policy_rag.SelfRAGEngine"):
            from app.graph.builder import build_graph

            graph = build_graph()
            graph_data = graph.get_graph()
            node_ids = [n.id for n in graph_data.nodes]

            expected_nodes = [
                "customer_service_agent",
                "policy_rag_tool",
                "compliance_agent",
                "hitl_review",
                "execution_agent",
                "reflection_increment",
                "cancellation",
            ]
            for node in expected_nodes:
                assert node in node_ids, f"Missing node: {node}"


class TestRouters:
    def test_compliance_router_approved(self):
        from app.graph.router import compliance_router

        state = {"compliance_result": "APPROVED"}
        assert compliance_router(state) == "execution_agent"

    def test_compliance_router_rejected(self):
        from app.graph.router import compliance_router

        state = {"compliance_result": "REJECTED"}
        assert compliance_router(state) == "reflection_router"

    def test_compliance_router_escalate(self):
        from app.graph.router import compliance_router

        state = {"compliance_result": "ESCALATE"}
        assert compliance_router(state) == "hitl_review"

    def test_compliance_router_default(self):
        from app.graph.router import compliance_router

        state = {}
        assert compliance_router(state) == "hitl_review"

    def test_reflection_router_under_limit(self):
        from app.graph.router import reflection_router

        state = {"reflection_count": 1, "max_reflections": 3}
        assert reflection_router(state) == "customer_service_agent"

    def test_reflection_router_at_limit(self):
        from app.graph.router import reflection_router

        state = {"reflection_count": 3, "max_reflections": 3}
        assert reflection_router(state) == "hitl_review"

    def test_hitl_router_approved(self):
        from app.graph.router import hitl_router

        state = {"human_decision": "APPROVED"}
        assert hitl_router(state) == "execution_agent"

    def test_hitl_router_rejected(self):
        from app.graph.router import hitl_router

        state = {"human_decision": "REJECTED"}
        assert hitl_router(state) == "end"
