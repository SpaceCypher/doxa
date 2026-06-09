import json
import asyncio
import random
from sqlmodel import Session, select
from typing import Dict, List
from ..models.db import engine, GlobalState, Agent, Cognition
from .llm import batch_infer_actions

COMPILER_PROMPT = """
You are the Belief -> Law Compiler for an artificial life simulation.
The agents in the simulation have formed a strong collective belief. Your job is to translate this natural language belief into a strict JSON representation of a physics law.

The JSON MUST conform to this exact schema and use ONLY the supported values below:
{
    "target_action": "EAT" | "MOVE" | "ATTACK" | "BUILD" | "FARM" | "GATHER" | "COMMUNICATE" | "TRADE" | "INVENT_BELIEF",
    "condition": "near_water" | "near_forest" | "near_mountain" | "near_structure" | "always" | "in_enemy_territory" | "at_war" | "is_military" | "is_priest",
    "effect_type": "satiety" | "stamina" | "health" | "damage_multiplier" | "trust_bonus",
    "effect_value": <float>
}

Example Belief: "Water is Sacred"
Output JSON: {"target_action": "EAT", "condition": "near_water", "effect_type": "satiety", "effect_value": 20.0}

Example Belief: "Warriors shall lead"
Output JSON: {"target_action": "ATTACK", "condition": "is_military", "effect_type": "damage_multiplier", "effect_value": 1.5}

Example Belief: "The forest drains our soul"
Output JSON: {"target_action": "MOVE", "condition": "near_forest", "effect_type": "stamina", "effect_value": -5.0}

Convert the following emergent belief into a physics law JSON object. Output ONLY the JSON.

Belief: "{belief_text}"
"""

async def compile_belief_to_law(belief_text: str) -> Dict:
    prompt_text = COMPILER_PROMPT.format(belief_text=belief_text)
    try:
        results = await batch_infer_actions([{"text": prompt_text}])
        result_text = results[0]
        # Clean up markdown formatting if the LLM added it
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split("```")[0].strip()
        elif "```" in result_text:
            result_text = result_text.split("```")[1].strip()
            
        law_json = json.loads(result_text)
        # Add the original text for reference
        law_json["original_belief"] = belief_text
        return law_json
    except Exception as e:
        print(f"[Law Compiler] Failed to compile belief '{belief_text}': {e}")
        return None

# ─────────────────────────────────────────────────────────────────────────────
# LOOP 1 — Collective Belief → Physics Law
# ─────────────────────────────────────────────────────────────────────────────
async def detect_belief_laws(session: Session):
    state = session.exec(select(GlobalState).where(GlobalState.session_id == "default")).first()
    if not state: return

    agents = session.exec(select(Agent)).all()
    total_agents = len(agents)
    if total_agents == 0: return
    
    cognitions = session.exec(select(Cognition)).all()
    
    belief_stats = {} # belief -> {"count": int, "sum_weight": float}
    
    for cog in cognitions:
        graph = dict(cog.belief_graph) if cog.belief_graph else {}
        for b in graph.get("theological", []):
            node = b.get("node")
            weight = b.get("weight", 0.0)
            if node and weight >= 0.8:
                if node not in belief_stats:
                    belief_stats[node] = {"count": 0, "sum_weight": 0.0}
                belief_stats[node]["count"] += 1
                belief_stats[node]["sum_weight"] += weight
                
    current_laws = list(state.laws) if state.laws else []
    existing_beliefs = [law.get("original_belief") for law in current_laws]
    
    new_laws_added = False
    for belief, stats in belief_stats.items():
        if stats["count"] / total_agents >= 0.60:
            if belief not in existing_beliefs:
                print(f"[Pattern Detector] Strong collective belief detected: '{belief}'. Compiling into Law...")
                compiled_law = await compile_belief_to_law(belief)
                if compiled_law:
                    print(f"[Pattern Detector] New Law Enacted: {compiled_law}")
                    current_laws.append(compiled_law)
                    new_laws_added = True
                    
                    # Announce via Lore
                    from .lore import add_global_lore_event
                    add_global_lore_event(
                        f"The collective belief '{belief}' has become so powerful it warped reality itself. A new Law of Physics was born: {json.dumps(compiled_law)}",
                        state.current_tick
                    )
                    
    if new_laws_added:
        state.laws = current_laws
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(state, "laws")
        session.add(state)
        session.commit()

