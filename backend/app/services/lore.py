import chromadb
from typing import List, Dict, Any, Optional
import os
import uuid
from collections import deque


# ---------------------------------------------------------------------------
# ChromaDB client — persisted to data/chroma/
# ---------------------------------------------------------------------------
_CHROMA_PATH = os.path.join(os.getcwd(), "data", "chroma")
chroma_client = chromadb.PersistentClient(path=_CHROMA_PATH)
collection = chroma_client.get_or_create_collection(name="doxa_lore")

# ---------------------------------------------------------------------------
# Deduplication guard:
# Keep a short memory of (civ_id, event_text) pairs added recently so we
# don't spam identical events every tick.
# Stores (civ_id, text_fingerprint) for the last 50 writes.
# ---------------------------------------------------------------------------
_recent_writes: deque = deque(maxlen=50)
_DEDUP_WINDOW = 5  # ticks — if same event for same civ within this window, skip


def _fingerprint(session_id: str, civ_id: str, event_text: str) -> str:
    """Short fingerprint to detect near-identical events."""
    return f"{session_id}::{civ_id}::{event_text[:80].strip().lower()}"


def add_lore_event(
    session_id: str,
    civ_id: str,
    event_text: str,
    current_tick: int,
    agent_id: str = "GLOBAL",
) -> Optional[str]:

    """
    Adds a historical event to the Akashic Records (ChromaDB vector store).
    Returns the doc_id, or None if the event was deduplicated.
    """
    fp = _fingerprint(session_id, civ_id, event_text)
    if fp in _recent_writes:
        return None  # Deduplicated — same event already written recently

    _recent_writes.append(fp)

    doc_id = str(uuid.uuid4())
    collection.add(
        documents=[event_text],
        metadatas=[{
            "session_id": session_id,
            "civ_id": civ_id,
            "tick": current_tick,
            "agent_id": agent_id,
        }],
        ids=[doc_id],
    )
    return doc_id


def add_global_lore_event(
    session_id: str,
    event_text: str,
    current_tick: int,
    agent_id: str = "DEMIURGE",
) -> None:
    """
    Records a world-level event visible to ALL civilizations.
    Writes one entry with civ_id='GLOBAL'.
    """
    add_lore_event(session_id, "GLOBAL", event_text, current_tick, agent_id)


def query_lore(
    session_id: str,
    civ_id: str,
    query_text: str,
    n_results: int = 3,
) -> List[Dict[str, Any]]:
    """
    Queries the Akashic Records for a specific civilization, merging in
    GLOBAL events so cataclysms and world events are always visible.
    Returns at most n_results entries sorted by relevance.
    """
    all_results: List[Dict[str, Any]] = []

    for target_civ in [civ_id, "GLOBAL"]:
        try:
            # Count entries for this filter to avoid n_results > collection size errors
            count = collection.count()
            if count == 0:
                continue
            safe_n = min(n_results, count)

            results = collection.query(
                query_texts=[query_text],
                n_results=safe_n,
                where={"$and": [{"civ_id": target_civ}, {"session_id": session_id}]},
            )
            if results and results.get("documents") and len(results["documents"]) > 0:
                docs = results["documents"][0]
                metas = results["metadatas"][0]
                distances = results.get("distances", [[]])[0]
                for i, (doc, meta) in enumerate(zip(docs, metas)):
                    all_results.append({
                        "text": doc,
                        "tick": meta.get("tick"),
                        "agent_id": meta.get("agent_id"),
                        "civ_id": meta.get("civ_id"),
                        "_distance": distances[i] if i < len(distances) else 1.0,
                    })
        except Exception as e:
            # Collection may be empty or filter may return 0 results — ignore
            print(f"[Lore] query_lore error for civ={target_civ}: {e}")
            continue

    # Sort by distance (lower = more relevant) and return top n_results
    all_results.sort(key=lambda x: x.get("_distance", 1.0))
    return all_results[:n_results]


def get_akashic_records(session_id: str, civ_id: str, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Returns the most recent lore events for a civilization (for the UI panel).
    Unlike query_lore, this fetches chronologically rather than by similarity.
    """
    try:
        count = collection.count()
        if count == 0:
            return []
        safe_n = min(limit, count)
        results = collection.get(
            where={"$and": [{"civ_id": {"$in": [civ_id, "GLOBAL"]}}, {"session_id": session_id}]},
            limit=safe_n,
        )
        if not results or not results.get("documents"):
            return []
        docs = results["documents"]
        metas = results["metadatas"]
        records = [
            {"text": doc, "tick": meta.get("tick"), "agent_id": meta.get("agent_id"), "civ_id": meta.get("civ_id")}
            for doc, meta in zip(docs, metas)
        ]
        # Sort by tick descending (most recent first)
        records.sort(key=lambda x: x.get("tick") or 0, reverse=True)
        return records[:limit]
    except Exception as e:
        print(f"[Lore] get_akashic_records error: {e}")
        return []
