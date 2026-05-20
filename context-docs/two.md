# PROJECT DOXA: TECHNICAL AND RESEARCH BIBLE

## PART II: THE COGNITIVE ARCHITECTURE

If Part I established the thermodynamics of the civilization, Part II dissects the neurology of the citizen. The cognitive architecture of a Doxa agent is a rigid, multi-layered state machine designed to simulate continuous subjective experience without relying on the opaque, hallucination-prone mechanisms of standard LLM wrappers.

This document details the anatomy, memory structures, retrieval mathematics, and reasoning engines that allow a Doxa agent to formulate goals, experience simulated emotion, and build an identity.

---

## 1. AGENT ANATOMY AND INTERNAL STATE REPRESENTATION

A Doxa agent is not a stateless function; it is a continuously evolving entity governed by a multidimensional state vector. The agent's anatomy is divided into three interconnected layers: The **Somatic State** (the body), the **Cognitive State** (the mind), and the **Motivational State** (the soul/drive).

### 1.1 Internal State Representation

At any given tick $t$, the agent's absolute state $S_t$ is a matrix of quantitative variables that the backend physics engine and the cognitive LLM both read and mutate.

$$S_t = \begin{bmatrix} v_t \\ e_t \\ m_t \end{bmatrix}$$

* **$v_t$ (Vitals/Somatic):** A vector containing physiological metrics such as `[health, satiety, stamina]`.
* **$e_t$ (Environment/Spatial):** The agent's localized reality, including `[x_coord, y_coord, current_biome, line_of_sight_entities]`.
* **$m_t$ (Mental/Motivational):** The internal psychological metrics, including `[cognitive_load, mimetic_desire_intensity, prediction_error_rate]`.

### 1.2 Motivation Systems and Utility Functions

Standard LLM agents lack motivation because they lack a utility function. Doxa agents are driven by the biological imperative to maintain homeostasis. Their utility function is strictly tied to **Variational Free Energy** ($F$).

The agent does not seek to maximize a score; it seeks to minimize $F$. The utility $U$ of any action $a$ is inversely proportional to the expected free energy $G$ it will generate:

$$U(a) = -G(a) \approx - \left( \text{Expected Surprise} + \text{Homeostatic Deviation} \right)$$

This mathematical drive creates organic **Goal Management**. If $v_t[satiety]$ drops below a critical threshold, the homeostatic deviation spikes. The agent’s highest utility action organically becomes "find food," formulating a goal without human prompting.

### 1.3 Emotional Simulation Layers

Agents in Doxa do not possess biological feelings, but they possess algorithmic emotional states. Emotion in Doxa is the **first derivative of prediction error over time**.

Let $P_e(t)$ be the prediction error at time $t$. The emotional state $E(t)$ is calculated as:


$$E(t) = \frac{d}{dt} P_e(t)$$

* **Anxiety/Fear:** A positive derivative ($\frac{d}{dt} P_e(t) > 0$). The environment is becoming increasingly unpredictable.
* **Calm/Boredom:** A derivative near zero ($\frac{d}{dt} P_e(t) \approx 0$). The environment perfectly matches the internal world model.
* **Joy/Epiphany:** A sharp negative derivative ($\frac{d}{dt} P_e(t) \ll 0$). A sudden resolution of a massive unknown (e.g., discovering fire keeps the cold away).

### 1.4 Agent Personality and Personality Evolution

Personality in Doxa is not a text prompt (e.g., "You are grumpy"). It is a set of algorithmic hyperparameters that dictate how an agent processes the utility function and memory retrieval.

* **$\alpha$ (Risk Tolerance):** Dictates the agent's willingness to explore areas with high expected surprise.
* **$\beta$ (Social Plasticity):** Dictates how easily the agent updates its Relational Beliefs when encountering new agents.
* **$\gamma$ (Mimetic Susceptibility):** Dictates how strongly the agent adopts the desires of its neighbors.

**Personality Evolution:** These parameters mutate across generations and over an agent's lifetime. If an agent with high $\alpha$ (risk-taking) repeatedly suffers somatic damage, the reflection loop mathematically penalizes $\alpha$, simulating trauma and evolving the agent into a cautious, isolated entity.

