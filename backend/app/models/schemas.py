from pydantic import BaseModel
from typing import List, Optional

class AgentState(BaseModel):
    id: str
    loc: List[int]
    state: str
    civ: str
    inventory: dict = {}

class AgentLogEntry(BaseModel):
    agent_id: str
    action: str
    reasoning: str

class SimulationConfigPayload(BaseModel):
    num_agents_civ_a: int = 5
    num_agents_civ_b: int = 5
    civ_a_alpha: float = 0.5
    civ_a_beta: float = 0.5
    civ_a_gamma: float = 0.5
    civ_b_alpha: float = 0.5
    civ_b_beta: float = 0.5
    civ_b_gamma: float = 0.5
    start_food: int = 10
    start_wood: int = 10
    start_water: int = 10
    start_health: float = 100.0
    start_satiety: float = 100.0
    start_stamina: float = 100.0
    start_env_wood: int = 500
    start_env_water: int = 500
    start_env_stone: int = 200
    start_env_gold: int = 50
    reproduction_vitals_threshold: float = 70.0
    reproduction_radius: int = 15
    reproduction_base_chance: float = 0.15
    seed: Optional[int] = None

class TelemetryPayload(BaseModel):
    tick: int
    agents: List[AgentState]
    asabiyyah: float
    cpr: dict = {}
    logs: List[AgentLogEntry] = []
    world_map: List[List[int]] = []
    world_seed: Optional[int] = None
    tech_tree: dict = {}

class EventInjectPayload(BaseModel):
    type: str
    severity: str
    location: List[int]

class BeliefInjectPayload(BaseModel):
    category: str
    node: str
    weight: float
