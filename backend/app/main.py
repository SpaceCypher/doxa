import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel
from dotenv import load_dotenv
import uuid

load_dotenv()

from .routers import simulation
from .models.db import engine
from .services import physics
from .services.analytics import analytics

run_id = str(uuid.uuid4())

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_db_and_tables()
    analytics.connect()
    # Start the simulation tick loop in the background
    asyncio.create_task(physics.tick_loop(simulation.broadcast_telemetry, run_id))
    yield
    # Shutdown
    physics.pause()
    analytics.close()

app = FastAPI(title="Project Doxa", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(simulation.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to Project Doxa API"}