# ─────────────────────────────────────────────────────────────────────────────
# LOOP 2 — Death Clusters → World Adaptation
# ─────────────────────────────────────────────────────────────────────────────
def detect_death_clusters(session: Session):
    """
    Scans death_markers for spatial clusters. If 3+ deaths of the same cause 
    occur within a 20x20 zone, the world adapts:
    - Dehydration cluster → spawn Water nodes
    - Combat cluster     → create Battlefield scar (terrain type 6), spawn Gold
    - Starvation cluster → boost global food respawn for 20 ticks
    """
    state = session.exec(select(GlobalState).where(GlobalState.session_id == "default")).first()
    if not state: return

    death_markers = list(state.death_markers) if state.death_markers else []
    if not death_markers:
        return

    # Group deaths by 20x20 zone and cause
    zone_cause_counts = {}
    for marker in death_markers:
        x, y, cause = marker.get("x", 0), marker.get("y", 0), marker.get("cause", "unknown")
        zone = f"{x // 20}_{y // 20}"
        key = f"{zone}_{cause}"
        zone_cause_counts[key] = zone_cause_counts.get(key, 0) + 1

    cpr = dict(state.common_pool_resources) if state.common_pool_resources else {}
    resources = list(cpr.get("resources", []))
    world_map = list(state.world_map) if state.world_map else []
    physics_constants = dict(state.physics_constants) if state.physics_constants else {}
    
    adapted = False
    triggered_zones = set()

    for key, count in zone_cause_counts.items():
        if count < 3:
            continue
        
        # Parse zone and cause from key
        parts = key.rsplit("_", 1)
        if len(parts) != 2:
            continue
        zone_key, cause = parts[0], parts[1]
        
        if zone_key in triggered_zones:
            continue
        triggered_zones.add(zone_key)
        
        zone_parts = zone_key.split("_")
        if len(zone_parts) != 2:
            continue
        zx, zy = int(zone_parts[0]) * 20 + 10, int(zone_parts[1]) * 20 + 10  # center of zone

        if cause == "dehydration":
            # Spawn 3 water nodes in this zone
            print(f"[World Adaptation] Dehydration cluster in zone ({zx},{zy}) → Spawning Water nodes")
            for _ in range(3):
                wx = max(0, min(99, zx + random.randint(-8, 8)))
                wy = max(0, min(99, zy + random.randint(-8, 8)))
                resources.append({
                    "id": f"adapt_{wx}_{wy}",
                    "type": "Water",
                    "x": wx,
                    "y": wy,
                    "amount": 200,
                    "crop_age": None
                })
            adapted = True
            from .lore import add_global_lore_event
            add_global_lore_event(
                f"The land wept for the dehydrated dead. Springs burst from the earth near ({zx},{zy}) at Tick {state.current_tick}.",
                state.current_tick
            )

        elif cause == "combat wounds":
            # Create Battlefield scar: mark terrain as type 6, spawn Gold
            print(f"[World Adaptation] Combat cluster in zone ({zx},{zy}) → Creating Battlefield scar + Gold spawn")
            if world_map:
                # Mark 5 cells near zone center as Battlefield (terrain type 6)
                for _ in range(5):
                    bx = max(0, min(99, zx + random.randint(-5, 5)))
                    by = max(0, min(99, zy + random.randint(-5, 5)))
                    if 0 <= by < len(world_map) and 0 <= bx < len(world_map[0]):
                        # Only scar walkable terrain (not water/mountain)
                        if world_map[by][bx] not in [0, 1, 5]:
                            world_map[by][bx] = 6  # Battlefield
            # Spawn Gold from the battlefield
            resources.append({
                "id": f"gold_{zx}_{zy}",
                "type": "Gold",
                "x": zx,
                "y": zy,
                "amount": 150,
                "crop_age": None
            })
            adapted = True
            from .lore import add_global_lore_event
            add_global_lore_event(
                f"The blood of the fallen sanctified the ground near ({zx},{zy}). A Battlefield scar now marks the land. Gold glistens among the ruins at Tick {state.current_tick}.",
                state.current_tick
            )

        elif cause == "starvation":
            # Boost global food respawn for 20 ticks
            print(f"[World Adaptation] Starvation cluster → Global food respawn boost for 20 ticks")
            physics_constants["food_respawn_bonus"] = {"multiplier": 2.0, "expires_tick": state.current_tick + 20}
            adapted = True
            from .lore import add_global_lore_event
            add_global_lore_event(
                f"The earth mourned the starved. In answer, the soil grew more fertile — food respawns at double rate for 20 ticks. This mercy began at Tick {state.current_tick}.",
                state.current_tick
            )

    if adapted:
        cpr["resources"] = resources
        state.common_pool_resources = cpr
        state.world_map = world_map
        state.physics_constants = physics_constants
        # Clear processed death markers to avoid re-triggering
        state.death_markers = []
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(state, "common_pool_resources")
        flag_modified(state, "world_map")
        flag_modified(state, "physics_constants")
        flag_modified(state, "death_markers")
        session.add(state)
        session.commit()