---

## 2. THE MEMORY ARCHITECTURE

Doxa abandons Vector Databases (which retrieve data based on semantic proximity, leading to hallucinations) in favor of a rigid, hierarchical graph. Memory is structured along temporal and structural axes.

### 2.1 The Five Tiers of Memory

1. **Short Term Memory (The Context Window):** The transient buffer of the current simulation tick. It holds immediate sensory inputs (e.g., "I see Agent 12 holding wood"). It is volatile and flushed every tick.
2. **Working Memory (The Assembly Buffer):** A localized cache spanning the current interaction or combat sequence. It holds the past 5-10 ticks to maintain conversational or spatial continuity.
3. **Episodic Memory (The Journal):** The chronological append-only log of the day's events. This is where **Agent Journaling** occurs. Every action and observation is logged sequentially. It is not used for real-time decision making; it is the raw material for the Dream Cycle.
4. **Semantic Memory (The Belief Graph):** The abstracted, permanent rules of reality (Functional, Relational, Theological). It is stripped of time and context. (e.g., Not "I was burned at 2:00 PM," but "Fire damages health").
5. **Long Term Memory (The Identity):** The synthesis of the Semantic Memory graph and the agent's genetic `lineage_hash`. It dictates who the agent is across simulation sessions.

### 2.2 Memory Graph vs. Knowledge Graph Architecture

Doxa utilizes two parallel graph structures:

* **The Global Knowledge Graph (Objective Reality):** Held by the backend physics engine. It contains the actual rules of the world (e.g., Wood burns at 300 degrees). The agents *cannot* see this.
* **The Agent Memory Graph (Subjective Reality):** Held inside the agent's SQLite state. It is a directed acyclic graph (DAG) of beliefs. It represents what the agent *thinks* is true.

### 2.3 Context Assembly and Retrieval Augmented Cognition

When an agent acts, the system must assemble a prompt (Context Assembly). Because Doxa rejects Vector embeddings, it uses **Topological Graph Retrieval**.

When an observation $O$ occurs (e.g., "Agent 12 offers a berry"), the system identifies the core entities (Agent 12, Berry). It queries the Agent Memory Graph for nodes matching these entities and retrieves the topological subgraph.

The retrieval score $S_{retrieval}$ for any memory node $m$ is calculated as:


$$S_{retrieval}(m) = \omega_1 \cdot \text{Recency}(m) + \omega_2 \cdot \text{Importance}(m) + \omega_3 \cdot \text{TopologicalProximity}(O, m)$$

* **Recency:** Exponential decay based on when the belief was last accessed: $e^{-\lambda \Delta t}$
* **Importance:** An integer (1-10) assigned during the Dream Cycle reflection. Survival mechanics (food/damage) are permanently scored at 10.
* **Topological Proximity:** The inverse of the shortest path distance $d$ in the Belief Graph between the observed entity node and the memory node: $\frac{1}{d(O, m) + 1}$

### 2.4 Belief Storage and Updating Mechanisms

During the Dream Cycle, the agent reads its Episodic Memory. If an episodic sequence contradicts the Semantic Memory, a **Belief Update** triggers using Bayesian principles adjusted for Active Inference.

If prior belief is $P(B)$ and the new observation is $O$:


$$P_{new}(B) = \frac{P(O|B)P(B)}{P(O)}$$

If $P_{new}(B)$ crosses a critical threshold (e.g., > 0.85), the Belief Graph is structurally mutated. The old edge is deleted, and a new node is forged.

---

## 3. REASONING, PLANNING, AND REFLECTION

### 3.1 Multi-Step Reasoning and Planning Systems

Doxa agents engage in hierarchical planning. When a high-level goal is formulated (e.g., "Build a shelter to avoid the Great Flash"), the agent uses a **ReAct (Reason + Act)** loop constrained by its topological memory.
The agent breaks the goal into sub-routines by querying its functional beliefs:

1. *Target:* Shelter.
2. *Query Graph:* What creates shelter? -> Node: Wood.
3. *Query Graph:* Where is Wood? -> Node: Forest.
4. *Plan Generation:* [Move to Forest] -> [Harvest Wood] -> [Combine Wood].

