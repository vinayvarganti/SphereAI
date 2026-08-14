import asyncio
import hashlib
import json
import logging
import math
import os
from pathlib import Path
from typing import Any

from app.core.exceptions import ExternalServiceNotConfiguredError


logger = logging.getLogger("agentsphere.memory")

_faiss_index: Any | None = None
_faiss_id_map: dict[int, str] = {}
_faiss_metadata: dict[str, dict[str, Any]] = {}
_embeddings: Any | None = None
_memory_vectors: dict[str, dict[str, Any]] = {}
_index_path: str = "./data/faiss_index"
_dimension: int = 1536


def init_vector_store(embeddings: Any | None = None, index_path: str | None = None) -> None:
    global _faiss_index, _faiss_id_map, _faiss_metadata, _embeddings, _index_path

    _embeddings = embeddings
    if index_path:
        _index_path = index_path

    try:
        import faiss
    except ModuleNotFoundError:
        logger.warning("faiss-cpu is not installed; vector store will use in-memory fallback")
        return

    _load_or_create_index()


def _load_or_create_index() -> None:
    global _faiss_index, _faiss_id_map, _faiss_metadata

    import faiss

    meta_path = f"{_index_path}.meta.json"
    index_file = f"{_index_path}.index"

    if os.path.exists(index_file) and os.path.exists(meta_path):
        try:
            _faiss_index = faiss.read_index(index_file)
            with open(meta_path, "r") as f:
                saved = json.load(f)
            _faiss_id_map = {int(k): v for k, v in saved.get("id_map", {}).items()}
            _faiss_metadata = saved.get("metadata", {})
            logger.info(f"Loaded FAISS index with {_faiss_index.ntotal} vectors from {index_file}")
            return
        except Exception as exc:
            logger.warning(f"Failed to load FAISS index ({exc}); creating new one")

    _faiss_index = faiss.IndexFlatIP(_dimension)
    _faiss_id_map = {}
    _faiss_metadata = {}
    logger.info("Created new FAISS IndexFlatIP")


def _save_index() -> None:
    if _faiss_index is None:
        return
    try:
        import faiss

        Path(_index_path).parent.mkdir(parents=True, exist_ok=True)
        faiss.write_index(_faiss_index, f"{_index_path}.index")
        with open(f"{_index_path}.meta.json", "w") as f:
            json.dump({"id_map": {str(k): v for k, v in _faiss_id_map.items()}, "metadata": _faiss_metadata}, f)
    except Exception as exc:
        logger.warning(f"Failed to save FAISS index ({exc})")


def _company_embedding_text(company: dict) -> str:
    name = company.get("company_name") or company.get("name") or "Unknown company"
    industry = company.get("industry") or "unknown industry"
    headquarters = company.get("headquarters") or "unknown headquarters"
    headcount = company.get("headcount") or "unknown number of"
    funding_stage = company.get("funding_stage") or "unknown"
    tech_stack = company.get("tech_stack") or []
    if isinstance(tech_stack, list):
        tech_stack = ", ".join(str(item) for item in tech_stack)
    return (
        f"{name} is a {industry} company headquartered in {headquarters}. "
        f"They have {headcount} employees and raised {funding_stage} funding. "
        f"Their tech stack includes {tech_stack}."
    )


def _fallback_embedding(text: str, dimensions: int = 1536) -> list[float]:
    vector = [0.0] * dimensions
    for token in text.lower().split():
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], "big") % dimensions
        vector[index] += 1.0
    norm = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [value / norm for value in vector]


def _normalize(vector: list[float]) -> list[float]:
    norm = math.sqrt(sum(v * v for v in vector)) or 1.0
    return [v / norm for v in vector]


async def _embed_text(text: str) -> list[float]:
    if _embeddings is None:
        return _fallback_embedding(text)
    try:
        if hasattr(_embeddings, "aembed_query"):
            vec = await _embeddings.aembed_query(text)
            return _normalize(vec)
        if hasattr(_embeddings, "embed_query"):
            vec = await asyncio.to_thread(_embeddings.embed_query, text)
            return _normalize(vec)
    except Exception as exc:
        logger.warning(f"Embeddings generation failed ({exc}); falling back to local SHA-256 embeddings")
        return _fallback_embedding(text)
    raise ExternalServiceNotConfiguredError("Embeddings client does not support query embedding")


