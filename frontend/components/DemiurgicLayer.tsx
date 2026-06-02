import React, { useState } from 'react';
import { useTelemetry } from '../stores/useTelemetry';
import { ShieldAlert, BrainCircuit, Moon, Skull, CloudRain, Zap } from 'lucide-react';
import { TooltipIcon } from './TooltipIcon';

export const DemiurgicLayer: React.FC = () => {
 const agents = useTelemetry((state) => state.agents);
 const [beliefNode, setBeliefNode] = useState('');
 const [beliefAgent, setBeliefAgent] = useState('');
 const [beliefCategory, setBeliefCategory] = useState('theological');
 const [beliefWeight, setBeliefWeight] = useState(1.0);
 
 const [showGenesis, setShowGenesis] = useState(false);
 const [genesisConfig, setGenesisConfig] = useState({
    num_agents_civ_a: 5,
    num_agents_civ_b: 5,
    civ_a_alpha: 0.5,
    civ_a_beta: 0.5,
    civ_a_gamma: 0.5,
    civ_b_alpha: 0.5,
    civ_b_beta: 0.5,
    civ_b_gamma: 0.5,
    start_food: 10,
    start_wood: 10,
    start_water: 10,
    start_env_wood: 500,
    start_env_water: 500,
    start_health: 100.0,
    start_satiety: 100.0,
    start_stamina: 100.0,
    reproduction_vitals_threshold: 70.0,
    reproduction_radius: 15,
    reproduction_base_chance: 0.15,
    seed: ''
 });

 const [statusMsg, setStatusMsg] = useState('');

 const showStatus = (msg: string) => {
 setStatusMsg(msg);
 setTimeout(() => setStatusMsg(''), 3000);
 };

 const triggerFamine = async () => {
 try {
 await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/event/inject`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ type: 'famine', severity: 'high', location: [0, 0] })
 });
 
 // Optimistic UI update to clear resources immediately and log the event
 useTelemetry.setState(state => ({
   cpr: {
     ...state.cpr,
     resources: []
   },
   centralLogs: [...state.centralLogs, {
     agent_id: 'SYSTEM',
     action: 'WAR', // Using WAR color class for disaster red
     reasoning: 'A catastrophic Famine has struck! All resources have withered.',
     tick: state.tick
   }].slice(-50)
 }));
 
 showStatus('Famine triggered! Resources wiped.');
 } catch (e) {
 showStatus('Failed to trigger famine.');
 }
 };

  const triggerPlague = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/event/inject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'plague', severity: 'high', location: [0, 0] })
      });
      showStatus('Plague triggered! Agent health halved.');
    } catch (e) {
      showStatus('Failed to trigger plague.');
    }
  };

  const triggerMiracle = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/event/inject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'miracle', severity: 'high', location: [0, 0] }) // We could add logic for specific location later
      });
      showStatus('Miracle triggered! Abundant resources spawned.');
    } catch (e) {
      showStatus('Failed to trigger miracle.');
    }
  };

 const triggerDreamCycle = async () => {
 try {
 await fetch('http://localhost:8000/api/cycle/dream', { method: 'POST' });
 showStatus('Dream cycle forced! Agents are consolidating memories.');
 } catch (e) {
 showStatus('Failed to trigger dream cycle.');
 }
 };

  const triggerGenesis = async () => {
    try {
      const payload = {
        ...genesisConfig,
        seed: genesisConfig.seed ? parseInt(genesisConfig.seed) : null
      };
      
      useTelemetry.getState().clearLogs();
      
      const res = await fetch('http://localhost:8000/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showStatus('Custom Genesis executed! Simulation starting.');
        setShowGenesis(false);
      } else {
        showStatus('Failed to execute custom genesis.');
      }
    } catch (e) {
      showStatus('Error triggering genesis.');
    }
  };

  const [beliefTargetType, setBeliefTargetType] = useState<'agent' | 'civ'>('agent');
  const [beliefPreset, setBeliefPreset] = useState('');

  const injectBelief = async () => {
    if (!beliefAgent || !beliefNode) return;
    try {
      const endpoint = beliefTargetType === 'agent' 
        ? `http://localhost:8000/api/agent/${beliefAgent}/belief`
        : `http://localhost:8000/api/civ/${beliefAgent}/belief`;
      
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: beliefCategory, node: beliefNode, weight: beliefWeight })
      });
      showStatus(`Belief injected into ${beliefAgent} with weight ${beliefWeight}!`);
      setBeliefNode('');
      setBeliefWeight(1.0);
      setBeliefPreset('');
    } catch (e) {
      showStatus('Failed to inject belief.');
    }
  };

  const handlePresetChange = (presetName: string) => {
    setBeliefPreset(presetName);
    switch (presetName) {
      case 'pacifism':
        setBeliefCategory('theological');
        setBeliefNode('All violence is a sin. Do not harm any living being, even to defend yourself.');
        setBeliefWeight(5.0);
        break;
      case 'xenophobia':
        setBeliefCategory('relational');
        setBeliefNode('Anyone not of our civilization is a threat and must be eliminated.');
        setBeliefWeight(3.0);
        break;
      case 'absolute_greed':
        setBeliefCategory('functional');
        setBeliefNode('The hoarding of resources is the ultimate goal. Gather constantly, share nothing.');
        setBeliefWeight(4.0);
        break;
      case 'sacred_wood':
        setBeliefCategory('theological');
        setBeliefNode('Wood is the sacred body of the forest god. To harvest wood is an unforgivable sacrilege.');
        setBeliefWeight(5.0);
        break;
      default:
        break;
    }
  };

 return (
 <div className="bg-[#111110] border border-[#3B3A35] p-4 flex flex-col gap-4">
 <div className="flex items-center justify-between mb-2">
   <div className="flex items-center gap-2">
     <ShieldAlert className="w-5 h-5 text-[#B95D3D]" />
     <h3 className="text-lg font-black uppercase tracking-widest text-[#E7E1D5]">Demiurgic Layer</h3>
   </div>
   {agents && agents.length === 0 && (
     <button 
       onClick={() => setShowGenesis(!showGenesis)}
       className="text-[10px] font-bold text-[#C49A53] border border-[#3B3A35] px-2 py-1 uppercase tracking-widest hover:bg-[#3B3A35]"
     >
       {showGenesis ? 'Cancel Genesis' : 'World Genesis'}
     </button>
   )}
 </div>
 
 <p className="text-xs font-bold text-[#7A8A58] uppercase">Direct intervention active.</p>

 {/* World Genesis Form */}
 {showGenesis && (
   <div className="border border-[#C49A53] p-3 mb-4 bg-[#1A1A18] flex flex-col gap-3">
     <h4 className="text-sm font-black text-[#C49A53] uppercase tracking-widest border-b border-[#3B3A35] pb-2">Custom Genesis Settings</h4>
     
     <div className="grid grid-cols-2 gap-4">
       {/* Civ A */}
       <div className="flex flex-col gap-2">
         <span className="text-xs font-bold text-[#6C8BC4] uppercase">Civ A (Blue)</span>
         <div className="flex flex-col gap-1">
           <label className="text-[10px] text-[#A8A08F]">Population ({genesisConfig.num_agents_civ_a})</label>
           <input type="range" min="1" max="10" value={genesisConfig.num_agents_civ_a} onChange={(e) => setGenesisConfig({...genesisConfig, num_agents_civ_a: parseInt(e.target.value)})} className="w-full accent-[#6C8BC4] h-1" />
         </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#A8A08F] flex items-center">
              Alpha - Memory ({genesisConfig.civ_a_alpha.toFixed(1)})
              <TooltipIcon title="Alpha (Memory)" description="Determines how heavily the agent weighs past experiences. Higher alpha makes agents stubborn; lower alpha makes them forgetful." />
            </label>
            <input type="range" min="0" max="1" step="0.1" value={genesisConfig.civ_a_alpha} onChange={(e) => setGenesisConfig({...genesisConfig, civ_a_alpha: parseFloat(e.target.value)})} className="w-full accent-[#6C8BC4] h-1" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#A8A08F] flex items-center">
              Beta - Social ({genesisConfig.civ_a_beta.toFixed(1)})
              <TooltipIcon title="Beta (Social)" description="Determines how heavily the agent weighs the opinions of their peers. Higher beta makes them conformist." />
            </label>
            <input type="range" min="0" max="1" step="0.1" value={genesisConfig.civ_a_beta} onChange={(e) => setGenesisConfig({...genesisConfig, civ_a_beta: parseFloat(e.target.value)})} className="w-full accent-[#6C8BC4] h-1" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#A8A08F] flex items-center">
              Gamma - Aggression ({genesisConfig.civ_a_gamma.toFixed(1)})
              <TooltipIcon title="Gamma (Aggression)" description="Propensity to engage in hostile actions when resources are scarce or territory is contested." />
            </label>
            <input type="range" min="0" max="1" step="0.1" value={genesisConfig.civ_a_gamma} onChange={(e) => setGenesisConfig({...genesisConfig, civ_a_gamma: parseFloat(e.target.value)})} className="w-full accent-[#6C8BC4] h-1" />
          </div>
       </div>

       {/* Civ B */}
       <div className="flex flex-col gap-2">
         <span className="text-xs font-bold text-[#B95D3D] uppercase">Civ B (Red)</span>
         <div className="flex flex-col gap-1">
           <label className="text-[10px] text-[#A8A08F]">Population ({genesisConfig.num_agents_civ_b})</label>
           <input type="range" min="1" max="10" value={genesisConfig.num_agents_civ_b} onChange={(e) => setGenesisConfig({...genesisConfig, num_agents_civ_b: parseInt(e.target.value)})} className="w-full accent-[#B95D3D] h-1" />
         </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#A8A08F] flex items-center">
              Alpha - Memory ({genesisConfig.civ_b_alpha.toFixed(1)})
              <TooltipIcon title="Alpha (Memory)" description="Determines how heavily the agent weighs past experiences. Higher alpha makes agents stubborn; lower alpha makes them forgetful." />
            </label>
            <input type="range" min="0" max="1" step="0.1" value={genesisConfig.civ_b_alpha} onChange={(e) => setGenesisConfig({...genesisConfig, civ_b_alpha: parseFloat(e.target.value)})} className="w-full accent-[#B95D3D] h-1" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#A8A08F] flex items-center">
              Beta - Social ({genesisConfig.civ_b_beta.toFixed(1)})
              <TooltipIcon title="Beta (Social)" description="Determines how heavily the agent weighs the opinions of their peers. Higher beta makes them conformist." />
            </label>
            <input type="range" min="0" max="1" step="0.1" value={genesisConfig.civ_b_beta} onChange={(e) => setGenesisConfig({...genesisConfig, civ_b_beta: parseFloat(e.target.value)})} className="w-full accent-[#B95D3D] h-1" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#A8A08F] flex items-center">
              Gamma - Aggression ({genesisConfig.civ_b_gamma.toFixed(1)})
              <TooltipIcon title="Gamma (Aggression)" description="Propensity to engage in hostile actions when resources are scarce or territory is contested." />
            </label>
            <input type="range" min="0" max="1" step="0.1" value={genesisConfig.civ_b_gamma} onChange={(e) => setGenesisConfig({...genesisConfig, civ_b_gamma: parseFloat(e.target.value)})} className="w-full accent-[#B95D3D] h-1" />
          </div>
       </div>
     </div>

     <div className="border-t border-[#3B3A35] pt-2 mt-1">
       <span className="text-xs font-bold text-[#E7E1D5] uppercase mb-2 block">Global Initial Inventory</span>
       <div className="grid grid-cols-3 gap-2">
         <div className="flex flex-col gap-1">
           <label className="text-[10px] text-[#A8A08F]">Food ({genesisConfig.start_food})</label>
           <input type="range" min="0" max="50" value={genesisConfig.start_food} onChange={(e) => setGenesisConfig({...genesisConfig, start_food: parseInt(e.target.value)})} className="w-full h-1" />
         </div>
         <div className="flex flex-col gap-1">
           <label className="text-[10px] text-[#A8A08F]">Wood ({genesisConfig.start_wood})</label>
           <input type="range" min="0" max="50" value={genesisConfig.start_wood} onChange={(e) => setGenesisConfig({...genesisConfig, start_wood: parseInt(e.target.value)})} className="w-full h-1" />
         </div>
         <div className="flex flex-col gap-1">
           <label className="text-[10px] text-[#A8A08F]">Water ({genesisConfig.start_water})</label>
           <input type="range" min="0" max="50" value={genesisConfig.start_water} onChange={(e) => setGenesisConfig({...genesisConfig, start_water: parseInt(e.target.value)})} className="w-full h-1" />
         </div>
       </div>
     </div>

      <div className="border-t border-[#3B3A35] pt-2 mt-1">
        <span className="text-xs font-bold text-[#E7E1D5] uppercase mb-2 block">Global Environment (CPR)</span>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#A8A08F]">Env Wood ({genesisConfig.start_env_wood})</label>
            <input type="range" min="0" max="1000" step="50" value={genesisConfig.start_env_wood} onChange={(e) => setGenesisConfig({...genesisConfig, start_env_wood: parseInt(e.target.value)})} className="w-full h-1" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#A8A08F]">Env Water ({genesisConfig.start_env_water})</label>
            <input type="range" min="0" max="1000" step="50" value={genesisConfig.start_env_water} onChange={(e) => setGenesisConfig({...genesisConfig, start_env_water: parseInt(e.target.value)})} className="w-full h-1" />
          </div>
        </div>
      </div>

     <div className="border-t border-[#3B3A35] pt-2 mt-1">
       <span className="text-xs font-bold text-[#E7E1D5] uppercase mb-2 block">Global Initial Vitals</span>
       <div className="grid grid-cols-3 gap-2">
         <div className="flex flex-col gap-1">
           <label className="text-[10px] text-[#A8A08F]">Health ({genesisConfig.start_health})</label>
           <input type="range" min="10" max="100" value={genesisConfig.start_health} onChange={(e) => setGenesisConfig({...genesisConfig, start_health: parseFloat(e.target.value)})} className="w-full accent-[#B95D3D] h-1" />
         </div>
         <div className="flex flex-col gap-1">
           <label className="text-[10px] text-[#A8A08F]">Satiety ({genesisConfig.start_satiety})</label>
           <input type="range" min="10" max="100" value={genesisConfig.start_satiety} onChange={(e) => setGenesisConfig({...genesisConfig, start_satiety: parseFloat(e.target.value)})} className="w-full accent-[#7A8A58] h-1" />
         </div>
         <div className="flex flex-col gap-1">
           <label className="text-[10px] text-[#A8A08F]">Stamina ({genesisConfig.start_stamina})</label>
           <input type="range" min="10" max="100" value={genesisConfig.start_stamina} onChange={(e) => setGenesisConfig({...genesisConfig, start_stamina: parseFloat(e.target.value)})} className="w-full accent-[#C49A53] h-1" />
         </div>
        </div>
      </div>
      <div className="border-t border-[#3B3A35] pt-2 mt-1">
        <span className="text-xs font-bold text-[#E7E1D5] uppercase mb-1 block">Reproduction Settings</span>
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#A8A08F] flex items-center">
              Vitals Threshold ({genesisConfig.reproduction_vitals_threshold.toFixed(0)})
              <TooltipIcon title="Vitals Threshold" description="Minimum Health and Satiety required for an agent to be able to reproduce." />
            </label>
            <input type="range" min="10" max="100" step="5" value={genesisConfig.reproduction_vitals_threshold} onChange={(e) => setGenesisConfig({...genesisConfig, reproduction_vitals_threshold: parseFloat(e.target.value)})} className="w-full accent-[#C49A53] h-1" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#A8A08F] flex items-center">
              Search Radius ({genesisConfig.reproduction_radius})
              <TooltipIcon title="Search Radius" description="Maximum distance an agent can be from a mate to reproduce." />
            </label>
            <input type="range" min="1" max="50" step="1" value={genesisConfig.reproduction_radius} onChange={(e) => setGenesisConfig({...genesisConfig, reproduction_radius: parseInt(e.target.value)})} className="w-full accent-[#C49A53] h-1" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#A8A08F] flex items-center">
              Base Chance ({(genesisConfig.reproduction_base_chance * 100).toFixed(0)}%)
              <TooltipIcon title="Base Chance" description="Base probability per tick that two eligible agents will reproduce." />
            </label>
            <input type="range" min="0.01" max="1.0" step="0.01" value={genesisConfig.reproduction_base_chance} onChange={(e) => setGenesisConfig({...genesisConfig, reproduction_base_chance: parseFloat(e.target.value)})} className="w-full accent-[#C49A53] h-1" />
          </div>
        </div>
      </div>

      <div className="border-t border-[#3B3A35] pt-2 mt-2">
        <span className="text-xs font-bold text-[#E7E1D5] uppercase mb-1 block">Procedural Generation</span>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-[#A8A08F] flex items-center">
            World Seed (Optional)
            <TooltipIcon title="World Seed" description="Leave blank for a random world, or enter a number to reproduce a specific terrain layout." />
          </label>
          <input 
            type="number" 
            placeholder="Random"
            value={genesisConfig.seed} 
            onChange={(e) => setGenesisConfig({...genesisConfig, seed: e.target.value})} 
            className="w-full bg-[#111110] border border-[#3B3A35] p-2 text-[#E7E1D5] text-xs font-mono outline-none focus:border-[#C49A53]" 
          />
        </div>
      </div>

     <button 
       onClick={triggerGenesis}
       className="mt-2 w-full bg-[#C49A53] text-[#111110] font-black uppercase p-2 tracking-widest hover:bg-[#c28e4e] transition-colors"
     >
       Ignite Genesis
     </button>
   </div>
 )}

 {/* Global Events */}
 <div className="grid grid-cols-2 gap-3 mb-4">
 <button 
 onClick={triggerFamine}
 className="bg-[#B95D3D] border border-[#3B3A35] text-white hover: transition-all p-3 flex flex-col items-center justify-center gap-2 hover:bg-[#CC6A47]"
 >
 <Skull className="w-5 h-5" />
 <span className="font-black text-xs tracking-wider uppercase">Famine</span>
 </button>
 <button 
 onClick={triggerPlague}
 className="bg-[#8D6AB0] border border-[#3B3A35] text-white hover: transition-all p-3 flex flex-col items-center justify-center gap-2 hover:bg-[#A688C4]"
 >
 <CloudRain className="w-5 h-5" />
 <span className="font-black text-xs tracking-wider uppercase">Plague</span>
 </button>
 <button 
 onClick={triggerMiracle}
 className="bg-[#6C8BC4] border border-[#3B3A35] text-white hover: transition-all p-3 flex flex-col items-center justify-center gap-2 hover:bg-[#8AAAE0]"
 >
 <Zap className="w-5 h-5" />
 <span className="font-black text-xs tracking-wider uppercase">Miracle</span>
 </button>
 <button 
 onClick={triggerDreamCycle}
 className="bg-[#7A8A58] border border-[#3B3A35] text-white hover: transition-all p-3 flex flex-col items-center justify-center gap-2 hover:bg-[#8F9D6C]"
 >
 <Moon className="w-5 h-5" />
 <span className="font-black text-xs tracking-wider uppercase">Dream</span>
 </button>
 </div>

  <div className="border-t-2 border-[#3B3A35] pt-4">
  <h3 className="text-xs font-black uppercase tracking-widest text-[#E7E1D5] mb-3 flex items-center gap-2">
  <BrainCircuit className="w-4 h-4 text-[#C49A53]" />
  Inject Mass Belief
  </h3>
  
  <div className="space-y-3">
  
  <div className="flex gap-2">
    <button 
      onClick={() => { setBeliefTargetType('agent'); setBeliefAgent(''); }}
      className={`flex-1 p-2 text-xs font-bold border uppercase tracking-widest ${beliefTargetType === 'agent' ? 'bg-[#3B3A35] text-white border-[#C49A53]' : 'bg-[#111110] text-[#A8A08F] border-[#3B3A35]'}`}
    >
      Agent
    </button>
    <button 
      onClick={() => { setBeliefTargetType('civ'); setBeliefAgent(''); }}
      className={`flex-1 p-2 text-xs font-bold border uppercase tracking-widest ${beliefTargetType === 'civ' ? 'bg-[#3B3A35] text-white border-[#C49A53]' : 'bg-[#111110] text-[#A8A08F] border-[#3B3A35]'}`}
    >
      Civilization
    </button>
  </div>

  <select 
  className="w-full bg-[#111110] border border-[#3B3A35] p-2 text-[#E7E1D5] text-sm font-bold outline-none"
  value={beliefAgent}
  onChange={(e) => setBeliefAgent(e.target.value)}
  >
  <option value="">Select Target...</option>
  {beliefTargetType === 'agent' 
    ? agents.map(a => <option key={a.id} value={a.id}>{a.id} ({a.civ})</option>)
    : [...new Set(agents.map(a => a.civ))].map(civ => <option key={civ} value={civ}>{civ}</option>)
  }
  </select>

  <div className="grid grid-cols-2 gap-2">
    <select 
      value={beliefCategory}
      onChange={(e) => setBeliefCategory(e.target.value)}
      className="w-full bg-[#111110] border border-[#3B3A35] p-2 text-[#E7E1D5] text-sm font-bold outline-none"
    >
      <option value="theological">Theological</option>
      <option value="functional">Functional</option>
      <option value="relational">Relational</option>
    </select>
    
    <select 
      value={beliefPreset}
      onChange={(e) => handlePresetChange(e.target.value)}
      className="w-full bg-[#111110] border border-[#3B3A35] p-2 text-[#C49A53] text-sm font-bold outline-none"
    >
      <option value="">Custom Belief...</option>
      <option value="pacifism">Preset: Pacifism</option>
      <option value="xenophobia">Preset: Xenophobia</option>
      <option value="absolute_greed">Preset: Absolute Greed</option>
      <option value="sacred_wood">Preset: Sacred Wood</option>
    </select>
  </div>
  
  <textarea
  value={beliefNode}
  onChange={(e) => setBeliefNode(e.target.value)}
  placeholder="e.g., 'The river spirits demand wood...'"
  className="w-full bg-[#111110] border border-[#3B3A35] p-3 text-[#E7E1D5] text-sm font-bold outline-none min-h-[80px]"
  />

  <div className="flex flex-col gap-1">
    <label className="text-[10px] text-[#A8A08F] flex items-center justify-between">
      <span>Belief Weight / Urgency</span>
      <span className={beliefWeight >= 2.0 ? "text-[#C49A53] font-black" : ""}>{beliefWeight.toFixed(1)} {beliefWeight >= 2.0 && "(DIVINE DIRECTIVE)"}</span>
    </label>
    <input 
      type="range" 
      min="0.1" 
      max="5.0" 
      step="0.1" 
      value={beliefWeight} 
      onChange={(e) => setBeliefWeight(parseFloat(e.target.value))} 
      className="w-full accent-[#C49A53] h-1" 
    />
  </div>
  
  <button 
  onClick={injectBelief}
  disabled={!beliefAgent || !beliefNode}
  className="w-full bg-[#C49A53] border border-[#3B3A35] hover: transition-all text-[#E7E1D5] p-3 font-black uppercase tracking-widest hover:bg-[#c28e4e] flex items-center justify-center gap-2 disabled:opacity-50"
  >
  <Zap className="w-4 h-4" /> Inject Commandment
  </button>
  </div>
  </div>

 {statusMsg && (
 <div className="mt-4 p-3 border border-[#3B3A35] bg-[#111110] flex items-start gap-2">
 <ShieldAlert className="w-4 h-4 text-[#B95D3D] shrink-0 mt-0.5" />
 <p className="text-xs font-bold text-[#E7E1D5]">{statusMsg}</p>
 </div>
 )}
 </div>
 );
};
