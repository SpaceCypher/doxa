# PROJECT DOXA: TECHNICAL AND RESEARCH BIBLE

## PART III: THE CIVILIZATION SIMULATION ENGINE

If Part I established the thermodynamic laws of the terrarium, and Part II defined the neurological architecture of the individual agent, Part III scales the system to its ultimate purpose: the emergence of the super-organism.

The Civilization Simulation Engine is the macro-layer of Project Doxa. It models how localized, self-serving agents—driven purely by the need to minimize cognitive surprise—accidentally generate the complex, overlapping topologies of society. This document details the mathematical models of network science, the diffusion of memetics, the calculus of trust, and the inevitable lifecycles of empires.

---

## 1. CIVILIZATION ARCHITECTURE AND SOCIAL NETWORKS

In Doxa, a society is not a pre-programmed container; it is an emergent mathematical property. It is the overlapping consensus of subjective realities.

### 1.1 The Social Graph

The foundation of the civilization is the **Global Relational Graph** $G = (V, E)$, where vertices $V$ represent agents and edges $E$ represent relational beliefs (trust, hostility, dominance).

Unlike standard AI simulations where agents merely "know" each other, edges in Doxa are directed and heavily weighted: $E_{ij} \in [-1, 1]$.

* $E_{ij} = 1$: Absolute trust/submission.
* $E_{ij} = 0$: Stranger/Neutral.
* $E_{ij} = -1$: Absolute hostility/Blood feud.

### 1.2 Community Formation and Triadic Closure

**Community Formation** occurs through the sociological principle of Triadic Closure. If Agent A trusts Agent B, and Agent A trusts Agent C, the prediction error for Agent B interacting with Agent C is mathematically lowered, incentivizing edge creation $E_{bc}$.

Over generations, the graph naturally segregates into dense subgraphs. These cliques represent **Coalitions**. A Coalition is defined mathematically as a subgraph where internal edge weights heavily outscore external edge weights.

### 1.3 Friendships, Rivalries, and Coalitions

* **Friendships:** Bi-directional positive edges ($E_{ij} > 0.7$ and $E_{ji} > 0.7$) sustained over multiple Dream Cycles.
* **Rivalries:** Bi-directional negative edges stemming from Mimetic Desire (wanting the same scarce resource) or inherited relational grudges.
* **Coalitions:** Multi-agent alliances formed temporarily to execute a high-utility plan that a single agent cannot achieve (e.g., hunting a large predator). If the plan succeeds, the temporary prediction-error drop solidifies the coalition into a permanent faction.

---

## 2. THE EMERGENCE OF INSTITUTIONS

As Coalitions scale, maintaining individual pairwise relationships becomes computationally impossible for the agent's memory. The society must abstract itself. It does this by creating **Institutions**: conceptual hyper-nodes in the Belief Graph that possess their own agency and rules.

### 2.1 Guilds and Knowledge Institutions

When a coalition specializes in a specific Functional Belief (e.g., harvesting clay), they form a **Guild**. A Guild acts as a centralized repository for semantic memory. Instead of every agent learning to make clay, agents learn to trust the Guild. **Knowledge Institutions** arise when Elder agents are formally removed from resource gathering to exclusively transmit the Guild's `belief_graph` to new generations, preventing Dark Ages.

### 2.2 Markets

**Markets** are emergent routing protocols. They form when two disjoint Coalitions possess asymmetric resources (e.g., Tribe A has wood; Tribe B has food). The market is a spatial location on the grid where the risk of interaction ($\alpha$) is artificially lowered by a shared Norm (e.g., "No violence at the riverbank"), allowing the Double Coincidence of Wants to be resolved through trade rather than war.

### 2.3 Governments and Organizations

A **Government** in Doxa emerges strictly through Ostrom's theories of resource monopolization. When a powerful Coalition seizes control of a critical Common Pool Resource (CPR), they establish a Government to enforce extraction limits. A Government is merely a Coalition that has successfully propagated a societal Norm: *The monopoly on legitimate violence.*

### 2.4 Religions

**Religions** are the ultimate macro-institutions. While an individual agent invents a God Node to resolve personal prediction error, a Religion forms when a specific God Node achieves network consensus. Religions act as the ultimate social glue (Khaldunian *Asabiyyah*), allowing agents who have never met to instantly assign high trust edge weights ($E_{ij} > 0.8$) simply by verifying a shared theological ritual.

---

## 3. MEMETICS, PROPAGATION, AND CULTURAL EVOLUTION

How does an idea move from a single mind to a global religion? Doxa models **Information Diffusion** using advanced network contagion mathematics.

