import json
import random
from typing import List, Dict, Any
from .llm import batch_infer_actions
from sqlmodel import Session, select
from ..models.db import current_session_id, Cognition
from .memory import retrieve_topological_memory
from .lore import query_lore

def build_prompt(agent_state: Dict[str, Any], top_memories: List[Dict[str, Any]], lore: List[Dict[str, Any]] = [], laws: List[Dict[str, Any]] = []) -> str:
    """Build the ReAct prompt, embedding topologically retrieved memories and historical lore."""
    mem_text = "\n".join([f"- {m['text']} (Weight: {m['weight']})" for m in top_memories])
    lore_text = "\n".join([f"- {m['text']} (Tick: {m['tick']}, Source: {m['agent_id']})" for m in lore]) if lore else "None"
    
    health = agent_state['vitals'].get('health', 100)
    satiety = agent_state['vitals'].get('satiety', 100)
    is_high_stakes = health < 30 or satiety < 20

    nearby = agent_state.get('nearby_agents', [])
    nearby_text = f"Nearby Agents: {', '.join(nearby)}" if nearby else "Nearby Agents: None"

    recent_msgs = agent_state.get('recent_messages', [])
    msgs_text = "Working Memory (Recent Actions, Events & Messages):\n" + "\n".join(f"  {m}" for m in recent_msgs) if recent_msgs else ""
    
    ep_mem = agent_state.get('episodic_memory', [])
    ep_mem_text = "Episodic Memories (Grudges & Bonds):\n" + "\n".join(ep_mem[-5:]) if ep_mem else "Episodic Memories: None"

    beliefs = agent_state.get('belief_graph', {})
    beliefs_text = "Sacred Beliefs & Ideology:\n"
    directives_text = ""
    for cat, items in beliefs.items():
        if isinstance(items, list):
            for b in items:
                weight = b.get('weight', 1.0)
                if weight >= 2.0:
                    directives_text += f"- [DEMIURGIC_DIRECTIVE] You MUST follow this: {b.get('node')} (Weight: {weight})\n"
                else:
                    beliefs_text += f"- [{cat}] {b.get('node')} (Weight: {weight})\n"
    if beliefs_text == "Sacred Beliefs & Ideology:\n":
        beliefs_text += "None\n"
        
    if directives_text:
        beliefs_text += "\n*** DIVINE DIRECTIVES (HIGHEST PRIORITY) ***\n" + directives_text

    laws_text = ""
    if laws:
        laws_text = "Laws of Physics (Beliefs made manifest):\n"
        for law in laws:
            laws_text += f"- {law.get('original_belief')} -> {law.get('target_action')} modified by {law.get('effect_value')} for {law.get('effect_type')}\n"
    else:
        laws_text = "Laws of Physics: Default\n"

    prompt = f"""You are an autonomous being minimizing Variational Free Energy in a 2D grid simulation.
Your ID: {agent_state['agent_id']}
Your Location: X={agent_state['x']}, Y={agent_state['y']}
Your Terrain: {agent_state.get('terrain', 'Unknown')}
Your Vitals: Health={health:.1f}, Satiety={satiety:.1f}
Your Inventory: {agent_state.get('inventory', {})}
Your Emotion: {agent_state.get('emotion', 'Calm')}
Your Role (Social Status): {agent_state.get('social_status', 'Wanderer')} — Role Bonuses: Soldier=+50% attack dmg & -50% dmg taken | Priest=beliefs spread at 1.4x weight & decay 2x slower | Farmer=food-efficient, crops bonus | Elder=wise, no role clobber | Wanderer=no bonus
Your Personality: {agent_state.get('personality', {'alpha': 0.5, 'beta': 0.5, 'gamma': 0.5})}
{nearby_text}
Nearby Objects: {', '.join(agent_state.get('nearby_objects', [])) if agent_state.get('nearby_objects') else 'None'}

{msgs_text}

{ep_mem_text}

{laws_text}

{beliefs_text}

Relevant Memories (Topological Retrieval):
{mem_text}

Akashic Records (Historical Lore):
{lore_text}

Intrinsic Needs (Maslow's Hierarchy):
1. Physiological: You must maintain Health and Satiety at 100. Starvation (Satiety < 20) leads to death. Find Food!
2. Security: Accumulate excess wood and water for future survival.
3. Social/Belonging: Build trust networks with nearby agents through trade and communication.
4. Self-Actualization: Explore the map, expand your civilization, or invent ideologies.

Psychological Profile:
- Alpha (Aggression/Dominance): High alpha means you are predisposed to zero-sum thinking. You may choose to ATTACK others to steal resources if it benefits your survival, or hold long-term Grudges.
- Beta (Empathy/Cooperation): High beta means you prefer positive-sum outcomes. You prefer to TRADE and COMMUNICATE to build alliances or express Grief over fallen comrades.
- Gamma (Curiosity/Exploration): High gamma means you prioritize long-term knowledge. You prefer to MOVE and explore the unknown, and INVENT_BELIEF to create religious/ideological movements.

Rules:
- Satiety drops over time. 
- {"CIVIL WAR ACTIVE. Your civilization is collapsing. You may freely attack your own kin." if agent_state.get('force_combat') else "Standard operations."}
- Territory: You are in zone {agent_state.get('territory_zone', 'unclaimed')}. {'⚔️ ENEMY TERRITORY — trespassing drains your health!' if agent_state.get('in_enemy_territory') else '🏠 Safe zone.'}
- Terrain Rules: Deep Water slowly drowns you (-5 health/tick) and requires 10 stamina to enter. Mountains are IMPASSABLE. Forests provide 2x wood but cost 3 stamina to enter. Sand costs 2 stamina. Grass costs 1 stamina.
- War Status: {'AT WAR' if agent_state.get('at_war') else 'At peace'}.
- Available actions:
  - {{"type": "MOVE", "dx": int, "dy": int}} (dx, dy in [-1, 1])
  - {{"type": "EAT"}} (Must be ON or ADJACENT to a **Food** resource. NOTE: 'Crop' is NOT Food — it takes 10 ticks to mature. Only eat items listed as 'Food at X=...' not 'Crop at X=...')
  - {{"type": "FARM"}} (Plant a crop at your current tile. MUST BE ON GRASS terrain. Crop matures into Food after 10 ticks — then you or any agent can EAT it. Costs 10 stamina.)
  - {{"type": "GATHER", "resource": "wood|water|food|stone|gold"}} (Gathers 10 of the resource from your surroundings into your inventory. Gold is rare and precious — used for high-value trades. Do this in Forests for double wood!)
  - {{"type": "TRADE", "target": "agent_id", "offer": {{"wood": 5}}, "request": {{"food": 5}}}} (Atomically swap resources. Builds trust. Gold is accepted. Must be within distance 5.)
  - {{"type": "COMMUNICATE", "target": "agent_id", "message": "string"}} (Coordinate with nearby agents, spread beliefs, or gossip. Priests gain extra trust per message.)
  - {{"type": "BUILD", "structure": "string"}} (Costs 20 stamina. MUST BE ON SOLID GROUND (Grass, Sand, Forest). Choose a structure that permanently changes your role: "Temple" → Priest (beliefs spread stronger, decay slower), "Barracks" → Soldier (+50% damage dealt, -50% damage taken), "Granary" → Farmer (+50 food on build, claims fertile territory). Claims a territory zone.)
  - {{"type": "ATTACK", "target": "agent_id"}} (Deals 15 base damage. Soldiers deal 1.5× damage. Pillages 20% of target's inventory on hit.)
  - {{"type": "INVENT_BELIEF", "belief": "string"}} (Costs 10 stamina. Invent a Sacred Value or ideology — Priests' invented beliefs start at higher weight.)
  - {{"type": "IDLE"}}

Given your environment and the agents around you, deduce the action that best fulfills your current most pressing need according to your personality.
"""

    if is_high_stakes:
        prompt += """
CRITICAL: High-stakes mode! You must perform a Tree of Thoughts internal debate. Simulate two distinct possible actions (futures).
For each future, estimate the resulting health and satiety (THESE MUST BE NUMBERS/INTEGERS, DO NOT USE WORDS like "thirty").
Output ONLY valid JSON matching this exact schema:
{
  "futures": [
    {"action": {"type": "EAT"}, "expected_health": 40, "expected_satiety": 60, "free_energy": 0.1},
    {"action": {"type": "MOVE", "dx": 1, "dy": 0}, "expected_health": 20, "expected_satiety": 10, "free_energy": 0.5}
  ]
}
"""
    else:
        prompt += """
You must output ONLY valid JSON matching this schema:
{
  "thoughts": "Your ReAct monologue",
  "action": { "type": "MOVE", "dx": 1, "dy": 0 }
}
"""
    return prompt

