## PROJECT DOXA: OFFICIAL CONTEXT BIBLE

**Version:** 1.0 (Master Reference)
**Architecture Status:** Locked

This document is the canonical memory, source of truth, and encyclopedia for Project Doxa. It contains all architectural logic, academic models, mathematical formulations, and engineering constraints required to reconstruct, understand, or expand the simulation.

---

## PART 1: PROJECT IDENTITY

### What Doxa Is

Project Doxa is a thermodynamically driven, session-based micro-civilization simulation. It is a discrete-time state machine engineered to observe the endogenous emergence of selfhood, society, religion, and historical cycles within a population of 20 autonomous agents. It runs locally on Apple M-series silicon, utilizing a Next.js frontend, a FastAPI Python monolithic backend, a local SQLite database, and the Google AI Studio API (`gemini-3-flash-preview` and `gemini-3.1-flash-lite`).

### Why Doxa Exists

Doxa exists to solve the fundamental fragility of modern AI agents: the lack of temporal consequence and semantic permanence. Current agentic wrappers operate as stateless calculators optimized for task execution, suffering from context bloat and hallucination when subjected to long-term memory streams. Doxa exists to prove that true autonomous alignment and cultural evolution can only emerge when agents are subjected to computational scarcity, shared resources, and environmental unpredictability.

### Core Mission and Vision

* **Mission:** To build an ecosystem where agents do not roleplay identity, but mathematically derive it through the defense of their internal world models against environmental chaos.
* **Vision:** A stable, infinite-duration terrarium that organically generates sociology, economics, and religion without human prompting or hardcoded game loops.

### Ultimate Goals

* **Research:** To mathematically validate that Active Inference, Ostrom's economics, and Khaldunian cliodynamics can be successfully simulated using LLMs as the cognitive processing units.
* **Engineering:** To achieve a zero-dollar cloud cost footprint by batching physics locally and using high-context, high-throughput models (Flash-Lite) solely for cognitive interrupts and nightly compilation.

---

## PART 2: CORE PHILOSOPHICAL FOUNDATIONS

### Selfhood and Identity

In Doxa, selfhood is not a biological spark or a system prompt (e.g., "You are a blacksmith"). Selfhood is a structural, mathematical necessity. It is the algorithmic defense of the internal generative model. Identity is defined entirely by the `belief_graph`—a directed acyclic graph of rules an agent has deduced. An agent *is* its beliefs.

### Agency and Goals

Agents are not given tasks by humans. Agency is the mathematical drive to return the agent's state vector to equilibrium. Goals are endogenously generated when an agent's homeostatic state (satiety, health) deviates from optimal levels, creating a utility drive to act.

### Belief and Knowledge

