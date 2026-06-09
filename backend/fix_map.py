from sqlmodel import Session, select
from app.models.db import engine, GlobalState
from app.services.world_builder import generate_world
from sqlalchemy.orm.attributes import flag_modified

with Session(engine) as session:
    state = session.exec(select(GlobalState).where(GlobalState.session_id == "default")).first()
    if state and not state.world_map:
        seed, world_map = generate_world(42, 100, 100)
        state.world_seed = seed
        state.world_map = world_map
        flag_modified(state, "world_map")
        session.add(state)
        session.commit()
        print("World map generated and saved.")
    else:
        print("State not found or map already exists.")
