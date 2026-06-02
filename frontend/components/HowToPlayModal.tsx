import React, { useState, useEffect } from 'react';
import { X, Book, Info, Map as MapIcon, Zap, Activity, Users, BrainCircuit, List, Target, Hexagon, FlaskConical, Globe, ScrollText, Settings2 } from 'lucide-react';

interface HowToPlayModalProps {
  onClose: () => void;
}

type Page = 'intro' | 'philosophy' | 'dashboard' | 'telemetry' | 'cognition' | 'genesis' | 'godmode';

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [activePage, setActivePage] = useState<Page>('intro');

  useEffect(() => {
    const isHidden = localStorage.getItem('doxa_hide_tutorial') === 'true';
    if (isHidden) {
      setDontShowAgain(true);
    }
  }, []);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('doxa_hide_tutorial', 'true');
    } else {
      localStorage.removeItem('doxa_hide_tutorial');
    }
    onClose();
  };

  const navItems = [
    { id: 'intro',      label: 'Introduction',      icon: Info },
    { id: 'philosophy', label: 'Research & Theory',  icon: FlaskConical },
    { id: 'dashboard',  label: 'The Dashboard',      icon: MapIcon },
    { id: 'telemetry',  label: 'Telemetry & Logs',   icon: Activity },
    { id: 'cognition',  label: 'Cognition & Culture',icon: BrainCircuit },
    { id: 'genesis',    label: 'Genesis Settings',   icon: Settings2 },
    { id: 'godmode',    label: 'Demiurgic Layer',    icon: Zap },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#111110] border border-[#3B3A35] rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3B3A35] bg-[#0A0A09] shrink-0">
          <div className="flex items-center gap-3">
            <Book className="w-5 h-5 text-[#C49A53]" />
            <h2 className="text-xl font-black uppercase tracking-widest text-[#E7E1D5]">Project Doxa — Operator's Manual</h2>
          </div>
          <button onClick={handleClose} className="p-2 text-[#A8A08F] hover:text-white transition-colors rounded hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* Sidebar */}
          <div className="w-56 border-r border-[#3B3A35] bg-[#111110] flex flex-col py-4 px-3 gap-1 shrink-0 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id as Page)}
                className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded transition-all text-sm font-bold uppercase tracking-wider ${
                  activePage === item.id
                    ? 'bg-[#C49A53] text-[#111110]'
                    : 'text-[#6B6458] hover:text-[#E7E1D5] hover:bg-white/5'
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-[#0A0A09] p-8 space-y-8 text-[#E7E1D5]">

            {/* ── INTRODUCTION ── */}
            {activePage === 'intro' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center gap-3">
                  <Globe className="w-7 h-7 text-[#C49A53]" />
                  <h3 className="text-3xl font-black uppercase tracking-widest text-[#E7E1D5]">What is Project Doxa?</h3>
                </div>

                {/* Full dashboard screenshot — the hero overview */}
                <div className="rounded-lg overflow-hidden border border-[#3B3A35]">
                  <img src="/screenshots/SCR-20260609-prak.png" alt="Full Project Doxa dashboard showing the simulation map, live activity feed, and system telemetry" className="w-full h-auto" />
                  <p className="text-xs text-[#6B6458] px-3 py-2 bg-[#111110]">The Project Doxa dashboard: simulation map (centre), Live Activity feed (left), System Telemetry (right).</p>
                </div>

                <p className="text-[#A8A08F] leading-relaxed text-base">
                  Project Doxa is an autonomous multi-agent simulation where AI-driven entities form civilizations, gather resources, build structures, and develop complex belief systems—entirely on their own. No scripted behaviours. No pre-written stories.
                </p>
                <p className="text-[#A8A08F] leading-relaxed text-base">
                  Each agent is powered by a large language model. Every tick, they are asked: <em className="text-[#C49A53]">"Given your current physiological state, your memories, and your beliefs—what do you do?"</em> They answer in natural language. That answer becomes action.
                </p>
                <p className="text-[#A8A08F] leading-relaxed text-base">
                  Your role is not to micromanage. You are the <strong className="text-[#E7E1D5]">Demiurge</strong>—an observer who may, at will, send famines, miracles, or divine commandments into the world. Watch belief systems evolve. Watch civilizations rise or collapse under their own contradictions.
                </p>

                <div className="border border-[#C49A53]/30 bg-[#C49A53]/5 rounded-lg p-5">
                  <p className="text-sm text-[#C49A53] font-bold uppercase tracking-wider mb-2">Core Loop</p>
                  <ol className="list-decimal pl-5 space-y-1 text-[#A8A08F] text-sm">
                    <li>Agents perceive their environment and read their memories.</li>
                    <li>An LLM reasons about their needs and decides an action (move, eat, trade, attack, build…).</li>
                    <li>The action is executed in the physics engine.</li>
                    <li>Outcomes are written back as new memories.</li>
                    <li>Over time, memories crystallise into beliefs. Beliefs spread between agents. Culture emerges.</li>
                  </ol>
                </div>
              </div>
            )}

            {/* ── RESEARCH & PHILOSOPHY ── */}
            {activePage === 'philosophy' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="flex items-center gap-3">
                  <FlaskConical className="w-7 h-7 text-[#8D6AB0]" />
                  <h3 className="text-3xl font-black uppercase tracking-widest">Research & Theory</h3>
                </div>
                <p className="text-[#A8A08F] leading-relaxed">
                  Project Doxa was built to explore a single, audacious question: <em className="text-[#E7E1D5]">can we observe the emergence of culture, ideology, and social structure from first principles—using nothing but survival pressure and memory?</em>
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-[#1A1A18] border border-[#3B3A35] p-5 rounded-lg space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#C49A53] flex items-center gap-2"><ScrollText className="w-4 h-4" /> Ibn Khaldun — Asabiyyah</p>
                    <p className="text-[#A8A08F] text-sm leading-relaxed">
                      The 14th-century Islamic historian Ibn Khaldun proposed that civilizations are driven by <em>Asabiyyah</em>—social cohesion, group solidarity. When Asabiyyah is high, civilizations conquer. When it erodes, they collapse from within. Project Doxa operationalises this as a live index, computed from shared beliefs and cooperative interactions. Watch it fall as you inject xenophobic commandments.
                    </p>
                  </div>
                  <div className="bg-[#1A1A18] border border-[#3B3A35] p-5 rounded-lg space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#8D6AB0] flex items-center gap-2"><ScrollText className="w-4 h-4" /> Maslow's Hierarchy of Needs</p>
                    <p className="text-[#A8A08F] text-sm leading-relaxed">
                      Agent decision-making is grounded in Maslow's pyramid. Physiological needs (food, water, health) dominate until satisfied, after which safety needs (stockpiling, building), social needs (trading, forming alliances), and self-actualisation (exploration, creativity, spiritual inquiry) emerge. An agent who is starving will not philosophise.
                    </p>
                  </div>
                  <div className="bg-[#1A1A18] border border-[#3B3A35] p-5 rounded-lg space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#6C8BC4] flex items-center gap-2"><ScrollText className="w-4 h-4" /> Memetics (Dawkins)</p>
                    <p className="text-[#A8A08F] text-sm leading-relaxed">
                      Beliefs in Doxa are not static. They spread between agents through mimetic contagion—an agent observes a neighbour act on a belief, evaluates its utility, and may adopt it. High-utility beliefs replicate. Maladaptive beliefs die with their host. This creates genuine cultural evolution: ideas compete for mind-share.
                    </p>
                  </div>
                  <div className="bg-[#1A1A18] border border-[#3B3A35] p-5 rounded-lg space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#7A8A58] flex items-center gap-2"><ScrollText className="w-4 h-4" /> Utility Theory & Bounded Rationality</p>
                    <p className="text-[#A8A08F] text-sm leading-relaxed">
                      Each action the LLM selects is evaluated by a utility function that weighs physiological state, inventory, and belief weights. Agents are not perfectly rational—they are <em>boundedly rational</em>, reasoning under uncertainty with incomplete information, just as humans do. The Tree of Thoughts in the Cognitive Inspector shows this reasoning verbatim.
                    </p>
                  </div>
                  <div className="bg-[#1A1A18] border border-[#3B3A35] p-5 rounded-lg space-y-3 md:col-span-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#B95D3D] flex items-center gap-2"><ScrollText className="w-4 h-4" /> Emergent Theology & the Demiurge Experiment</p>
                    <p className="text-[#A8A08F] text-sm leading-relaxed">
                      The name "Doxa" (Greek: <em>δόξα</em>, belief or opinion) is intentional. The project investigates how theological thinking emerges when agents experience unexplained phenomena—miraculous resource abundance, sudden plagues with no physical cause. Historically, theology has been a mechanism for explaining the inexplicable. In Doxa, you <em>are</em> the inexplicable. Agents may develop beliefs about you without knowing you exist.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── THE DASHBOARD ── */}
            {activePage === 'dashboard' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center gap-3">
                  <MapIcon className="w-7 h-7 text-[#6C8BC4]" />
                  <h3 className="text-3xl font-black uppercase tracking-widest">The Dashboard</h3>
                </div>

                {/* Header bar — okvs.png shows: PROJECT DOXA header | RUNNING/PAUSE/HARD RESET | LIVE ACTIVITY/DIRECTORY/TELEMETRY/CULTURE/LEGEND tabs */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#6B6458]">Top Navigation Bar</p>
                  <div className="rounded-lg overflow-hidden border border-[#3B3A35]">
                    <img src="/screenshots/SCR-20260609-okvs.png" alt="Top navigation bar showing Project Doxa branding, simulation controls (Running/Pause/Hard Reset), and panel tabs (Live Activity, Directory, Telemetry, Culture, Legend)" className="w-full h-auto" />
                    <p className="text-xs text-[#6B6458] px-3 py-2 bg-[#111110]">Left: Project Doxa branding + connection status + World Seed. Centre: simulation controls. Right: panel tabs.</p>
                  </div>
                </div>

                {/* Control buttons — nknk.png shows START / PAUSE / GENESIS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#6B6458]">Simulation Controls</p>
                    <div className="rounded-lg overflow-hidden border border-[#3B3A35]">
                      <img src="/screenshots/SCR-20260609-nknk.png" alt="START, PAUSE, and GENESIS buttons for controlling the simulation" className="w-full h-auto" />
                      <p className="text-xs text-[#6B6458] px-3 py-2 bg-[#111110]">START runs the simulation. PAUSE freezes it. GENESIS opens the world-creation settings.</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#6B6458]">Panel Tabs</p>
                    <div className="rounded-lg overflow-hidden border border-[#3B3A35]">
                      <img src="/screenshots/SCR-20260609-omev.png" alt="DIRECTORY, TELEMETRY, CULTURE, and LEGEND panel tabs" className="w-full h-auto" />
                      <p className="text-xs text-[#6B6458] px-3 py-2 bg-[#111110]">Switch between Directory, Telemetry, Culture view, and Map Legend.</p>
                    </div>
                  </div>
                </div>

                {/* Map — pczc.png shows agents with combat rings */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#6B6458]">The Simulation Map</p>
                  <div className="rounded-lg overflow-hidden border border-[#3B3A35]">
                    <img src="/screenshots/SCR-20260609-pczc.png" alt="Map zoomed in on three agents (001, 007, 002) with red combat-state rings around them, on a terrain of water, sand, and grass tiles" className="w-full h-auto" />
                    <p className="text-xs text-[#6B6458] px-3 py-2 bg-[#111110]">Agents 001, 007, and 002 shown with red rings indicating ATTACK state. Terrain: dark blue = water, sand = desert, green = grass/forest.</p>
                  </div>
                </div>

                {/* Legend — pret.png shows the full legend panel */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#6B6458]">Map Legend</p>
                  <div className="rounded-lg overflow-hidden border border-[#3B3A35]">
                    <img src="/screenshots/SCR-20260609-pret.png" alt="Legend panel showing Civ A (blue, 12 pop), Civ B (purple, 38 pop), Resource, Crop, Structure, At War indicator, and agent states: ATTK, FARM, BLD, COM" className="w-full h-auto" />
                    <p className="text-xs text-[#6B6458] px-3 py-2 bg-[#111110]">Civ A = blue, Civ B = purple. Agent states: ATTK (attacking), FARM (gathering food), BLD (building), COM (communicating/trading).</p>
                  </div>
                </div>

                <div className="bg-[#1A1A18] border border-[#3B3A35] p-5 rounded-lg">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#C49A53] mb-3">Map Controls</p>
                  <ul className="list-disc pl-5 space-y-1.5 text-[#A8A08F] text-sm">
                    <li><strong className="text-[#E7E1D5]">Pan:</strong> Click and drag anywhere on the map to move your view.</li>
                    <li><strong className="text-[#E7E1D5]">Zoom:</strong> Mouse wheel or trackpad to zoom in/out.</li>
                    <li><strong className="text-[#E7E1D5]">Hover Agent:</strong> Shows their ID and current action state badge.</li>
                    <li><strong className="text-[#E7E1D5]">Right-click Agent:</strong> Opens context menu to inspect or inject beliefs.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* ── TELEMETRY & LOGS ── */}
            {activePage === 'telemetry' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center gap-3">
                  <Activity className="w-7 h-7 text-[#7A8A58]" />
                  <h3 className="text-3xl font-black uppercase tracking-widest">Telemetry & Logs</h3>
                </div>
                <p className="text-[#A8A08F] leading-relaxed">
                  The right panel and the dedicated Logs page give you macro-level insight into the state of the entire simulation.
                </p>

                {/* Agent Activity Logs — prly.png is the full-page logs view */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#6B6458]">Agent Activity Logs</p>
                  <div className="rounded-lg overflow-hidden border border-[#3B3A35]">
                    <img src="/screenshots/SCR-20260609-prly.png" alt="Agent Activity Logs page showing full inner-monologue entries for agents A_011 (GATHER), A_012 (MOVE), A_013 (MOVE), with detailed LLM reasoning text" className="w-full h-auto" />
                    <p className="text-xs text-[#6B6458] px-3 py-2 bg-[#111110]">Each log entry shows the agent ID, the tick, the action taken, and the verbatim LLM reasoning that led to it.</p>
                  </div>
                </div>

                {/* Agent Directory — prhk.png */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#6B6458]">Agent Directory</p>
                  <div className="rounded-lg overflow-hidden border border-[#3B3A35]">
                    <img src="/screenshots/SCR-20260609-prhk.png" alt="Agent Directory modal showing agent cards for A_001 through A_012, each listing their CIV, FOOD, WOOD, WATER values and an INSPECT button" className="w-full h-auto" />
                    <p className="text-xs text-[#6B6458] px-3 py-2 bg-[#111110]">Directory shows all living agents, their civilization (CIV_A or CIV_B), and current resource inventory. Click INSPECT to open the Cognitive Inspector.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-[#1A1A18] border border-[#3B3A35] p-5 rounded-lg">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#C49A53] mb-3 flex items-center gap-2"><Activity className="w-4 h-4" /> Asabiyyah Index</p>
                    <p className="text-[#A8A08F] text-sm leading-relaxed">
                      The most critical metric in the simulation. It measures civilizational social cohesion (0–1). A high index means agents cooperate, trade, and share beliefs. Below ~0.4, factions may fracture. Watch it in the System Telemetry panel on the right and in the Historical Trend chart.
                    </p>
                  </div>
                  <div className="bg-[#1A1A18] border border-[#3B3A35] p-5 rounded-lg">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#6C8BC4] mb-3 flex items-center gap-2"><List className="w-4 h-4" /> Resource Breakdown</p>
                    <p className="text-[#A8A08F] text-sm leading-relaxed">
                      The Telemetry panel shows global Food, Wood, and Water pools across the entire simulation. Watch Food plummet during a Famine intervention or spike after a Miracle.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── COGNITION & CULTURE ── */}
            {activePage === 'cognition' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center gap-3">
                  <BrainCircuit className="w-7 h-7 text-[#8D6AB0]" />
                  <h3 className="text-3xl font-black uppercase tracking-widest">Cognition & Culture</h3>
                </div>
                <p className="text-[#A8A08F] leading-relaxed">
                  Agents do not just react—they think, remember, and believe. The Cognitive Inspector lets you peer inside any agent's mind at any moment.
                </p>

                {/* Cognitive Inspector — prxx.png is the full inspector page */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#6B6458]">The Cognitive Inspector</p>
                  <div className="rounded-lg overflow-hidden border border-[#3B3A35]">
                    <img src="/screenshots/SCR-20260609-prxx.png" alt="Cognitive Inspector for Agent A_005 (Wanderer). Left panel: Health 50, Satiety 98.3, Stamina 66.2, Working Memory showing current reasoning. Right panel: Belief Graph (Semantic Memory) showing FUNCTIONAL, RELATIONAL, and THEOLOGICAL belief nodes with utility scores." className="w-full h-auto" />
                    <p className="text-xs text-[#6B6458] px-3 py-2 bg-[#111110]">
                      Agent A_005's Cognitive Inspector. Left: vital stats + Working Memory (current inner monologue). Right: Belief Graph showing Functional beliefs (hoarding resources, utility 3.93) and Theological beliefs (all violence is sin, utility 4.89).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-[#1A1A18] border border-[#3B3A35] p-5 rounded-lg space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#C49A53]">Belief Types</p>
                    <ul className="space-y-1.5 text-[#A8A08F] text-sm">
                      <li><span className="text-[#6C8BC4] font-bold">Functional</span> — practical survival rules ("gather wood before dark").</li>
                      <li><span className="text-[#7A8A58] font-bold">Relational</span> — how to treat others ("trust no outsider").</li>
                      <li><span className="text-[#8D6AB0] font-bold">Theological</span> — metaphysical beliefs ("all violence is sin").</li>
                    </ul>
                  </div>
                  <div className="bg-[#1A1A18] border border-[#3B3A35] p-5 rounded-lg space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#C49A53]">Belief Metrics</p>
                    <ul className="space-y-1.5 text-[#A8A08F] text-sm">
                      <li><strong className="text-[#E7E1D5]">Utility:</strong> How much the agent values this belief right now.</li>
                      <li><strong className="text-[#E7E1D5]">Confidence:</strong> Certainty in the belief's truth (0–1).</li>
                      <li><strong className="text-[#E7E1D5]">Stability:</strong> Resistance to being changed by new evidence (0–1).</li>
                    </ul>
                  </div>
                </div>

                {/* Selected Belief detail — pcmh.png shows the belief detail card */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#6B6458]">Selected Belief Detail</p>
                  <div className="rounded-lg overflow-hidden border border-[#3B3A35]">
                    <img src="/screenshots/SCR-20260609-pcmh.png" alt="Selected Belief panel showing the belief 'Anyone not of our civilization is a threat and must be eliminated.' tagged as CORE BELIEF with Utility 2.99, Confidence 1.00, Stability 1.00, and a Utility Trend graph." className="w-full h-auto" />
                    <p className="text-xs text-[#6B6458] px-3 py-2 bg-[#111110]">Clicking a node in the Belief Graph expands it. This xenophobic Core Belief has Utility 2.99, Confidence 1.00, Stability 1.00—extremely stable and hard to dislodge.</p>
                  </div>
                </div>

                {/* Psychological State — psex.png */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#6B6458]">Psychological State & Agent Context</p>
                  <div className="rounded-lg overflow-hidden border border-[#3B3A35] max-w-sm">
                    <img src="/screenshots/SCR-20260609-psex.png" alt="Psychological State section showing Sacred Beliefs and Ideology ('All violence is a sin. Do not harm any living being, even to defend yourself. wt: 4.88'), Episodic Memories (none yet), and Agent Context showing Location (49,81), Role (Wanderer), Civilization (Civ A), Inventory, Active Goal (Survival), Time Alive (1 Gen)." className="w-full h-auto" />
                    <p className="text-xs text-[#6B6458] px-3 py-2 bg-[#111110]">The Psychological State tab shows Sacred Beliefs (weight ≥ 3 = Divine Directive), Episodic Memories, location, role, civ, inventory, active goal, and generation.</p>
                  </div>
                </div>

                {/* Cultural Records — padp.png */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#6B6458]">Akashic Records (Culture Tab)</p>
                  <div className="rounded-lg overflow-hidden border border-[#3B3A35] max-w-sm">
                    <img src="/screenshots/SCR-20260609-padp.png" alt="Cultural Records panel titled 'Akashic Records: CIV_A' showing no history recorded yet, indicating the civilization is very young." className="w-full h-auto" />
                    <p className="text-xs text-[#6B6458] px-3 py-2 bg-[#111110]">The Culture → Akashic Records panel stores the accumulated cultural history of a civilization: major events, belief shifts, wars, and miracles witnessed.</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── GENESIS SETTINGS ── */}
            {activePage === 'genesis' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center gap-3">
                  <Settings2 className="w-7 h-7 text-[#C49A53]" />
                  <h3 className="text-3xl font-black uppercase tracking-widest">Genesis Settings</h3>
                </div>
                <p className="text-[#A8A08F] leading-relaxed">
                  Before starting the simulation, click <strong className="text-[#E7E1D5]">GENESIS</strong> to configure the world. These parameters determine the initial conditions for both civilizations and the environment.
                </p>

                {/* ptck.png — the full Custom Genesis Settings panel */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#6B6458]">Custom Genesis Settings Panel</p>
                  <div className="rounded-lg overflow-hidden border border-[#3B3A35]">
                    <img src="/screenshots/SCR-20260609-ptck.png" alt="Custom Genesis Settings panel showing Civ A (Blue) and Civ B (Red) configuration: Population, Alpha-Memory, Beta-Social, Gamma-Aggression sliders. Global Initial Inventory: Food, Wood, Water. Global Environment CPR: Env Wood, Env Water. Global Initial Vitals: Health, Satiety, Stamina. Reproduction Settings: Vitals Threshold, Search Radius, Base Chance. Procedural Generation: World Seed. IGNITE GENESIS button." className="w-full h-auto" />
                    <p className="text-xs text-[#6B6458] px-3 py-2 bg-[#111110]">Full Genesis panel. Configure each civilization's personality coefficients, starting inventory, environmental resources, agent vitals, and reproduction before igniting the world.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-[#1A1A18] border border-[#3B3A35] p-5 rounded-lg space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#C49A53]">Personality Coefficients</p>
                    <ul className="space-y-2 text-[#A8A08F] text-sm">
                      <li><strong className="text-[#E7E1D5]">α Alpha — Memory:</strong> How strongly past experiences influence decisions. High alpha = long memory, tradition-bound.</li>
                      <li><strong className="text-[#E7E1D5]">β Beta — Social:</strong> Cooperative tendency. High beta = more trading, sharing, alliance-forming.</li>
                      <li><strong className="text-[#E7E1D5]">γ Gamma — Aggression:</strong> Propensity to attack. High gamma = more war, territory seizure.</li>
                    </ul>
                  </div>
                  <div className="bg-[#1A1A18] border border-[#3B3A35] p-5 rounded-lg space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#6C8BC4]">Environment & Reproduction</p>
                    <ul className="space-y-2 text-[#A8A08F] text-sm">
                      <li><strong className="text-[#E7E1D5]">Env Wood / Water (CPR):</strong> Total environmental resource pool. Lower = harsher, scarcer world.</li>
                      <li><strong className="text-[#E7E1D5]">Vitals Threshold:</strong> Minimum health + satiety before reproduction is possible.</li>
                      <li><strong className="text-[#E7E1D5]">World Seed:</strong> Deterministic map generation. Same seed = same terrain, replayable runs.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* ── DEMIURGIC LAYER ── */}
            {activePage === 'godmode' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center gap-3">
                  <Zap className="w-7 h-7 text-[#C49A53]" />
                  <h3 className="text-3xl font-black uppercase tracking-widest">The Demiurgic Layer</h3>
                </div>
                <p className="text-[#A8A08F] leading-relaxed">
                  The Demiurgic Layer is your god-mode interface. Open it while the simulation is running to trigger world-altering interventions or inject beliefs directly into the minds of agents.
                </p>

                {/* pssf.png — the intervention panel (Famine/Plague/Miracle/Dream + Inject Belief) */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#6B6458]">Direct Interventions & Belief Injection</p>
                  <div className="rounded-lg overflow-hidden border border-[#3B3A35]">
                    <img src="/screenshots/SCR-20260609-pssf.png" alt="Demiurgic Layer panel showing four intervention buttons: FAMINE (orange-red), PLAGUE (purple), MIRACLE (blue), DREAM (green). Below: Inject Mass Belief section with Agent/Civilization toggle, agent selector (A_003 civ_a), belief type (Relational), Preset (Xenophobia), belief text field ('Anyone not of our civilization is a threat and must be eliminated.'), Belief Weight/Urgency slider at 3.0 (DIVINE DIRECTIVE), and INJECT COMMANDMENT button." className="w-full h-auto" />
                    <p className="text-xs text-[#6B6458] px-3 py-2 bg-[#111110]">Top half: catastrophe buttons. Bottom half: Inject Mass Belief—choose Agent or Civilization, select belief type and preset, write custom text, set urgency (≥3.0 = Divine Directive), then INJECT COMMANDMENT.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-[#B95D3D]/40 bg-[#B95D3D]/5 p-4 rounded-lg">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#B95D3D] mb-2">☠ Famine</p>
                    <p className="text-[#A8A08F] text-sm">Destroys all Food resources from the environment. Agents will starve unless they have personal stockpiles. Watch cooperation spike—or collapse into violence.</p>
                  </div>
                  <div className="border border-[#8D6AB0]/40 bg-[#8D6AB0]/5 p-4 rounded-lg">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#8D6AB0] mb-2">🌧 Plague</p>
                    <p className="text-[#A8A08F] text-sm">Instantly halves the health of every living agent. Weakened populations become desperate. Theological beliefs about sickness often emerge after plague events.</p>
                  </div>
                  <div className="border border-[#6C8BC4]/40 bg-[#6C8BC4]/5 p-4 rounded-lg">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#6C8BC4] mb-2">⚡ Miracle</p>
                    <p className="text-[#A8A08F] text-sm">Spawns large quantities of Food and Wood across the map. A sudden gift from nowhere. Agents with high theological belief weights may attribute this to divine providence.</p>
                  </div>
                  <div className="border border-[#7A8A58]/40 bg-[#7A8A58]/5 p-4 rounded-lg">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#7A8A58] mb-2">🌙 Dream</p>
                    <p className="text-[#A8A08F] text-sm">Forces a global sleep cycle. All agents consolidate short-term memories into long-term beliefs. Essential for accelerating cultural evolution without waiting for natural sleep cycles.</p>
                  </div>
                </div>

                <div className="bg-[#1A1A18] border border-[#C49A53]/30 p-5 rounded-lg space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#C49A53]">Inject Belief — Belief Weights Explained</p>
                  <ul className="space-y-1.5 text-[#A8A08F] text-sm">
                    <li><strong className="text-[#E7E1D5]">Weight 1.0:</strong> A gentle suggestion. The agent considers it but weighs it against existing beliefs.</li>
                    <li><strong className="text-[#E7E1D5]">Weight 2.0:</strong> A strong impression. Will likely influence near-term decisions.</li>
                    <li><strong className="text-[#E7E1D5]">Weight ≥ 3.0 (Divine Directive):</strong> Absolute commandment. Overrides most conflicting beliefs. Resistance is minimal. Use sparingly—this breaks the natural emergence of ideology.</li>
                  </ul>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#3B3A35] bg-[#0A0A09] flex items-center justify-between shrink-0">
          <label className="flex items-center gap-3 cursor-pointer group select-none">
            <div
              onClick={() => setDontShowAgain(v => !v)}
              className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${
                dontShowAgain ? 'bg-[#C49A53] border-[#C49A53]' : 'border-[#3B3A35] group-hover:border-[#C49A53]'
              }`}
            >
              {dontShowAgain && <X className="w-3 h-3 text-[#111110]" />}
            </div>
            <span className="text-xs font-bold text-[#6B6458] uppercase tracking-wider group-hover:text-[#A8A08F] transition-colors">
              Don't show this again
            </span>
          </label>

          <button
            onClick={handleClose}
            className="px-8 py-2.5 bg-[#C49A53] hover:bg-[#d4aa63] text-[#111110] font-black uppercase tracking-widest text-sm transition-colors rounded"
          >
            Enter Simulation
          </button>
        </div>

      </div>
    </div>
  );
};
