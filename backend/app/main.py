import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel
import os
from dotenv import load_dotenv
import uuid

# Load .env from the project root (since backend is run from /backend but .env is in root)
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env'))

from .routers import simulation
from .routers.analytics import router as analytics_router
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
    yield
    # Shutdown
    for session_id in list(physics.active_tasks.keys()):
        physics.pause(session_id)
    analytics.close()

app = FastAPI(title="Project Doxa", lifespan=lifespan)

frontend_url = os.getenv("FRONTEND_URL")
origins = ["http://localhost:3000", "http://localhost:5173"]
if frontend_url:
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(simulation.router, prefix="/api")
app.include_router(analytics_router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to Project Doxa API"}
