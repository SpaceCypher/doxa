import asyncio
import math
import os
import uuid
from sqlmodel import Session, select
from ..models.db import current_session_id, engine, GlobalState, Agent
from ..models.schemas import TelemetryPayload, AgentState, AgentLogEntry

# Terrain physics definitions
TERRAIN_TYPES = {
    0: {"name": "Deep Water", "move_stamina": 10.0, "health_drain": 5.0, "impassable": False},
    1: {"name": "Shallow Water", "move_stamina": 5.0, "health_drain": 0.0, "impassable": False},
    2: {"name": "Sand", "move_stamina": 2.0, "health_drain": 0.0, "impassable": False},
    3: {"name": "Grass", "move_stamina": 1.0, "health_drain": 0.0, "impassable": False},
    4: {"name": "Forest", "move_stamina": 3.0, "health_drain": 0.0, "impassable": False},
    5: {"name": "Mountain", "move_stamina": 0.0, "health_drain": 0.0, "impassable": True},
}

is_running = False  # Deprecated
active_tasks = {}
_consecutive_errors = {}
_MAX_CONSECUTIVE_ERRORS = 5

god_mode_queues = {}

def start(session_id: str, broadcast_callback):
    if session_id not in active_tasks:
        active_tasks[session_id] = asyncio.create_task(tick_loop(broadcast_callback, session_id))

def pause(session_id: str):
    if session_id in active_tasks:
        active_tasks[session_id].cancel()
        del active_tasks[session_id]

async def tick_loop(broadcast_callback, session_id: str):
    try:
        while True:
            try:
                current_session_id.set(session_id)
                await process_tick(broadcast_callback, session_id)
                _consecutive_errors[session_id] = 0  # reset on success
            except Exception as e:
                err_count = _consecutive_errors.get(session_id, 0) + 1
                _consecutive_errors[session_id] = err_count
                import traceback
                error_msg = str(e) + "\n" + traceback.format_exc()
                print(f"[{session_id}] [TICK ERROR #{err_count}] {error_msg}")
                
                # Kill switch for LLM Rate Limits
                if "429" in error_msg or "Rate limit" in error_msg or err_count >= _MAX_CONSECUTIVE_ERRORS:
                    pause(session_id)
                    reason = "RATE LIMIT REACHED" if "429" in error_msg else f"{_MAX_CONSECUTIVE_ERRORS} consecutive errors"
                    print(f"[{session_id}] [TICK ERROR] {reason} — simulation PAUSED. Check logs.")
                    try:
                        await broadcast_callback({"tick": -1, "agents": [], "asabiyyah": 0.0, "cpr": {}, "logs": [], "error": f"{reason}: {error_msg}"})
                    except Exception:
                        pass
            await asyncio.sleep(float(os.getenv("TICK_DURATION_SECONDS", "1.0")))
    except asyncio.CancelledError:
        print(f"[{session_id}] Tick loop cancelled.")
    except Exception as e:
        print(f"[{session_id}] Fatal error in tick loop: {e}")

