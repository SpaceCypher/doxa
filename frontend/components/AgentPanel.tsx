import React, { useState, useRef, useEffect } from 'react';
import { Heart, Battery, Flame, Zap, MapPin, Briefcase, Globe2, Target, History, Clock, Brain, ChevronDown, ChevronRight } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import Link from 'next/link';

interface AgentPanelProps {
  agent: any;
  cognition?: any;
  history?: any[];
}

export const AgentPanel: React.FC<AgentPanelProps> = ({ agent, cognition, history = [] }) => {
  const ulRef = useRef<HTMLUListElement>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    workingMemory: true,
    psychologicalState: false,
    agentContext: false
  });

  useEffect(() => {
    if (ulRef.current && openSections.workingMemory) {
      ulRef.current.scrollTo({ top: ulRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [cognition?.working_memory, openSections.workingMemory]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({...prev, [section]: !prev[section]}));
  };

  if (!agent) return <div className="p-4 text-gray-500">Select an agent</div>;

  const vitals = agent.vitals || {};
  const mimetic = agent.mimetic_desire || {};
  const coords = agent.coordinates || {x: 0, y: 0};

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto pr-2 custom-scrollbar">
      
      {/* HEADER */}
      <div className="bg-[#111110] border border-[#3B3A35] p-4 flex-shrink-0">
         <div className="flex items-center gap-2 mb-4">
           <div className="w-6 h-6 border border-[#B95D3D] flex items-center justify-center">
              <Zap className="w-3 h-3 text-[#B95D3D]" />
           </div>
           <h2 className="text-sm font-black uppercase tracking-widest text-[#E7E1D5]">
             Agent {agent.agent_id}
           </h2>
           <span className="ml-auto text-[10px] text-[#A8A08F] uppercase tracking-widest font-bold">
             {agent.social_status || 'Wanderer'}
           </span>
         </div>

         {/* VITALS GRID */}
         <div className="grid grid-cols-2 gap-2">
            <VitalBlock icon={<Heart className="w-3 h-3 text-[#B95D3D]" />} label="Health" value={vitals.health?.toFixed(1) ?? '100.0'} color="#B95D3D" dataKey="health" history={history} />
            <VitalBlock icon={<Battery className="w-3 h-3 text-[#7A8A58]" />} label="Satiety" value={vitals.satiety?.toFixed(1) ?? '100.0'} color="#7A8A58" dataKey="satiety" history={history} />
            <VitalBlock icon={<Flame className="w-3 h-3 text-[#C49A53]" />} label="Stamina" value={vitals.stamina?.toFixed(1) ?? '100.0'} color="#C49A53" dataKey="stamina" history={history} />
            
            {/* MIMETIC */}
            <div className="bg-[#161614] border border-[#3B3A35] p-2 flex flex-col">
              <div className="flex items-center gap-2 text-[#A8A08F] font-bold uppercase tracking-widest text-[9px] mb-2">
                <Zap className="w-3 h-3" /> Mimetic
              </div>
              <div className="text-lg font-black text-[#E7E1D5]">{mimetic.target || 'None'}</div>
              <div className="text-[10px] font-mono text-[#A8A08F] mt-auto">Int: {mimetic.intensity?.toFixed(2) ?? '0.00'}</div>
            </div>
         </div>
      </div>

      {/* WORKING MEMORY */}
      <div className="bg-[#111110] border border-[#3B3A35] flex flex-col flex-shrink-0">
        <div 
          className="p-3 border-b border-[#3B3A35] flex items-center justify-between text-[#A8A08F] font-bold uppercase tracking-widest text-xs flex-shrink-0 cursor-pointer hover:bg-[#1A1A18]"
          onClick={() => toggleSection('workingMemory')}
        >
           <div className="flex items-center gap-2">
             <History className="w-4 h-4" /> Working Memory
           </div>
           {openSections.workingMemory ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
        {openSections.workingMemory && (
          <>
            <ul ref={ulRef} className="p-3 space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
              {cognition && cognition.working_memory && cognition.working_memory.length > 0 ? (
                cognition.working_memory.map((mem: any, i: number) => {
                   const text = typeof mem === 'string' ? mem : JSON.stringify(mem);
                   let action = "LOG";
                   let rest = text;
                   let color = "#A8A08F";
                   
                   if (text.startsWith("[Message from")) { action = "MSG"; color = "#6C8BC4"; }
                   else if (text.includes("Moving") || text.includes("Move")) { action = "MOVE"; color = "#6C8BC4"; }
                   else if (text.includes("Ate")) { action = "EAT"; color = "#7A8A58"; }
                   else if (text.includes("Thought")) { action = "THINK"; color = "#C49A53"; }
                   else if (text.includes("Built")) { action = "BUILD"; color = "#B95D3D"; }

                   return (
                     <li key={i} className="flex gap-2 text-[10px] font-mono">
                       <div className="w-1 flex-shrink-0" style={{backgroundColor: color}}></div>
                       <div className="flex-1 flex flex-col gap-1">
                          <div className="flex justify-between items-center text-[#E7E1D5]">
                             <span style={{color}} className="font-bold">{action}</span>
                             <span className="text-[#A8A08F]">--:--:--</span>
                          </div>
                          <div className="text-[#A8A08F] italic leading-relaxed">{rest}</div>
                       </div>
                     </li>
                   )
                })
              ) : (
                <li className="text-[#A8A08F] font-bold italic opacity-60 text-xs text-center py-4">No recent activity</li>
              )}
            </ul>
            <div className="p-2 border-t border-[#3B3A35] flex-shrink-0">
               <Link href="/logs" className="block w-full text-center py-2 text-[10px] font-bold uppercase tracking-widest text-[#E7E1D5] hover:bg-[#1A1A18] transition-colors">
                  View Full Agent Logs →
               </Link>
            </div>
          </>
        )}
      </div>

      {/* PSYCHOLOGICAL STATE */}
      <div className="bg-[#111110] border border-[#3B3A35] flex flex-col flex-shrink-0">
        <div 
          className="p-3 border-b border-[#3B3A35] flex items-center justify-between text-[#A8A08F] font-bold uppercase tracking-widest text-xs flex-shrink-0 cursor-pointer hover:bg-[#1A1A18]"
          onClick={() => toggleSection('psychologicalState')}
        >
           <div className="flex items-center gap-2">
             <Brain className="w-4 h-4" /> Psychological State
           </div>
           {openSections.psychologicalState ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
        {openSections.psychologicalState && (
          <div className="overflow-y-auto custom-scrollbar p-3 space-y-4">
            {/* Sacred Beliefs */}
            <div>
              <div className="text-[10px] text-[#C49A53] font-bold uppercase tracking-widest mb-2">Sacred Beliefs & Ideology</div>
              <ul className="space-y-1">
                {cognition?.belief_graph?.theological?.length > 0 ? (
                  cognition.belief_graph.theological.map((b: any, i: number) => (
                    <li key={i} className="text-xs text-[#E7E1D5] font-mono leading-relaxed border-l-2 border-[#C49A53] pl-2">
                      {b.node} <span className="opacity-50">(wt: {b.weight})</span>
                    </li>
                  ))
                ) : (
                  <li className="text-[10px] text-[#A8A08F] italic opacity-60">No sacred beliefs</li>
                )}
              </ul>
            </div>
            
            {/* Episodic Memories */}
            <div>
              <div className="text-[10px] text-[#B95D3D] font-bold uppercase tracking-widest mb-2">Episodic Memories</div>
              <ul className="space-y-1">
                {cognition?.episodic_memory?.length > 0 ? (
                  cognition.episodic_memory.map((mem: string, i: number) => {
                    let color = "#A8A08F";
                    if (mem.includes("GRUDGE")) color = "#B95D3D";
                    if (mem.includes("GRIEF")) color = "#6C8BC4";
                    return (
                      <li key={i} className="text-xs text-[#E7E1D5] font-mono leading-relaxed border-l-2 pl-2" style={{borderColor: color}}>
                        {mem}
                      </li>
                    )
                  })
                ) : (
                  <li className="text-[10px] text-[#A8A08F] italic opacity-60">No episodic memories</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* AGENT CONTEXT */}
      <div className="bg-[#111110] border border-[#3B3A35] flex-shrink-0">
        <div 
          className="p-3 border-b border-[#3B3A35] flex items-center justify-between text-[#A8A08F] font-bold uppercase tracking-widest text-xs cursor-pointer hover:bg-[#1A1A18]"
          onClick={() => toggleSection('agentContext')}
        >
           <div className="flex items-center gap-2">
             <Globe2 className="w-4 h-4" /> Agent Context
           </div>
           {openSections.agentContext ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
        {openSections.agentContext && (
          <div className="p-3 flex flex-col gap-2 text-xs font-mono">
             <div className="flex justify-between items-center border-b border-[#24231F] pb-1">
               <span className="text-[#A8A08F] flex items-center gap-2"><MapPin className="w-3 h-3"/> Location</span>
               <span className="text-[#E7E1D5]">({coords.x}, {coords.y})</span>
             </div>
             <div className="flex justify-between items-center border-b border-[#24231F] pb-1">
               <span className="text-[#A8A08F] flex items-center gap-2"><Briefcase className="w-3 h-3"/> Role</span>
               <span className="text-[#E7E1D5]">{agent.social_status || 'Wanderer'}</span>
             </div>
             <div className="flex justify-between items-center border-b border-[#24231F] pb-1">
               <span className="text-[#A8A08F] flex items-center gap-2"><Globe2 className="w-3 h-3"/> Civilization</span>
               <span className="text-[#E7E1D5]">{agent.civilization_id === 'civ_a' ? 'Civ A' : 'Civ B'}</span>
             </div>
             <div className="flex justify-between items-center border-b border-[#24231F] pb-1">
               <span className="text-[#A8A08F] flex items-center gap-2"><Briefcase className="w-3 h-3"/> Inventory</span>
               <span className="text-[#E7E1D5]">
                 Food: {agent.inventory?.food || 0} | Wood: {agent.inventory?.wood || 0} | Water: {agent.inventory?.water || 0}
               </span>
             </div>
             <div className="flex justify-between items-center border-b border-[#24231F] pb-1">
               <span className="text-[#A8A08F] flex items-center gap-2"><Target className="w-3 h-3"/> Active Goal</span>
               <span className="text-[#E7E1D5]">Survival</span>
             </div>
             <div className="flex justify-between items-center border-b border-[#24231F] pb-1">
               <span className="text-[#A8A08F] flex items-center gap-2"><Clock className="w-3 h-3"/> Time Alive</span>
               <span className="text-[#E7E1D5]">{agent.generation} Gen</span>
             </div>
          </div>
        )}
      </div>

    </div>
  );
};

const VitalBlock = ({icon, label, value, color, dataKey, history}: any) => {
  return (
    <div className="bg-[#161614] border border-[#3B3A35] p-2 flex flex-col h-20">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1" style={{color}}>
          {icon} <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
        </div>
      </div>
      <div className="text-lg font-black text-[#E7E1D5] leading-none mb-1">{value}</div>
      <div className="mt-auto h-6 w-full -ml-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history}>
            <YAxis domain={[-10, 110]} hide />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
