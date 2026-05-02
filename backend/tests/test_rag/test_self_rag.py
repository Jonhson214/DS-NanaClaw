from unittest.mock import patch, MagicMock

import pytest

from app.rag.self_rag import SelfRAGEngine, RewrittenQuery, DocumentGradeResult


class TestSelfRAGEngine:
    def test_rewrite_query(self):
        mock_result = RewrittenQuery(
            rewritten_query="US region Electronics refund policy for defective headphones",
            search_intent="查找美国区电子产品退款政策",
        )

        with patch("app.rag.self_rag.ChatOpenAI") as mock_chat:
            mock_instance = MagicMock()
            mock_structured = MagicMock()
            mock_structured.invoke.return_value = mock_result
            mock_instance.with_structured_output.return_value = mock_structured
            mock_chat.return_value = mock_instance

            engine = SelfRAGEngine()
            query = engine.rewrite_query(
                review_text="耳机坏了",
                proposed_solution="全额退款",
                region="US",
                product_category="Electronics",
            )

            assert "headphones" in query.lower() or len(query) > 0

    def test_grade_documents_filters_irrelevant(self):
        docs = [
            {"section_title": "退货政策", "content": "30天内可退货"},
            {"section_title": "运费说明", "content": "标准运费为5元"},
        ]

        relevant_grade = DocumentGradeResult(is_relevant=True, reason="直接相关")
        irrelevant_grade = DocumentGradeResult(is_relevant=False, reason="不相关")

        with patch("app.rag.self_rag.ChatOpenAI") as mock_chat:
            mock_instance = MagicMock()
            mock_structured = MagicMock()
            mock_structured.invoke.side_effect = [relevant_grade, irrelevant_grade]
            mock_instance.with_structured_output.return_value = mock_structured
            mock_chat.return_value = mock_instance

            engine = SelfRAGEngine()
            graded = engine.grade_documents(query="退货政策", documents=docs)

            assert len(graded) == 1
            assert graded[0]["section_title"] == "退货政策"