async def process_tick(broadcast_callback, session_id: str):
    with Session(engine) as session:
        # Get or create global state
        state = session.exec(select(GlobalState).where(GlobalState.session_id == current_session_id.get()).where(GlobalState.session_id == current_session_id.get())).first()
        if not state:
            state = GlobalState(session_id=session_id, current_tick=0)
            session.add(state)
        
        state.current_tick += 1
        
        import random
        
        cpr = dict(state.common_pool_resources) if state.common_pool_resources else {}
        resources = cpr.get("resources", [])
        structures = cpr.get("structures", [])
        
        famine_ticks = cpr.get("famine_ticks", 0)
        if famine_ticks > 0:
            cpr["famine_ticks"] = famine_ticks - 1
        else:
            # Bug 1 Fix: Only count Food-typed resources, not Crops, for respawn threshold
            food_count = sum(1 for r in resources if r.get("type") == "Food")
            
            # Loop 2: Starvation cluster global food respawn bonus
            physics_constants = dict(state.physics_constants) if state.physics_constants else {}
            bonus = physics_constants.get("food_respawn_bonus")
            target_food = 20
            if bonus and state.current_tick <= bonus.get("expires_tick", 0):
                target_food = int(20 * bonus.get("multiplier", 1.0))
            
            if food_count < target_food:
                for _ in range(target_food - food_count):
                    resources.append({
                        "id": str(uuid.uuid4())[:8],
                        "type": "Food",
                        "x": random.randint(0, 100),
                        "y": random.randint(0, 100),
                        "amount": float(random.randint(50, 150))
                    })
            # Fix: Spawn Gold nodes so agents can gather and trade them
            # Maintain ~5 Gold nodes in the world at all times
            gold_count = sum(1 for r in resources if r.get("type") == "Gold")
            if gold_count < 5:
                for _ in range(5 - gold_count):
                    resources.append({
                        "id": str(uuid.uuid4())[:8],
                        "type": "Gold",
                        "x": random.randint(5, 95),
                        "y": random.randint(5, 95),
                        "amount": float(random.randint(20, 60))
                    })
            # Maintain ~8 Stone nodes
            stone_count = sum(1 for r in resources if r.get("type") == "Stone")
            if stone_count < 8:
                for _ in range(8 - stone_count):
                    resources.append({
                        "id": str(uuid.uuid4())[:8],
                        "type": "Stone",
                        "x": random.randint(5, 95),
                        "y": random.randint(5, 95),
                        "amount": float(random.randint(30, 80))
                    })
        cpr["resources"] = resources
        cpr["structures"] = structures
        state.common_pool_resources = cpr
        session.add(state)
        
        # Get all agents
        agents = session.exec(select(Agent).where(Agent.session_id == current_session_id.get())).all()
        
        logs = []
        
        # Process God Mode Queue
        global god_mode_queues
        if session_id in god_mode_queues and god_mode_queues[session_id]:
            pending_god_mode = god_mode_queues[session_id][:]
            god_mode_queues[session_id].clear()
            
            for gm in pending_god_mode:
                if gm["type"] == "smite":
                    agent = session.exec(select(Agent).where(Agent.session_id == current_session_id.get()).where(Agent.agent_id == gm["agent_id"])).first()
                    if agent:
                        vitals = dict(agent.vitals) if agent.vitals else {}
                        vitals["health"] = 10.0
                        vitals["stamina"] = 10.0
                        agent.vitals = vitals
                        from sqlalchemy.orm.attributes import flag_modified
                        flag_modified(agent, "vitals")
                        session.add(agent)
                        
                        # Also update the in-memory array so the rest of the tick sees it
                        for a in agents:
                            if a.agent_id == agent.agent_id:
                                a.vitals = vitals
                                break
                                
                        logs.append(AgentLogEntry(agent_id=agent.agent_id, action="SMITED", reasoning="The Gods have struck this agent down!"))
                        
                elif gm["type"] == "bless":
                    agent = session.exec(select(Agent).where(Agent.session_id == current_session_id.get()).where(Agent.agent_id == gm["agent_id"])).first()
                    if agent:
                        vitals = dict(agent.vitals) if agent.vitals else {}
                        vitals["health"] = 100.0
                        vitals["satiety"] = 100.0
                        vitals["stamina"] = 100.0
                        agent.vitals = vitals
                        from sqlalchemy.orm.attributes import flag_modified
                        flag_modified(agent, "vitals")
                        session.add(agent)
                        
                        for a in agents:
                            if a.agent_id == agent.agent_id:
                                a.vitals = vitals
                                break
                                
                        logs.append(AgentLogEntry(agent_id=agent.agent_id, action="BLESSED", reasoning="The Gods have smiled upon this agent!"))
                        
                elif gm["type"] == "spawn":
                    res_type = gm["res_type"]
                    amount = 100
                    resources.append({
                        "id": str(uuid.uuid4())[:8],
                        "type": res_type,
                        "x": gm["x"],
                        "y": gm["y"],
                        "amount": amount,
                        "crop_age": 0 if res_type == "Crop" else None
                    })
                    cpr["resources"] = resources
                    state.common_pool_resources = cpr
                    from sqlalchemy.orm.attributes import flag_modified
                    flag_modified(state, "common_pool_resources")
                    session.add(state)
                    logs.append(AgentLogEntry(agent_id="SYSTEM", action="SPAWN", reasoning=f"The Gods spawned {res_type} at {gm['x']}, {gm['y']}"))
                    
                elif gm["type"] == "plague":
                    for a in agents:
                        vitals = dict(a.vitals) if a.vitals else {}
                        vitals["health"] = max(10.0, vitals.get("health", 100) - 50.0)
                        a.vitals = vitals
                        from sqlalchemy.orm.attributes import flag_modified
                        flag_modified(a, "vitals")
                        session.add(a)
                    logs.append(AgentLogEntry(agent_id="SYSTEM", action="PLAGUE", reasoning="A terrible Plague sweeps the land! All agents lose 50 health."))
                    from .lore import add_global_lore_event
                    add_global_lore_event(
                        current_session_id.get(),
                        f"The Divine Plague descended upon all civilizations at Tick {state.current_tick}. "
                        f"Every living soul lost half their health. The cause remains unknown.",
                        state.current_tick
                    )
                    
                elif gm["type"] == "miracle":
                    for _ in range(10):
                        resources.append({
                            "id": str(uuid.uuid4())[:8],
                            "type": "Wood",
                            "x": random.randint(0, 99),
                            "y": random.randint(0, 99),
                            "amount": 500,
                            "crop_age": None
                        })
                        resources.append({
                            "id": str(uuid.uuid4())[:8],
                            "type": "Food",
                            "x": random.randint(0, 99),
                            "y": random.randint(0, 99),
                            "amount": 500,
                            "crop_age": None
                        })
                    cpr["resources"] = resources
                    state.common_pool_resources = cpr
                    from sqlalchemy.orm.attributes import flag_modified
                    flag_modified(state, "common_pool_resources")
                    session.add(state)
                    logs.append(AgentLogEntry(agent_id="SYSTEM", action="MIRACLE", reasoning="A Miracle! Abundant Food and Wood have appeared across the land."))
                    from .lore import add_global_lore_event
                    add_global_lore_event(
                        current_session_id.get(),
                        f"At Tick {state.current_tick}, an inexplicable miracle occurred: massive quantities of Food "
                        f"and Wood appeared across the land with no natural cause. The agents who witnessed it "
                        f"were left to wonder about its origin.",
                        state.current_tick
                    )
                    
                elif gm["type"] == "famine":
                    # Wipe out all food and water
                    resources.clear()
                    cpr["resources"] = resources
                    cpr["famine_ticks"] = 20
                    state.common_pool_resources = cpr
                    from sqlalchemy.orm.attributes import flag_modified
                    flag_modified(state, "common_pool_resources")
                    session.add(state)
                    
                    # Trigger RAFT elections
                    from ..services.society import trigger_raft_election
                    trigger_raft_election(session, "Famine", "civ_a")
                    trigger_raft_election(session, "Famine", "civ_b")
                    
                    logs.append(AgentLogEntry(agent_id="SYSTEM", action="FAMINE", reasoning="A catastrophic Famine has struck! All environmental resources have withered."))
                    from .lore import add_global_lore_event
                    add_global_lore_event(
                        current_session_id.get(),
                        f"A great Famine consumed all sustenance at Tick {state.current_tick}. "
                        f"Every food source and harvest was annihilated. Civilizations scramble to survive.",
                        state.current_tick
                    )
                    
            session.commit()
        
        # Satiety decay rate — may be modified by Loop 4 (Democratic Action)
        physics_constants = dict(state.physics_constants) if state.physics_constants else {}
        decay_rate = float(os.getenv("SATIETY_DECAY_RATE", "0.1"))
        decay_multiplier = physics_constants.get("satiety_decay_multiplier", 1.0)
        decay_rate *= decay_multiplier
        
        # Bug 5 Fix: Pre-load constants once per tick, not once per agent
        _MAX_LIFESPAN = int(os.getenv("MAX_LIFESPAN", "300"))
        
        # Bug 4 Fix: Pre-load territory/war_state once per tick for context lookups
        from .economy import get_territory_context
        _territory = dict(state.territory) if state.territory else {}
        _war_state = dict(state.war_state) if state.war_state else {}
        
        # Prepare data for cognition loop (Bug 6: each dict pre-seeded with recent_messages=[])
        agents_data = []
        for agent in agents:
            # Find nearby agents (Manhattan distance <= 5)
            nearby_agents = []
            ax = agent.coordinates.get("x", 0)
            ay = agent.coordinates.get("y", 0)
            for other in agents:
                if other.agent_id != agent.agent_id:
                    ox = other.coordinates.get("x", 0)
                    oy = other.coordinates.get("y", 0)
                    if abs(ax - ox) + abs(ay - oy) <= 5:
                        nearby_agents.append(f"{other.agent_id} (Civ {other.civilization_id[-1].upper()})")

            # Find nearby objects
            nearby_objects = []
            for res in resources:
                if abs(ax - res["x"]) + abs(ay - res["y"]) <= 5:
                    nearby_objects.append(f"{res['type']} at X={res['x']}, Y={res['y']}")
            for struct in structures:
                if abs(ax - struct["x"]) + abs(ay - struct["y"]) <= 5:
                    nearby_objects.append(f"{struct['structure']} at X={struct['x']}, Y={struct['y']}")

            # Decay vitals
            vitals = dict(agent.vitals) # copy
            
            # Terrain lookup
            world_map = list(state.world_map) if state.world_map else []
            terrain_id = 3 # default Grass
            if world_map and 0 <= ay < len(world_map) and 0 <= ax < len(world_map[0]):
                terrain_id = world_map[ay][ax]
            terrain_str = TERRAIN_TYPES.get(terrain_id, {}).get("name", "Unknown")
            
            # Deep water continuous drain
            if terrain_id == 0:
                vitals["health"] = max(0.0, vitals.get("health", 100.0) - TERRAIN_TYPES[0]["health_drain"])
                agent.vitals = vitals
                from sqlalchemy.orm.attributes import flag_modified
                flag_modified(agent, "vitals")

            vitals["satiety"] = max(0.0, vitals.get("satiety", 100.0) - decay_rate)
            if vitals["satiety"] <= 0:
                vitals["health"] = max(0.0, vitals.get("health", 100.0) - decay_rate * 2)
            
            # Phase 8: Increment age each tick
            agent.age = (agent.age or 0) + 1
            
            # Old Age: past MAX_LIFESPAN, probability of death increases logarithmically
            # Bug 5 Fix: read env once per tick, not once per agent
            if agent.age > _MAX_LIFESPAN:
                overage = agent.age - _MAX_LIFESPAN
                death_chance = min(0.95, 0.01 * math.log1p(overage))
                if random.random() < death_chance:
                    vitals["health"] = 0.0  # Will be caught by death check below
            
            # Bug 2 Fix: Stamina passive decay — movement costs energy, rest recovers it
            in_structure = any(abs(ax - s["x"]) + abs(ay - s["y"]) <= 1 for s in structures)
            if in_structure and vitals["satiety"] > 20:
                # Resting in shelter: health heals AND stamina regenerates
                vitals["health"] = min(100.0, vitals.get("health", 100.0) + decay_rate)
                vitals["stamina"] = min(100.0, vitals.get("stamina", 100.0) + decay_rate * 0.5)
            else:
                # Active: stamina passively drains at a slow rate (0.05 per tick)
                vitals["stamina"] = max(0.0, vitals.get("stamina", 100.0) - 0.05)
                
            # Loop 3: Settlement zone health/stamina regen bonus
            settlements = physics_constants.get("settlements", [])
            in_settlement = any(
                abs(ax - s["cx"]) + abs(ay - s["cy"]) <= s.get("radius", 12)
                for s in settlements
            )
            if in_settlement:
                vitals["health"] = min(100.0, vitals.get("health", 100.0) + 5.0)
                vitals["stamina"] = min(100.0, vitals.get("stamina", 100.0) + 1.0)
                
            agent.vitals = vitals
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(agent, "vitals")
            
            # Calculate Prediction Error (P_e) - proxy is deviation from homeostasis
            current_pe = ((100.0 - vitals.get("health", 100.0)) + (100.0 - vitals.get("satiety", 100.0))) / 200.0
            
            pe_history = list(agent.prediction_error_history) if agent.prediction_error_history else [0.0]
            pe_history.append(current_pe)
            if len(pe_history) > 2:
                pe_history.pop(0)
            agent.prediction_error_history = pe_history
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(agent, "prediction_error_history")
            
            # Emotion is derivative of P_e
            if len(pe_history) >= 2:
                dp_e = pe_history[-1] - pe_history[-2]
                if dp_e > 0.05:
                    emotion = "Anxiety/Fear"
                elif dp_e < -0.05:
                    emotion = "Joy/Epiphany"
                else:
                    emotion = "Calm/Boredom"
            else:
                emotion = "Calm/Boredom"
            
            # Phase 8: Territory & War context for cognition prompt (Bug 4 Fix: uses pre-loaded dicts)
            terr_ctx = get_territory_context(_territory, _war_state, agent.civilization_id, ax, ay)
            
            agents_data.append({
                "agent_id": agent.agent_id,
                "x": ax,
                "y": ay,
                "vitals": agent.vitals,
                "inventory": dict(agent.inventory) if agent.inventory else {"food": 0, "wood": 0, "water": 0},
                "civilization_id": agent.civilization_id,
                "status": agent.status,
                "age": agent.age,
                "personality": dict(agent.personality) if agent.personality else {"alpha": 0.5, "beta": 0.5, "gamma": 0.5},
                "emotion": emotion,
                "current_tick": state.current_tick,
                "nearby_agents": nearby_agents,
                "nearby_objects": nearby_objects,
                "recent_messages": [],  # Bug 6 Fix: pre-seeded for consistent schema; overwritten by cognition loop
                "territory_zone": terr_ctx.get("zone_owner", "unclaimed"),
                "in_enemy_territory": terr_ctx.get("in_enemy_territory", False),
                "at_war": terr_ctx.get("at_war", False),
                "terrain": terrain_str,
                "terrain_id": terrain_id,
                # Force combat if in enemy territory during war OR civil war active
                "force_combat": (
                    terr_ctx.get("in_enemy_territory", False) and terr_ctx.get("at_war", False)
                ) or (
                    state.asabiyyah_index.get(agent.civilization_id, 1.0) < 0.3
                    if isinstance(state.asabiyyah_index, dict) else False
                )
            })
            
            session.add(agent)
            
        session.commit()
        
        # Cognitive Loop: run asynchronously
        from .cognition_service import run_cognitive_loop, update_cognition_state
        actions = await run_cognitive_loop(agents_data, session)
        
        # Apply actions
        from .pattern_detector import apply_laws
        active_laws = list(state.laws) if state.laws else []
        agent_states = []
        for i, (agent, action) in enumerate(zip(agents, actions)):
            agent_data = agents_data[i]
            
            if action["type"] == "MOVE" and agent.status == "Operation":
                coords = dict(agent.coordinates)
                ax = coords.get("x", 0)
                ay = coords.get("y", 0)
                nx = max(0, min(99, ax + action.get("dx", 0)))
                ny = max(0, min(99, ay + action.get("dy", 0)))
                
                world_map = list(state.world_map) if state.world_map else []
                target_terrain = 3
                if world_map and 0 <= ny < len(world_map) and 0 <= nx < len(world_map[0]):
                    target_terrain = world_map[ny][nx]
                
                terrain_info = TERRAIN_TYPES.get(target_terrain, TERRAIN_TYPES[3])
                
                # Autonomous Growth: Apply Laws
                stamina_cost = apply_laws(agent, "MOVE", "stamina", terrain_info["move_stamina"], active_laws, agent_data)
                
                vitals = dict(agent.vitals)
                if not terrain_info["impassable"] and vitals.get("stamina", 100.0) >= stamina_cost:
                    coords["x"] = nx
                    coords["y"] = ny
                    agent.coordinates = coords
                    from sqlalchemy.orm.attributes import flag_modified
                    flag_modified(agent, "coordinates")
                    
                    vitals["stamina"] -= stamina_cost
                    agent.vitals = vitals
                    flag_modified(agent, "vitals")
                    
                    session.add(agent)
                else:
                    logs.append(AgentLogEntry(agent_id=agent.agent_id, action="MOVE_FAIL", reasoning=f"Impassable terrain or insufficient stamina to enter {terrain_info['name']}."))
            elif action["type"] == "EAT" and agent.status == "Operation":
                coords = agent.coordinates
                ax, ay = coords.get("x", 0), coords.get("y", 0)
                food_idx = -1
                for i, r in enumerate(resources):
                    if r["type"] == "Food" and abs(ax - r["x"]) + abs(ay - r["y"]) <= 1:
                        food_idx = i
                        break
                
                if food_idx != -1:
                    resources[food_idx]["amount"] -= 40.0
                    if resources[food_idx]["amount"] <= 0:
                        resources.pop(food_idx)
                    vitals = dict(agent.vitals)
                    max_sat = float(os.getenv("MAX_SATIETY", "100.0"))
                    
                    # Autonomous Growth: Apply Laws
                    satiety_gain = apply_laws(agent, "EAT", "satiety", 40.0, active_laws, agent_data)
                    
                    vitals["satiety"] = min(max_sat, vitals.get("satiety", 100.0) + satiety_gain)
                    agent.vitals = vitals
                from sqlalchemy.orm.attributes import flag_modified
                flag_modified(agent, "vitals")
                session.add(agent)
            elif action["type"] == "COMMUNICATE" and agent.status == "Operation":
                target_id = action.get("target")
                message = action.get("message", "")
                if target_id and message:
                    from ..models.db import Cognition
                    target_cog = session.exec(select(Cognition).where(Cognition.session_id == current_session_id.get()).where(Cognition.agent_id == target_id)).first()
                    my_cog = session.exec(select(Cognition).where(Cognition.session_id == current_session_id.get()).where(Cognition.agent_id == agent.agent_id)).first()
                    if target_cog and my_cog:
                        wm = list(target_cog.working_memory) if target_cog.working_memory else []
                        wm.append(f"[Message from {agent.agent_id}]: {message}")
                        
                        # Transmit Top Belief
                        my_graph = dict(my_cog.belief_graph) if my_cog.belief_graph else {}
                        theo_beliefs = my_graph.get("theological", [])
                        if theo_beliefs:
                            top_belief = sorted(theo_beliefs, key=lambda x: x.get("weight", 0), reverse=True)[0]
                            tgt_graph = dict(target_cog.belief_graph) if target_cog.belief_graph else {"functional": [], "relational": [], "theological": []}
                            if "theological" not in tgt_graph: tgt_graph["theological"] = []
                            if not any(b.get("node") == top_belief["node"] for b in tgt_graph["theological"]):
                                # Fix: Priests transmit beliefs at higher weight (0.7 vs 0.5)
                                transmit_weight = 0.7 if agent.social_status == "Priest" else 0.5
                                tgt_graph["theological"].append({"node": top_belief["node"], "weight": transmit_weight})
                                target_cog.belief_graph = tgt_graph
                                from sqlalchemy.orm.attributes import flag_modified
                                flag_modified(target_cog, "belief_graph")
                                
                        # Transmit Gossip (Negative Episodic Memory)
                        my_ep = list(my_cog.episodic_memory) if my_cog.episodic_memory else []
                        grudges = [m for m in my_ep if "GRUDGE" in m]
                        if grudges:
                            top_grudge = grudges[-1]
                            wm.append(f"[Gossip from {agent.agent_id}]: {top_grudge}")
                            
                        target_cog.working_memory = wm
                        from sqlalchemy.orm.attributes import flag_modified
                        flag_modified(target_cog, "working_memory")
                        session.add(target_cog)
                        
                        # Fix: Priests get +0.2 trust bonus on COMMUNICATE (religious authority)
                        trust_gain = 1.2 if agent.social_status == "Priest" else 1.0
                        
                        # Autonomous Growth: Apply Laws
                        trust_gain = apply_laws(agent, "COMMUNICATE", "trust_bonus", trust_gain, active_laws, agent_data)
                        
                        from .society import update_trust_graph
                        update_trust_graph(session, agent.agent_id, target_id, trust_gain)
                        update_trust_graph(session, target_id, agent.agent_id, trust_gain)
            elif action["type"] == "BUILD" and agent.status == "Operation":
                structure = action.get("structure", "Structure")
                coords = agent.coordinates
                cx = coords.get("x", 0)
                cy = coords.get("y", 0)
                
                already_exists = any(s.get("x") == cx and s.get("y") == cy for s in structures)
                
                if not already_exists:
                    vitals = dict(agent.vitals)
                    vitals["stamina"] = max(0.0, vitals.get("stamina", 100.0) - 20.0)
                    agent.vitals = vitals
                    from sqlalchemy.orm.attributes import flag_modified
                    flag_modified(agent, "vitals")
                    
                    # --- Role System Integration ---
                    from ..models.db import Cognition
                    cog = session.exec(select(Cognition).where(Cognition.session_id == current_session_id.get()).where(Cognition.agent_id == agent.agent_id)).first()
                    
                    structure_upper = structure.upper()
                    if "TEMPLE" in structure_upper or "SHRINE" in structure_upper:
                        agent.social_status = "Priest"
                        if cog and cog.belief_graph:
                            graph = dict(cog.belief_graph)
                            theological = graph.get("theological", [])
                            theological.append({"node": f"Divine Keeper of {structure}", "weight": 0.95})
                            graph["theological"] = theological
                            cog.belief_graph = graph
                            flag_modified(cog, "belief_graph")
                            session.add(cog)
                    elif "BARRACKS" in structure_upper or "WATCHTOWER" in structure_upper or "FORT" in structure_upper:
                        agent.social_status = "Soldier"
                    elif "GRANARY" in structure_upper or "FARM" in structure_upper:
                        agent.social_status = "Farmer"
                        inv = dict(agent.inventory) if agent.inventory else {"food": 0, "wood": 0, "water": 0}
                        inv["food"] = inv.get("food", 0) + 50
                        agent.inventory = inv
                        flag_modified(agent, "inventory")
                    else:
                        agent.social_status = "Builder"
                    # Apply Loop 4: Architectural Age bonus if active
                    physics_constants = dict(state.physics_constants) if state.physics_constants else {}
                    bonus_durability = physics_constants.get("structure_durability_bonus", 0)
                    structures.append({
                        "builder": agent.agent_id,
                        "structure": structure,
                        "x": cx,
                        "y": cy,
                        "tick": state.current_tick,
                        "durability": 100 + bonus_durability
                    })
                    
                    # Phase 8: Claim territory for this civilization
                    from .economy import claim_territory
                    claim_territory(session, agent.agent_id, cx, cy)
                    
                    # Write to Akashic Records
                    from .lore import add_lore_event
                    add_lore_event(
                        current_session_id.get(),
                        agent.civilization_id,
                        f"Agent {agent.agent_id} ({agent.social_status}) constructed a {structure} "
                        f"at ({cx}, {cy}) on Tick {state.current_tick}. A new landmark rises.",
                        state.current_tick,
                        agent.agent_id
                    )
                    logs.append(AgentLogEntry(agent_id="SYSTEM", action="BUILD", reasoning=f"{agent.agent_id} built a {structure} at ({cx},{cy})."))
                
                # Satisfy the drive by purging the Demiurgic Layer directive from belief_graph
                from ..models.db import Cognition
                cog = session.exec(select(Cognition).where(Cognition.session_id == current_session_id.get()).where(Cognition.agent_id == agent.agent_id)).first()
                if cog and cog.belief_graph:
                    graph = dict(cog.belief_graph)
                    pruned = False
                    for cat in ["functional", "relational", "theological"]:
                        if cat in graph:
                            old_len = len(graph[cat])
                            graph[cat] = [b for b in graph[cat] if "BUILD" not in b.get("node", "").upper()]
                            if len(graph[cat]) < old_len:
                                pruned = True
                    if pruned:
                        cog.belief_graph = graph
                        from sqlalchemy.orm.attributes import flag_modified
                        flag_modified(cog, "belief_graph")
                        session.add(cog)
                        
                session.add(agent)
            
            # ATTACK action — deals health damage to target
            elif action["type"] == "ATTACK" and agent.status == "Operation":
                target_id = action.get("target")
                if target_id:
                    target_agent = next((a for a in agents if a.agent_id == target_id), None)
                    # Check if attack is allowed (different civ OR same civ but civil war is active)
                    civil_war_active = False
                    if isinstance(state.asabiyyah_index, dict):
                        civil_war_active = state.asabiyyah_index.get(agent.civilization_id, 1.0) < 0.3
                        
                    if target_agent and (target_agent.civilization_id != agent.civilization_id or civil_war_active):
                        # Attacker costs stamina
                        atk_vitals = dict(agent.vitals)
                        atk_vitals["stamina"] = max(0.0, atk_vitals.get("stamina", 100.0) - 10.0)
                        agent.vitals = atk_vitals
                        from sqlalchemy.orm.attributes import flag_modified
                        flag_modified(agent, "vitals")
                        session.add(agent)
                        # Target takes 15 damage (reduced by 50% if in home territory)
                        tgt_vitals = dict(target_agent.vitals)
                        dmg = 15.0
                        
                        # Autonomous Growth: Apply Laws
                        dmg = apply_laws(agent, "ATTACK", "damage_multiplier", dmg, active_laws, agent_data)
                        
                        # Fix Bug B: Warrior is the behavior-derived name; Soldier is structure-assigned.
                        # Both must grant the +50% damage buff.
                        MILITARY_ROLES = ("Soldier", "Warrior")
                        if agent.social_status in MILITARY_ROLES:
                            dmg *= 1.5
                        if target_agent.social_status in MILITARY_ROLES:
                            dmg *= 0.5  # Defenders in military roles take half damage
                            
                        zone = f"zone_{target_agent.coordinates.get('x',0)//10}_{target_agent.coordinates.get('y',0)//10}"
                        if _territory.get(zone) == target_agent.civilization_id:
                            dmg *= 0.5  # Home turf defensive bonus
                        tgt_vitals["health"] = max(0.0, tgt_vitals.get("health", 100.0) - dmg)
                        target_agent.vitals = tgt_vitals
                        flag_modified(target_agent, "vitals")
                        session.add(target_agent)
                        # Update trust: attacking drops trust to 0
                        from .society import update_trust_graph
                        update_trust_graph(session, agent.agent_id, target_id, 0.0)
                        update_trust_graph(session, target_id, agent.agent_id, 0.0)
                        
                        # Pillage 20% of resources
                        tgt_inv = dict(target_agent.inventory) if target_agent.inventory else {"food": 0, "wood": 0, "water": 0}
                        atk_inv = dict(agent.inventory) if agent.inventory else {"food": 0, "wood": 0, "water": 0}
                        stolen_food = int(tgt_inv.get("food", 0) * 0.2)
                        stolen_wood = int(tgt_inv.get("wood", 0) * 0.2)
                        stolen_water = int(tgt_inv.get("water", 0) * 0.2)
                        
                        if stolen_food > 0 or stolen_wood > 0 or stolen_water > 0:
                            tgt_inv["food"] = max(0, tgt_inv.get("food", 0) - stolen_food)
                            tgt_inv["wood"] = max(0, tgt_inv.get("wood", 0) - stolen_wood)
                            tgt_inv["water"] = max(0, tgt_inv.get("water", 0) - stolen_water)
                            atk_inv["food"] = atk_inv.get("food", 0) + stolen_food
                            atk_inv["wood"] = atk_inv.get("wood", 0) + stolen_wood
                            atk_inv["water"] = atk_inv.get("water", 0) + stolen_water
                            
                            target_agent.inventory = tgt_inv
                            agent.inventory = atk_inv
                            flag_modified(target_agent, "inventory")
                            flag_modified(agent, "inventory")
                        
                        print(f"[COMBAT] {agent.agent_id} → {target_id}: -{dmg:.0f}hp (target health: {tgt_vitals['health']:.1f}) | Pillaged: Food {stolen_food}, Wood {stolen_wood}, Water {stolen_water}")
                        
                        # ── Write combat outcome to AGGRESSOR's working memory ──────
                        from ..models.db import Cognition
                        my_cog_atk = session.exec(select(Cognition).where(Cognition.session_id == current_session_id.get()).where(Cognition.agent_id == agent.agent_id)).first()
                        if my_cog_atk:
                            atk_wm = list(my_cog_atk.working_memory) if my_cog_atk.working_memory else []
                            loot_summary = f"Food:{stolen_food} Wood:{stolen_wood} Water:{stolen_water}"
                            atk_wm.append(
                                f"[COMBAT] I attacked {target_id} on Tick {state.current_tick}, "
                                f"dealing {dmg:.1f} damage. Pillaged: {loot_summary}. "
                                f"Their remaining health: {tgt_vitals['health']:.1f}."
                            )
                            if len(atk_wm) > 20: atk_wm = atk_wm[-20:]
                            my_cog_atk.working_memory = atk_wm
                            flag_modified(my_cog_atk, "working_memory")
                            session.add(my_cog_atk)
                        
                        # ── Add Grudge Memory to victim ──────────────────────────────
                        target_cog = session.exec(select(Cognition).where(Cognition.session_id == current_session_id.get()).where(Cognition.agent_id == target_id)).first()
                        if target_cog:
                            ep_mem = list(target_cog.episodic_memory) if target_cog.episodic_memory else []
                            ep_mem.append(f"[GRUDGE] Agent {agent.agent_id} attacked me on Tick {state.current_tick} for {dmg:.1f} damage and stole my resources.")
                            if len(ep_mem) > 10: ep_mem = ep_mem[-10:]
                            target_cog.episodic_memory = ep_mem
                            flag_modified(target_cog, "episodic_memory")
                            session.add(target_cog)
            
            # Phase 9: GATHER action
            elif action["type"] == "GATHER" and agent.status == "Operation":
                res_type = action.get("resource", "wood").lower()
                inv = dict(agent.inventory) if agent.inventory else {"food": 0, "wood": 0, "water": 0}
                
                world_map = list(state.world_map) if state.world_map else []
                ax, ay = agent.coordinates.get("x", 0), agent.coordinates.get("y", 0)
                terrain_id = 3
                if world_map and 0 <= ay < len(world_map) and 0 <= ax < len(world_map[0]):
                    terrain_id = world_map[ay][ax]
                
                if res_type in ["wood", "water"]:
                    cpr = dict(state.common_pool_resources) if state.common_pool_resources else {}
                    amount_available = cpr.get(res_type, 0)
                    base_amount = 10
                    # Terrain bonuses
                    if res_type == "wood" and terrain_id == 4: # Forest
                        base_amount += 10
                    elif res_type == "water" and terrain_id in [0, 1]: # Water
                        base_amount += 10
                    
                    gather_amount = min(base_amount, amount_available)
                    if gather_amount > 0:
                        cpr[res_type] -= gather_amount
                        inv[res_type] = inv.get(res_type, 0) + gather_amount
                        state.common_pool_resources = cpr
                        from sqlalchemy.orm.attributes import flag_modified
                        flag_modified(state, "common_pool_resources")
                        session.add(state)
                        agent.inventory = inv
                        flag_modified(agent, "inventory")
                        session.add(agent)
                elif res_type in ["food", "stone", "gold"]:
                    target_type = res_type.capitalize()
                    for i, r in enumerate(resources):
                        if r["type"] == target_type and abs(ax - r["x"]) + abs(ay - r["y"]) <= 1:
                            gather_amount = min(10.0, r["amount"])
                            if gather_amount > 0:
                                resources[i]["amount"] -= gather_amount
                                inv[res_type] = inv.get(res_type, 0) + gather_amount
                                if resources[i]["amount"] <= 0:
                                    resources.pop(i)
                                agent.inventory = inv
                                from sqlalchemy.orm.attributes import flag_modified
                                flag_modified(agent, "inventory")
                                session.add(agent)
                            break
                            
            # Phase 9: TRADE action
            elif action["type"] == "TRADE" and agent.status == "Operation":
                target_id = action.get("target")
                offer = action.get("offer", {})
                request = action.get("request", {})
                
                if target_id and offer and request:
                    target_agent = next((a for a in agents if a.agent_id == target_id), None)
                    if target_agent:
                        inv_a = dict(agent.inventory) if agent.inventory else {"food": 0, "wood": 0, "water": 0}
                        inv_b = dict(target_agent.inventory) if target_agent.inventory else {"food": 0, "wood": 0, "water": 0}
                        
                        can_offer = all(inv_a.get(k, 0) >= v and v > 0 for k, v in offer.items())
                        can_request = all(inv_b.get(k, 0) >= v and v > 0 for k, v in request.items())
                        
                        ax, ay = agent.coordinates.get("x", 0), agent.coordinates.get("y", 0)
                        bx, by = target_agent.coordinates.get("x", 0), target_agent.coordinates.get("y", 0)
                        
                        if can_offer and can_request and (abs(ax - bx) + abs(ay - by) <= 5):
                            for k, v in offer.items():
                                inv_a[k] -= v
                                inv_b[k] = inv_b.get(k, 0) + v
                            for k, v in request.items():
                                inv_b[k] -= v
                                inv_a[k] = inv_a.get(k, 0) + v
                                
                            agent.inventory = inv_a
                            from sqlalchemy.orm.attributes import flag_modified
                            flag_modified(agent, "inventory")
                            session.add(agent)
                            
                            target_agent.inventory = inv_b
                            flag_modified(target_agent, "inventory")
                            session.add(target_agent)
                            
                            from ..models.db import Cognition
                            target_cog = session.exec(select(Cognition).where(Cognition.session_id == current_session_id.get()).where(Cognition.agent_id == target_id)).first()
                            if target_cog:
                                wm = list(target_cog.working_memory) if target_cog.working_memory else []
                                wm.append(f"[TRADE] {agent.agent_id} gave you {offer} in exchange for your {request}.")
                                target_cog.working_memory = wm
                                session.add(target_cog)
                                
                            from .society import update_trust_graph
                            update_trust_graph(session, agent.agent_id, target_id, 1.0)
                            update_trust_graph(session, target_id, agent.agent_id, 1.0)
            
            # Phase 8: FARM action — plant a crop at current location
            elif action["type"] == "FARM" and agent.status == "Operation":
                coords = agent.coordinates
                fx = coords.get("x", 0)
                fy = coords.get("y", 0)
                
                # Bug 7 Fix: Only block farming if a Crop specifically exists on this tile
                tile_has_crop = any(
                    r.get("type") == "Crop" and r.get("x") == fx and r.get("y") == fy
                    for r in resources
                )
                
                world_map = list(state.world_map) if state.world_map else []
                terrain_id = 3
                if world_map and 0 <= fy < len(world_map) and 0 <= fx < len(world_map[0]):
                    terrain_id = world_map[fy][fx]
                
                # Farm only if no crop exists AND standing on Grass (3)
                if not tile_has_crop and terrain_id == 3:

                    resources.append({
                        "id": str(uuid.uuid4())[:8],
                        "type": "Crop",
                        "x": fx,
                        "y": fy,
                        "crop_age": 0,
                        "planted_by": agent.agent_id,
                        "civ": agent.civilization_id,
                        "amount": 0.0  # no food value until mature
                    })
                    # Farming costs some stamina
                    vitals = dict(agent.vitals)
                    vitals["stamina"] = max(0.0, vitals.get("stamina", 100.0) - 10.0)
                    agent.vitals = vitals
                    from sqlalchemy.orm.attributes import flag_modified
                    flag_modified(agent, "vitals")
                    session.add(agent)
            elif action["type"] == "INVENT_BELIEF" and agent.status == "Operation":
                belief_text = action.get("belief", "").strip()
                if belief_text:
                    from ..models.db import Cognition
                    cog = session.exec(select(Cognition).where(Cognition.session_id == current_session_id.get()).where(Cognition.agent_id == agent.agent_id)).first()
                    if cog:
                        graph = dict(cog.belief_graph) if cog.belief_graph else {"functional": [], "relational": [], "theological": []}
                        if "theological" not in graph:
                            graph["theological"] = []
                        if not any(b.get("node") == belief_text for b in graph["theological"]):
                            # Fix: Priests invent beliefs with higher starting weight (1.5 vs 1.0)
                            belief_weight = 1.5 if agent.social_status == "Priest" else 1.0
                            graph["theological"].append({"node": belief_text, "weight": belief_weight})
                            cog.belief_graph = graph
                            from sqlalchemy.orm.attributes import flag_modified
                            flag_modified(cog, "belief_graph")
                            session.add(cog)
                            
                    vitals = dict(agent.vitals)
                    vitals["stamina"] = max(0.0, vitals.get("stamina", 100.0) - 10.0)
                    agent.vitals = vitals
                    flag_modified(agent, "vitals")
                    session.add(agent)
                
            elif agent.status == "Apprenticeship":
                # Generation 2+ AgentSchool tethering: Copy belief sub-graph from a random Operation agent (elder)
                if state.current_tick % 10 == 0:
                    elders = [a for a in agents if a.status == "Operation" and a.civilization_id == agent.civilization_id]
                    if elders:
                        import random
                        elder = random.choice(elders)
                        from ..models.db import Cognition
                        elder_cog = session.exec(select(Cognition).where(Cognition.session_id == current_session_id.get()).where(Cognition.agent_id == elder.agent_id)).first()
                        child_cog = session.exec(select(Cognition).where(Cognition.session_id == current_session_id.get()).where(Cognition.agent_id == agent.agent_id)).first()
                        
                        if elder_cog and child_cog:
                            # Copy weighted subset of elder's belief_graph
                            elder_graph = dict(elder_cog.belief_graph) if elder_cog.belief_graph else {}
                            child_graph = dict(child_cog.belief_graph) if child_cog.belief_graph else {"functional": [], "relational": [], "theological": []}
                            
                            import random
                            for category in ["functional", "relational", "theological"]:
                                elder_beliefs = elder_graph.get(category, [])
                                if not elder_beliefs: continue
                                
                                # Probabilistic inclusion based on weight
                                selected_beliefs = [b for b in elder_beliefs if random.random() < b.get("weight", 0.5)]
                                
                                if category not in child_graph:
                                    child_graph[category] = []
                                child_graph[category].extend(selected_beliefs)
                                
                            child_cog.belief_graph = child_graph
                            from sqlalchemy.orm.attributes import flag_modified
                            flag_modified(child_cog, "belief_graph")
                            session.add(child_cog)
                            
                        agent.status = "Operation"
                        session.add(agent)
            
            # Bug 4 Fix: Only Operation agents take real actions and generate logs
            if agent.status == "Operation":
                update_cognition_state(session, agent.agent_id, action)
                logs.append(AgentLogEntry(
                    agent_id=agent.agent_id,
                    action=action["type"],
                    reasoning=action.get("reasoning", "")
                ))
                
                # ── Belief Decay ──────────────────────────────────────────
                # Low-weight beliefs erode over time; the world forgets the old.
                # Fix: Priests have half the belief decay rate (sacred memory persists)
                from ..models.db import Cognition
                cog_decay = session.exec(select(Cognition).where(Cognition.session_id == current_session_id.get()).where(Cognition.agent_id == agent.agent_id)).first()
                if cog_decay and cog_decay.belief_graph:
                    graph = dict(cog_decay.belief_graph)
                    changed = False
                    is_priest = agent.social_status == "Priest"
                    decay_rate_belief = 0.005 if is_priest else 0.01  # Priests: sacred memory persists longer
                    for cat in ["functional", "relational", "theological"]:
                        if cat not in graph:
                            continue
                        pruned = []
                        for b in graph[cat]:
                            w = b.get("weight", 0.5) - decay_rate_belief
                            if w > 0.0:
                                pruned.append({**b, "weight": round(w, 3)})
                                changed = True
                            else:
                                changed = True  # belief expired
                        graph[cat] = pruned
                    if changed:
                        cog_decay.belief_graph = graph
                        from sqlalchemy.orm.attributes import flag_modified
                        flag_modified(cog_decay, "belief_graph")
                        session.add(cog_decay)
                
                # ── Social Status / Role Assignment ───────────────────────
                # Fix Bug A: Structure-assigned roles (Priest, Soldier, Farmer) are LOCKED.
                # They persist until the agent dies or reaches Elder age.
                # Only Wanderers, Builders, and Warriors can be re-derived from behavior.
                LOCKED_ROLES = {"Priest", "Soldier", "Farmer"}
                if state.current_tick % 10 == 0:
                    age = agent.age or 0
                    
                    # Elder overrides everything (age-gated ascension)
                    if age > 400:
                        if agent.social_status != "Elder":
                            agent.social_status = "Elder"
                            session.add(agent)
                    elif agent.social_status not in LOCKED_ROLES:
                        # Only re-derive role for unlocked agents
                        wm = list(cog_decay.working_memory) if cog_decay and cog_decay.working_memory else []
                        recent_actions = [m.split("|")[0].replace("Action: ", "").strip() for m in wm[-10:]]
                        farm_count = recent_actions.count("FARM")
                        build_count = recent_actions.count("BUILD")
                        attack_count = recent_actions.count("ATTACK")
                        
                        # Fix Bug B: Keep "Soldier" name for consistency with damage buff check
                        if attack_count >= 3:
                            new_status = "Soldier"   # behavior-derived: high-aggression = soldier
                        elif build_count >= 3:
                            new_status = "Builder"
                        elif farm_count >= 2:
                            new_status = "Farmer"
                        else:
                            new_status = "Wanderer"
                        
                        if agent.social_status != new_status:
                            agent.social_status = new_status
                            session.add(agent)
            else:
                # Apprentices are logged separately so we can track their learning in MongoDB
                logs.append(AgentLogEntry(
                    agent_id=agent.agent_id,
                    action="APPRENTICE",
                    reasoning="In apprenticeship. Learning from elders."
                ))
                
            # Prepare state for telemetry
            agent_states.append(AgentState(
                id=agent.agent_id,
                loc=[agent.coordinates.get("x", 0), agent.coordinates.get("y", 0)],
                state=action["type"] if agent.status == "Operation" else "APPRENTICE",
                civ=agent.civilization_id,
                inventory=dict(agent.inventory) if agent.inventory else {"food": 0, "wood": 0, "water": 0}
            ))
            
        session.commit()
        
        # Process civilization-scale dynamics (Memetics) — pass existing session to avoid SQLite lock
        from .memetics import process_memetics
        process_memetics(session)
        
        # Society Service (Phase 4 & 6)
        from .society import calculate_asabiyyah_per_civ, decay_cpr, calculate_reputation, update_trust_graph, detect_guild_formation, trigger_scapegoat, decay_trust_graph, apply_triadic_closure
        asabiyyah_dict = calculate_asabiyyah_per_civ(session)
        state.asabiyyah_index = asabiyyah_dict
        session.add(state)
        cpr_data = decay_cpr(session)
        
        # Exponential trust decay every tick
        decay_trust_graph(session)
        
        # Bug 1 Fix: Farming runs every tick so crop_age matches actual tick count
        from .economy import process_farming
        resources = process_farming(resources, physics_constants)   # Age crops, promote mature ones to Food
        
        # Every 5 ticks, update reputations and society mechanics
        if state.current_tick % 5 == 0:
            calculate_reputation(session)
            detect_guild_formation(session)
            
            # Phase 8: Territory pressure and war evaluation (every 5 ticks is fine for these)
            from .economy import apply_territory_pressure, process_war
            apply_territory_pressure(session, [a for a in agents if a.vitals.get("health", 0) > 0])  # Bug 2 Fix: live agents only
            process_war(session)                      # Evaluate inter-civ trust → war/peace
            
            # Check for civil war scapegoating
            for civ, asab in asabiyyah_dict.items():
                if asab < 0.3:
                    trigger_scapegoat(session, civ)
            
            # Spatial Interaction Logic: Agents in close proximity simulate dyadic interaction,
            # triggering the Trust update rules derived from the Complex Contagion model.
            if len(agents) >= 2:
                for a in agents:
                    for b in agents:
                        if a.agent_id != b.agent_id:
                            # if distance < 2
                            dx = a.coordinates.get("x",0) - b.coordinates.get("x",0)
                            dy = a.coordinates.get("y",0) - b.coordinates.get("y",0)
                            dist = abs(dx) + abs(dy)
                            if dist < 2:
                                update_trust_graph(session, a.agent_id, b.agent_id, 0.1)
                                
        # Every 10 ticks run Triadic Closure
        if state.current_tick % 10 == 0:
            apply_triadic_closure(session)
        
        # ── Auto Dream Cycle ──────────────────────────────────────────────────
        # Every DREAM_CYCLE_INTERVAL ticks (default 20), compile working_memory
        # into long-term beliefs automatically — no manual trigger needed.
        _dream_interval = int(os.getenv("DREAM_CYCLE_INTERVAL", "20"))
        if state.current_tick > 0 and state.current_tick % _dream_interval == 0:
            from .dream_cycle import run_dream_cycle
            processed_count = await run_dream_cycle()
            logs.append(AgentLogEntry(
                agent_id="SYSTEM",
                action="DREAM_CYCLE",
                reasoning=f"Dream Cycle complete at Tick {state.current_tick}. "
                          f"{processed_count} agents consolidated their memories into beliefs."
            ))
            print(f"[DREAM CYCLE] Tick {state.current_tick}: {processed_count} agents processed.")

        # ── Loop 4: Accumulate Action Tally (used by Democratic Action detector) ───────
        pc = dict(state.physics_constants) if state.physics_constants else {}
        tally = dict(pc.get("action_tally", {}))
        for _action in actions:
            atype = _action.get("type", "IDLE")
            tally[atype] = tally.get(atype, 0) + 1
        pc["action_tally"] = tally
        state.physics_constants = pc
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(state, "physics_constants")
        session.add(state)

        # ── Pattern Detector (Autonomous Growth) ──────────────────────────────
        if state.current_tick > 0 and state.current_tick % 50 == 0:
            from .pattern_detector import run_pattern_detector
            await run_pattern_detector(session)
            logs.append(AgentLogEntry(
                agent_id="SYSTEM",
                action="PATTERN_DETECTOR",
                reasoning=f"Pattern Detector ran at Tick {state.current_tick}."
            ))

        # Bug 2 Fix: Build latest_cpr from current state and merge in the decay_cpr sub-keys
        # (wood, water) so that neither the decay write nor the resource/structure write clobbers the other.
        decayed_cpr = dict(cpr_data) if cpr_data else {}
        latest_cpr = dict(state.common_pool_resources) if state.common_pool_resources else {}
        latest_cpr["resources"] = resources
        latest_cpr["structures"] = structures
        # Preserve wood/water values that decay_cpr computed
        if "wood" in decayed_cpr:
            latest_cpr["wood"] = decayed_cpr["wood"]
        if "water" in decayed_cpr:
            latest_cpr["water"] = decayed_cpr["water"]
        state.common_pool_resources = latest_cpr
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(state, "common_pool_resources")
        session.add(state)
        
        # Bug 1 Fix: Track live population with a counter so cap is accurate during loop
        MAX_POPULATION = int(os.getenv("MAX_POPULATION", "50"))
        live_count = len(agents)
        
        # Check for death & reproduction
        for agent in agents:
            vitals = dict(agent.vitals)
            
            # Dehydration mechanic: if global water is 0, everyone suffers
            if latest_cpr.get("water", 100) <= 0:
                vitals["health"] = max(0.0, vitals.get("health", 100.0) - 5.0)
                agent.vitals = vitals
                from sqlalchemy.orm.attributes import flag_modified
                flag_modified(agent, "vitals")
                session.add(agent)
            if vitals.get("health", 100) <= 0:
                # ── Determine cause of death ─────────────────────────────────────
                cause = "unknown causes"
                if vitals.get("satiety", 100) <= 0:
                    cause = "starvation"
                elif latest_cpr.get("water", 100) <= 0:
                    cause = "dehydration"
                elif agent.age > _MAX_LIFESPAN:
                    cause = "old age"
                else:
                    cause = "combat wounds"
                
                agent_role = agent.social_status or "Wanderer"
                agent_civ = agent.civilization_id
                
                # ── Lore event in Akashic Records ────────────────────────────────
                from .lore import add_lore_event
                add_lore_event(
                    current_session_id.get(),
                    agent_civ,
                    f"Agent {agent.agent_id} ({agent_role}) of {agent_civ} perished from {cause} "
                    f"on Tick {state.current_tick}. They lived for {agent.age} ticks across "
                    f"generation {agent.generation}.",
                    state.current_tick,
                    agent.agent_id
                )
                
                # ── Write WITNESS memory to nearby agents (radius 10) ────────────
                dead_x = agent.coordinates.get("x", 0)
                dead_y = agent.coordinates.get("y", 0)
                from ..models.db import Cognition
                for other in agents:
                    if other.agent_id == agent.agent_id:
                        continue
                    ox = other.coordinates.get("x", 0)
                    oy = other.coordinates.get("y", 0)
                    if abs(dead_x - ox) + abs(dead_y - oy) <= 10:
                        wit_cog = session.exec(select(Cognition).where(Cognition.session_id == current_session_id.get()).where(Cognition.agent_id == other.agent_id)).first()
                        if wit_cog:
                            wit_wm = list(wit_cog.working_memory) if wit_cog.working_memory else []
                            wit_wm.append(
                                f"[WITNESS] I saw {agent.agent_id} ({agent_role}) die of {cause} "
                                f"at Tick {state.current_tick}. Death came from {cause}."
                            )
                            if len(wit_wm) > 20: wit_wm = wit_wm[-20:]
                            wit_cog.working_memory = wit_wm
                            from sqlalchemy.orm.attributes import flag_modified
                            flag_modified(wit_cog, "working_memory")
                            session.add(wit_cog)
                
                # ── Grief mechanics for highly-trusted peers ─────────────────────
                trust = dict(state.trust_graph) if state.trust_graph else {}
                my_trust_scores = trust.get(agent.agent_id, {})
                for peer_id, t_val in my_trust_scores.items():
                    if t_val > 0.8:
                        peer = session.exec(select(Agent).where(Agent.session_id == current_session_id.get()).where(Agent.agent_id == peer_id)).first()
                        if peer:
                            p_vitals = dict(peer.vitals)
                            p_vitals["stamina"] = max(0.0, p_vitals.get("stamina", 100.0) * 0.5)
                            peer.vitals = p_vitals
                            from sqlalchemy.orm.attributes import flag_modified
                            flag_modified(peer, "vitals")
                            session.add(peer)
                            peer_cog = session.exec(select(Cognition).where(Cognition.session_id == current_session_id.get()).where(Cognition.agent_id == peer_id)).first()
                            if peer_cog:
                                ep_mem = list(peer_cog.episodic_memory) if peer_cog.episodic_memory else []
                                ep_mem.append(f"[GRIEF] My trusted ally {agent.agent_id} died of {cause} on Tick {state.current_tick}. I am devastated.")
                                if len(ep_mem) > 10: ep_mem = ep_mem[-10:]
                                peer_cog.episodic_memory = ep_mem
                                flag_modified(peer_cog, "episodic_memory")
                                session.add(peer_cog)

                cog = session.exec(select(Cognition).where(Cognition.session_id == current_session_id.get()).where(Cognition.agent_id == agent.agent_id)).first()
                if cog:
                    session.delete(cog)
                
                # ── Activity log entry ────────────────────────────────────────────
                logs.append(AgentLogEntry(
                    agent_id="SYSTEM",
                    action="DEATH",
                    reasoning=f"Agent {agent.agent_id} ({agent_role}) of {agent_civ} has perished from {cause} on Tick {state.current_tick}."
                ))
                
                # ── Loop 2: Tag death into death_markers ──────────────────────────
                current_markers = list(state.death_markers) if state.death_markers else []
                current_markers.append({
                    "cause": cause,
                    "x": dead_x,
                    "y": dead_y,
                    "tick": state.current_tick,
                    "civ": agent_civ
                })
                # Keep last 500 death markers to prevent unbounded growth
                if len(current_markers) > 500:
                    current_markers = current_markers[-500:]
                state.death_markers = current_markers
                from sqlalchemy.orm.attributes import flag_modified
                flag_modified(state, "death_markers")
                session.add(state)
                
                session.delete(agent)
                agent_states = [s for s in agent_states if s.id != agent.agent_id]
                live_count -= 1
                continue
                
            # --- Resource-Aware Ecological Reproduction ---
            if live_count >= MAX_POPULATION:
                pass  # Hard population cap reached, no reproduction
            else:
                rep_settings = dict(state.common_pool_resources).get("reproduction_settings", {}) if state.common_pool_resources else {}
                vital_threshold = rep_settings.get("vitals_threshold", 70.0)
                rep_radius = rep_settings.get("radius", 15)
                base_chance = rep_settings.get("base_chance", 0.15)
                
                if vitals.get("health", 0) > vital_threshold and vitals.get("satiety", 0) > vital_threshold and vitals.get("stamina", 0) > 50:
                    ax_r = agent.coordinates.get("x", 0)
                    ay_r = agent.coordinates.get("y", 0)
                    
                    # Count food within radius — proxy for local carrying capacity
                    food_nearby = sum(
                        1 for r in resources
                        if abs(ax_r - r["x"]) + abs(ay_r - r["y"]) <= rep_radius
                    )
                    
                    # Require at least one same-civ mate within radius
                    mate_nearby = any(
                        a.agent_id != agent.agent_id
                        and a.civilization_id == agent.civilization_id
                        and abs(ax_r - a.coordinates.get("x", 0)) + abs(ay_r - a.coordinates.get("y", 0)) <= rep_radius
                        for a in agents
                    )
                    
                    if mate_nearby and food_nearby > 0:
                        # Birth probability scales with food abundance
                        food_factor = min(food_nearby / 10.0, 1.0)
                        stamina_factor = vitals.get("stamina", 100.0) / 100.0
                        reproduction_chance = base_chance * food_factor * stamina_factor
                        
                        if random.random() < reproduction_chance:
                            new_id = f"A_{random.randint(100, 999)}"
                            if not session.exec(select(Agent).where(Agent.session_id == current_session_id.get()).where(Agent.agent_id == new_id)).first():
                                from ..models.db import Cognition
                                
                                # Mutate personality slightly from parent's traits
                                parent_personality = dict(agent.personality) if agent.personality else {"alpha": 0.5, "beta": 0.5, "gamma": 0.5}
                                child_personality = {
                                    k: max(0.0, min(1.0, v + random.uniform(-0.05, 0.05)))
                                    for k, v in parent_personality.items()
                                }
                                
                                new_agent = Agent(
                                    agent_id=new_id,
                                    session_id=current_session_id.get(),
                                    civilization_id=agent.civilization_id,
                                    generation=agent.generation + 1,
                                    status="Apprenticeship",
                                    # Scatter child within ±5 tiles of parent to prevent stacking
                                    coordinates={
                                        "x": max(0, min(100, agent.coordinates.get("x", 0) + random.randint(-5, 5))),
                                        "y": max(0, min(100, agent.coordinates.get("y", 0) + random.randint(-5, 5)))
                                    },
                                    vitals={
                                        "health": round(random.uniform(75.0, 95.0), 1),
                                        "satiety": round(random.uniform(70.0, 90.0), 1),
                                        "stamina": round(random.uniform(80.0, 100.0), 1)
                                    },
                                    personality=child_personality
                                )
                                session.add(new_agent)
                                session.add(Cognition(agent_id=new_id))
                                live_count += 1
                                
                                logs.append(AgentLogEntry(
                                    agent_id=new_id,
                                    session_id=current_session_id.get(),
                                    action="BORN",
                                    reasoning=f"A new generation begins in {agent.civilization_id}!"
                                ))
                                
                                # Reproduction costs the parent stamina
                                parent_vitals = dict(agent.vitals)
                                parent_vitals["stamina"] = max(0.0, parent_vitals.get("stamina", 100.0) - 25.0)
                                agent.vitals = parent_vitals
                                from sqlalchemy.orm.attributes import flag_modified
                                flag_modified(agent, "vitals")
                                session.add(agent)

        # Evaluate global tech unlocks based on accumulated resources and devotion
        from .techtree import evaluate_tech_unlocks
        evaluate_tech_unlocks(session)

        session.commit()
        
        # Broadcast
        asabiyyah_dict = state.asabiyyah_index if isinstance(state.asabiyyah_index, dict) else {}
        payload = TelemetryPayload(
            tick=state.current_tick,
            agents=agent_states,
            asabiyyah=asabiyyah_dict.get("civ_a", 1.0),
            cpr=latest_cpr,
            logs=logs,
            world_map=list(state.world_map) if state.world_map else [],
            world_seed=state.world_seed
        )
        payload_dict = payload.model_dump()
        # Inject Phase 8 state not covered by CPR schema
        payload_dict["territory"] = dict(state.territory) if state.territory else {}
        payload_dict["war_state"] = dict(state.war_state) if state.war_state else {}
        payload_dict["tech_tree"] = dict(state.tech_tree) if state.tech_tree else {}
        
        try:
            from .analytics import analytics
            if analytics.enabled:
                fat_agents = []
                for agent in agents:
                    from ..models.db import Cognition
                    cog = session.exec(select(Cognition).where(Cognition.session_id == current_session_id.get()).where(Cognition.agent_id == agent.agent_id)).first()
                    
                    emo = "Calm/Boredom"
                    for ad in agents_data:
                        if ad["agent_id"] == agent.agent_id:
                            emo = ad.get("emotion", "Calm/Boredom")
                            break
                            
                    fat_agents.append({
                        "agent_id": agent.agent_id,
                        "civilization_id": agent.civilization_id,
                        "generation": agent.generation,
                        "status": agent.status,
                        "social_status": agent.social_status,
                        "vitals": dict(agent.vitals) if agent.vitals else {},
                        "coordinates": dict(agent.coordinates) if agent.coordinates else {},
                        "personality": dict(agent.personality) if agent.personality else {},
                        "mimetic_desire": dict(agent.mimetic_desire) if agent.mimetic_desire else {},
                        "prediction_error_history": list(agent.prediction_error_history) if agent.prediction_error_history else [],
                        "emotion": emo,
                        "belief_graph": dict(cog.belief_graph) if cog and cog.belief_graph else {},
                        "working_memory": list(cog.working_memory) if cog and cog.working_memory else [],
                        "lexicon_hash": dict(cog.lexicon_hash) if cog and cog.lexicon_hash else {}
                    })
                
                fat_payload = {
                    "tick": state.current_tick,
                    "asabiyyah_index": asabiyyah_dict,
                    "reputation": dict(state.reputation) if isinstance(state.reputation, dict) else {},
                    "trust_graph": dict(state.trust_graph) if isinstance(state.trust_graph, dict) else {},
                    "active_norms": list(state.active_norms) if isinstance(state.active_norms, list) else [],
                    "cpr": latest_cpr,
                    "agents": fat_agents,
                    "logs": [log.model_dump() for log in logs]
                }
                await analytics.log_tick(session_id, fat_payload)
        except Exception as e:
            print(f"Analytics logging failed: {e}")
            
        await broadcast_callback(payload_dict)


