from unittest.mock import patch, MagicMock

import pytest

from app.agents.compliance import (
    ComplianceOutput,
    ComplianceDecision,
    compliance_node,
)


class TestComplianceNode:
    def _make_state_with_solution(self, sample_workflow_state):
        sample_workflow_state["proposed_solution"] = "全额退款 $299.00"
        sample_workflow_state["claim_amount"] = 299.00
        sample_workflow_state["solution_confidence"] = 0.85
        sample_workflow_state["solution_reasoning"] = "VIP 客户到货即损"
        sample_workflow_state["rag_retrieved_policies"] = [
            {
                "doc_id": "Policy-US-ELEC-001",
                "section_title": "美国区 > 电子产品 > 30天退货政策",
                "relevance_score": 0.95,
                "content_snippet": "购买 30 日内，电子产品支持无条件退货退款",
            }
        ]
        return sample_workflow_state

    def test_approved_decision(self, sample_workflow_state):
        state = self._make_state_with_solution(sample_workflow_state)
        mock_output = ComplianceOutput(
            decision=ComplianceDecision.APPROVED,
            reason="符合 Policy-US-ELEC-001 退货政策",
            confidence=0.95,
            policy_references=["Policy-US-ELEC-001"],
            risk_flags=[],
        )

        with patch("app.agents.compliance.build_compliance_llm") as mock_llm_builder:
            mock_llm = MagicMock()
            mock_llm.invoke.return_value = mock_output
            mock_llm_builder.return_value = mock_llm

            result = compliance_node(state, config={})

            assert result["compliance_result"] == "APPROVED"
            assert result["compliance_confidence"] == 0.95

    def test_rejected_decision(self, sample_workflow_state):
        state = self._make_state_with_solution(sample_workflow_state)
        mock_output = ComplianceOutput(
            decision=ComplianceDecision.REJECTED,
            reason="退款金额超出订单原始金额的 120%",
            confidence=0.88,
            policy_references=["Policy-US-ELEC-001"],
            risk_flags=["超额赔偿"],
        )

        with patch("app.agents.compliance.build_compliance_llm") as mock_llm_builder:
            mock_llm = MagicMock()
            mock_llm.invoke.return_value = mock_output
            mock_llm_builder.return_value = mock_llm

            result = compliance_node(state, config={})

            assert result["compliance_result"] == "REJECTED"

    def test_error_escalates(self, sample_workflow_state):
        state = self._make_state_with_solution(sample_workflow_state)

        with patch("app.agents.compliance.build_compliance_llm") as mock_llm_builder:
            mock_llm = MagicMock()
            mock_llm.invoke.side_effect = Exception("API error")
            mock_llm_builder.return_value = mock_llm

            result = compliance_node(state, config={})

            assert result["compliance_result"] == "ESCALATE"
            assert "异常" in result["compliance_reason"]
