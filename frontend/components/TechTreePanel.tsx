import React from 'react';
import { useTelemetry } from '../stores/useTelemetry';

interface TechTreePanelProps {
  civId: string;
}

const ALL_TECHS = [
  { id: 'agriculture', name: 'Agriculture', desc: 'Allows Farming', icon: '🌾' },
  { id: 'masonry', name: 'Masonry', desc: 'Allows Stone structures', icon: '🧱' },
  { id: 'theology', name: 'Theology', desc: 'Allows Temples', icon: '👁️' },
];

export default function TechTreePanel({ civId }: TechTreePanelProps) {
  const techTreeData = useTelemetry((state) => state.tech_tree) || {};
  const unlocked = techTreeData[civId] || [];

  return (
    <div className="bg-[#1C1C1A] text-[#E7E1D5] p-4 rounded border border-[#2B2A26] flex flex-col h-full">
      <h2 className="text-sm font-bold uppercase tracking-wider mb-4 border-b border-[#2B2A26] pb-2 text-[#C49A53]">
        Tech Tree: {civId}
      </h2>
      
      <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
        {ALL_TECHS.map(tech => {
          const isUnlocked = unlocked.includes(tech.id);
          return (
            <div 
              key={tech.id} 
              className={`p-3 rounded border flex items-center gap-3 transition-colors ${
                isUnlocked 
                  ? 'bg-[#2A2A22] border-[#C49A53]' 
                  : 'bg-[#141413] border-[#2B2A26] opacity-50 grayscale'
              }`}
            >
              <div className="text-2xl">{tech.icon}</div>
              <div>
                <div className="text-sm font-bold text-[#E7E1D5]">{tech.name}</div>
                <div className="text-xs text-gray-400">{tech.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
