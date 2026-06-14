"""
economy.py — Phase 8: Civilization Depth

Handles:
1. Farming / Crop Growth — crops planted by agents mature into Food over time
2. Territory System    — building claims a 10×10 zone for a civilization
3. War Declaration     — inter-civ trust collapse triggers formal war state
"""
import uuid
import math
import random
from sqlmodel import Session, select
from ..models.db import current_session_id, engine, Agent, GlobalState, Cognition
from sqlalchemy.orm.attributes import flag_modified


# ─────────────────────────────────────────────
# 1. FARMING / CROP GROWTH
# ─────────────────────────────────────────────

CROP_MATURITY_TICKS = 10   # Ticks from planting to harvestable food
CROP_DECAY_TICKS    = 5    # Ticks a mature crop survives before rotting

def process_farming(resources: list, physics_constants: dict = None) -> list:
    """
    Bug 3 Fix: Accepts the live resources list from physics.py directly — does NOT
    read/write the DB itself to avoid overwrite races.
    Ages all Crop resources; promotes mature ones to Food nodes.
    Applies Loop 4 crop maturity bonus if agricultural revolution is active.
    Returns the updated resources list.
    """
    updated = []
    for r in resources:
        if r.get("type") != "Crop":
            updated.append(r)
            continue

        age = r.get("crop_age", 0) + 1
        r = dict(r)  # shallow copy so we don't mutate the original reference
        r["crop_age"] = age

        if physics_constants:
            maturity_bonus = physics_constants.get("crop_maturity_bonus", 0)
        else:
            maturity_bonus = 0

        maturity_ticks = max(1, CROP_MATURITY_TICKS + maturity_bonus)

        if age >= maturity_ticks + CROP_DECAY_TICKS:
            # Rotten — remove from world silently
            continue
        elif age >= maturity_ticks:
            # Mature — convert to a Food node agents can EAT
            updated.append({
                "id": r["id"],
                "type": "Food",
                "x": r["x"],
                "y": r["y"],
                "amount": 80.0,
                "from_farming": True
            })
        else:
            # Still growing
            updated.append(r)

    return updated


# ─────────────────────────────────────────────
# 2. TERRITORY SYSTEM
# ─────────────────────────────────────────────

ZONE_SIZE = 10  # Each territory zone is 10×10 grid units

def _zone_key(x: int, y: int) -> str:
    """Convert a coordinate to a zone key."""
    zx = x // ZONE_SIZE
    zy = y // ZONE_SIZE
    return f"zone_{zx}_{zy}"

def claim_territory(session: Session, agent_id: str, x: int, y: int):
    """
    Called when an agent performs a BUILD action.
    Claims the 10×10 zone for that agent's civilization.
    """
    state = session.exec(select(GlobalState).where(GlobalState.session_id == current_session_id.get()).where(GlobalState.session_id == current_session_id.get()).where(GlobalState.session_id == current_session_id.get())).first()
    if not state:
        return

    agent = session.exec(select(Agent).where(Agent.session_id == current_session_id.get()).where(Agent.agent_id == agent_id)).first()
    if not agent:
        return

    territory = dict(state.territory) if state.territory else {}
    zone = _zone_key(x, y)
    old_owner = territory.get(zone)
    new_owner = agent.civilization_id

    if old_owner != new_owner:
        territory[zone] = new_owner
        state.territory = territory
        flag_modified(state, "territory")
        session.add(state)
        print(f"[Territory] Zone {zone} claimed by {new_owner}" +
              (f" (taken from {old_owner})" if old_owner else ""))


def apply_territory_pressure(session: Session, live_agents):
    """
    Bug 2 Fix: Only receives live_agents (health > 0) to avoid writing to deleted rows.
    Agents in enemy territory during wartime take passive health drain.
    Agents in their own territory get a small health regen bonus.
    """
    state = session.exec(select(GlobalState).where(GlobalState.session_id == current_session_id.get()).where(GlobalState.session_id == current_session_id.get()).where(GlobalState.session_id == current_session_id.get())).first()
    if not state:
        return

    territory = dict(state.territory) if state.territory else {}
    war_state = dict(state.war_state) if state.war_state else {}

    for agent in live_agents:
        x = agent.coordinates.get("x", 0)
        y = agent.coordinates.get("y", 0)
        zone = _zone_key(x, y)
        zone_owner = territory.get(zone)

        if zone_owner is None:
            continue  # Unclaimed land, neutral

        vitals = dict(agent.vitals)
        at_war = agent.civilization_id in war_state and bool(war_state.get(agent.civilization_id))

        if zone_owner == agent.civilization_id:
            # Home territory: small health regen bonus
            vitals["health"] = min(100.0, vitals.get("health", 100.0) + 0.1)
        elif at_war:
            # Enemy territory during wartime: health drain
            vitals["health"] = max(0.0, vitals.get("health", 100.0) - 0.5)

        agent.vitals = vitals
        flag_modified(agent, "vitals")
        session.add(agent)


