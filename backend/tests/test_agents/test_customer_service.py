from unittest.mock import patch, MagicMock

import pytest

from app.agents.customer_service import (
    CustomerServiceOutput,
    customer_service_node,
)


class TestCustomerServiceNode:
    def test_successful_response(self, sample_workflow_state):
        mock_output = CustomerServiceOutput(
            proposed_solution="全额退款 $299.00 + 15% 折扣码",
            claim_amount=299.00,
            confidence_score=0.85,
            reasoning="VIP 客户，商品到货即损，符合退货政策",
            needs_human_review=False,
        )

        with patch(
            "app.agents.customer_service.build_customer_service_llm"
        ) as mock_llm_builder:
            mock_llm = MagicMock()
            mock_llm.invoke.return_value = mock_output
            mock_llm_builder.return_value = mock_llm

            result = customer_service_node(sample_workflow_state, config={})

            assert result["proposed_solution"] == "全额退款 $299.00 + 15% 折扣码"
            assert result["claim_amount"] == 299.00
            assert result["solution_confidence"] == 0.85
            assert result["current_node"] == "customer_service_agent"

    def test_error_handling(self, sample_workflow_state):
        with patch(
            "app.agents.customer_service.build_customer_service_llm"
        ) as mock_llm_builder:
            mock_llm = MagicMock()
            mock_llm.invoke.side_effect = Exception("LLM API timeout")
            mock_llm_builder.return_value = mock_llm

            result = customer_service_node(sample_workflow_state, config={})

            assert result["proposed_solution"] == ""
            assert result["claim_amount"] == 0.0
            assert len(result["error_log"]) == 1
            assert "CustomerServiceAgent error" in result["error_log"][0]

    def test_reflection_context_included(self, sample_workflow_state):
        sample_workflow_state["reflection_count"] = 1
        sample_workflow_state["compliance_reason"] = "退款金额超出政策上限"

        mock_output = CustomerServiceOutput(
            proposed_solution="部分退款 $200.00",
            claim_amount=200.00,
            confidence_score=0.90,
            reasoning="根据合规驳回理由调整退款金额",
            needs_human_review=False,
        )

        with patch(
            "app.agents.customer_service.build_customer_service_llm"
        ) as mock_llm_builder:
            mock_llm = MagicMock()
            mock_llm.invoke.return_value = mock_output
            mock_llm_builder.return_value = mock_llm

            result = customer_service_node(sample_workflow_state, config={})

            call_args = mock_llm.invoke.call_args[0][0]
            human_msg = call_args[1].content
            assert "退款金额超出政策上限" in human_msg
            assert "第 1 次重写" in human_msg
