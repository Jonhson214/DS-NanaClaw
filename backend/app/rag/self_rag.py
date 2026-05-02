from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel, Field

from app.config import settings


class RewrittenQuery(BaseModel):
    rewritten_query: str = Field(description="精炼后的检索查询")
    search_intent: str = Field(description="检索意图说明")


class DocumentGradeResult(BaseModel):
    is_relevant: bool = Field(description="该文档是否能回答当前工单的问题")
    reason: str = Field(description="判断理由")


class SelfRAGEngine:
    def __init__(self):
        self.rewrite_llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.0,
            api_key=settings.openai_api_key,
        ).with_structured_output(RewrittenQuery)

        self.grading_llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.0,
            api_key=settings.openai_api_key,
        ).with_structured_output(DocumentGradeResult)

    def rewrite_query(
        self,
        review_text: str,
        proposed_solution: str,
        region: str,
        product_category: str,
    ) -> str:
        messages = [
            SystemMessage(content=(
                "你是一个检索查询优化专家。将客户工单和 AI 方案提炼为"
                "一句精准的政策检索查询。查询应包含：地区、商品类别、"
                "具体需求（退款/换货/保修等）。"
            )),
            HumanMessage(content=(
                f"客户投诉: {review_text}\n"
                f"AI 建议方案: {proposed_solution}\n"
                f"地区: {region}\n"
                f"商品类别: {product_category}\n\n"
                f"请生成精准的政策检索查询。"
            )),
        ]
        result = self.rewrite_llm.invoke(messages)
        return result.rewritten_query

    def grade_documents(
        self,
        query: str,
        documents: list[dict],
    ) -> list[dict]:
        graded = []
        for doc in documents:
            messages = [
                SystemMessage(content=(
                    "你是文档相关性评审员。判断给定的政策文档"
                    "是否能直接回答检索查询的问题。"
                )),
                HumanMessage(content=(
                    f"检索查询: {query}\n\n"
                    f"政策文档:\n标题: {doc['section_title']}\n"
                    f"内容: {doc['content']}\n\n"
                    f"该文档是否与查询直接相关？"
                )),
            ]
            grade = self.grading_llm.invoke(messages)
            if grade.is_relevant:
                graded.append(doc)
        return graded