# ─────────────────────────────────────────────────────────────────────────────
# LOOP 3 — Emergent Settlement Detection
# ─────────────────────────────────────────────────────────────────────────────
def detect_settlements(session: Session):
    """
    If 3+ structures by different agents are within radius 15 of each other,
    declare a Settlement zone. Settlement zones give +5 health regen and +20%
    crop maturity speed to agents inside them.
    """
    state = session.exec(select(GlobalState).where(GlobalState.session_id == "default")).first()
    if not state: return

    cpr = dict(state.common_pool_resources) if state.common_pool_resources else {}
    structures = list(cpr.get("structures", []))
    if len(structures) < 3:
        return

    physics_constants = dict(state.physics_constants) if state.physics_constants else {}
    existing_settlements = physics_constants.get("settlements", [])
    existing_centers = [(s["cx"], s["cy"]) for s in existing_settlements]

    new_settlements = list(existing_settlements)
    adapted = False

    # Cluster: for each structure, find all structures within radius 15
    for i, s in enumerate(structures):
        sx, sy = s.get("x", 0), s.get("y", 0)
        
        cluster = [s]
        builders = {s.get("builder")}
        for j, other in enumerate(structures):
            if i == j:
                continue
            ox, oy = other.get("x", 0), other.get("y", 0)
            if abs(sx - ox) + abs(sy - oy) <= 15:
                cluster.append(other)
                builders.add(other.get("builder"))

        # Need 3+ structures by different agents (at least 2 different builders)
        if len(cluster) >= 3 and len(builders) >= 2:
            # Compute centroid
            cx = int(sum(c.get("x", 0) for c in cluster) / len(cluster))
            cy = int(sum(c.get("y", 0) for c in cluster) / len(cluster))

            # Don't create duplicate settlement near existing one
            too_close = any(abs(cx - ec[0]) + abs(cy - ec[1]) <= 20 for ec in existing_centers)
            if not too_close:
                settlement_name = f"Settlement of {cluster[0].get('structure', 'Stones')}"
                new_settlements.append({"cx": cx, "cy": cy, "name": settlement_name, "radius": 12})
                existing_centers.append((cx, cy))
                adapted = True
                print(f"[World Adaptation] Emergent Settlement detected: '{settlement_name}' at ({cx},{cy})")
                from .lore import add_global_lore_event
                add_global_lore_event(
                    f"Through collective labor, a {settlement_name} emerged near ({cx},{cy}) at Tick {state.current_tick}. The zone now radiates vitality — +5 health regen, faster crops.",
                    state.current_tick
                )

    if adapted:
        physics_constants["settlements"] = new_settlements
        state.physics_constants = physics_constants
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(state, "physics_constants")
        session.add(state)
        session.commit()

