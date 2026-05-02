from pymilvus import Collection, connections, AnnSearchRequest, WeightedRanker
from langchain_openai import OpenAIEmbeddings

from app.config import settings


class HybridPolicyRetriever:
    def __init__(self):
        connections.connect(
            alias="default",
            host=settings.milvus_host,
            port=settings.milvus_port,
        )
        self.collection = Collection(settings.milvus_collection)
        self.collection.load()
        self.embedder = OpenAIEmbeddings(
            model="text-embedding-3-large",
            api_key=settings.openai_api_key,
        )

    def retrieve(
        self,
        query: str,
        region: str,
        product_category: str,
        customer_tier: str = "ALL",
        top_k: int = 20,
    ) -> list[dict]:
        query_vector = self.embedder.embed_query(query)

        filter_expr = (
            f'region in ["{region}", "GLOBAL"] '
            f'and product_category in ["{product_category}", "ALL"] '
            f'and customer_tier in ["{customer_tier}", "ALL"]'
        )

        dense_req = AnnSearchRequest(
            data=[query_vector],
            anns_field="dense_vector",
            param={"metric_type": "COSINE", "params": {"nprobe": 16}},
            limit=top_k,
            expr=filter_expr,
        )

        sparse_req = AnnSearchRequest(
            data=[self._text_to_sparse(query)],
            anns_field="sparse_vector",
            param={"metric_type": "IP"},
            limit=top_k,
            expr=filter_expr,
        )

        ranker = WeightedRanker(0.7, 0.3)
        results = self.collection.hybrid_search(
            reqs=[dense_req, sparse_req],
            ranker=ranker,
            limit=top_k,
            output_fields=[
                "doc_id", "section_title", "content",
                "parent_chunk_id", "region", "product_category",
            ],
        )

        return [
            {
                "doc_id": hit.entity.get("doc_id"),
                "section_title": hit.entity.get("section_title"),
                "content": hit.entity.get("content"),
                "parent_chunk_id": hit.entity.get("parent_chunk_id"),
                "score": hit.distance,
            }
            for hit in results[0]
        ]

    def _text_to_sparse(self, text: str) -> dict:
        from pymilvus.model.sparse import BM25EmbeddingFunction
        bm25 = BM25EmbeddingFunction()
        return bm25.encode_queries([text])[0]
