import cohere

from app.config import settings


class PolicyReranker:
    def __init__(self):
        self.client = cohere.Client(api_key=settings.cohere_api_key)

    def rerank(
        self,
        query: str,
        documents: list[dict],
        top_n: int = 3,
        relevance_threshold: float = 0.5,
    ) -> list[dict]:
        doc_texts = [doc["content"] for doc in documents]

        response = self.client.rerank(
            model="rerank-v3.5",
            query=query,
            documents=doc_texts,
            top_n=top_n,
        )

        reranked = []
        for result in response.results:
            if result.relevance_score >= relevance_threshold:
                doc = documents[result.index]
                doc["relevance_score"] = result.relevance_score
                reranked.append(doc)

        return reranked