# ─────────────────────────────────────────────────────────────────────────────
# LOOP 4 — Democratic Action → Global Physics Constants
# ─────────────────────────────────────────────────────────────────────────────
def detect_dominant_action(session: Session):
    """
    Reads the action_tally accumulated over the last 100 ticks.
    If 60%+ of actions share one type, modifies physics_constants accordingly:
    - ATTACK majority  → resources deplete 20% faster (war economy)
    - FARM majority    → crop maturity 2 ticks faster (agricultural revolution)
    - COMMUNICATE maj. → Asabiyyah gains 10% faster (golden age of dialogue)
    - BUILD majority   → structure durability +10 (architectural age)
    """
    state = session.exec(select(GlobalState).where(GlobalState.session_id == "default")).first()
    if not state: return

    physics_constants = dict(state.physics_constants) if state.physics_constants else {}
    action_tally = dict(physics_constants.get("action_tally", {}))
    total = sum(action_tally.values())
    
    if total == 0:
        return

    dominant_action = max(action_tally, key=action_tally.get)
    dominant_count = action_tally[dominant_action]
    dominant_pct = dominant_count / total

    if dominant_pct < 0.60:
        # No dominant action, reset to defaults
        physics_constants.pop("satiety_decay_multiplier", None)
        physics_constants.pop("crop_maturity_bonus", None)
        physics_constants.pop("asabiyyah_gain_multiplier", None)
        physics_constants.pop("structure_durability_bonus", None)
        physics_constants.pop("dominant_action", None)
    else:
        # Clear old effects first
        physics_constants.pop("satiety_decay_multiplier", None)
        physics_constants.pop("crop_maturity_bonus", None)
        physics_constants.pop("asabiyyah_gain_multiplier", None)
        physics_constants.pop("structure_durability_bonus", None)

        physics_constants["dominant_action"] = dominant_action
        print(f"[Democratic Action] Dominant action: {dominant_action} ({dominant_pct:.0%}) → rewriting physics")

        from .lore import add_global_lore_event

        if dominant_action == "ATTACK":
            physics_constants["satiety_decay_multiplier"] = 1.2  # 20% faster depletion
            add_global_lore_event(
                f"War consumes all. With {dominant_pct:.0%} of agents fighting, resources deplete 20% faster. The War Economy age begins at Tick {state.current_tick}.",
                state.current_tick
            )
        elif dominant_action in ("FARM", "GATHER"):
            physics_constants["crop_maturity_bonus"] = -2  # 2 ticks faster maturity
            add_global_lore_event(
                f"The fields yield abundantly. With {dominant_pct:.0%} of agents farming, crops mature 2 ticks faster. The Agricultural Revolution begins at Tick {state.current_tick}.",
                state.current_tick
            )
        elif dominant_action == "COMMUNICATE":
            physics_constants["asabiyyah_gain_multiplier"] = 1.10  # 10% faster asabiyyah
            add_global_lore_event(
                f"Dialogue reshapes civilization. With {dominant_pct:.0%} of agents communicating, Asabiyyah builds 10% faster. The Golden Age of Dialogue begins at Tick {state.current_tick}.",
                state.current_tick
            )
        elif dominant_action == "BUILD":
            physics_constants["structure_durability_bonus"] = 10
            add_global_lore_event(
                f"The builders lead. With {dominant_pct:.0%} of agents constructing, new structures gain +10 durability. The Architectural Age begins at Tick {state.current_tick}.",
                state.current_tick
            )

    # Reset tally for next 100-tick window
    physics_constants["action_tally"] = {}
    state.physics_constants = physics_constants
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(state, "physics_constants")
    session.add(state)
    session.commit()


def apply_laws(agent: Agent, action_type: str, effect_type: str, base_value: float, laws: List[Dict], world_context: Dict) -> float:
    """
    Applies any active laws that match the action_type and effect_type.
    Returns the modified value.
    """
    modified_value = base_value
    for law in laws:
        if law.get("target_action") == action_type and law.get("effect_type") == effect_type:
            condition = law.get("condition")
            condition_met = False
            
            if condition == "always":
                condition_met = True
            elif condition == "near_water" and world_context.get("terrain_id") in [0, 1]:
                condition_met = True
            elif condition == "near_forest" and world_context.get("terrain_id") == 4:
                condition_met = True
            elif condition == "near_mountain" and world_context.get("terrain_id") == 5:
                condition_met = True
            elif condition == "near_structure" and world_context.get("near_structure"):
                condition_met = True
            elif condition == "in_enemy_territory" and world_context.get("in_enemy_territory"):
                condition_met = True
            elif condition == "at_war" and world_context.get("at_war"):
                condition_met = True
            elif condition == "is_military" and agent.social_status in ["Soldier", "Warrior"]:
                condition_met = True
            elif condition == "is_priest" and agent.social_status == "Priest":
                condition_met = True
                
            if condition_met:
                print(f"[Law Engine] Applying law '{law.get('original_belief')}' to Agent {agent.agent_id} ({action_type} -> {effect_type})")
                if effect_type == "damage_multiplier":
                    modified_value *= float(law.get("effect_value", 1.0))
                else:
                    modified_value += float(law.get("effect_value", 0.0))
                    
    return modified_value

async def run_pattern_detector(session: Session):
    """
    Main entry point for the Autonomous Growth loops.
    Called periodically (every 50 ticks for Loops 1+2+3, every 100 ticks for Loop 4).
    """
    state = session.exec(select(GlobalState).where(GlobalState.session_id == "default")).first()
    if not state:
        return

    # Loop 1: Beliefs → Laws (every 50 ticks)
    await detect_belief_laws(session)

    # Loop 2: Death Clusters → World Adaptation (every 50 ticks)
    detect_death_clusters(session)

    # Loop 3: Settlement Detection (every 50 ticks)
    detect_settlements(session)

    # Loop 4: Democratic Action → Physics Constants (every 100 ticks)
    if state.current_tick > 0 and state.current_tick % 100 == 0:
        detect_dominant_action(session)
