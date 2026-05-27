import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from typing import List
from sqlmodel import Session, select, delete
import random
from ..services import physics
from ..services.dream_cycle import run_dream_cycle
from pydantic import BaseModel
from ..models.schemas import EventInjectPayload, BeliefInjectPayload, TelemetryPayload, AgentState, SimulationConfigPayload
from ..models.db import engine, GlobalState, Agent, Cognition

class ResourceSpawnPayload(BaseModel):
    x: int
    y: int
    type: str

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        # Bug F Fix: guard against ValueError if websocket already removed
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

# Callback used by physics.py to broadcast to all clients
async def broadcast_telemetry(payload: dict):
    await manager.broadcast(payload)

@router.websocket("/stream")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Push current state on connection so frontend persists across reloads
        with Session(engine) as session:
            state = session.exec(select(GlobalState).where(GlobalState.session_id == "default")).first()
            if state:
                agents = session.exec(select(Agent)).all()
                agent_states = [AgentState(id=a.agent_id, loc=[a.coordinates.get("x",0), a.coordinates.get("y",0)], state=a.status, civ=a.civilization_id) for a in agents]
                asabiyyah_dict = state.asabiyyah_index if isinstance(state.asabiyyah_index, dict) else {}
                cpr = state.common_pool_resources if isinstance(state.common_pool_resources, dict) else {}
                payload = TelemetryPayload(
                    tick=state.current_tick,
                    agents=agent_states,
                    asabiyyah=asabiyyah_dict.get("civ_a", 1.0),
                    cpr=cpr,
                    logs=[],
                    world_map=list(state.world_map) if state.world_map else [],
                    world_seed=state.world_seed
                )
                await websocket.send_json(payload.model_dump())
        
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@router.get("/session/status")
async def get_session_status():
    return {"is_running": physics.is_running}

@router.post("/session/start")
async def start_session(config: SimulationConfigPayload = None):
    if not config:
        config = SimulationConfigPayload()
    
    with Session(engine) as session:
        if not session.exec(select(Agent)).first():
            total_agents = config.num_agents_civ_a + config.num_agents_civ_b
            for i in range(1, total_agents + 1):
                agent_id = f"A_{i:03d}"
                is_civ_a = i <= config.num_agents_civ_a
                
                civ_id = "civ_a" if is_civ_a else "civ_b"
                alpha = config.civ_a_alpha if is_civ_a else config.civ_b_alpha
                beta = config.civ_a_beta if is_civ_a else config.civ_b_beta
                gamma = config.civ_a_gamma if is_civ_a else config.civ_b_gamma
                
                agent = Agent(
                    agent_id=agent_id,
                    civilization_id=civ_id,
                    generation=1,
                    status="Operation",
                    social_status="Wanderer",
                    coordinates={"x": random.randint(0, 49) if is_civ_a else random.randint(51, 100), "y": random.randint(0, 100)},
                    vitals={
                        "health": config.start_health,
                        "satiety": config.start_satiety,
                        "stamina": config.start_stamina
                    },
                    personality={"alpha": alpha, "beta": beta, "gamma": gamma},
                    inventory={"food": config.start_food, "wood": config.start_wood, "water": config.start_water},
                    prediction_error_history=[]
                )
                session.add(agent)
                cognition = Cognition(agent_id=agent_id)
                session.add(cognition)
            session.commit()
            
            # Seed the world environment with starting resources
            state = session.exec(select(GlobalState).where(GlobalState.session_id == "default")).first()
            if state:
                cpr = dict(state.common_pool_resources) if state.common_pool_resources else {}
                cpr["wood"] = config.start_env_wood
                cpr["water"] = config.start_env_water
                cpr["stone"] = config.start_env_stone
                cpr["gold"] = config.start_env_gold
                cpr["reproduction_settings"] = {
                    "vitals_threshold": config.reproduction_vitals_threshold,
                    "radius": config.reproduction_radius,
                    "base_chance": config.reproduction_base_chance
                }
                state.common_pool_resources = cpr
                
                # Generate world map
                from ..services.world_builder import generate_world
                seed, world_map = generate_world(config.seed, 100, 100)
                state.world_seed = seed
                state.world_map = world_map
                
                from sqlalchemy.orm.attributes import flag_modified
                flag_modified(state, "common_pool_resources")
                flag_modified(state, "world_map")
                session.add(state)
                session.commit()
                
    physics.start()
    return {"status": "started"}

@router.post("/session/reset")
async def reset_session():
    physics.pause()
    with Session(engine) as session:
        session.exec(delete(Agent))
        session.exec(delete(Cognition))
        session.exec(delete(GlobalState))
        
        # Recreate default global state
        new_state = GlobalState(
            session_id="default",
            current_tick=0,
            asabiyyah_index={"civ_a": 1.0, "civ_b": 1.0},
            common_pool_resources={"wood": 0, "water": 0}
        )
        session.add(new_state)
        session.commit()
        
    payload = TelemetryPayload(
        tick=0,
        agents=[],
        asabiyyah=1.0, 
        cpr={"wood": 0, "water": 0},
        logs=[]
    )
    await broadcast_telemetry(payload.model_dump())
        
    return {"status": "reset"}

@router.post("/session/pause")
async def pause_session():
    physics.pause()
    return {"status": "paused"}