Knowledge is objective (held by the backend physics engine). Belief is subjective (held in the agent's SQLite schema). Beliefs are heuristics generated to predict the environment.

### Memory

Memory is identity. To prevent hallucination, memory is heavily structured. Raw experiences are temporary; only the semantic rules extracted from those experiences are permanent.

### Reflection and Learning

Learning is the synthesis of new semantic rules from episodic failure. Reflection is the nightly process ("Dream Cycle") where raw text is converted into rigid JSON rules.

### Emergence and Collective Intelligence

Society is not pre-programmed. Collective intelligence emerges when the overlapping belief graphs of multiple selfish agents happen to yield higher survival utility than isolated action.

### Meta-Cognition and Godhood

Godhood is a mathematical pressure-release valve. When an agent experiences an event that violates its functional understanding of reality, cognitive surprise spikes. To prevent the collapse of its identity, the agent is forced to invent a Theological Belief (a God Node) to explain the unexplainable, restoring predictability to its universe.

---

## PART 3: AGENT MODEL

### Agent Anatomy and State

An agent is a persistent row in the `agents` and `cognition` SQLite tables. Its state at time $t$ is a matrix:

* **Somatic State:** Health, satiety, stamina.
* **Spatial State:** Coordinates on the 2D grid, line-of-sight visibility.
* **Mental State:** Mimetic desire intensity, prediction error rate.

### Agent Lifecycle

1. **Spawn:** Born as a blank slate with a genetic `lineage_hash`.
2. **Apprenticeship:** Tethers to an Elder to slowly copy the Elder's `belief_graph` (AgentSchool protocol).
3. **Operation:** Executes the deterministic physics loop, interrupting for LLM cognition only when surprised or challenged.
4. **Death:** Somatic failure deletes the agent's subjective memory, though its artifacts and transmitted culture remain.

### Agent Cognition and Reasoning

Cognition is cleanly split. Routine tasks (walking, basic harvesting) are executed by the Python backend reading the agent's functional beliefs—costing zero API tokens. Complex reasoning (ambushes, trade, crisis resolution) triggers the ReAct loop via `gemini-3.1-flash-lite`.

### Agent Communication

Agents exchange information via a `lexicon_hash`. This acts as a translation layer. When passing subgraph memories to others, the vocabulary mutates. This enforces lossy communication, leading to dialect drift and organic misunderstandings.

---

## PART 4: MEMORY SYSTEM

Doxa explicitly rejects Vector Databases (RAG) due to semantic blurring and context bloat. Memory is governed by the CoALA (Cognitive Architectures for Language Agents) framework.

### Memory Subsystems

* **Short-Term Memory (Context Window):** The transient buffer of the current simulation tick. Flushed immediately after action execution.
* **Working / Episodic Memory:** The append-only daily journal. An array of text logs (e.g., " Agent 12 stole wood"). Kept in SQLite `working_memory`.
* **Semantic Memory (Belief Graph):** The permanent, abstracted rules of reality, stripped of time and context. Kept in SQLite `belief_graph` as JSON.
* **Long-Term Memory:** The fusion of the semantic graph and the `lineage_hash` (genetic memory passed from parents).

### Memory Mechanics

* **Memory Retrieval:** Uses Topological Graph Retrieval. The system pulls nodes logically connected to the current observation, not semantically similar words.
* **Memory Reinforcement:** Beliefs proven true repeatedly gain weight.
* **Memory Decay:** Episodic text is permanently deleted every night. Relational trust edges decay exponentially over time if not reinforced.

---

## PART 5: BELIEF SYSTEM

### Belief Categories

* **Functional:** Objective physics (e.g., "Fire burns").
* **Relational:** Social stances (e.g., "Distrust Agent 7").
* **Theological:** Metaphysical heuristics (e.g., "The Great Flash demands sacrifice").

### Belief Creation and Revision

Beliefs are synthesized during the Dream Cycle. If an episodic observation contradicts a prior belief, Bayesian updating occurs. If the new probability crosses a threshold, the belief is rewritten.

### Contradiction Handling (The Caltrop Layer)

Inspired by database state validation (Argus/Caltrop), Doxa features a Memetic Immune System. Before a new belief is saved to SQLite, a Python validator checks it against absolute physical laws defined in `.env`. If an agent hallucinates a paradox (e.g., "Water kills"), the Caltrop layer flags it as a memetic pathogen. If the agent spreads it, their social reputation drops, leading to ostracization.

---

## PART 6: REASONING SYSTEM

### Multi-Tiered Architecture

* **ReAct (Reason + Act):** Used during the Fast-Tick interrupt. The agent observes the spatial grid, generates an internal monologue assessing utility, and outputs a JSON action.
* **Internal Debates (Tree of Thoughts):** For high-stakes decisions (combat), the agent forks its context to evaluate the expected utility of two simulated futures before acting.
* **Analogy Synthesis (Graph of Thoughts):** Used exclusively during the Dream Cycle. The LLM connects two disparate Functional nodes (e.g., Clay + Fire = Kiln) to invent new technologies.

---

## PART 7: SOCIETY SYSTEM

### Social Emergence

Societies emerge through **Triadic Closure**. If Agent A trusts B, and A trusts C, the probability of B trusting C increases. This naturally forms dense subgraphs known as **Coalitions**.

### Dynamics

* **Trust:** A pairwise directed edge weight between [-1, 1].
* **Reputation:** A global metric calculated via Eigenvector Centrality. High reputation agents become Leaders.
* **Influence:** The capacity of a Leader's broadcasted belief to instantly overcome a follower's internal adoption threshold.
* **Institutions:** Guilds form when Coalitions centralize a specific functional capability, removing the need for all agents to learn all skills.

---

## PART 8: CIVILIZATION SYSTEM

### Civilization Evolution

Civilization is subject to the Khaldunian cycle of **Asabiyyah** (Social Cohesion).

1. **Growth:** Shared hardship unifies the `belief_graph`.
2. **Peak:** High cohesion unlocks Cooperative Pathfinding, allowing mega-structures and extreme wealth.
3. **Collapse:** Wealth triggers Mimetic Rivalry (agents copying each other's desires). Factions emerge. Asabiyyah drops below 0.3, disabling cooperation and sparking civil war.

### Governance and Norms

Governments form to solve Ostrom's Tragedy of the Commons. If a "King" agent depletes the global Forest, the resulting prediction error (famine) forces the society to invent Laws or Taxation via negotiation systems to restrict the King.

### Cultural Evolution

Beliefs act as memetic viruses. They spread via Complex Contagion (requiring multiple trusted sources to adopt). Over time, successful norms are institutionalized as Traditions.

---

## PART 9: GODHOOD LAYER

### Architecture and Purpose

The Godhood Layer is the mathematical sink for unresolvable Variational Free Energy. It prevents cognitive collapse when the functional physics engine injects chaos (environmental disasters initiated by the Admin).

### Mechanisms

* **Meta-Agents:** The FastAPI Society Service acts as the invisible meta-agent, constantly calculating global Asabiyyah and Ostrom resource decay.
* **Consensus (RAFT):** When multiple agents generate different God Nodes to explain a disaster, they run a RAFT-inspired election. The agent with the highest Asabiyyah becomes the Theological Leader. Followers overwrite their God Nodes to match the Leader's, achieving religious consensus.

---

## PART 10: MATHEMATICAL FOUNDATIONS

### Variational Free Energy (Active Inference)

The utility driver of all action. Minimizing surprise.


$$F = D_{KL}[Q(s) || P(s)] - \mathbb{E}_{Q}[\ln P(o|s)]$$

### Topological Retrieval Score

Determines which memories enter the context window.


$$S_{retrieval}(m) = w_1 e^{-\lambda \Delta t} + w_2 \left(\frac{I_m}{10}\right) + w_3 \left(\frac{1}{d(O, m) + 1}\right)$$

### Bayesian Belief Updating

Updates the probability of a semantic rule based on new episodic data.


$$P(B|O) = \frac{P(O|B)P(B)}{P(O)}$$

### Trust Propagation

Updates dyadic trust with exponential decay over time.


$$T_{ij}(t+1) = T_{ij}(t) e^{-\lambda} + \alpha \Delta_{int}$$

### Reputation (Eigenvector Centrality)

Calculates an agent's global influence.


$$R_i = \frac{1}{\lambda} \sum_j T_{ji} R_j$$

### Complex Contagion (Information Diffusion)

Determines if an agent adopts a new cultural norm based on neighbor threshold $\theta_i$.


$$P(\text{Adopt}_i) = \mathbb{1} \left( \sum_{j \in N(i)} T_{ji} \cdot I(j) \ge \theta_i \right)$$

---

## PART 11: RESEARCH FOUNDATIONS

| Paper / Theory | Summary & Contribution | Strengths vs. Weaknesses | Doxa Implementation |
| --- | --- | --- | --- |
| **Generative Agents (Smallville)** | Agents in a sandbox via memory streams. | *Strength:* Routine architecture. *Weakness:* Context bloat, hallucination. | **Used:** Daily routines, spatial 2D grid. **Rejected:** Vector memory streams. |
| **ReAct** | Reason + Act interleaving. | *Strength:* Exception handling. *Weakness:* Requires external tools. | **Used:** The fast-tick internal monologue to evaluate spatial physics. |
| **Reflection** | Agents evaluate failures for self-correction. | *Strength:* Stops infinite loops. *Weakness:* Needs human metric. | **Used:** Nightly Dream Cycle reflections on thermodynamic surprise. |
| **Graph of Thoughts** | Explores reasoning as a DAG. | *Strength:* Complex synthesis. *Weakness:* Computationally heavy. | **Used:** Restricted to Dream Cycle for Analogy-Driven Innovation (technology synthesis). |
| **CoALA Framework** | Separates Working, Episodic, and Semantic memory. | *Strength:* Fixes context bloat. *Weakness:* Hard to structure. | **Used:** The entire database schema foundation. Memory is flushed nightly to semantic JSON. |
| **Ostrom's Commons** | Economics of shared resources and power asymmetry. | *Strength:* Highly realistic. | **Used:** The backend CPR decay logic. King agents force societal revolution. |
| **Khaldunian Asabiyyah** | Cliodynamics; the rise and fall of social cohesion. | *Strength:* Models macro-history. | **Used:** Background Python service calculates Asabiyyah to enable/disable cooperative pathfinding. |
| **Girard's Mimesis** | Desire is imitative, leading to rivalry and scapegoating. | *Strength:* Organic conflict generation. | **Used:** Observing neighbors injects artificial mimetic desires into an agent's state vector. |
| **Caltrop/Argus Sandbox** | Validates LLM outputs against strict environment schemas before commit. | *Strength:* Stops fatal syntax/logic errors. | **Used:** The Memetic Immune System validating beliefs against physical `.env` absolutes. |

---

## PART 12: TECHNICAL ARCHITECTURE

### The Monolith

Doxa uses a **Modular Monolith**. Microservices introduce HTTP latency that desyncs the 1-tick-per-second physics engine from the cognitive engine.

* **Backend:** Python FastAPI.
* **Frontend:** Next.js (Canvas 2D grid, React Flow, Tailwind).
* **Cognitive API:** `gemini-3.1-flash-lite` (fast interrupts) and `gemini-3-flash-preview` (legacy routing/heavy compilation).
* **Execution:** Local Apple M-series hardware.

### Service Domains

* **Simulation Service:** Grid, time $t$, Ostrom resource physics.
* **Agent Runtime:** Somatic decay, pathfinding, queue batched API interrupts.
* **Memory Service:** SQLite I/O, Topological Retrieval logic.
* **Knowledge Service (Caltrop):** Belief validation.

### Architecture Topology

```text
[ NEXT.JS GOD MODE CONSOLE ]
       ^ (WebSockets)
       |
[ FASTAPI MONOLITH ] 
  ├── Simulation Service (Physics & Asabiyyah)
  ├── Agent Runtime (Queue & ReAct)
  ├── Memory Service (Topological Fetch)
  └── Caltrop Validator (Immune System)
       |
       v (JSON Payloads)
[ GEMINI FLASH-LITE / PREVIEW API ]
       |
       v
[ LOCAL SQLITE DATABASE ]

```

---

## PART 13: DATABASE DESIGN

Doxa utilizes strict relational storage with embedded JSON for graph topologies. Vector storage is explicitly banned.

### Schema: `global_state`

| Column | Type | Purpose |
| --- | --- | --- |
| `session_id` | VARCHAR | Primary Key. |
| `current_tick` | INT | Master clock. |
| `asabiyyah_index` | FLOAT | Khaldunian cohesion metric. |
| `cpr_data` | JSON | Ostrom common pool tracking. |

### Schema: `agents`

| Column | Type | Purpose |
| --- | --- | --- |
| `agent_id` | VARCHAR | Primary Key. |
| `generation` | INT | Generational tracker. |
| `vitals` | JSON | Somatic states (health, hunger). |
| `coordinates` | JSON | Spatial 2D position. |

### Schema: `cognition`

| Column | Type | Purpose |
| --- | --- | --- |
| `agent_id` | VARCHAR | Foreign Key. |
| `lexicon_hash` | JSON | Dictionary for dialect mutations. |
| `working_memory` | JSON | Array of text logs (flushed nightly). |
| `belief_graph` | JSON | The Semantic DAG (Functional, Relational, Theological). |
| `lineage_hash` | VARCHAR | Genetic pointer for inherited grudges. |

---

## PART 14: WORKFLOWS

1. **Agent Birth & Learning (AgentSchool):**
Generation 2 agent spawns with an empty `belief_graph`. It is physically tethered to an Elder for 10 ticks. The Python engine copies foundational semantic nodes from Elder to Child. If the Elder dies prematurely, the knowledge is permanently lost.


2. **Belief & Memory Formation (Dream Cycle):**
During the day, the agent logs text to `working_memory`. At session end, FastAPI pauses physics. Gemini processes the logs. It extracts functional physics, resolves prediction errors into theological nodes, writes the JSON to SQLite, and deletes the text logs.


3. **Society Formation (Triadic Closure):**
Agent A trades with Agent B. $T_{AB}$ increases. B trades with C. $T_{BC}$ increases. Due to topological proximity, Agent A formulates a trust edge with C. A three-node Coalition forms, sharing a specialized Guild technology.


4. **Civilization Formation (Ostrom & RAFT):**
A King agent rapidly depletes the global Forest. The Coalition suffers massive prediction error. They initiate a RAFT election, select a Leader via high Asabiyyah, and establish a new Norm (Taxation) to throttle the King's extraction rate.


5. **Civilization Evolution (Girard & Khaldun):**
The civilization achieves peak wealth. Somatic needs are met. Agents begin imitating each other's luxury desires (Mimetic Rivalry). Envy lowers the Asabiyyah index. The network fractures. A Scapegoat ritual is initiated to purge the violence, or the civilization collapses into civil war.


---

## PART 15: PROJECT VOCABULARY

* **Asabiyyah:** Social cohesion. High Asabiyyah enables cooperative pathfinding; low Asabiyyah causes civil war.
* **Belief Graph:** The semantic JSON DAG defining an agent's identity and understanding of reality.
* **Caltrop Layer:** The memetic immune system validator that blocks paradoxical LLM hallucinations from saving to SQLite.
* **Complex Contagion:** The network math requiring an agent to hear a belief from multiple trusted sources before adopting it.
* **Dream Cycle:** The nightly offline LLM compilation phase converting episodic memory into semantic beliefs.
* **Fast-Tick:** The 1-second deterministic physics loop and rapid ReAct LLM calls.
* **God Node:** A theological belief mathematically forced into existence to resolve high Variational Free Energy caused by an unexplainable event.
* **Lineage Hash:** The genetic pointer allowing agents to inherit relational grudges from parents.
* **Mimetic Rivalry:** The tendency of agents to copy the desires of neighbors, leading to artificial resource scarcity.
* **Topological Retrieval:** Fetching context memory based on graph edge distance rather than semantic vector similarity.
* **Variational Free Energy:** The mathematical metric of cognitive surprise. Agents act solely to minimize it.

---

## PART 16: CURRENT STATE OF THE PROJECT

* **Finalized:** Local M3 architecture, FastAPI/Next.js stack, SQLite schemas, Topological memory retrieval, Flash-Lite/Preview API topology, Khaldunian and Ostrom mathematical integration.
* **Partially Defined:** The exact JSON translation algorithms for `lexicon_hash` dialect mutations.
* **Unresolved / Research Gaps:** Dynamic tuning of the risk tolerance ($\alpha$) variable based on simulated trauma. Transitioning the discrete 2D grid to continuous floating-point spatial vectors for hyper-realistic LoS ambushes.
* **Engineering Gaps:** The Python async queue must be optimized to perfectly batch simultaneous spatial interrupts without stalling the master simulation clock.

---

## PART 17: MASTER KNOWLEDGE GRAPH

```text
[THERMODYNAMIC SURPRISE] --(triggers)--> [ACTIVE INFERENCE] --(drives)--> [AGENT ACTIONS]
                                                |
                                          (resolves via)
                                                v
[PHYSICS ENGINE (FASTAPI)] --(logs)--> [EPISODIC MEMORY] --(Dream Cycle)--> [BELIEF GRAPH (SQLITE)]
       |                                                                           |
 (Ostrom Math)                                                            (Topological Retrieval)
       v                                                                           v
[COMMON POOL RESOURCES] <--(depletes)-- [MIMETIC RIVALRY] <--(motivates)-- [AGENT COGNITION]
       |                                       |                                   |
 (Forces creation of)                    (Destroys)                        (Triadic Closure)
       v                                       v                                   v
[GOVERNMENT / NORMS] <--(enforced by)-- [ASABIYYAH (COHESION)] <--(creates)-- [COALITIONS / SOCIETY]
                                               |
                                        (cycles form)
                                               v
[KHALDUNIAN CLIODYNAMICS] --(dictates)--> [CIVILIZATION LIFECYCLE]

```

---

## PART 18: FINAL PROJECT DOXA REFERENCE

**PROJECT DOXA ARCHITECTURE BLOCK**
**Core:** Session-based, mathematically grounded micro-civilization simulator running locally via FastAPI, SQLite, Next.js, and Google Gemini Flash-Lite/Preview. Rejects Vector DBs and Task Execution paradigms.
**Cognition:** Driven by Friston's Variational Free Energy. Agents act to minimize thermodynamic surprise. Memory follows the CoALA framework: temporary episodic text is compiled nightly (Dream Cycle) into a permanent semantic JSON `belief_graph` (Functional, Relational, Theological). Topological graph retrieval assembles context.
**Society:** Emerges via Triadic Closure. Relational edges govern trust propagation and reputation (Eigenvector Centrality). The Caltrop layer validates beliefs to prevent memetic paradoxes.
**Civilization Math:** Uses Ostrom's Tragedy of the Commons (power asymmetry forces government emergence), Girard's Mimetic Rivalry (artificial scarcity and scapegoating), and Khaldunian Asabiyyah (social cohesion index dictating cooperative pathfinding and civil collapse). Theology is established via RAFT consensus elections to resolve massive prediction errors (God Nodes).
**Infrastructure:** Modular monolith. Zero-dollar API footprint via batching fast-tick interrupts and utilizing large-context models for offline compilation. State is 100% deterministic and portable via SQLite.