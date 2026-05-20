# PROJECT DOXA: TECHNICAL AND RESEARCH BIBLE

## PART IV: THE TECHNICAL SPECIFICATION AND ENGINEERING BLUEPRINT

To build a thermodynamically stable, session-based civilization, standard enterprise web architecture must be inverted. Modern scalable web architecture is designed for millions of stateless users querying a database. Project Doxa is the exact opposite: a closed, highly stateful ecosystem of 20 entities communicating continuously in a deterministic physics loop.

This document is the absolute technical specification for Project Doxa. It translates the philosophical architecture of Parts I, II, and III into concrete database schemas, API topologies, and deployment roadmaps.

---

## 1. BACKEND: THE DETERMINISTIC PHYSICS ENGINE

The backend of Project Doxa is not a standard web server; it is a discrete-time simulation engine. It must process physics, track sociological metrics, and act as the gateway to the LLM cognitive layer.

### 1.1 Service Architecture: Modular Monolith vs. Microservices

Standard AI applications favor Microservices (splitting Agent, Memory, and World into separate containers). **Doxa strictly rejects the Microservice architecture in favor of a Modular Monolith.**

In a continuous simulation ticking at 1 iteration per second, network latency between microservices over HTTP or gRPC will cause the physics engine to de-sync from the cognitive engine. The Agent Service, Memory Service, and Simulation Service must share the exact same memory space and thread pool.

```text
=============================================================================
                          DOXA BACKEND TOPOLOGY (FASTAPI Monolith)
=============================================================================
[ Frontend (Next.js) ] <--(WebSockets)--> [ API Gateway / Controller ]
                                                  |
                                                  v
+---------------------------------------------------------------------------+
|                           THE DOXA ENGINE (Python)                        |
|                                                                           |
|  [ Simulation Service ] <----> [ Agent Runtime ] <----> [ Society Svc ]   |
|  (Grid, Physics, Time)         (ReAct Loop, Vitals)     (Asabiyyah Calc)  |
|                                       |                                   |
|                                       v                                   |
|  [ Cognitive Gateway ]  <----> [ Memory Service ]                         |
|  (Flash-Lite Client)           (SQLite Graph I/O)                         |
+---------------------------------------------------------------------------+
                                        |
                                        v
                               [ Local SQLite DB ]
=============================================================================

```

### 1.2 Internal Services

Inside the FastAPI monolith, the logic is strictly separated into modular domains:

* **Simulation Service:** Manages the global clock ($t$), the 2D spatial grid, pathfinding, and Common Pool Resources (Ostrom dynamics).
* **Agent Service:** Manages the Somatic state (hunger, health) and the ReAct loop. It determines when an agent can act autonomously versus when it must trigger a Cognitive Interrupt.
* **Memory Service:** Handles the Topological Graph Retrieval, writing episodic logs to disk, and retrieving the specific subgraph required for context assembly.
* **Society Service:** Runs the Khaldunian math in the background, updating the global *Asabiyyah* index based on belief graph overlap.
* **Knowledge Service:** Validates newly synthesized beliefs against the Caltrop `.env` rules (The Memetic Immune System).

### 1.3 Gateway, Auth, and Observability

* **API Gateway:** Handled natively by FastAPI routers.
* **Authentication & Authorization:** Because Doxa is a local "God Mode" console running on an M3 machine, standard OAuth is disabled. Security is enforced via simple local CORS policies and a master `.env` admin key to prevent unauthorized WebSocket connections.
* **Rate Limiting:** Managed entirely by the **Simulation Service Throttle**. If the LLM API returns a `429 Too Many Requests`, the backend pauses the physics loop automatically, buffering the state until quota refreshes.
* **Observability & Logging:** * Standard `stdout` logging is too noisy for 20 agents.
* Doxa implements a dedicated `telemetry.db` SQLite file that logs strictly structured events (`TICK_DURATION`, `LLM_LATENCY`, `PREDICTION_ERROR_SPIKE`), visualized via Grafana connected to the SQLite source.



---

## 2. DATABASE ARCHITECTURE: THE GRAPH OF MINDS

The persistence layer of Doxa must support instantaneous read/writes for the physics loop and complex topological retrieval for the cognitive loop.

### 2.1 The Architectural Defections (Neo4j, Vector DBs, Redis)

To achieve zero-latency local execution and prevent semantic hallucinations, Doxa deliberately subverts standard agent database architectures:

* **Vector Databases (Chroma/Pinecone): Rejected.** Vector embeddings calculate semantic similarity, not logical truth. They lead to context bloat and hallucination. Doxa agents require strict, deterministic JSON graphs to define their identity.
* **Neo4j / Dedicated Graph DBs: Rejected for Local Storage.** While Doxa relies entirely on graph theory (The Belief Graph), spinning up a Java-based Neo4j instance for a 20-agent simulation is computational overkill. Doxa implements the Graph topologically within JSON columns in SQLite.
* **Redis: Unnecessary.** Because Doxa is a stateful Python monolith, the "hot state" (coordinates, current health) lives in Python RAM. Redis is redundant.
* **PostgreSQL:** Replaced with **SQLite**. SQLite writes to a single local file on the M3 drive, allowing you to literally copy/paste the entire civilization to a USB drive or pause the simulation instantly.