@router.get("/lore/{civ_id}")
async def get_lore(civ_id: str, limit: int = 10):
    from ..services.lore import collection
    results = collection.get(
        where={"civ_id": civ_id},
        limit=limit
    )
    events = []
    if results and results.get("documents"):
        docs = results["documents"]
        metas = results["metadatas"]
        for doc, meta in zip(docs, metas):
            events.append({
                "text": doc,
                "tick": meta.get("tick", 0),
                "agent_id": meta.get("agent_id", "GLOBAL")
            })
    return {"lore": events}

@router.post("/event/inject")
async def inject_event(payload: EventInjectPayload):
    print(f"Event Injected: {payload}")
    if payload.type == "famine":
        god_mode_queue.append({"type": "famine"})
    elif payload.type == "plague":
        god_mode_queue.append({"type": "plague"})
    elif payload.type == "miracle":
        god_mode_queue.append({"type": "miracle", "location": payload.location})
            
    return {"status": "event injected", "payload": payload.model_dump()}

@router.post("/agent/{agent_id}/belief")
async def inject_belief(agent_id: str, payload: BeliefInjectPayload):
    from sqlalchemy.orm.attributes import flag_modified
    with Session(engine) as session:
        cognition = session.exec(select(Cognition).where(Cognition.agent_id == agent_id)).first()
        if not cognition:
            raise HTTPException(status_code=404, detail="Agent not found")
            
        graph = dict(cognition.belief_graph) if cognition.belief_graph else {"functional": [], "relational": [], "theological": []}
        cat = payload.category
        if cat not in graph:
            graph[cat] = []
            
        graph[cat].append({"node": payload.node, "weight": payload.weight})
        cognition.belief_graph = graph
        flag_modified(cognition, "belief_graph")
        session.add(cognition)
        session.commit()
        
    return {"status": "belief injected", "agent_id": agent_id}

@router.post("/civ/{civ_id}/belief")
async def inject_civ_belief(civ_id: str, payload: BeliefInjectPayload):
    from sqlalchemy.orm.attributes import flag_modified
    with Session(engine) as session:
        # Get all agents in the civilization
        agents = session.exec(select(Agent).where(Agent.civilization_id == civ_id)).all()
        if not agents:
            raise HTTPException(status_code=404, detail="Civilization or agents not found")
        
        agent_ids = [a.agent_id for a in agents]
        cognitions = session.exec(select(Cognition).where(Cognition.agent_id.in_(agent_ids))).all()
        
        for cognition in cognitions:
            graph = dict(cognition.belief_graph) if cognition.belief_graph else {"functional": [], "relational": [], "theological": []}
            cat = payload.category
            if cat not in graph:
                graph[cat] = []
                
            graph[cat].append({"node": payload.node, "weight": payload.weight})
            cognition.belief_graph = graph
            flag_modified(cognition, "belief_graph")
            session.add(cognition)
            
        session.commit()
        
    return {"status": "civilization belief injected", "civ_id": civ_id, "agents_affected": len(cognitions)}

@router.get("/agent/{agent_id}")
async def get_agent(agent_id: str):
    with Session(engine) as session:
        agent = session.exec(select(Agent).where(Agent.agent_id == agent_id)).first()
        cognition = session.exec(select(Cognition).where(Cognition.agent_id == agent_id)).first()
        
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
            
        return {
            "agent": agent.model_dump(),
            "cognition": cognition.model_dump() if cognition else None
        }

from ..services.physics import god_mode_queue

@router.post("/cycle/dream")
async def trigger_dream_cycle():
    physics.pause()
    await run_dream_cycle()
    physics.start()
    return {"status": "dream cycle completed", "message": "Episodic memory flushed, semantic beliefs updated"}

@router.post("/agent/{agent_id}/smite")
async def smite_agent(agent_id: str):
    god_mode_queue.append({"type": "smite", "agent_id": agent_id})
    return {"status": "smited", "agent_id": agent_id}

@router.post("/agent/{agent_id}/bless")
async def bless_agent(agent_id: str):
    god_mode_queue.append({"type": "bless", "agent_id": agent_id})
    return {"status": "blessed", "agent_id": agent_id}

@router.post("/resource/spawn")
async def spawn_resource(payload: ResourceSpawnPayload):
    res_type = "Crop" if payload.type == "food" else payload.type.capitalize()
    god_mode_queue.append({
        "type": "spawn",
        "res_type": res_type,
        "x": payload.x,
        "y": payload.y
    })
    return {"status": "resource spawned"}


# ── Akashic Records (Lore / RAG) ──────────────────────────────────────────────

@router.get("/lore/{civ_id}")
async def get_akashic_records(civ_id: str, limit: int = 20):
    """
    Returns the most recent lore events for a civilization (for the Akashic Records UI panel).
    Includes GLOBAL events (miracles, famines, plagues).
    Response uses 'lore' key to match LorePanel.tsx expectations.
    """
    try:
        from ..services.lore import get_akashic_records
        records = get_akashic_records(civ_id, limit=limit)
        return {"civ_id": civ_id, "lore": records, "count": len(records)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lore query failed: {str(e)}")



@router.get("/lore/{civ_id}/query")
async def query_akashic_records(civ_id: str, q: str, n: int = 5):
    """
    Semantic search over the Akashic Records for a civilization.
    Returns the most semantically relevant historical events given a query string.
    """
    try:
        from ..services.lore import query_lore
        results = query_lore(civ_id=civ_id, query_text=q, n_results=n)
        return {"civ_id": civ_id, "query": q, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lore query failed: {str(e)}")

