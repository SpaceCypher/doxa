# Issues to be Fixed

## ~~1. Aquatic Structures (BUILD Action Logic)~~ [RESOLVED]
**Bug:** Agents are currently able to build structures (like Granaries) in the middle of Deep Water. 
**Cause:** 
- The `BUILD` action prompt in `cognition_service.py` lacks a terrain constraint (unlike `FARM` which specifies grass).
- The `physics.py` backend engine only verifies if a tile is empty before allowing construction; it does not verify if the terrain is solid ground.
**Proposed Fix:** 
- ~~Update the prompt in `cognition_service.py` to specify that structures must be built on land (Grass, Sand, or Forest).~~ [DONE]
- ~~Patch the `BUILD` action logic in `physics.py` to reject the action and waste the agent's stamina if they attempt to build on `terrain_id == 0` (Deep Water).~~ [DONE]

---

# Feature Backlog: Philosophical & Scientific Emergence

## 1. Mimetic Theory & The Scapegoat Mechanism (René Girard)
- **Concept:** When civilization stress is high (Famine/Plague) and Asabiyyah is critically low, agents spontaneously identify an "outlier" (Wanderer or agent with unusual beliefs) as a scapegoat.
- **Mechanic:** The society dogpiles and attacks the scapegoat. Upon their death, Asabiyyah artificially and instantly resets to 1.0 (peace restored through violence).

## 2. Linguistic Relativity (Sapir-Whorf Hypothesis)
- **Concept:** Geographic isolation leads to language drift, causing xenophobia.
- **Mechanic:** Track `lexicon_hash` drift. If an agent uses `COMMUNICATE` with a target whose lexicon hash is >30% different, the message is parsed backward or tagged as "Hostile Noise", triggering accidental wars.

## 3. Evolutionary Game Theory & Genetic Drift (John Maynard Smith)
- **Concept:** Agent personality traits (Alpha/Beta/Gamma) evolve to match the environment over generations.
- **Mechanic:** When an agent reproduces, the child inherits the parent's personality profile with a ±5% mutation. Harsh environments will breed Spartan "Hawk" cultures, while lush environments will breed cooperative "Dove" cultures.

## 4. Tragedy of the Commons & Polycentric Governance (Elinor Ostrom)
- **Concept:** Spontaneous emergence of property rights and policing to prevent environmental collapse.
- **Mechanic:** Beta agents can invent a "Functional Belief" (norm) capping resource gathering (e.g., max 10 wood). If an Alpha agent violates this, the Beta agents automatically trigger a coordinated `ATTACK` on the violator.

## 5. Hegelian Dialectic (Thesis + Antithesis = Synthesis)
- **Concept:** Ideological clashes can result in philosophical compromise rather than mutual destruction.
- **Mechanic:** When two Prophets with opposing follower bases clash, there is a 5% chance to trigger `SYNTHESIS`. The LLM merges both beliefs into a new, ultra-contagious ideology that absorbs both sects and triggers a Golden Age.