def _cosine(left: list[float], right: list[float]) -> float:
    if not left or not right:
        return 0.0
    limit = min(len(left), len(right))
    numerator = sum(left[i] * right[i] for i in range(limit))
    left_norm = math.sqrt(sum(value * value for value in left[:limit])) or 1.0
    right_norm = math.sqrt(sum(value * value for value in right[:limit])) or 1.0
    return numerator / (left_norm * right_norm)


async def store_company_embedding(company: dict) -> str:
    text = _company_embedding_text(company)
    vector = await _embed_text(text)
    company_id = company.get("id") or company.get("_id") or company.get("company_id") or company.get("domain")
    if not company_id:
        company_id = hashlib.sha256(text.encode("utf-8")).hexdigest()
    metadata = {
        "type": "company",
        "name": company.get("name") or company.get("company_name"),
        "domain": company.get("domain"),
        "workflow_id": company.get("workflow_id"),
        "user_id": company.get("user_id"),
        "icp_score": company.get("icp_match_score", 0),
    }

    if _faiss_index is None:
        _memory_vectors[str(company_id)] = {"values": vector, "metadata": metadata, "namespace": "companies"}
        return str(company_id)

    import numpy as np

    vec_np = np.array([vector], dtype="float32")
    idx = _faiss_index.ntotal
    await asyncio.to_thread(_faiss_index.add, vec_np)
    _faiss_id_map[idx] = str(company_id)
    _faiss_metadata[str(company_id)] = metadata
    await asyncio.to_thread(_save_index)
    return str(company_id)


async def search_similar_companies(text: str, top_k: int = 5) -> list[dict]:
    vector = await _embed_text(text)

    if _faiss_index is None:
        scored = [
            {"id": vector_id, "score": _cosine(vector, item["values"]), "metadata": item["metadata"]}
            for vector_id, item in _memory_vectors.items()
            if item.get("namespace") == "companies"
        ]
        return sorted(scored, key=lambda item: item["score"], reverse=True)[:top_k]

    if _faiss_index.ntotal == 0:
        return []

    import numpy as np

    vec_np = np.array([vector], dtype="float32")
    k = min(top_k, _faiss_index.ntotal)
    scores, indices = await asyncio.to_thread(_faiss_index.search, vec_np, k)

    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx == -1:
            continue
        cid = _faiss_id_map.get(int(idx))
        if cid:
            results.append({"id": cid, "score": float(score), "metadata": _faiss_metadata.get(cid, {})})
    return results


async def check_duplicate(domain: str, threshold: float = 0.95) -> bool:
    if not domain:
        return False
    matches = await search_similar_companies(domain, top_k=5)
    normalized = domain.lower().strip()
    for match in matches:
        metadata = match.get("metadata", {})
        if str(metadata.get("domain", "")).lower().strip() == normalized:
            return True
        if float(match.get("score", 0)) > threshold:
            return True
    return False


async def delete_workflow_vectors(workflow_id: str) -> None:
    if _faiss_index is None:
        stale = [
            vector_id
            for vector_id, item in _memory_vectors.items()
            if item.get("metadata", {}).get("workflow_id") == workflow_id
        ]
        for vector_id in stale:
            _memory_vectors.pop(vector_id, None)
        return

    # FAISS flat index doesn't support selective deletion easily.
    # Mark metadata as deleted; they won't appear in future results.
    stale_ids = [cid for cid, meta in _faiss_metadata.items() if meta.get("workflow_id") == workflow_id]
    for cid in stale_ids:
        _faiss_metadata.pop(cid, None)
        stale_idx = [k for k, v in _faiss_id_map.items() if v == cid]
        for k in stale_idx:
            _faiss_id_map.pop(k, None)
    await asyncio.to_thread(_save_index)


def vector_stats() -> dict:
    if _faiss_index is None:
        return {"provider": "memory", "vector_count": len(_memory_vectors)}
    return {"provider": "faiss", "vector_count": _faiss_index.ntotal, "index_path": _index_path}
