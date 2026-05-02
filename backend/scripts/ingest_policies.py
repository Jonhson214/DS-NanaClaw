"""政策文档导入向量数据库脚本。

用法:
    python -m scripts.ingest_policies --source ./data/policies/
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.rag.chunker import PolicyChunker
from app.rag.indexer import PolicyIndexer


def load_policy_file(filepath: Path) -> dict:
    if filepath.suffix == ".json":
        with open(filepath, encoding="utf-8") as f:
            return json.load(f)
    elif filepath.suffix in (".md", ".txt"):
        with open(filepath, encoding="utf-8") as f:
            content = f.read()
        return {
            "content": content,
            "metadata": {
                "doc_id": filepath.stem,
                "section_title": filepath.stem,
                "region": "GLOBAL",
                "product_category": "ALL",
                "customer_tier": "ALL",
                "policy_type": "general",
            },
        }
    else:
        raise ValueError(f"Unsupported file format: {filepath.suffix}")


def main():
    parser = argparse.ArgumentParser(description="Import policy documents into Milvus")
    parser.add_argument("--source", required=True, help="Directory containing policy files")
    parser.add_argument("--collection", default=None, help="Milvus collection name")
    parser.add_argument("--chunk-size", type=int, default=512)
    parser.add_argument("--chunk-overlap", type=int, default=64)
    args = parser.parse_args()

    source_dir = Path(args.source)
    if not source_dir.is_dir():
        print(f"Error: {source_dir} is not a valid directory")
        sys.exit(1)

    chunker = PolicyChunker(chunk_size=args.chunk_size, chunk_overlap=args.chunk_overlap)
    indexer = PolicyIndexer()

    all_chunks = []
    for filepath in sorted(source_dir.glob("**/*")):
        if filepath.suffix not in (".json", ".md", ".txt"):
            continue
        print(f"Processing: {filepath}")
        doc = load_policy_file(filepath)
        chunks = chunker.split_document(
            text=doc["content"],
            metadata=doc.get("metadata", {}),
        )
        all_chunks.extend(chunks)

    if not all_chunks:
        print("No documents found to index.")
        sys.exit(0)

    count = indexer.index_documents(all_chunks, collection_name=args.collection)
    print(f"Successfully indexed {count} chunks into Milvus.")


if __name__ == "__main__":
    main()
