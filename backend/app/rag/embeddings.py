from langchain_openai import OpenAIEmbeddings

from app.config import settings


class PolicyEmbeddings:
    def __init__(self, model: str = "text-embedding-3-large"):
        self.embedder = OpenAIEmbeddings(
            model=model,
            api_key=settings.openai_api_key,
        )

    def embed_query(self, text: str) -> list[float]:
        return self.embedder.embed_query(text)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self.embedder.embed_documents(texts)