# ─────────────────────────────────────────────
# 3. WAR DECLARATION SYSTEM
# ─────────────────────────────────────────────

WAR_TRUST_THRESHOLD   = 0.20   # Average inter-civ trust below this → declare war
PEACE_TRUST_THRESHOLD = 0.50   # Average inter-civ trust above this → make peace

def process_war(session: Session):
    """
    Bug 6 Fix: Only considers trust pairs where both agents are currently alive.
    Evaluates inter-civilization average trust.
    If avg trust between civ_a agents → civ_b agents drops below WAR_TRUST_THRESHOLD,
    formally declare war in GlobalState.war_state.
    Peace is restored when trust recovers above PEACE_TRUST_THRESHOLD.
    """
    state = session.exec(select(GlobalState).where(GlobalState.session_id == current_session_id.get()).where(GlobalState.session_id == current_session_id.get()).where(GlobalState.session_id == current_session_id.get())).first()
    if not state or not state.trust_graph:
        return

    trust = dict(state.trust_graph)
    agents = session.exec(select(Agent).where(Agent.session_id == current_session_id.get())).all()
    war_state = dict(state.war_state) if state.war_state else {}

    # Build set of live agent ids to filter ghost trust entries
    live_agent_ids = {a.agent_id for a in agents}

    # Group agents by civ
    civs: dict = {}
    for a in agents:
        civs.setdefault(a.civilization_id, []).append(a.agent_id)

    civ_list = list(civs.keys())
    changed = False

    for i in range(len(civ_list)):
        for j in range(i + 1, len(civ_list)):
            civ_a, civ_b = civ_list[i], civ_list[j]
            a_agents = civs[civ_a]
            b_agents = civs[civ_b]

            # Bug 6 Fix: Only count trust scores between currently live agents
            scores = []
            for ag_a in a_agents:
                if ag_a not in live_agent_ids:
                    continue
                for ag_b in b_agents:
                    if ag_b not in live_agent_ids:
                        continue
                    t = trust.get(ag_a, {}).get(ag_b)
                    if t is not None:
                        scores.append(t)

            if not scores:
                continue

            avg_trust = sum(scores) / len(scores)

            a_enemies = set(war_state.get(civ_a, []))
            b_enemies = set(war_state.get(civ_b, []))
            currently_at_war = civ_b in a_enemies

            if not currently_at_war and avg_trust < WAR_TRUST_THRESHOLD:
                # Declare war!
                a_enemies.add(civ_b)
                b_enemies.add(civ_a)
                war_state[civ_a] = list(a_enemies)
                war_state[civ_b] = list(b_enemies)
                changed = True
                print(f"[WAR] ⚔️  {civ_a} has declared war on {civ_b}! Avg trust: {avg_trust:.3f}")
                from .lore import add_lore_event
                pass
                add_lore_event(current_session_id.get(), civ_a, f"Our civilization formally declared war on the heretics of {civ_b}.", state.current_tick)
                add_lore_event(current_session_id.get(), civ_b, f"The infidels of {civ_a} have declared an unjust war against us.", state.current_tick)

            elif currently_at_war and avg_trust > PEACE_TRUST_THRESHOLD:
                # Peace restored
                a_enemies.discard(civ_b)
                b_enemies.discard(civ_a)
                war_state[civ_a] = list(a_enemies)
                war_state[civ_b] = list(b_enemies)
                changed = True
                print(f"[PEACE] 🕊️  {civ_a} and {civ_b} have made peace. Avg trust: {avg_trust:.3f}")
                from .lore import add_lore_event
                pass
                add_lore_event(current_session_id.get(), civ_a, f"A peace treaty was signed with {civ_b}.", state.current_tick)
                add_lore_event(current_session_id.get(), civ_b, f"A peace treaty was signed with {civ_a}.", state.current_tick)

    if changed:
        state.war_state = war_state
        flag_modified(state, "war_state")
        session.add(state)


def get_territory_context(territory: dict, war_state: dict, civ_id: str, x: int, y: int) -> dict:
    """
    Bug 4 Fix: Now takes pre-loaded territory/war_state dicts instead of doing DB queries per agent.
    Returns territory/war context dict to be injected into the cognition prompt.
    """
    zone = _zone_key(x, y)
    zone_owner = territory.get(zone, "unclaimed")
    enemies = war_state.get(civ_id, [])

    return {
        "zone": zone,
        "zone_owner": zone_owner,
        "in_own_territory": zone_owner == civ_id,
        "in_enemy_territory": zone_owner in enemies,
        "at_war": bool(enemies),
        "enemies": enemies,
    }
