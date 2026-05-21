import os
from typing import Any, Optional
from sqlmodel import Field, SQLModel, JSON, Column, create_engine

sqlite_file_name = "data/doxa_world.db"
# Ensure the data directory exists
os.makedirs(os.path.dirname(sqlite_file_name), exist_ok=True)
sqlite_url = f"sqlite:///{sqlite_file_name}"

engine = create_engine(sqlite_url)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

class GlobalState(SQLModel, table=True):
    __tablename__ = "global_state"
    session_id: str = Field(primary_key=True, max_length=50)
    current_tick: int = Field(default=0)
    asabiyyah_index: Any = Field(default={"civ_a": 1.0, "civ_b": 1.0}, sa_column=Column(JSON))
    common_pool_resources: Any = Field(default={}, sa_column=Column(JSON))
    active_norms: Any = Field(default=[], sa_column=Column(JSON))
    trust_graph: Any = Field(default={}, sa_column=Column(JSON))
    reputation: Any = Field(default={}, sa_column=Column(JSON))
    # Phase 8: Territory & War
    territory: Any = Field(default={}, sa_column=Column(JSON))  # {"zone_X_Y": "civ_id"}
    war_state: Any = Field(default={}, sa_column=Column(JSON))  # {"civ_a": ["civ_b"], "civ_b": []}
    
    # Phase 11: Tech Tree
    tech_tree: Any = Field(default={}, sa_column=Column(JSON))  # {"civ_a": ["agriculture", "masonry"], "civ_b": []}
    
    # World Generation
    world_seed: Optional[int] = Field(default=None)
    world_map: Any = Field(default=[], sa_column=Column(JSON))

class Agent(SQLModel, table=True):
    __tablename__ = "agents"
    agent_id: str = Field(primary_key=True, max_length=10)
    civilization_id: str = Field(default="civ_a", max_length=20)
    generation: int = Field(default=1)
    status: str = Field(default="Apprenticeship", max_length=20) # Apprenticeship or Operation
    social_status: str = Field(default="Wanderer", max_length=20)
    age: int = Field(default=0)  # Phase 8: ticks lived; old age death kicks in after MAX_LIFESPAN
    vitals: Any = Field(default={"health": 100, "satiety": 100, "stamina": 100}, sa_column=Column(JSON))
    coordinates: Any = Field(default={"x": 0, "y": 0}, sa_column=Column(JSON))
    mimetic_desire: Any = Field(default={"target": None, "intensity": 0.0}, sa_column=Column(JSON))
    inventory: Any = Field(default={"food": 0, "wood": 0, "water": 0, "stone": 0, "gold": 0, "devotion": 0}, sa_column=Column(JSON))
    personality: Any = Field(default={"alpha": 0.5, "beta": 0.5, "gamma": 0.5}, sa_column=Column(JSON))
    prediction_error_history: Any = Field(default=[], sa_column=Column(JSON))

class Cognition(SQLModel, table=True):
    __tablename__ = "cognition"
    agent_id: str = Field(primary_key=True, max_length=10, foreign_key="agents.agent_id")
    lexicon_hash: Any = Field(default={}, sa_column=Column(JSON))
    working_memory: Any = Field(default=[], sa_column=Column(JSON))
    episodic_memory: Any = Field(default=[], sa_column=Column(JSON))
    belief_graph: Any = Field(default={"functional": [], "relational": [], "theological": []}, sa_column=Column(JSON))
    lineage_hash: str = Field(default="", max_length=50)
