from sqlmodel import Session, select
from ..models.db import GlobalState
from sqlalchemy.orm.attributes import flag_modified

TECH_TREE_COSTS = {
    "agriculture": {"food": 100},
    "masonry": {"stone": 50},
    "theology": {"devotion": 100}
}

def unlock_tech(session: Session, civ_id: str, tech_id: str) -> bool:
    """
    Attempts to unlock a technology for a given civilization.
    Assumes the cost has been paid or validated before calling.
    """
    if tech_id not in TECH_TREE_COSTS:
        return False
        
    state = session.exec(select(GlobalState).where(GlobalState.session_id == "default")).first()
    if not state:
        return False
        
    tech_tree = dict(state.tech_tree) if state.tech_tree else {}
    if civ_id not in tech_tree:
        tech_tree[civ_id] = []
        
    if tech_id not in tech_tree[civ_id]:
        tech_tree[civ_id].append(tech_id)
        state.tech_tree = tech_tree
        flag_modified(state, "tech_tree")
        session.add(state)
        return True
        
    return False

def get_unlocked_techs(session: Session, civ_id: str) -> list:
    state = session.exec(select(GlobalState).where(GlobalState.session_id == "default")).first()
    if not state or not state.tech_tree:
        return []
    return state.tech_tree.get(civ_id, [])

def evaluate_tech_unlocks(session: Session):
    state = session.exec(select(GlobalState).where(GlobalState.session_id == "default")).first()
    if not state:
        return

    from ..models.db import Agent
    agents = session.exec(select(Agent)).all()
    
    # We will sum up resources per civ
    civ_resources = {}
    for agent in agents:
        if agent.status != "Operation": continue
        civ = agent.civilization_id
        if civ not in civ_resources:
            civ_resources[civ] = {"food": 0, "stone": 0, "devotion": 0}
        
        inv = agent.inventory or {}
        civ_resources[civ]["food"] += inv.get("food", 0)
        civ_resources[civ]["stone"] += inv.get("stone", 0)
        
        # Devotion proxy: number of theological beliefs across the civ
        from ..models.db import Cognition
        cog = session.exec(select(Cognition).where(Cognition.agent_id == agent.agent_id)).first()
        if cog and cog.belief_graph:
            theological = cog.belief_graph.get("theological", [])
            civ_resources[civ]["devotion"] += len(theological) * 10
            
    # Check for unlocks
    for civ, resources in civ_resources.items():
        if resources["food"] >= TECH_TREE_COSTS["agriculture"]["food"]:
            unlock_tech(session, civ, "agriculture")
            
        if resources["stone"] >= TECH_TREE_COSTS["masonry"]["stone"]:
            unlock_tech(session, civ, "masonry")
            
        if resources["devotion"] >= TECH_TREE_COSTS["theology"]["devotion"]:
            unlock_tech(session, civ, "theology")