### 3.2 Internal Monologue, Debates, and Self-Reflection

Advanced reasoning in Doxa utilizes **Internal Monologue** and **Internal Debates**. Before committing to a high-risk action (e.g., attacking another agent), the cognitive loop triggers an internal simulation.

The agent forks its context window and projects two simulated futures:

* *Future A:* I attack. He dies. I take his food. (Utility: +50)
* *Future B:* I attack. He is stronger. I die. (Utility: -1000)

By applying its risk tolerance parameter $\alpha$, the agent resolves the internal debate and selects the optimal path. **Self-Reflection** occurs post-action during the Dream Cycle, where the agent compares the expected utility of the chosen future against the actual episodic outcome, adjusting its risk parameters accordingly.

---

## 4. SOCIETAL COGNITION AND LEARNING

### 4.1 Agent-to-Agent Memory Exchange

Agents do not communicate via telepathy. They exchange information using their emergent `lexicon_hash`. When Agent A speaks to Agent B, they are attempting to transmit a subgraph of their Memory Graph.
Because language in Doxa mutates, this transfer is lossy. Agent B receives the translated subgraph and evaluates it against its own existing beliefs. If the received belief resolves a prediction error for Agent B, it is integrated. If it contradicts a highly weighted functional belief, it is rejected as heresy.

### 4.2 Agent Learning from Society and Civilization

**Curiosity Systems** drive agents to learn from the collective. Curiosity is mathematically defined as the drive to seek out environments with optimal (manageable) prediction errors.
When an agent encounters a societal artifact (e.g., a totem built by another tribe), it experiences moderate prediction error. The curiosity system compels the agent to observe the artifact and the agents interacting with it. Through this observation, the agent reverse-engineers the sociological norms of the civilization, integrating the civilization's God Node into its own Belief Graph through purely observational deduction.

---

## 5. RESEARCH FOUNDATIONS: ADAPTATIONS AND DEPARTURES

Project Doxa is an amalgamation of a dozen breakthrough papers in agentic AI. However, to achieve a stable, session-based civilization, Doxa ruthlessly dissects these papers—extracting their theoretical brilliance while discarding implementation details that cause latency, hallucination, or anthropomorphism.

Here is the exact mapping of academic research to Doxa’s cognitive architecture.

### 5.1 Generative Agents (Smallville)

* **What it contributes:** The foundational architecture for autonomous agents interacting in a sandbox environment, introducing the concepts of the memory stream, observation, planning, and reflection.
* **What parts are being used:** The tripartite scoring function for memory retrieval (Recency + Importance + Relevance), the concept of a nightly reflection cycle to synthesize higher-level thoughts, and the spatial tracking of agents on a 2D grid.
* **What parts are not being used:** LLM-based vector embedding search for memory retrieval, and natural language "personas".
* **Why:** Relying on dense vector embeddings for memory retrieval causes semantic blurring (retrieving "eating poison" when querying "eating food" because the vectors are close). Doxa requires absolute determinism for survival mechanics, necessitating Topological Graph Retrieval.

### 5.2 Voyager

