import React, { useMemo, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Search, LayoutGrid, Network, ShieldCheck } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface BeliefGraph {
  functional?: { node: string; weight: number }[];
  relational?: { node: string; weight: number }[];
  theological?: { node: string; weight: number }[];
}

// Generate deterministic mock history for the utility trend chart
const generateTrend = (base: number) => {
  let cur = base;
  return Array.from({length: 30}).map((_, i) => {
     cur += (Math.random() - 0.5) * Math.max(0.1, base * 0.1);
     return {val: Math.max(0, cur)};
  });
};

export const MemoryExplorer: React.FC<{ graph?: BeliefGraph }> = ({ graph }) => {
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedNodeData, setSelectedNodeData] = useState<any>(null);

  const { initialNodes, initialEdges } = useMemo(() => {
    if (!graph) return { initialNodes: [], initialEdges: [] };

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const categories = ['functional', 'relational', 'theological'] as const;
    const colors = {
      functional: '#6C8BC4', // Muted Blue
      relational: '#7A8A58', // Muted Olive
      theological: '#8470A5', // Dusty Purple
    };

    categories.forEach((cat, i) => {
      if (filter !== 'all' && filter !== cat) return;

      // Central category node
      const catId = `root-${cat}`;
      nodes.push({
        id: catId,
        position: { x: i * 350, y: 250 },
        data: { label: cat.toUpperCase(), cat, isRoot: true },
        type: 'default',
        style: {
          background: '#161614',
          color: '#E7E1D5',
          border: `1px solid ${colors[cat]}`,
          borderRadius: '4px',
          padding: '10px 20px',
          fontWeight: 'black',
          fontSize: '12px',
          width: 200,
          textAlign: 'center',
          boxShadow: `0 0 10px ${colors[cat]}22`
        },
      });

      const items = graph[cat] || [];
      items.forEach((item, j) => {
        if (search && !item.node.toLowerCase().includes(search.toLowerCase())) return;

        const itemId = `node-${cat}-${j}`;
        // Calculate a ring layout around the root
        const angle = (j / items.length) * Math.PI * 2;
        const radius = 200;
        
        // Mock stats derived from weight
        const utility = item.weight || 0.5;
        const confidence = Math.min(1.0, utility + 0.1 + (Math.random() * 0.2 - 0.1));
        const stability = Math.min(1.0, utility - 0.1 + (Math.random() * 0.2 - 0.1));

        nodes.push({
          id: itemId,
          position: { 
             x: i * 350 + Math.cos(angle) * radius, 
             y: 250 + Math.sin(angle) * radius 
          },
          data: { 
            label: item.node.toUpperCase(),
            utility: utility.toFixed(2),
            confidence: confidence.toFixed(2),
            stability: stability.toFixed(2),
            cat
          },
          style: {
            background: '#111110',
            color: '#E7E1D5',
            border: `1px solid ${colors[cat]}`,
            borderRadius: '4px',
            padding: '12px',
            fontSize: '10px',
            width: 180,
            fontWeight: 'bold',
            textAlign: 'center',
          },
        });

        edges.push({
          id: `edge-${catId}-${itemId}`,
          source: catId,
          target: itemId,
          animated: true,
          style: { stroke: '#3B3A35', strokeWidth: 1.5, strokeDasharray: '5,5' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#3B3A35' },
        });
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [graph, filter, search]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Custom Node Rendering to include the Utility/Confidence text inside
  const mappedNodes = nodes.map(n => ({
    ...n,
    data: {
      ...n.data,
      label: (
        <div className="flex flex-col gap-1 items-center justify-center h-full">
          <div className="text-[#6C8BC4] font-black">{n.data.label as string}</div>
          {!n.data.isRoot && (
             <div className="text-[#A8A08F] font-mono text-[9px] mt-1">
               Utility: {n.data.utility as string}
             </div>
          )}
        </div>
      )
    }
  }));

  const onNodeClick = (_: any, node: Node) => {
     if (node.data.isRoot) return;
     setSelectedNodeData({
        description: node.data.label, // In a real app we might have a long desc
        utility: parseFloat(node.data.utility as string),
        confidence: parseFloat(node.data.confidence as string),
        stability: parseFloat(node.data.stability as string),
        cat: node.data.cat,
        history: generateTrend(parseFloat(node.data.utility as string))
     });
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative">
      {/* TOOLBAR */}
      <div className="bg-[#111110] border-b border-[#3B3A35] p-4 flex items-center justify-between z-10 flex-shrink-0">
         <h2 className="text-sm font-black uppercase tracking-widest text-[#E7E1D5]">Belief Graph (Semantic Memory)</h2>
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-[#161614] border border-[#3B3A35] p-1">
               <button onClick={() => setFilter('all')} className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${filter==='all' ? 'bg-[#24231F] text-[#E7E1D5]' : 'text-[#A8A08F] hover:text-[#E7E1D5]'}`}>All Beliefs</button>
               <button onClick={() => setFilter('functional')} className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${filter==='functional' ? 'bg-[#24231F] text-[#E7E1D5]' : 'text-[#A8A08F] hover:text-[#E7E1D5]'}`}>
                  <span className="w-2 h-2 rounded-full bg-[#6C8BC4]"></span> Functional
               </button>
               <button onClick={() => setFilter('relational')} className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${filter==='relational' ? 'bg-[#24231F] text-[#E7E1D5]' : 'text-[#A8A08F] hover:text-[#E7E1D5]'}`}>
                  <span className="w-2 h-2 rounded-full bg-[#7A8A58]"></span> Relational
               </button>
               <button onClick={() => setFilter('theological')} className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${filter==='theological' ? 'bg-[#24231F] text-[#E7E1D5]' : 'text-[#A8A08F] hover:text-[#E7E1D5]'}`}>
                  <span className="w-2 h-2 rounded-full bg-[#8470A5]"></span> Theological
               </button>
            </div>
            
            <div className="flex items-center gap-2 bg-[#161614] border border-[#3B3A35] p-1">
               <button className="p-1 bg-[#24231F] text-[#E7E1D5]"><Network className="w-4 h-4"/></button>
               <button className="p-1 text-[#A8A08F] hover:text-[#E7E1D5]"><LayoutGrid className="w-4 h-4"/></button>
            </div>

            <div className="relative border border-[#3B3A35] bg-[#161614] flex items-center px-2">
               <input 
                 type="text" 
                 placeholder="Search beliefs..." 
                 className="bg-transparent text-xs font-mono text-[#E7E1D5] p-2 outline-none w-48 placeholder-[#A8A08F]"
                 value={search}
                 onChange={e => setSearch(e.target.value)}
               />
               <Search className="w-4 h-4 text-[#A8A08F]" />
            </div>
         </div>
      </div>

      {/* GRAPH AREA */}
      <div className="flex-grow relative bg-[#050505]">
        <div className="absolute inset-0 z-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#1A1A18 1px, transparent 1px), linear-gradient(90deg, #1A1A18 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.5 }}></div>
        <ReactFlow
          nodes={mappedNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          minZoom={0.2}
        >
          <Controls className="bg-[#161614] border border-[#3B3A35] fill-[#A8A08F] " />
          <Background color="transparent" />
        </ReactFlow>
      </div>

      {/* BOTTOM PANEL - SELECTED BELIEF */}
      <div className={`border-t border-[#3B3A35] bg-[#111110] transition-all duration-300 ease-in-out ${selectedNodeData ? 'h-[320px] opacity-100' : 'h-0 opacity-0 overflow-hidden'}`}>
         {selectedNodeData && (
            <div className="p-6 h-full flex flex-col gap-4">
               <div className="flex items-center gap-2 text-[#A8A08F] font-bold uppercase tracking-widest text-xs mb-2">
                  <ShieldCheck className="w-4 h-4 text-[#C49A53]"/> Selected Belief
               </div>
               
               <div className="flex items-start justify-between gap-8 h-full">
                  
                  {/* Left Desc */}
                  <div className="flex flex-col w-1/3 h-full">
                     <div className="flex items-start gap-4 mb-4">
                        <h3 className="text-xl font-black text-[#E7E1D5] leading-tight">{selectedNodeData.description}</h3>
                        <span className="px-2 py-1 bg-[#24231F] text-[10px] uppercase font-bold tracking-widest border border-[#3B3A35] flex-shrink-0 mt-1">Core Belief</span>
                     </div>
                     <p className="text-[#A8A08F] text-xs leading-relaxed mb-auto">
                       This belief has formed through repeated validation in the simulation environment. It strongly influences the agent's decision-making matrix.
                     </p>
                     <div className="flex items-center gap-8 text-[10px] font-bold uppercase tracking-widest text-[#A8A08F]">
                        <div>
                           <div className="mb-1">Origin</div>
                           <div className="text-[#E7E1D5]">Inferred</div>
                        </div>
                        <div>
                           <div className="mb-1">Last Reinforced</div>
                           <div className="text-[#E7E1D5]">Just now</div>
                        </div>
                     </div>
                  </div>

                  {/* Attributes */}
                  <div className="flex flex-col w-1/4 h-full pt-2">
                     <div className="text-[10px] font-bold uppercase tracking-widest text-[#A8A08F] mb-4">Attributes</div>
                     
                     <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                           <span className="w-20 text-[10px] text-[#E7E1D5]">Utility</span>
                           <div className="flex-1 h-1 bg-[#24231F] overflow-hidden"><div className="h-full bg-[#C49A53]" style={{width: `${Math.min(100, selectedNodeData.utility * 100)}%`}}></div></div>
                           <span className="font-mono text-xs text-[#E7E1D5] w-8 text-right">{selectedNodeData.utility.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="w-20 text-[10px] text-[#E7E1D5]">Confidence</span>
                           <div className="flex-1 h-1 bg-[#24231F] overflow-hidden"><div className="h-full bg-[#7A8A58]" style={{width: `${Math.min(100, selectedNodeData.confidence * 100)}%`}}></div></div>
                           <span className="font-mono text-xs text-[#E7E1D5] w-8 text-right">{selectedNodeData.confidence.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="w-20 text-[10px] text-[#E7E1D5]">Stability</span>
                           <div className="flex-1 h-1 bg-[#24231F] overflow-hidden"><div className="h-full bg-[#6C8BC4]" style={{width: `${Math.min(100, selectedNodeData.stability * 100)}%`}}></div></div>
                           <span className="font-mono text-xs text-[#E7E1D5] w-8 text-right">{selectedNodeData.stability.toFixed(2)}</span>
                        </div>
                     </div>
                  </div>

                  {/* Trend Line */}
                  <div className="flex flex-col w-1/3 h-full pt-2 pr-4 pb-6">
                     <div className="text-[10px] font-bold uppercase tracking-widest text-[#A8A08F] mb-4">Utility Trend</div>
                     <div className="flex-1 border-l border-b border-[#3B3A35] relative mb-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={selectedNodeData.history}>
                            <YAxis domain={[0, Math.max(1, Math.ceil(selectedNodeData.utility))]} hide />
                            <Line type="monotone" dataKey="val" stroke="#C49A53" strokeWidth={2} dot={false} isAnimationActive={false} />
                          </LineChart>
                        </ResponsiveContainer>
                        <div className="absolute top-0 -left-6 text-[9px] text-[#A8A08F]">{Math.max(1, Math.ceil(selectedNodeData.utility)).toFixed(1)}</div>
                        <div className="absolute bottom-1/2 -left-6 text-[9px] text-[#A8A08F]">{(Math.max(1, Math.ceil(selectedNodeData.utility)) / 2).toFixed(1)}</div>
                        <div className="absolute bottom-0 -left-6 text-[9px] text-[#A8A08F]">0.0</div>
                        <div className="absolute -bottom-4 left-0 text-[9px] text-[#A8A08F]">-60m</div>
                        <div className="absolute -bottom-4 right-0 text-[9px] text-[#A8A08F]">Now</div>
                     </div>
                  </div>
                  
               </div>
            </div>
         )}
      </div>

    </div>
  );
};