def parse_action(raw_response: str, agent_state: Dict[str, Any]) -> Dict[str, Any]:
    """Parse the JSON response from the LLM, evaluate Utility if in futures mode."""
    try:
        raw = raw_response.strip()
        if raw.startswith("```json"):
            raw = raw[7:]
        if raw.startswith("```"):
            raw = raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]
            
        data = json.loads(raw.strip())
        
        if "futures" in data and isinstance(data["futures"], list) and len(data["futures"]) > 0:
            # Tree of Thoughts evaluation: U(a) = -(FreeEnergy + gamma * Deviation)
            gamma = agent_state.get("personality", {}).get("gamma", 1.0)
            best_action = data["futures"][0].get("action", {"type": "IDLE"})
            best_u = -float('inf')
            
            for future in data["futures"]:
                fe = future.get("free_energy", 1.0)
                eh = future.get("expected_health", 0.0)
                es = future.get("expected_satiety", 0.0)
                dev = (100.0 - eh) + (100.0 - es)
                u = -(fe + gamma * dev)
                
                if u > best_u:
                    best_u = u
                    best_action = future.get("action", {"type": "IDLE"})
            best_action["reasoning"] = f"Tree of Thoughts selected future with expected Utility = {best_u:.2f}"
            return best_action
        else:
            action = data.get("action", {"type": "IDLE"})
            if "thoughts" in data:
                action["reasoning"] = data["thoughts"]
            return action
            
    except Exception as e:
        print(f"Failed to parse LLM output: {raw_response} Error: {e}")
        return {"type": "IDLE", "reasoning": f"[Error] LLM Generation Failed: {str(e)}"}

