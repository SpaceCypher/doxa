from typing import Dict, Any, List
import math
from sqlmodel import Session, select
from ..models.db import engine, GlobalState, Cognition, Agent

def calculate_asabiyyah_per_civ(session: Session) -> dict:
    """Calculates the Khaldunian Asabiyyah (Social Cohesion) index per civilization."""
    agents = session.exec(select(Agent)).all()
    civs = set(a.civilization_id for a in agents)
    
    asabiyyah_dict = {}
    for civ in civs:
        civ_agents = [a.agent_id for a in agents if a.civilization_id == civ]
        cognitions = session.exec(select(Cognition).where(Cognition.agent_id.in_(civ_agents))).all()
        if not cognitions or len(cognitions) < 2:
            asabiyyah_dict[civ] = 1.0 
            continue

        total_functional_nodes = sum(len(dict(c.belief_graph).get("functional", [])) if c.belief_graph else 0 for c in cognitions)
        baseline = 1.0
        decay = min(0.9, total_functional_nodes * 0.005)
        asabiyyah_dict[civ] = round(baseline - decay, 3)
        
    return asabiyyah_dict

def decay_cpr(session: Session) -> dict:
    """Decays Ostrom's Common Pool Resources based on consumption."""
    state = session.exec(select(GlobalState).where(GlobalState.session_id == "default")).first()
    if not state:
        return {}
    
    # Bug 3 Fix: Read full CPR to preserve resources/structures keys managed by physics.py
    cpr = dict(state.common_pool_resources) if state.common_pool_resources else {}
    
    # Only update the wood/water sub-keys, never touch food resources or structures
    cpr["wood"] = min(1000, cpr.get("wood", 500) + 1)
    cpr["water"] = min(2000, cpr.get("water", 1000) + 5)
    
    agent_count = len(session.exec(select(Agent)).all())
    cpr["water"] = max(0, cpr["water"] - (agent_count * 0.5))
    
    state.common_pool_resources = cpr
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(state, "common_pool_resources")
    session.add(state)
    return cpr

def update_trust_graph(session: Session, agent_a: str, agent_b: str, delta: float):
    """Updates the directed trust from agent_a to agent_b: T(t+1) = alpha * T(t) + (1-alpha) * delta"""
    state = session.exec(select(GlobalState).where(GlobalState.session_id == "default")).first()
    if not state: return
    
    trust = dict(state.trust_graph) if state.trust_graph else {}
    if agent_a not in trust:
        trust[agent_a] = {}
        
    current = trust[agent_a].get(agent_b, 0.5)
    
    alpha = 0.9 # Memory decay factor for interaction
    trust[agent_a][agent_b] = max(0.0, min(1.0, alpha * current + (1 - alpha) * delta))
    
    state.trust_graph = trust
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(state, "trust_graph")
    session.add(state)

def decay_trust_graph(session: Session):
    """Applies exponential time-decay to all trust edges: T(t+1) = T(t) * e^(-lambda)"""
    import math
    state = session.exec(select(GlobalState).where(GlobalState.session_id == "default")).first()
    if not state or not state.trust_graph: return
    
    lam = 0.01 # Decay rate
    decay_factor = math.exp(-lam)
    
    trust = dict(state.trust_graph)
    for a1 in trust:
        for a2 in trust[a1]:
            # Decay towards 0.0
            trust[a1][a2] = round(trust[a1][a2] * decay_factor, 4)
            
    state.trust_graph = trust
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(state, "trust_graph")
    session.add(state)

def apply_triadic_closure(session: Session, tau: float = 0.6):
    """
    If agent A trusts B (T>tau) and A trusts C (T>tau), increase trust between B and C.
    """
    state = session.exec(select(GlobalState).where(GlobalState.session_id == "default")).first()
    if not state or not state.trust_graph: return
    
    trust = dict(state.trust_graph)
    increases = []
    
    for a, targets in trust.items():
        trusted_by_a = [peer for peer, t_val in targets.items() if t_val > tau]
        for i in range(len(trusted_by_a)):
            for j in range(i + 1, len(trusted_by_a)):
                b = trusted_by_a[i]
                c = trusted_by_a[j]
                increases.append((b, c, 0.05))
                increases.append((c, b, 0.05))
                
    for b, c, delta in increases:
        if b not in trust:
            trust[b] = {}
        # Bug 7 Fix: initialize at 0.0 not 0.5 to avoid inflated stranger-trust from triadic closure
        current = trust[b].get(c, 0.0)
        trust[b][c] = min(1.0, current + delta)
        
    state.trust_graph = trust
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(state, "trust_graph")
    session.add(state)

def calculate_reputation(session: Session):
    """
    Approximates Eigenvector Centrality from the Trust Graph.
    R_i = sum(T_ji * R_j)
    """
    state = session.exec(select(GlobalState).where(GlobalState.session_id == "default")).first()
    if not state or not state.trust_graph:
        return
        
    trust = dict(state.trust_graph)
    agents = session.exec(select(Agent)).all()
    agent_ids = [a.agent_id for a in agents]
    
    # Initialize uniform reputation
    rep = {a: 1.0 / len(agent_ids) for a in agent_ids}
    
    # Power iteration (2 iterations for fast approximation)
    for _ in range(2):
        new_rep = {a: 0.0 for a in agent_ids}
        for j in agent_ids:
            for i in agent_ids:
                t_ji = trust.get(j, {}).get(i, 0.0)
                if t_ji > 0:
                    new_rep[i] += t_ji * rep[j]
                    
        # Normalize
        total = sum(new_rep.values())
        if total > 0:
            rep = {k: v / total for k, v in new_rep.items()}
            
    state.reputation = rep
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(state, "reputation")
    session.add(state)