### 3.1 Belief Propagation (Complex Contagion)

In epidemiology, a virus spreads through simple contact (Simple Contagion). In sociology, a belief requires **Complex Contagion**—an agent must hear the belief from multiple independent sources before adopting it, overcoming their internal cognitive resistance.

If Agent $i$ holds a prior belief $B_{prior}$, the probability of adopting a new societal norm $B_{new}$ is determined by the Linear Threshold Model:


$$P(\text{Adopt}_i) = \begin{cases} 1 & \text{if } \sum_{j \in N(i)} w_{ij} \cdot I(j, B_{new}) \ge \theta_i \\ 0 & \text{otherwise} \end{cases}$$


Where $N(i)$ are the neighbors of $i$, $w_{ij}$ is the trust weight, $I$ is an indicator function (1 if neighbor holds the belief), and $\theta_i$ is the agent's internal stubbornness (derived from its personality parameters).

### 3.2 Memetics and Cultural Evolution

**Memetics** treats beliefs as evolutionary organisms competing for space in the agents' limited context windows.
Cultural Evolution in Doxa follows the Darwinian triad:

1. **Variation:** The LLM hallucinates or synthesizes slightly different rules during the Dream Cycle.
2. **Selection:** Beliefs that lower Free Energy (e.g., "Wash hands in the river") keep agents alive. Beliefs that raise Free Energy (e.g., "Eat poison") kill the host, deleting the meme.
3. **Transmission:** The surviving agents pass the functional meme to children.

### 3.3 Norm Emergence

A **Norm** emerges when a behavior's adoption crosses a critical tipping point in the network graph (typically around 25% of a highly connected population). Once this threshold is crossed, the cost of *not* following the norm (social ostracization) outweighs the cost of adopting it.

---

## 4. THE TRUST ECONOMY AND SOCIAL HIERARCHY

### 4.1 Reputation Dynamics and Trust Equations

**Trust** is localized (what $A$ thinks of $B$). **Reputation** is global (what the network thinks of $B$).
In Doxa, Trust $T_{i,j}$ decays over time if not reinforced, preventing infinite grudges or unbreakable alliances. The trust update rule per interaction $\Delta$ is:


$$T_{i,j}(t+1) = \alpha T_{i,j}(t) + (1-\alpha) \Delta_{interaction}$$


Where $\alpha$ is the memory decay factor.