async def run_cognitive_loop(agents_data: List[Dict[str, Any]], session: Session) -> List[Dict[str, Any]]:
    """Generates prompts with memories, queries LLM, returns actions."""
    if not agents_data:
        return []
        
    from ..models.db import GlobalState
    state = session.exec(select(GlobalState).where(GlobalState.session_id == current_session_id.get()).where(GlobalState.session_id == current_session_id.get()).where(GlobalState.session_id == current_session_id.get())).first()
    active_laws = list(state.laws) if state and state.laws else []
    
    
    # Bug C Fix: Only query LLM for Operation agents — Apprentices don't make independent decisions
    operation_indices = [i for i, a in enumerate(agents_data) if a.get('status', 'Operation') == 'Operation']
    operation_agents = [agents_data[i] for i in operation_indices]
    
    prompts = []
    for a in operation_agents:
        # Retrieve graph
        cog = session.exec(select(Cognition).where(Cognition.session_id == current_session_id.get()).where(Cognition.session_id == current_session_id.get()).where(Cognition.agent_id == a['agent_id'])).first()
        graph = dict(cog.belief_graph) if cog and cog.belief_graph else {}
        a['belief_graph'] = graph
        a['episodic_memory'] = list(cog.episodic_memory) if cog and cog.episodic_memory else []
        
        # Inject messages + ALL episodic working memory into agent state
        wm = list(cog.working_memory) if cog and cog.working_memory else []
        # BUG FIX: previously only "[Message..." prefixed entries reached the LLM.
        # Now we include ALL working_memory entries (actions, events, messages, witnesses)
        # but cap at the last 15 to keep token count reasonable.
        a['recent_messages'] = wm[-15:] if wm else []

        # Observation should include vitals, nearby objects, and nearby agents
        nearby_obj = ', '.join(a.get('nearby_objects', []))
        nearby_agt = ', '.join(a.get('nearby_agents', []))
        inv = a.get('inventory', {})
        obs = f"Health {a['vitals'].get('health')} Satiety {a['vitals'].get('satiety')} Inv: {inv} Objects: {nearby_obj} Agents: {nearby_agt}"
        
        mems = retrieve_topological_memory(graph, obs, current_tick=a.get('current_tick', 0), top_k=5)
        
        # Query Akashic Records (Lore)
        lore_results = query_lore(session_id=current_session_id.get(), civ_id=a.get('civilization_id', 'civ_a'), query_text=obs, n_results=3)
        
        prompts.append({"text": build_prompt(a, mems, lore_results, active_laws)})
    
    if not prompts:
        # All agents are apprentices, return IDLE for everyone
        return [{"type": "IDLE", "reasoning": "Apprenticeship - no action"} for _ in agents_data]
    
    print(f"Calling batch_infer_actions with {len(prompts)} prompts")
    raw_responses = await batch_infer_actions(prompts)
    print("batch_infer_actions completed!")
    operation_actions = [parse_action(resp, a) for resp, a in zip(raw_responses, operation_agents)]
    
    # Re-expand: fill Apprentice slots with IDLE
    all_actions = [{"type": "IDLE", "reasoning": "Apprenticeship - learning from elders"} for _ in agents_data]
    for idx, action in zip(operation_indices, operation_actions):
        all_actions[idx] = action
    
    return all_actions

def update_cognition_state(session: Session, agent_id: str, action: Dict[str, Any]) -> None:
    """Updates the agent's working memory with the episodic log and rich monologue."""
    cognition = session.exec(select(Cognition).where(Cognition.session_id == current_session_id.get()).where(Cognition.session_id == current_session_id.get()).where(Cognition.agent_id == agent_id)).first()
    if not cognition:
        return
        
    # 1. Lexicon Drift
    lexicon = dict(cognition.lexicon_hash) if cognition.lexicon_hash else {"Food": "Nourishment", "Danger": "Threat"}
    if random.random() < 0.05 and lexicon:
        key = random.choice(list(lexicon.keys()))
        val = lexicon[key]
        mutations = ['a', 'e', 'i', 'o', 'u', 's', 'th', 'ing']
        lexicon[key] = val + random.choice(mutations)
    cognition.lexicon_hash = lexicon
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(cognition, "lexicon_hash")

    # 2. Append to Working Memory (Episodic Log) — capped at 20 entries (Bug A Fix)
    wm = list(cognition.working_memory) if cognition.working_memory else []
    
    action_type = action.get("type", "IDLE")
    reasoning = action.get("reasoning", "")
    if reasoning:
        wm.append(f"Action: {action_type} | Thoughts: {reasoning}")
    else:
        wm.append(f"Action: {action_type}")
    
    # Rolling window: keep only the last 20 memories to prevent token/storage explosion
    if len(wm) > 20:
        wm = wm[-20:]
        
    cognition.working_memory = wm
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(cognition, "working_memory")
    
    session.add(cognition)