def trigger_raft_election(session: Session, cataclysm_name: str, civ_id: str):
    """
    Election logic. The agent with highest reputation dictates the God Node.
    """
    state = session.exec(select(GlobalState).where(GlobalState.session_id == "default")).first()
    if not state or not state.reputation:
        return
        
    rep = dict(state.reputation)
    agents = session.exec(select(Agent).where(Agent.civilization_id == civ_id)).all()
    civ_agent_ids = [a.agent_id for a in agents]
    
    civ_rep = {k: v for k, v in rep.items() if k in civ_agent_ids}
    if not civ_rep:
        return
        
    leader_id = max(civ_rep, key=civ_rep.get)
    
    # Get leader's theological nodes
    leader_cog = session.exec(select(Cognition).where(Cognition.agent_id == leader_id)).first()
    if not leader_cog: return
    
    graph = dict(leader_cog.belief_graph) if leader_cog.belief_graph else {}
    theological = graph.get("theological", [])
    if not theological:
        theological.append({"node": f"{cataclysm_name} is the will of the simulation", "weight": 1.0})
        
    leader_god_node = theological[0]
    
    # Propagate to everyone in civ
    cognitions = session.exec(select(Cognition).where(Cognition.agent_id.in_(civ_agent_ids))).all()
    for cog in cognitions:
        cgraph = dict(cog.belief_graph) if cog.belief_graph else {"functional": [], "relational": [], "theological": []}
        cgraph["theological"] = [leader_god_node]  # Overwrite
        cog.belief_graph = cgraph
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(cog, "belief_graph")
        session.add(cog)

def detect_guild_formation(session: Session):
    """
    Detects dense trust clusters. If 5+ agents form a complete clique in the trust graph,
    and share >= 3 functional beliefs, they form a Guild.
    """
    state = session.exec(select(GlobalState).where(GlobalState.session_id == "default")).first()
    if not state or not state.trust_graph:
        return
    
    trust = dict(state.trust_graph)
    
    for a1, trusts in trust.items():
        high_trust_peers = [peer for peer, t_val in trusts.items() if t_val > 0.5]
        if len(high_trust_peers) >= 4:
            coalition = set([a1] + high_trust_peers)
            
            # Verify mutual clique
            is_clique = True
            for m1 in coalition:
                if m1 not in trust:
                    is_clique = False
                    break
                for m2 in coalition:
                    if m1 != m2 and trust[m1].get(m2, 0.0) <= 0.5:
                        is_clique = False
                        break
                if not is_clique:
                    break
                    
            if is_clique and len(coalition) >= 5:
                cognitions = session.exec(select(Cognition).where(Cognition.agent_id.in_(list(coalition)))).all()
                if len(cognitions) == len(coalition):
                    shared_beliefs = None
                    for cog in cognitions:
                        graph = dict(cog.belief_graph) if cog.belief_graph else {}
                        functional = {b.get("node") for b in graph.get("functional", []) if b.get("node")}
                        if shared_beliefs is None:
                            shared_beliefs = functional
                        else:
                            shared_beliefs = shared_beliefs.intersection(functional)
                            
                    if shared_beliefs is not None and len(shared_beliefs) >= 3:
                        # Form guild — Bug 4 Fix: only append if not already a member
                        guild_node = f"Member of Guild-{a1}"
                        for cog in cognitions:
                            graph = dict(cog.belief_graph) if cog.belief_graph else {"functional": [], "relational": [], "theological": []}
                            if "relational" not in graph:
                                graph["relational"] = []
                            # Deduplicate: don't add membership if already present
                            already_member = any(b.get("node") == guild_node for b in graph["relational"])
                            if not already_member:
                                graph["relational"].append({"node": guild_node, "weight": 1.0})
                                cog.belief_graph = graph
                                from sqlalchemy.orm.attributes import flag_modified
                                flag_modified(cog, "belief_graph")
                                session.add(cog)

def trigger_scapegoat(session: Session, civ_id: str):
    """
    Purges the agent with the highest mimetic_desire to reset Asabiyyah.
    """
    agents = session.exec(select(Agent).where(Agent.civilization_id == civ_id)).all()
    if not agents: return
    
    # Bug 5 Fix: only consider live agents to avoid double-delete on already-dead agents
    live_agents = [a for a in agents if (a.vitals or {}).get("health", 0) > 0]
    if not live_agents: return
    
    # Find agent with highest mimetic intensity
    scapegoat = max(live_agents, key=lambda a: dict(a.mimetic_desire).get("intensity", 0.0) if a.mimetic_desire else 0.0)
    
    # "Kill" scapegoat
    scapegoat.vitals = {"health": 0, "satiety": 0, "stamina": 0}
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(scapegoat, "vitals")
    session.add(scapegoat)
    
    # Reset Asabiyyah for the civ
    state = session.exec(select(GlobalState).where(GlobalState.session_id == "default")).first()
    if state and state.asabiyyah_index:
        idx = dict(state.asabiyyah_index)
        idx[civ_id] = 1.0
        state.asabiyyah_index = idx
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(state, "asabiyyah_index")
        session.add(state)