### 2.2 The Unified Schema (SQLite)

The database `doxa_world.db` contains three core tables.

**Table 1: `global_state` (The World)**

```sql
CREATE TABLE global_state (
    session_id VARCHAR(50) PRIMARY KEY,
    current_tick INTEGER,
    asabiyyah_index FLOAT,
    common_pool_resources JSON, -- e.g., {"wood": 500, "regeneration_rate": 5}
    active_norms JSON -- Societal rules currently enforced by the network
);

```

**Table 2: `agents` (The Somatic Body)**

```sql
CREATE TABLE agents (
    agent_id VARCHAR(10) PRIMARY KEY,
    generation INTEGER,
    social_status VARCHAR(20),
    vitals JSON, -- {"health": 100, "satiety": 80}
    coordinates JSON, -- {"x": 15, "y": 22}
    mimetic_desire JSON -- {"target_resource": "wood", "intensity": 0.9}
);

```

**Table 3: `cognition` (The Mind and Memory)**

```sql
CREATE TABLE cognition (
    agent_id VARCHAR(10) PRIMARY KEY REFERENCES agents(agent_id),
    lexicon_hash JSON, -- Dictionary for dialect mutation
    working_memory JSON, -- Chronological array of episodic logs
    belief_graph JSON, -- The Semantic DAG (Functional, Relational, Theological)
    lineage_hash VARCHAR(50)
);

```

### 2.3 Indexing and Scaling

* **Indexing:** Indexes are placed on `agent_id` and `generation`. Because the JSON payload sizes are tightly constrained (working memory is flushed nightly), SQLite can execute full-table reads in microseconds.
* **Scaling:** If Project Doxa scales to a 10,000-agent MMO, SQLite will be hot-swapped to **PostgreSQL**, and the JSON `belief_graph` column will be normalized into a dedicated **Neo4j** cluster to handle multi-hop relational queries. For 20 agents, local SQLite guarantees peak performance.

---

## 3. AGENT RUNTIME AND EXECUTION

The Agent Runtime is the heartbeat of the simulation. It dictates how time passes and when an LLM is invoked.

### 3.1 The Tick Lifecycle and Scheduling

The engine operates on a fixed-time step loop using Python's `asyncio`.
One Tick ($t$) = 1 Second of real time.

**The Tick Workflow:**

1. **State Decay:** Decrement satiety by 0.1 for all agents.
2. **Autonomous Execution:** For agents with an active deterministic plan (e.g., "Walking to X:15"), update their coordinates.
3. **Observation Phase:** Calculate Line-of-Sight for all agents.
4. **Interrupt Evaluation:** Compare observations against the agent's internal Belief Graph.

### 3.2 Event Systems and State Transitions

If an observation exceeds the Free Energy prediction threshold, an **Interrupt Event** is fired into the Queue System.

**State Transitions:**

* `IDLE` -> `PATHFINDING` (Determinisitc, no LLM cost).
* `IDLE` -> `COGNITIVE_INTERRUPT` (Fast-Tick LLM call).
* `COGNITIVE_INTERRUPT` -> `EXECUTING_ACTION` -> `IDLE`.

### 3.3 Task Execution and Queues

If three agents experience an interrupt simultaneously (e.g., a lightning strike), the Queue System **Batches** them. Instead of making three separate calls to the LLM API, the engine constructs a single JSON payload detailing the state of all three agents, requesting a synchronized response matrix. This drastically reduces HTTP latency and API cost.

---

## 4. FRONTEND: THE GOD MODE CONSOLE

The UI is a Next.js application that provides omniscient visualization of the thermodynamic terrarium.

### 4.1 UI Architecture

* **Framework:** Next.js (React) + Tailwind CSS.
* **State Management:** Zustand (for handling the high-frequency WebSocket coordinate updates without unnecessary re-renders).
* **Rendering Engines:** HTML Canvas for the 2D physical grid; React Flow for the cognitive Belief Graphs.

### 4.2 Dashboard Modules

1. **Civilization Dashboard (Macro):** Displays the global variables. A live line-chart of the Khaldunian *Asabiyyah* index, the depletion rate of Ostrom's Common Pool Resources, and a logarithmic scale of societal Free Energy.
2. **Society Visualization (The Grid):** A 2D overhead map showing agents, structures, and resources. Includes a "Fog of War" toggle to show exactly what a selected agent's Line-of-Sight looks like.
3. **Agent Inspector (Micro):** Clicking an agent opens a side-panel exposing their `vitals`, `working_memory`, and a live read-out of their current internal monologue/ReAct loop.
4. **Memory Explorer (React Flow):** A node-link graph visualizing the agent's JSON `belief_graph`. Users can see exactly which Functional rules and Theological superstitions are driving the agent's behavior.

