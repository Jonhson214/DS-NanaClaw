from __future__ import annotations

from pymilvus import (
    Collection, CollectionSchema, FieldSchema,
    DataType, connections, utility,
)

from app.config import settings
from app.rag.embeddings import PolicyEmbeddings


class PolicyIndexer:
    DENSE_DIM = 3072

    def __init__(self):
        connections.connect(
            alias="default",
            host=settings.milvus_host,
            port=settings.milvus_port,
        )
        self.embedder = PolicyEmbeddings()

    def create_collection(self, collection_name: str | None = None) -> Collection:
        name = collection_name or settings.milvus_collection

        if utility.has_collection(name):
            return Collection(name)

        fields = [
            FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
            FieldSchema(name="doc_id", dtype=DataType.VARCHAR, max_length=256),
            FieldSchema(name="section_title", dtype=DataType.VARCHAR, max_length=512),
            FieldSchema(name="content", dtype=DataType.VARCHAR, max_length=8192),
            FieldSchema(name="region", dtype=DataType.VARCHAR, max_length=32),
            FieldSchema(name="product_category", dtype=DataType.VARCHAR, max_length=128),
            FieldSchema(name="customer_tier", dtype=DataType.VARCHAR, max_length=32),
            FieldSchema(name="policy_type", dtype=DataType.VARCHAR, max_length=64),
            FieldSchema(name="parent_chunk_id", dtype=DataType.VARCHAR, max_length=256),
            FieldSchema(name="dense_vector", dtype=DataType.FLOAT_VECTOR, dim=self.DENSE_DIM),
            FieldSchema(name="sparse_vector", dtype=DataType.SPARSE_FLOAT_VECTOR),
        ]

        schema = CollectionSchema(fields=fields, description="Policy documents collection")
        collection = Collection(name=name, schema=schema)

        collection.create_index(
            field_name="dense_vector",
            index_params={
                "metric_type": "COSINE",
                "index_type": "HNSW",
                "params": {"M": 16, "efConstruction": 256},
            },
        )
        collection.create_index(
            field_name="sparse_vector",
            index_params={
                "metric_type": "IP",
                "index_type": "SPARSE_INVERTED_INDEX",
            },
        )

        return collection

    def index_documents(
        self,
        documents: list[dict],
        collection_name: str | None = None,
    ) -> int:
        collection = self.create_collection(collection_name)
        texts = [doc["content"] for doc in documents]
        dense_vectors = self.embedder.embed_documents(texts)

        from pymilvus.model.sparse import BM25EmbeddingFunction
        bm25 = BM25EmbeddingFunction()
        bm25.fit(texts)
        sparse_vectors = bm25.encode_documents(texts)

        entities = []
        for i, doc in enumerate(documents):
            meta = doc.get("metadata", {})
            entities.append({
                "doc_id": meta.get("doc_id", f"doc-{i}"),
                "section_title": meta.get("section_title", ""),
                "content": doc["content"][:8000],
                "region": meta.get("region", "GLOBAL"),
                "product_category": meta.get("product_category", "ALL"),
                "customer_tier": meta.get("customer_tier", "ALL"),
                "policy_type": meta.get("policy_type", "general"),
                "parent_chunk_id": meta.get("parent_chunk_id", ""),
                "dense_vector": dense_vectors[i],
                "sparse_vector": sparse_vectors[i],
            })

        collection.insert(entities)
        collection.flush()
        return len(entities)
