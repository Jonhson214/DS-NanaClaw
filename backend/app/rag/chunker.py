from __future__ import annotations

from langchain_text_splitters import RecursiveCharacterTextSplitter


class PolicyChunker:
    def __init__(
        self,
        chunk_size: int = 512,
        chunk_overlap: int = 64,
        separators: list[str] | None = None,
    ):
        if separators is None:
            separators = ["\n## ", "\n### ", "\n#### ", "\n\n", "\n", "。", ".", " "]
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=separators,
            length_function=len,
        )

    def split_document(
        self,
        text: str,
        metadata: dict | None = None,
    ) -> list[dict]:
        chunks = self.splitter.split_text(text)
        result = []
        for i, chunk in enumerate(chunks):
            chunk_meta = dict(metadata or {})
            chunk_meta["chunk_index"] = i
            chunk_meta["total_chunks"] = len(chunks)
            result.append({
                "content": chunk,
                "metadata": chunk_meta,
            })
        return result