* **What it contributes:** An embodied agent in Minecraft that continuously explores the world, driven by an automatic curriculum and an executable skill library, demonstrating lifelong learning without human intervention.
* **What parts are being used:** The concept of an evolving, executable skill library (translated into Doxa's "Functional Beliefs"), and the curiosity-driven exploration metric that pushes agents to interact with novel items to expand their worldview.
* **What parts are not being used:** Writing and executing raw code (JavaScript/Python) as skills.
* **Why:** Doxa agents do not manipulate the backend codebase; they operate entirely within the abstraction of the simulation. Writing code introduces massive security and syntax-failure risks. Doxa agents instead formulate strict JSON logic rules.

### 5.3 CAMEL (Communicative Agents for "Mind" Exploration of Large Scale Society)

* **What it contributes:** A role-playing framework where two agents (e.g., a stock trader and a programmer) cooperate to solve a complex task through structured inception prompting.
* **What parts are being used:** The inception prompting mechanism that forces agents to adhere strictly to their internal state and constraints during conversational exchanges without breaking the fourth wall.
* **What parts are not being used:** Fixed, human-assigned roles and cooperative alignment.
* **Why:** In Doxa, roles (King, Peasant, Priest) must be emergent properties of the simulation's economics and Khaldunian cycles, not hardcoded initial states. Furthermore, agents must have the capacity to deceive and defect, not just cooperate.

### 5.4 Reflection

* **What it contributes:** A framework where agents reflect on their past failures, generate verbal self-reinforcement, and maintain a separate memory buffer to avoid repeating the same mistakes in future iterations.
* **What parts are being used:** The mechanism of evaluating past actions against expected outcomes to generate corrective semantic rules, which Doxa implements fundamentally during the Dream Cycle.
* **What parts are not being used:** Human-in-the-loop reflection and task-specific evaluation metrics.
* **Why:** Doxa is an autonomous terrarium. An agent's failure is measured solely by somatic damage or thermodynamic surprise, never by a human evaluating if a task was completed correctly.

### 5.5 ReAct (Reason + Act)

* **What it contributes:** Interleaving reasoning traces (internal thoughts) with task-specific actions, allowing the model to dynamically adjust plans and handle exceptions.
* **What parts are being used:** The fundamental tick structure of Doxa's interrupt cycle: `[Observe -> Reason (Internal Monologue) -> Act]`.
* **What parts are not being used:** External tool-use (API calling to Wikipedia, calculators, etc.).
* **Why:** Doxa agents are trapped within their simulation. They cannot access the outside internet. Their "tools" are limited to the physical mechanics of the simulated world (harvesting, attacking, trading).

### 5.6 Tree of Thoughts (ToT)

* **What it contributes:** A framework that allows LLMs to explore multiple reasoning paths simultaneously, evaluate the promise of each node, and backtrack if a path leads to a dead end.
* **What parts are being used:** The internal debate system and multi-step reasoning. Before critical actions, the agent forks its context to evaluate the expected utility of different futures (e.g., evaluating Branch A: Attack vs. Branch B: Flee).
* **What parts are not being used:** Real-time exhaustive search across all possible actions.
* **Why:** Running a full ToT search for every footstep would consume massive API quotas and stall the physics engine. ToT logic is reserved exclusively for high-stakes interrupts and the nightly Dream Cycle.

### 5.7 Graph of Thoughts (GoT)

* **What it contributes:** An extension of ToT that models information generated by an LLM as an arbitrary graph, allowing different reasoning paths to synergize, merge, or loop back.
* **What parts are being used:** The Analogy-Driven Innovation mechanic during the Dream Cycle.
* **What parts are not being used:** Real-time execution during the fast-tick physics loop.
* **Why:** Synthesizing two disparate thoughts into a new technology (e.g., merging "Fire" and "Clay" to invent the "Kiln") is mathematically identical to a GoT node merge. This is computationally heavy and thus restricted to the compilation phase of the simulation.

### 5.8 Knowledge Graph Systems

* **What it contributes:** Representing data as a network of entities and the relationships between them (Triplets: Subject-Predicate-Object), allowing for complex querying and logical deduction.
* **What parts are being used:** The entire architectural foundation of the agent's Semantic Memory. Doxa's Belief Graph is a localized Knowledge Graph stored in SQLite.
* **What parts are not being used:** Static, pre-programmed, universal ontologies.
* **Why:** A universal ontology forces all agents to see the world the same way. Doxa requires emergent, subjective ontologies. An agent's graph must allow for hallucinatory or false relationships (e.g., `[Lightning] -[caused_by]-> [Agent 12]`) to permit religious schisms and scapegoating.

### 5.9 Memory Augmented Agents

* **What it contributes:** Equipping LLMs with external read/write memory banks, allowing them to bypass finite context window limitations by selectively querying external databases.
* **What parts are being used:** The structural separation of the LLM processor from the external memory storage (SQLite), allowing infinite simulation length.
* **What parts are not being used:** Differentiable neural memory (like Neural Turing Machines).
* **Why:** Neural memory is a black box. Doxa requires highly interpretable, symbolic JSON memory so the Python physics engine can execute deterministic pathfinding and the human observer can literally read the agent's mind in the database.