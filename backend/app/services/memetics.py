import math
import random
from typing import List
from sqlmodel import Session, select
from ..models.db import current_session_id, engine, Agent, GlobalState, Cognition

def detect_norm_emergence(session: Session):
    """
    Scans the population to find beliefs that cross the 25% tipping point.
    Adds them to GlobalState.active_norms.
    """
    state = session.exec(select(GlobalState).where(GlobalState.session_id == current_session_id.get()).where(GlobalState.session_id == current_session_id.get()).where(GlobalState.session_id == current_session_id.get())).first()
    if not state: return
    
    agents = session.exec(select(Agent).where(Agent.session_id == current_session_id.get())).all()
    if not agents: return
    total_agents = len(agents)
    
    cognitions = session.exec(select(Cognition).where(Cognition.session_id == current_session_id.get()).where(Cognition.session_id == current_session_id.get())).all()
    belief_counts = {}
    
    for cog in cognitions:
        graph = dict(cog.belief_graph) if cog.belief_graph else {}
        for cat in ["functional", "relational", "theological"]:
            for b in graph.get(cat, []):
                node = b.get("node")
                if node:
                    belief_counts[node] = belief_counts.get(node, 0) + 1
                    
    current_norms = set(state.active_norms) if state.active_norms else set()
    new_norms = set(current_norms)
    
    for node, count in belief_counts.items():
        if count / total_agents >= 0.25:
            new_norms.add(node)
            
    if new_norms != current_norms:
        state.active_norms = list(new_norms)
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(state, "active_norms")
        session.add(state)
        # Bug E Fix: Do NOT commit here — let the caller's session handle commits

def process_memetics(session: Session):
    """
    Processes mimetic desire transmission and Complex Contagion of Norms.
    Bug D Fix: Accepts external session instead of opening a new one to prevent SQLite lock conflicts.
    """
    detect_norm_emergence(session)
    
    state = session.exec(select(GlobalState).where(GlobalState.session_id == current_session_id.get()).where(GlobalState.session_id == current_session_id.get()).where(GlobalState.session_id == current_session_id.get())).first()
    agents = session.exec(select(Agent).where(Agent.session_id == current_session_id.get())).all()
    
    trust_graph = dict(state.trust_graph) if state and state.trust_graph else {}
    active_norms = list(state.active_norms) if state and state.active_norms else []
    
    for agent in agents:
        # 1. Mimetic Desire (Simple proximity to higher reputation agents)
        reputation = dict(state.reputation) if state and state.reputation else {}
        my_rep = reputation.get(agent.agent_id, 0.0)
        
        closest_model = None
        min_dist = float('inf')
        
        for other in agents:
            if other.agent_id == agent.agent_id: continue
            other_rep = reputation.get(other.agent_id, 0.0)
            
            if other_rep > my_rep:
                dx = agent.coordinates.get("x", 0) - other.coordinates.get("x", 0)
                dy = agent.coordinates.get("y", 0) - other.coordinates.get("y", 0)
                dist = math.sqrt(dx*dx + dy*dy)
                
                if dist < 10.0 and dist < min_dist:
                    min_dist = dist
                    closest_model = other
        
        # Gamma determines if they adopt the desire
        gamma = dict(agent.personality).get("gamma", 0.5) if agent.personality else 0.5
        if closest_model and closest_model.mimetic_desire and random.random() < gamma:
            # Bug B Fix: Explicitly create a plain dict copy to avoid SQLAlchemy proxy reference sharing
            desire = closest_model.mimetic_desire
            agent.mimetic_desire = {"target": desire.get("target"), "intensity": float(desire.get("intensity", 0.0))}
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(agent, "mimetic_desire")
        
        # 2. Complex Contagion of Norms (Linear Threshold Model)
        if active_norms and agent.agent_id in trust_graph:
            beta = dict(agent.personality).get("beta", 0.5) if agent.personality else 0.5
            theta_i = 1.0 - beta # High plasticity = low stubbornness threshold
            
            my_trusts = trust_graph.get(agent.agent_id, {})
            
            # Pre-fetch cognitions for all trusted peers
            trusted_peer_ids = list(my_trusts.keys())
            if trusted_peer_ids:
                cognitions = session.exec(select(Cognition).where(Cognition.session_id == current_session_id.get()).where(Cognition.session_id == current_session_id.get()).where(Cognition.agent_id.in_(trusted_peer_ids))).all()
                peer_beliefs = {c.agent_id: dict(c.belief_graph) if c.belief_graph else {} for c in cognitions}
            else:
                peer_beliefs = {}

            for norm in active_norms:
                sum_trust = 0.0
                for peer, t_val in my_trusts.items():
                    if t_val > 0.0:
                        p_graph = peer_beliefs.get(peer, {})
                        holds_norm = False
                        for cat in ["functional", "relational", "theological"]:
                            if any(n.get("node") == norm for n in p_graph.get(cat, [])):
                                holds_norm = True
                                break
                        if holds_norm:
                            sum_trust += t_val
                
                if sum_trust >= theta_i:
                    cog = session.exec(select(Cognition).where(Cognition.session_id == current_session_id.get()).where(Cognition.session_id == current_session_id.get()).where(Cognition.agent_id == agent.agent_id)).first()
                    if cog:
                        cgraph = dict(cog.belief_graph) if cog.belief_graph else {"functional": [], "relational": [], "theological": []}
                        already = any(n.get("node") == norm for n in cgraph.get("functional", []))
                        if not already:
                            cgraph["functional"].append({"node": norm, "weight": 1.0})
                            cog.belief_graph = cgraph
                            from sqlalchemy.orm.attributes import flag_modified
                            flag_modified(cog, "belief_graph")
                            session.add(cog)
                            
                            from .cognition_service import update_cognition_state
                            update_cognition_state(session, agent.agent_id, {"type": "MEME_ADOPTION", "reasoning": f"Adopted societal norm: {norm}"})
        
        session.add(agent)
        
    session.commit()

