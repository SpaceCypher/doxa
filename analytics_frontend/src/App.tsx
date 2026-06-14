import React, { useEffect, useState } from 'react';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Sparkles, BrainCircuit, Activity, Users, Database, BarChart3, AlertTriangle, RefreshCcw } from 'lucide-react';

export default function App() {
  const [timeSeries, setTimeSeries] = useState<any[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tsRes, insRes] = await Promise.all([
        fetch('http://localhost:8000/api/analytics/timeseries'),
        fetch('http://localhost:8000/api/analytics/insights')
      ]);
      
      if (!tsRes.ok) {
         const errData = await tsRes.json().catch(() => ({}));
         throw new Error(errData.detail || 'Failed to fetch time-series data');
      }
      const tsData = await tsRes.json();
      
      // Map the data for easier charting
      const mappedTsData = tsData.map((d: any) => ({
        tick: d.tick,
        asabiyyah: d.asabiyyah,
        population: d.population,
        cpr_wood: d.cpr_wood,
        cpr_water: d.cpr_water,
        priest: d.roles?.priest || 0,
        farmer: d.roles?.farmer || 0,
        soldier: d.roles?.soldier || 0,
        wanderer: d.roles?.wanderer || 0,
      }));
      
      setTimeSeries(mappedTsData);

      if (insRes.ok) {
        const insData = await insRes.json();
        setInsights(insData);
      } else {
        const insErr = await insRes.json().catch(() => ({}));
        console.error("Insights error:", insErr);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-[#E7E1D5] font-sans selection:bg-[#C49A53] selection:text-[#050505] overflow-x-hidden pb-20">

      {/* TOP NAVIGATION */}
      <nav className="fixed top-0 left-0 right-0 h-14 bg-[#0A0A09]/80 backdrop-blur-md border-b border-[#3B3A35] flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-[#8470A5]" />
            <h1 className="text-sm font-black tracking-widest uppercase text-[#E7E1D5]">Advanced Analytics & AI Insights</h1>
          </div>
        </div>
        <button 
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#161614] hover:bg-[#24231F] border border-[#3B3A35] rounded transition-colors text-xs font-bold uppercase tracking-widest text-[#A8A08F]"
        >
          <RefreshCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </nav>

      <main className="max-w-7xl mx-auto pt-24 px-6 flex flex-col gap-8">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 opacity-50">
            <div className="w-8 h-8 border-2 border-[#C49A53] border-t-transparent rounded-full animate-spin mb-4"></div>
            <div className="text-xs font-mono uppercase tracking-widest text-[#A8A08F]">Processing Complex Telemetry...</div>
          </div>
        ) : error ? (
          <div className="bg-[#24231F] border border-red-500/30 p-8 rounded text-center max-w-2xl mx-auto w-full">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <div className="text-red-400 font-bold uppercase tracking-widest text-lg mb-2">Analytics Engine Error</div>
            <div className="text-[#E7E1D5] text-sm mt-2 p-4 bg-[#111110] rounded border border-red-500/20">{error}</div>
            <button 
              onClick={fetchData}
              className="mt-6 px-6 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded text-xs font-bold uppercase tracking-widest transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* AI INSIGHTS CARD */}
            <div className="relative overflow-hidden rounded-lg border border-[#8470A5]/30 bg-gradient-to-br from-[#161614] to-[#0A0A09] p-8 shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#8470A5]/5 blur-[100px] rounded-full pointer-events-none"></div>
              
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-12 h-12 bg-[#8470A5]/10 rounded border border-[#8470A5]/30 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-[#8470A5]" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-lg font-black tracking-widest uppercase text-[#8470A5]">Gemini AI Synthesis</h2>
                    {insights?.status === "insufficient_data" && (
                       <span className="px-2 py-0.5 bg-[#24231F] border border-[#3B3A35] text-[9px] uppercase font-bold tracking-widest text-[#A8A08F]">Waiting for more ticks...</span>
                    )}
                  </div>
                  
                  {insights?.narrative ? (
                    <div className="text-[#E7E1D5] leading-relaxed text-sm whitespace-pre-wrap font-serif opacity-90">
                      {insights.narrative}
                    </div>
                  ) : (
                    <div className="text-[#A8A08F] text-sm font-mono">No AI narrative generated yet. Wait for society to develop.</div>
                  )}
                </div>
              </div>

              {/* STATISTICAL READOUTS (ANOVA & TIME SERIES) */}
              {insights?.statistics && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-8 border-t border-[#3B3A35]/50">
                  <div className="flex flex-col gap-1">
                    <div className="text-[10px] uppercase font-black tracking-widest text-[#A8A08F]">Asabiyyah Volatility</div>
                    <div className="text-2xl font-mono text-[#E7E1D5]">{insights.statistics.time_series?.asabiyyah_volatility || "0.00"}</div>
                    <div className="text-[10px] text-[#A8A08F]">Std Dev over {insights.statistics.time_series?.ticks_analyzed || 0} ticks</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="text-[10px] uppercase font-black tracking-widest text-[#A8A08F]">Population Trend</div>
                    <div className={`text-2xl font-mono ${insights.statistics.time_series?.population_trend > 0 ? 'text-[#7A8A58]' : insights.statistics.time_series?.population_trend < 0 ? 'text-red-400' : 'text-[#E7E1D5]'}`}>
                      {insights.statistics.time_series?.population_trend > 0 ? '+' : ''}{insights.statistics.time_series?.population_trend || 0}
                    </div>
                    <div className="text-[10px] text-[#A8A08F]">Net growth over epoch</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="text-[10px] uppercase font-black tracking-widest text-[#A8A08F]">Role vs Health ANOVA</div>
                    <div className="text-sm font-mono text-[#E7E1D5] break-words mt-1">{insights.statistics.anova?.conclusion || "N/A"}</div>
                    {insights.statistics.anova?.f_statistic && (
                       <div className="text-[10px] text-[#A8A08F] mt-1">F={insights.statistics.anova.f_statistic} | p={insights.statistics.anova.p_value}</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* GRAPHS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* ASABIYYAH TREND */}
              <div className="bg-[#111110] border border-[#3B3A35] rounded p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Activity className="w-4 h-4 text-[#C49A53]" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#A8A08F]">Social Cohesion (Asabiyyah)</h3>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#24231F" vertical={false} />
                      <XAxis dataKey="tick" stroke="#A8A08F" fontSize={10} tickFormatter={(val) => `T${val}`} />
                      <YAxis stroke="#A8A08F" fontSize={10} domain={[0, 1]} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#111110', borderColor: '#3B3A35', color: '#E7E1D5' }} />
                      <Line type="monotone" dataKey="asabiyyah" stroke="#C49A53" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ROLE DISTRIBUTION */}
              <div className="bg-[#111110] border border-[#3B3A35] rounded p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Users className="w-4 h-4 text-[#6C8BC4]" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#A8A08F]">Role Demographics</h3>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#24231F" vertical={false} />
                      <XAxis dataKey="tick" stroke="#A8A08F" fontSize={10} />
                      <YAxis stroke="#A8A08F" fontSize={10} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#111110', borderColor: '#3B3A35', color: '#E7E1D5' }} />
                      <Area type="monotone" dataKey="farmer" stackId="1" stroke="#7A8A58" fill="#7A8A58" />
                      <Area type="monotone" dataKey="priest" stackId="1" stroke="#8470A5" fill="#8470A5" />
                      <Area type="monotone" dataKey="soldier" stackId="1" stroke="#D35F5F" fill="#D35F5F" />
                      <Area type="monotone" dataKey="wanderer" stackId="1" stroke="#A8A08F" fill="#A8A08F" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* RESOURCE DEPLETION */}
              <div className="bg-[#111110] border border-[#3B3A35] rounded p-6 col-span-1 lg:col-span-2">
                <div className="flex items-center gap-2 mb-6">
                  <Database className="w-4 h-4 text-[#7A8A58]" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#A8A08F]">Common Pool Resources (CPR)</h3>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#24231F" vertical={false} />
                      <XAxis dataKey="tick" stroke="#A8A08F" fontSize={10} />
                      <YAxis stroke="#A8A08F" fontSize={10} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#111110', borderColor: '#3B3A35', color: '#E7E1D5' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', color: '#A8A08F' }} />
                      <Line type="monotone" dataKey="cpr_wood" stroke="#7A8A58" strokeWidth={2} dot={false} name="Wood" />
                      <Line type="monotone" dataKey="cpr_water" stroke="#6C8BC4" strokeWidth={2} dot={false} name="Water" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </>
        )}
      </main>
    </div>
  );
}