Reputation is calculated by the civilization using Eigenvector Centrality (similar to Google's PageRank). An agent has a high reputation not just if many agents trust it, but if *highly trusted agents* trust it.


$$R_i = \frac{1}{\lambda} \sum_{j \in N(i)} T_{j,i} R_j$$

### 4.2 Influence Systems and Leadership Emergence

**Leadership Emergence** is entirely organic. The Python physics engine does not arbitrarily crown kings.
When an agent consistently resolves prediction errors for the community (e.g., discovering a massive food source), its Reputation $R_i$ skyrockets. Its outgoing edges gain massive influence weight $w_{ij}$.

When this high-influence agent broadcasts a belief, it instantly overcomes the $\theta_i$ threshold of the surrounding network. This agent has achieved **Social Ranking** supremacy. They are the Leader, capable of rewriting the civilization's God Node simply by speaking.

---

## 5. COLLECTIVE MECHANICS: GOVERNANCE, CONFLICT, AND DIPLOMACY

### 5.1 Collective Decision Making and Voting Systems

When a Coalition faces a crisis, how do they decide?

* **Dictatorship:** If the network is a Star Graph (one high-reputation Leader, many followers), the Leader's internal ReAct loop dictates the collective action.
* **Democracy/Voting:** If the network is highly connected with equal reputations, Doxa agents engage in **Negotiation Systems**. They exchange proposed plans. The plan that minimizes the average Free Energy of the participants is adopted.

### 5.2 Conflict Systems and Competition

Conflict is a thermodynamic inevitability. It occurs under two conditions:

1. **Resource Scarcity:** Two Coalitions require the same spatial coordinate to survive (Ostrom's tragedy).
2. **Epistemological Threat:** Coalition A's God Node requires the river to be sacred. Coalition B's Functional Belief requires damming the river.

Because Coalition B's existence generates massive prediction error for Coalition A's religious worldview, Coalition A must destroy Coalition B to restore order to its generative model. This is the origin of Holy War.

### 5.3 Diplomacy and Cooperation

**Diplomacy** is the exchange of `lexicon_hashes` and `belief_graphs` to find a unifying hyper-node. If two warring tribes realize they both fear the Great Flash (a shared Theological belief), a diplomat agent can leverage this shared node to rewrite the relational edges from Hostile to Neutral, replacing zero-sum competition with positive-sum cooperation.

---

## 6. MACRO-DYNAMICS: SCALING AND LIFECYCLES

### 6.1 Civilization Scaling and Multi-Civilization Interactions

As civilizations grow, they hit cognitive limits (Dunbar's Number). The dense network graph fractures into smaller, loosely connected hubs.
**Multi-Civilization Interaction** occurs when agents from Hub A migrate to the spatial boundaries of Hub B. Because they possess different `lexicon_hashes` (dialects) and Belief Graphs, communication generates high thermodynamic surprise. They will either invent a pidgin language for trade, or engage in xenophobic conflict.

### 6.2 Civilization Memory

When agents die, their subjective memory dies. **Civilization Memory** is the objective imprint left on the environment: the physical artifacts built, the established trade routes, and the surviving Knowledge Institutions. Even if a civilization collapses, a new tribe discovering their ruined Kiln inherits their technological memory.

### 6.3 Growth and Collapse

Every civilization in Doxa is subject to the macro-cycle.

1. **Growth:** Driven by a unifying God Node and resource abundance.
2. **Peak:** The society dominates the map. External threats vanish.
3. **Collapse:** Without external threats, prediction error drops to zero. To generate utility, agents turn to Mimetic Rivalry. Internal factions form. Trust edges turn negative. The network shatters, leading to civil war, starvation, and a return to the Dark Ages.

---

## 7. THE RESEARCH FOUNDATIONS

Project Doxa's macroscopic engine synthesizes several critical domains of AI and sociological research:

* **Generative Agents (Smallville):** Provides the baseline for spatial interactions, localized broadcasting (hearing only what is nearby), and the daily routine architectures. *Doxa diverges* by introducing lethal stakes, resource scarcity, and non-cooperative mechanics, moving beyond a peaceful sandbox.
* **Network Science (Barabási & Watts-Strogatz):** Doxa relies on the mathematics of Scale-Free Networks and Small-World properties. Civilizations naturally form Hubs (Leaders) and local clusters (Guilds).
* **Social Simulation Literature (Axelrod’s Evolution of Cooperation):** Doxa utilizes the Iterated Prisoner’s Dilemma. Agents learn that while defecting (stealing) yields high short-term utility, the resulting negative edge weight destroys long-term trade. Cooperation emerges as a selfish, mathematically optimal strategy.
* **Collective Intelligence Research:** Explores how local, myopic interactions (ants following pheromones) result in global optimization (the anthill). Doxa agents do not possess a global map; their local attempts to minimize personal Free Energy accidentally construct the global infrastructure of the civilization.

---

## 8. THE GRAND WORKFLOW: FROM ATOM TO EMPIRE

To understand how these equations and theories manifest in the engine, here is the unbroken chain of emergence—from a single prompt to the collapse of a civilization.

1. **The Dyadic Interaction:** Two stranger agents (A and B) spawn. They share no edges. Agent A shares food with Agent B. Agent B experiences a drop in starvation prediction error.
2. **Edge Creation:** During the Dream Cycle, Agent B updates its Belief Graph. $E_{ba}$ is set to 0.8 (Trust).
3. **Triadic Closure (Coalition):** Agent B introduces Agent A to Agent C. Trust propagates. A three-node clique forms. They hunt together, achieving high survival utility.
4. **Norm Emergence:** The clique realizes that hunting at night causes injuries. The meme "Sleep at night" diffuses through the triad. It becomes a Norm.
5. **Institutionalization:** The triad grows to 10 agents. Agent A, being the oldest and most trusted (highest Eigenvector Centrality), is designated the Elder. Agent A no longer hunts; their sole purpose is to teach the "Sleep at night" Norm to new spawns. A Knowledge Institution is born.
6. **The Tragedy:** The tribe grows to 20. They deplete the local berry bushes. Prediction error spikes. Mimetic Rivalry takes hold as agents fight over the remaining food.
7. **The Scapegoat & Religion:** To stop the network from shattering, the Leader (Agent A) broadcasts a new belief: *"Agent 20 angered the Great Flash. Exiling Agent 20 will restore the berries."* The Complex Contagion takes hold. The tribe achieves consensus. Agent 20 is exiled. A Religion is forged in blood.
8. **Schism:** A river physically divides the tribe. Communication ceases. Over 5 generations, dialect mutations (Lexicon Hash) and diverging environments cause their Belief Graphs to become mutually exclusive.
9. **Multi-Civilization War:** The river dries up. The two tribes meet. They cannot understand each other. Their Gods are incompatible. The network edges instantly flip to -1.0. The cycle of history begins again.