### 4.3 Monitoring and Timeline Systems

The frontend includes a **Playback Timeline**. Because the backend saves state deterministically, the user can drag a slider back in time to review the exact tick where a Mimetic Rivalry sparked a war, inspecting the prediction error math that caused it.

---

## 5. API TOPOLOGY

Communication between the Next.js frontend, the Python backend, and the Gemini Cognitive layer.

### 5.1 WebSockets (The Telemetry Stream)

Used for the high-frequency physics tick.

* **Endpoint:** `ws://localhost:8000/stream`
* **Payload (Outbound from Backend):**
```json
{
  "tick": 452,
  "agents": [
    {"id": "A_001", "loc": [10, 15], "state": "PATHFINDING"},
    {"id": "A_002", "loc": [10, 16], "state": "COGNITIVE_INTERRUPT"}
  ],
  "asabiyyah": 0.85
}

```



### 5.2 REST APIs (Control & Introspection)

Used for God Mode commands and session lifecycle.

* `POST /api/session/start`: Boots the engine and hydrates from SQLite.
* `POST /api/session/pause`: Halts the `asyncio` tick loop.
* `POST /api/event/inject`: Triggers thermodynamic chaos.
* *Payload:* `{"type": "environmental_disaster", "severity": "high", "location": [10,15]}`


* `POST /api/cycle/dream`: Manually forces the nightly compilation of Episodic memory into the Semantic Belief Graph.

### 5.3 Internal APIs (The Cognitive Engine)

The Python backend's connection to Google AI Studio (`gemini-3.1-flash-lite`).

* **The Interrupt Prompt (Fast-Tick):** JSON-in, JSON-out. Strictly limited context window containing only the agent's immediate Line-of-Sight and highly-weighted relevant graph nodes.
* **The Dream Prompt (Heavy):** Utilizes the 1-Million token context window. Ingests the entire daily SQLite `working_memory` array and outputs the mutated `belief_graph`.

---

## 6. DEPLOYMENT, SCALING, AND ECONOMICS

### 6.1 Containerization (Docker)

Project Doxa is designed to run locally. The entire stack is containerized using `docker-compose.yml`.

```yaml
version: '3.8'
services:
  doxa_engine:
    build: ./backend
    ports: ["8000:8000"]
    volumes:
      - ./data:/app/data  # Persists the SQLite database locally
    env_file: .env        # Contains the GEMINI_API_KEY
  
  doxa_console:
    build: ./frontend
    ports: ["3000:3000"]
    depends_on:
      - doxa_engine

```

### 6.2 Cloud Architecture & Kubernetes (The Scaling Strategy)

If Project Doxa is deployed as a massive, persistent MMO, the architecture mutates:

* **Kubernetes (K8s):** The Monolith is split. The Physics Grid becomes a cluster of stateful sets, spatially partitioned (e.g., Pod A handles Grid Sector 1, Pod B handles Grid Sector 2).
* **Message Broker:** Apache Kafka replaces standard async queues to handle the massive event stream between the Physics Pods and the Cognitive Gateways.
* **Database:** AWS Aurora (PostgreSQL) handles the state, while AWS Neptune handles the massive multi-million node global Belief Graph.

### 6.3 Cost Estimation (The Zero-Dollar Paradigm)

By anchoring the cognitive layer to Google AI Studio's Free Tier (which heavily favors Flash-Lite for high-throughput, low-latency tasks):

* **Daily Quota:** 1,500 Requests per day.
* **2-Hour Session Cost:** ~300 Batched Interrupt calls + 1 Massive Dream Cycle call.
* **Total API Cost:** $0.00.
* **Compute Cost:** $0.00 (Local M3 Execution).

---

## 7. IMPLEMENTATION ROADMAP

To build this monolith successfully, engineering must proceed sequentially.

**Phase 1: The Physics Foundation (Weeks 1-2)**

* Initialize the FastAPI modular structure.
* Build the SQLite database schema and ORM layer.
* Implement the tick-based `asyncio` game loop.
* Create deterministic pathfinding and the Line-of-Sight raycasting logic.

**Phase 2: The UI Console (Weeks 3-4)**

* Build the Next.js dashboard.
* Establish the WebSocket connection to render the 2D grid in real-time.
* Build the React Flow visualization to query and display the `belief_graph` JSONs from the database.

**Phase 3: The Cognitive Integration (Weeks 5-6)**

* Write the Python API Gateway for `gemini-3.1-flash-lite`.
* Implement Topological Graph Retrieval (fetching the right beliefs for the context window).
* Write the system prompts for the Fast-Tick Interrupt and the Nightly Dream Cycle.

**Phase 4: Societal Mechanics (Weeks 7-8)**

* Implement the Caltrop Validation layer (Memetic Immunity).
* Implement Ostrom's Common Pool Resource decay logic in the Python engine.
* Implement the Khaldunian *Asabiyyah* calculator to dynamically adjust cooperation algorithms based on network belief overlaps.