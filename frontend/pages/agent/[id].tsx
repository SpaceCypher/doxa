import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { AgentPanel } from '../../components/AgentPanel';
import { MemoryExplorer } from '../../components/MemoryExplorer';
import { ArrowLeft, BrainCircuit } from 'lucide-react';
import Link from 'next/link';

export default function AgentInspector() {
  const router = useRouter();
  const { id } = router.query;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // History for sparklines
  const [vitalsHistory, setVitalsHistory] = useState<any[]>([]);
  const vitalsRef = useRef<any[]>([]);

  useEffect(() => {
    if (!id) return;
    
    const fetchAgent = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/agent/${id}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
          
          // Update history
          if (json.agent && json.agent.vitals) {
            const newHistory = [...vitalsRef.current, { 
              health: json.agent.vitals.health || 0,
              satiety: json.agent.vitals.satiety || 0,
              stamina: json.agent.vitals.stamina || 0,
              mimetic: json.agent.mimetic_desire?.intensity || 0,
              tick: json.agent.current_tick || Date.now()
            }].slice(-30); // Keep last 30 ticks
            vitalsRef.current = newHistory;
            setVitalsHistory(newHistory);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
    const interval = setInterval(fetchAgent, 2000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading && !data) return <div className="p-8 text-[#E7E1D5] font-black uppercase tracking-widest bg-[#050505] min-h-screen">Loading Agent {id}...</div>;
  if (!data) return <div className="p-8 text-[#B95D3D] font-black uppercase tracking-widest bg-[#050505] min-h-screen">Agent {id} not found.</div>;

  return (
    <div className="h-screen bg-[#050505] text-[#E7E1D5] font-sans flex flex-col p-4">
      <Head>
        <title>Inspector - {id}</title>
      </Head>

      <header className="flex items-center justify-between border-b border-[#3B3A35] pb-4 mb-4 flex-shrink-0">
        <div className="flex items-center gap-6">
          <Link href="/" className="px-4 py-2 border border-[#3B3A35] hover:bg-[#1A1A18] text-[#A8A08F] hover:text-[#E7E1D5] font-bold uppercase transition-all flex items-center gap-2 text-xs tracking-widest">
            <ArrowLeft className="w-4 h-4" /> Back to Civilization
          </Link>
          <div className="h-6 w-[1px] bg-[#3B3A35]"></div>
          <h1 className="text-xl font-black uppercase tracking-widest text-[#E7E1D5]">
            Cognitive Inspector
          </h1>
        </div>
        <div className="flex items-center gap-2 pr-4">
           <BrainCircuit className="w-5 h-5 text-[#B95D3D]" />
           <div className="text-right">
              <div className="text-xs font-black uppercase tracking-widest text-[#E7E1D5]">Agent: {id}</div>
              <div className="text-[10px] uppercase tracking-widest text-[#A8A08F]">{data.agent?.social_status || 'Wanderer'}</div>
           </div>
        </div>
      </header>
      
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        <div className="col-span-3 flex flex-col min-h-0">
          <AgentPanel agent={data.agent} cognition={data.cognition} history={vitalsHistory} />
        </div>
        
        <div className="col-span-9 flex flex-col min-h-0 border border-[#3B3A35] bg-[#111110]">
          <MemoryExplorer graph={data.cognition?.belief_graph} />
        </div>
      </div>
    </div>
  );
}
