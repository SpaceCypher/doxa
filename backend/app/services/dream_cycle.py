import json
import asyncio
from sqlmodel import Session, select
from ..models.db import engine, Cognition, GlobalState
from .caltrop import validator
from .llm import get_client


async def synthesize_beliefs_from_logs(agent_id: str, logs: list) -> list:
    """
    Sends the agent's episodic working_memory to the LLM for 'Graph of Thoughts'
    synthesis. Returns a list of new belief node dicts with confidence + stability.
    """
    if not logs:
        return []

    prompt = f"""You are the Dream Cycle compiler for Agent {agent_id}.
Below is the agent's episodic working memory from the past day:
{chr(10).join(logs)}

Your task: perform a 'Graph of Thoughts' analogy synthesis.
Extract semantic heuristics and causal beliefs from these raw experiences.
Output an array of JSON objects representing new Belief Nodes.

Categories allowed: "functional", "relational", "theological".
- "functional"   → practical survival rules ("I must eat before exploring")
- "relational"   → rules about other agents ("Agent X is untrustworthy")
- "theological"  → metaphysical beliefs about inexplicable events ("The Great Giver rewards patience")

If you encounter something logically inexplicable (a sudden resource flood, a plague with no cause),
create a "theological" God Node to resolve the Free Energy dissonance.

For each belief, also estimate:
- "confidence" (0.0–1.0): How certain is the agent about this? Recent vivid events = high confidence.
- "stability"  (0.0–1.0): How resistant is this belief to change? Core survival rules = high stability.
- "weight"     (0.0–1.0): Bayesian weight / importance. High = agent acts on this often.

Output ONLY a valid JSON array, for example:
[
  {{"category": "functional", "node": "Gathering food near water yields more resources", "weight": 0.75, "confidence": 0.8, "stability": 0.6}},
  {{"category": "theological", "node": "The Invisible Hand provides abundance without warning", "weight": 0.9, "confidence": 0.7, "stability": 0.9}}
]
"""
    try:
        client, model_name = get_client()
        response = await client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "You output valid JSON only. No markdown, no commentary."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.6,
            max_tokens=1024,
        )
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```json"):
            raw = raw[7:]
        if raw.startswith("```"):
            raw = raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]

        return json.loads(raw.strip())
    except Exception as e:
        print(f"[DreamCycle] LLM error for Agent {agent_id}: {e}")
        return []


async def run_dream_cycle() -> int:
    """
    Nightly offline compilation.

    For every agent with working_memory logs:
    1. Calls the LLM to synthesise new belief nodes (with confidence + stability).
    2. Merges new nodes into the existing belief_graph.
       - If a belief already exists (node text match), increment times_reinforced
         and recalculate stability = 1 - 1/(1 + times_reinforced).
    3. Applies Bayesian nightly decay to unreinforced beliefs.
    4. Prunes beliefs below stubbornness threshold.
    5. Flushes working_memory.
    6. Writes significant new theological beliefs to the Akashic Records (ChromaDB).

    Returns: number of agents processed.
    """
    processed = 0
    with Session(engine) as session:
        cognitions = session.exec(select(Cognition)).all()

        async def process_agent(cog: Cognition):
            logs = list(cog.working_memory) if cog.working_memory else []
            if not logs:
                return None
            new_beliefs = await synthesize_beliefs_from_logs(cog.agent_id, logs)
            return (cog, new_beliefs)

        tasks = [process_agent(c) for c in cognitions]
        results = await asyncio.gather(*tasks)

        state = session.exec(select(GlobalState).where(GlobalState.session_id == "default")).first()
        current_tick = state.current_tick if state else 0

        for res in results:
            if not res:
                continue
            cog, new_beliefs = res

            # Fetch agent personality for stubbornness
            from ..models.db import Agent
            agent = session.exec(select(Agent).where(Agent.agent_id == cog.agent_id)).first()
            beta = dict(agent.personality).get("beta", 0.5) if agent and agent.personality else 0.5
            civ_id = agent.civilization_id if agent else "civ_a"
            theta = 1.0 - beta  # stubbornness threshold

            graph = dict(cog.belief_graph) if cog.belief_graph else {
                "functional": [], "relational": [], "theological": []
            }

            # ── Bayesian nightly decay of unreinforced beliefs ─────────────
            for cat in ["functional", "relational", "theological"]:
                if cat not in graph:
                    graph[cat] = []
                    continue
                pruned = []
                for n in graph[cat]:
                    w = max(0.0, n.get("weight", 0.5) - 0.05)
                    if w >= (0.3 * theta):
                        pruned.append({**n, "weight": round(w, 3)})
                graph[cat] = pruned

            # ── Merge new beliefs from LLM ─────────────────────────────────
            new_theological_for_lore = []

            for b in new_beliefs:
                cat = b.get("category", "functional")
                node_text = b.get("node", "").strip()
                if not node_text:
                    continue

                # Caltrop validation
                if not validator.validate_belief(node_text):
                    continue

                if cat not in graph:
                    graph[cat] = []

                # Check if belief already exists (exact or near-match)
                existing = next(
                    (n for n in graph[cat] if n.get("node", "").strip().lower() == node_text.lower()),
                    None,
                )

                if existing:
                    # Reinforce existing belief
                    tr = existing.get("times_reinforced", 0) + 1
                    new_stability = round(1.0 - 1.0 / (1.0 + tr), 3)
                    new_confidence = round(min(1.0, existing.get("confidence", 0.5) + 0.05), 3)
                    new_weight = round(min(1.0, existing.get("weight", 0.5) + b.get("weight", 0.5) * 0.1), 3)
                    existing.update({
                        "times_reinforced": tr,
                        "stability": new_stability,
                        "confidence": new_confidence,
                        "weight": new_weight,
                    })
                else:
                    # New belief node
                    new_node = {
                        "node": node_text,
                        "weight": round(b.get("weight", 0.5), 3),
                        "confidence": round(b.get("confidence", 0.5), 3),
                        "stability": round(b.get("stability", 0.3), 3),
                        "created_tick": current_tick,
                        "times_reinforced": 0,
                    }
                    graph[cat].append(new_node)

                    # Queue significant theological beliefs for Akashic Records
                    if cat == "theological" and new_node["weight"] >= 0.7:
                        new_theological_for_lore.append(new_node)

            cog.belief_graph = graph
            cog.working_memory = []  # Flush episodic logs after compilation

            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(cog, "belief_graph")
            flag_modified(cog, "working_memory")
            session.add(cog)
            processed += 1

            # ── Write significant theological beliefs to Akashic Records ───
            if new_theological_for_lore:
                from .lore import add_lore_event
                for theo in new_theological_for_lore:
                    lore_text = (
                        f"Agent {cog.agent_id} developed a new sacred belief: \"{theo['node']}\" "
                        f"(Confidence: {theo['confidence']:.2f}, Stability: {theo['stability']:.2f})"
                    )
                    add_lore_event(civ_id, lore_text, current_tick, cog.agent_id)

        session.commit()

    return processed
