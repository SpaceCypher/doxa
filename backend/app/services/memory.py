import math
import difflib
from typing import List, Dict, Any


def _semantic_similarity(text_a: str, text_b: str) -> float:
    """
    Returns a [0, 1] similarity score between two strings.
    Uses difflib SequenceMatcher as a lightweight proxy for semantic distance.
    Much better than pure word-overlap — catches morphological variants.
    """
    return difflib.SequenceMatcher(None, text_a.lower(), text_b.lower()).ratio()


def retrieve_topological_memory(
    belief_graph: Dict[str, List[Dict[str, Any]]],
    observation: str,
    current_tick: int,
    top_k: int = 5,
) -> List[Dict[str, Any]]:
    """
    Retrieves the top-K memories from the belief graph using Topological Scoring.

    Score formula:
        S = w1 * exp(-λ·Δt)   — recency (time-decay)
            + w2 * (Im / 10)  — importance (belief weight proxy)
            + w3 * sim(obs, m) — semantic relevance (difflib ratio)

    w1=0.2, w2=0.5, w3=0.3, λ=0.1
    """
    w1, w2, w3 = 0.2, 0.5, 0.3
    lam = 0.1

    all_nodes: List[Dict[str, Any]] = []
    if not belief_graph:
        return []

    for cat in ["functional", "relational", "theological"]:
        for node in belief_graph.get(cat, []):
            all_nodes.append({**node, "_category": cat})

    if not all_nodes:
        return []

    scored_nodes = []
    for node in all_nodes:
        text = node.get("node", "")
        weight = node.get("weight", 0.5)

        # Importance proxy from weight (0–5 range → scale to 0–10)
        im = weight * 10

        # Semantic similarity (replaces word-overlap distance)
        sim = _semantic_similarity(observation, text)

        # Time decay
        created_tick = node.get("created_tick", current_tick)
        dt = max(0, current_tick - created_tick)

        score = (w1 * math.exp(-lam * dt)) + (w2 * (im / 10)) + (w3 * sim)

        scored_nodes.append({
            "text": text,
            "weight": weight,
            "category": node.get("_category", "functional"),
            "confidence": node.get("confidence", weight),
            "stability": node.get("stability", 0.5),
            "score": round(score, 4),
        })

    # Sort descending by score
    scored_nodes.sort(key=lambda x: x["score"], reverse=True)
    return scored_nodes[:top_k]
