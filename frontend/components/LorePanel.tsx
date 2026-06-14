import React, { useState, useEffect } from 'react';
import { getSessionId } from '../utils/session';
import { BACKEND_URL } from '../utils/api';

interface LoreEvent {
  text: string;
  tick: number;
  agent_id: string;
}

interface LorePanelProps {
  civId: string;
}

export default function LorePanel({ civId }: LorePanelProps) {
  const [lore, setLore] = useState<LoreEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!civId) return;
    
    const fetchLore = async () => {
      setLoading(true);
      try {
        const sessionId = getSessionId();
        const res = await fetch(`${BACKEND_URL}/api/lore/${civId}?session_id=${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setLore(data.lore || []);
        }
      } catch (err) {
        console.error("Failed to fetch lore:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLore();
    // Poll every 5 seconds
    const interval = setInterval(fetchLore, 5000);
    return () => clearInterval(interval);
  }, [civId]);

  return (
    <div className="bg-[#1C1C1A] text-[#E7E1D5] p-4 rounded border border-[#2B2A26] flex flex-col h-full">
      <h2 className="text-sm font-bold uppercase tracking-wider mb-4 border-b border-[#2B2A26] pb-2 text-[#C49A53]">
        Akashic Records: {civId}
      </h2>
      
      <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
        {loading && lore.length === 0 ? (
          <div className="text-xs text-gray-500 italic">Reading the ether...</div>
        ) : lore.length === 0 ? (
          <div className="text-xs text-gray-500 italic">No history recorded yet.</div>
        ) : (
          lore.map((event, idx) => (
            <div key={idx} className="bg-[#141413] p-3 rounded border border-[#2B2A26]">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-[#C49A53]">Tick {event.tick}</span>
                <span className="text-[10px] text-gray-500">{event.agent_id}</span>
              </div>
              <p className="text-sm font-serif">{event.text}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
