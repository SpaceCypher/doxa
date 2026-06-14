import { BACKEND_URL } from "../utils/api";
import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Users, Database, Globe, Play, Square, RefreshCcw, Activity, ChevronDown, Map as MapIcon, ShieldAlert, LineChart, Sparkles, X, Wifi, WifiOff, Swords, Pause, RotateCcw, Zap, MonitorPlay, Droplets, TreePine, Apple, Heart, Battery, List, ChevronUp, Terminal, Settings, HelpCircle, Filter, BarChart3, Key } from 'lucide-react';
import CanvasGrid from '../components/CanvasGrid';
import { TelemetryChart } from '../components/TelemetryChart';
import { TimelineSlider } from '../components/TimelineSlider';
import { DemiurgicLayer } from '../components/DemiurgicLayer';
import LorePanel from '../components/LorePanel';
import { useTelemetry } from '../stores/useTelemetry';
import { TooltipIcon } from '../components/TooltipIcon';
import { HowToPlayModal } from '../components/HowToPlayModal';
import { ApiKeyModal } from '../components/ApiKeyModal';
import { getSessionId } from '../utils/session';

export default function Home() {
  const { tick, asabiyyah, agents, connected, cpr, centralLogs, setFocusedAgent, world_seed, trackedAgentId, setTrackedAgentId } = useTelemetry();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isInitializingWorld, setIsInitializingWorld] = useState(false);
  const wasInitializingRef = useRef(false);

  // When agents arrive for the first time after genesis, dismiss loading overlay and mark as running
  useEffect(() => {
    // wasInitializingRef guards against persisted agent data triggering this on mount
    if (wasInitializingRef.current && agents && agents.length > 0) {
      setIsInitializingWorld(false);
      setIsRunning(true);
      wasInitializingRef.current = false;
    }
  }, [agents]);

  // Wrapper: arming setIsInitializingWorld wipes persisted agent data + primes the ref watcher
  const armInitializingWorld = (val: boolean) => {
    if (val) {
      // Clear any persisted agents from previous session so the effect
      // only fires on FRESH agents arriving from the new genesis WebSocket payload
      useTelemetry.setState({ agents: [], world_map: [], world_seed: null, tick: 0 });
    }
    wasInitializingRef.current = val;
    setIsInitializingWorld(val);
  };

  // UI State toggles
  const [isGenesisOpen, setIsGenesisOpen] = useState(false);
  const [activeSlideout, setActiveSlideout] = useState<'none' | 'directory' | 'telemetry' | 'culture'>('none');
  const [showLegend, setShowLegend] = useState(false);
  const [isActivityFeedExpanded, setIsActivityFeedExpanded] = useState(true);
  const [activityLogFilter, setActivityLogFilter] = useState<string[]>([]);
  const [showActivityFilter, setShowActivityFilter] = useState(false);
  const [showTrackAgentDropdown, setShowTrackAgentDropdown] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // Auto-show tutorial or API key modal on first visit
  useEffect(() => {
    const isHidden = localStorage.getItem('doxa_hide_tutorial') === 'true';
    if (!isHidden) {
      setShowHowToPlay(true);
    } else {
      const apiKey = localStorage.getItem('doxa_api_key');
      if (!apiKey) {
        setShowApiKeyModal(true);
      }
    }
  }, []);

  const logsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTo({
        top: logsContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [centralLogs, isActivityFeedExpanded]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const sessionId = getSessionId();
        const res = await fetch(`${BACKEND_URL}/api/session/status?session_id=${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setIsRunning(data.is_running);
        }
      } catch (e) {}
    };
    fetchStatus();
    const statusInterval = setInterval(fetchStatus, 2000);
    return () => clearInterval(statusInterval);
  }, []);



  const startSimulation = async () => {
    if (isProcessing) return;
    // ── BYOK gate ─────────────────────────────────────────────────────
    const apiKey = localStorage.getItem('doxa_api_key');
    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }
    // ──────────────────────────────────────────────────────────────────
    setIsProcessing(true);
    armInitializingWorld(true);
    try {
      const sessionId = getSessionId();
      await fetch(`${BACKEND_URL}/api/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          session_id: sessionId,
          api_key: apiKey
        })
      });
      // Don't set isRunning here — the agent-arrival effect will do it
    } catch (e) {
      // On failure, dismiss overlay immediately
      armInitializingWorld(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const pauseSimulation = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const sessionId = getSessionId();
      await fetch(`${BACKEND_URL}/api/session/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      });
      setIsRunning(false);
    } catch (e) {} finally {
      setIsProcessing(false);
    }
  };

  const resetSimulation = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    useTelemetry.setState({ centralLogs: [] });
    try {
      const sessionId = getSessionId();
      await fetch(`${BACKEND_URL}/api/session/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      });
      setIsRunning(false);
    } catch (e) {} finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-screen h-screen bg-[#050505] text-[#E7E1D5] font-sans relative overflow-hidden flex flex-col">
      <Head>
        <title>Project Doxa - Operating System</title>
      </Head>

      {/* 1. MAP = THE ENTIRE APPLICATION */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#1A1A18 1px, transparent 1px), linear-gradient(90deg, #1A1A18 1px, transparent 1px)', backgroundSize: '50px 50px', opacity: 0.3 }}></div>
        <div className="w-full h-full relative">
          <CanvasGrid />
        </div>
      </div>

      {/* 1.5. WORLD INITIALIZATION OVERLAY */}
      {isInitializingWorld && (
        <div className="absolute inset-0 z-[35] bg-[#050505]/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <Globe className="w-16 h-16 text-[#7A8A58] animate-pulse mb-6" />
          <h2 className="text-2xl font-black uppercase tracking-[0.3em] text-[#E7E1D5] mb-2 text-center">Initializing World</h2>
          <p className="text-[#A8A08F] text-xs max-w-md text-center font-mono">
            Generating geographical matrices via multidimensional noise fractals...<br/>
            This requires ~15 seconds of compute. Do not refresh.
          </p>
          <div className="mt-8 flex items-center justify-center gap-1">
            <div className="w-2 h-2 bg-[#7A8A58] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-[#7A8A58] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-[#7A8A58] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      )}

      {/* RESPONSIVE TOP HEADER */}
      <div className="absolute top-4 left-4 right-8 z-20 pointer-events-none flex justify-between items-start gap-4">
        
        {/* LEFT COMPONENT: LOGO BADGE */}
        <div className="pointer-events-auto flex items-center gap-3 bg-[#111110]/95 backdrop-blur border border-[#3B3A35] p-2 pr-4 rounded shadow-2xl shrink-0">
          <div className="w-10 h-10 rounded flex items-center justify-center border border-[#3B3A35] bg-[#050505]">
            <Globe className="w-6 h-6 text-[#E7E1D5]" />
          </div>
          <div className="flex flex-col justify-center pr-4 border-r border-[#3B3A35]">
            <h1 className="text-base font-black uppercase tracking-widest text-[#E7E1D5] leading-none mb-1">Project Doxa</h1>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                {connected ? <Wifi className="w-3 h-3 text-[#7A8A58] animate-pulse" /> : <WifiOff className="w-3 h-3 text-[#B95D3D]" />}
                <div className="flex flex-col gap-0">
                  <span className={`text-[9px] font-bold tracking-widest uppercase ${connected ? 'text-[#7A8A58]' : 'text-[#B95D3D]'}`}>
                    {connected ? 'LINK ESTABLISHED' : 'LINK SEVERED'}
                  </span>
                  {!connected && (
                    <span className="text-[8px] font-bold tracking-widest uppercase text-[#B95D3D] opacity-70 animate-pulse">
                      RECONNECTING...
                    </span>
                  )}
                </div>
              </div>
              {world_seed !== null && (
                <span className="text-[9px] font-mono tracking-widest text-[#C49A53] pl-5">
                  SEED: {world_seed}
                </span>
              )}
            </div>
          </div>
          <Link 
            href="/logs"
            target="_blank"
            className="flex flex-col items-center justify-center px-1 hover:text-[#C49A53] transition-colors text-[#A8A08F] group"
            title="Open System Logs"
          >
            <Activity className="w-4 h-4 mb-0.5 group-hover:scale-110 transition-transform" />
            <span className="text-[7px] font-black uppercase tracking-widest text-center leading-tight">System<br/>Logs</span>
          </Link>
        </div>

        {/* CENTER COMPONENT: COMMAND BAR & GENESIS */}
        <div className="pointer-events-auto flex items-center gap-4 shrink-0">
          <button 
            onClick={() => setIsGenesisOpen(true)}
            className="bg-[#111110]/95 backdrop-blur border border-[#C49A53] text-[#C49A53] hover:bg-[#C49A53] hover:text-[#111110] h-10 px-4 font-bold uppercase tracking-widest text-xs flex items-center gap-2 rounded shadow-2xl transition-all"
          >
            <Settings className="w-4 h-4" /> Genesis
          </button>
          <div className="flex items-center bg-[#111110]/95 backdrop-blur border border-[#3B3A35] rounded shadow-2xl overflow-hidden h-10">
            <button 
              onClick={startSimulation}
              disabled={isProcessing || isRunning}
              className="h-full px-5 font-bold uppercase text-xs flex items-center gap-2 transition-all border-r border-[#3B3A35] bg-[#050505] hover:bg-[#7A8A58] hover:text-[#111110] disabled:opacity-50 text-[#7A8A58]"
            >
              {isRunning ? <><Activity className="w-4 h-4" /> Running</> : <><Play className="w-4 h-4" /> Start</>}
            </button>
            <button 
              onClick={pauseSimulation}
              disabled={isProcessing || !isRunning}
              className="h-full px-5 font-bold uppercase text-xs flex items-center gap-2 transition-all border-r border-[#3B3A35] bg-[#050505] hover:bg-[#B95D3D] hover:text-[#111110] disabled:opacity-50 text-[#B95D3D]"
            >
              <Pause className="w-4 h-4" /> Pause
            </button>
            <button 
              onClick={resetSimulation}
              disabled={isProcessing}
              className="h-full px-5 font-bold uppercase text-xs flex items-center gap-2 transition-all bg-[#050505] hover:bg-[#E7E1D5] hover:text-[#111110] disabled:opacity-50 text-[#A8A08F]"
            >
              <RotateCcw className="w-4 h-4" /> Hard Reset
            </button>
          </div>
        </div>

        {/* RIGHT COMPONENT: OVERLAY TOGGLES */}
        <div className="pointer-events-auto flex bg-[#111110]/95 backdrop-blur border border-[#3B3A35] rounded shadow-2xl overflow-hidden h-10 shrink-0">
          <button 
            disabled={isInitializingWorld}
            onClick={() => setActiveSlideout(activeSlideout === 'directory' ? 'none' : 'directory')}
            className={`px-4 font-bold uppercase tracking-widest text-xs flex items-center gap-2 transition-all border-r border-[#3B3A35] disabled:opacity-50 disabled:cursor-not-allowed ${activeSlideout === 'directory' ? 'bg-[#E7E1D5] text-[#111110]' : 'text-[#A8A08F] hover:bg-[#1A1A18] hover:text-white'}`}
          >
            <Users className="w-4 h-4" /> Directory
          </button>
          <button 
            disabled={isInitializingWorld}
            onClick={() => setActiveSlideout(activeSlideout === 'telemetry' ? 'none' : 'telemetry')}
            className={`px-4 font-bold uppercase tracking-widest text-xs flex items-center gap-2 transition-all border-r border-[#3B3A35] disabled:opacity-50 disabled:cursor-not-allowed ${activeSlideout === 'telemetry' ? 'bg-[#E7E1D5] text-[#111110]' : 'text-[#A8A08F] hover:bg-[#1A1A18] hover:text-white'}`}
          >
            <Database className="w-4 h-4" /> Telemetry
          </button>
          <button 
            disabled={isInitializingWorld}
            onClick={() => setActiveSlideout(activeSlideout === 'culture' ? 'none' : 'culture')}
            className={`px-4 font-bold uppercase tracking-widest text-xs flex items-center gap-2 transition-all border-r border-[#3B3A35] disabled:opacity-50 disabled:cursor-not-allowed ${activeSlideout === 'culture' ? 'bg-[#E7E1D5] text-[#111110]' : 'text-[#A8A08F] hover:bg-[#1A1A18] hover:text-white'}`}
          >
            <Globe className="w-4 h-4" /> Culture
          </button>
          <button 
            disabled={isInitializingWorld}
            onClick={() => setShowLegend(!showLegend)}
            className={`px-4 font-bold uppercase tracking-widest text-xs flex items-center gap-2 transition-all border-r border-[#3B3A35] disabled:opacity-50 disabled:cursor-not-allowed ${showLegend ? 'bg-[#E7E1D5] text-[#111110]' : 'text-[#A8A08F] hover:bg-[#1A1A18] hover:text-white'}`}
          >
            <MapIcon className="w-4 h-4" /> Legend
          </button>
          <button 
            onClick={() => setShowHowToPlay(true)}
            className="px-4 font-bold uppercase tracking-widest text-xs flex items-center gap-2 transition-all text-[#C49A53] hover:bg-[#1A1A18] hover:text-[#c28e4e]"
          >
            <HelpCircle className="w-4 h-4" /> Guide
          </button>
        </div>
      </div>

      {/* 2.5 FLOATING ACTIVITY FEED */}
      <div className="absolute left-4 top-[96px] z-30 flex flex-col gap-2 pointer-events-auto">
        {/* Toggle Button & Filter */}
        <div className="flex items-center gap-2">
          <button 
            disabled={isInitializingWorld}
            onClick={() => setIsActivityFeedExpanded(!isActivityFeedExpanded)}
            className={`h-10 px-4 font-bold uppercase tracking-widest text-xs flex items-center gap-2 transition-all bg-[#111110]/95 backdrop-blur border border-[#3B3A35] rounded shadow-2xl flex-1 disabled:opacity-50 disabled:cursor-not-allowed ${isActivityFeedExpanded ? 'bg-[#E7E1D5] text-[#111110]' : 'text-[#A8A08F] hover:bg-[#1A1A18] hover:text-white'}`}
          >
            <Activity className="w-4 h-4" />
            Live Activity
            {isActivityFeedExpanded && <ChevronDown className="w-4 h-4 ml-auto" />}
          </button>
          
          {isActivityFeedExpanded && (
            <div className="relative">
              <button 
                onClick={() => setShowActivityFilter(!showActivityFilter)}
                className={`h-10 w-10 flex items-center justify-center bg-[#111110]/95 backdrop-blur border border-[#3B3A35] rounded shadow-2xl transition-all ${showActivityFilter || activityLogFilter.length > 0 ? 'bg-[#E7E1D5] text-[#111110]' : 'text-[#A8A08F] hover:bg-[#1A1A18] hover:text-white'}`}
              >
                <Filter className="w-4 h-4" />
              </button>
              
              {showActivityFilter && (
                <div className="absolute top-12 left-0 w-48 bg-[#111110]/95 backdrop-blur-md border border-[#3B3A35] rounded shadow-2xl overflow-hidden flex flex-col z-40">
                  <div className="px-3 py-2 border-b border-[#3B3A35] flex justify-between items-center bg-[#0A0A09]">
                    <span className="text-[10px] font-bold text-[#A8A08F] uppercase tracking-wider">Filter Logs</span>
                    <button onClick={() => setShowActivityFilter(false)} className="text-[#A8A08F] hover:text-white"><X className="w-3 h-3" /></button>
                  </div>
                  <div className="max-h-48 overflow-y-auto custom-scrollbar flex flex-col">
                    <button 
                      onClick={() => setActivityLogFilter([])}
                      className={`px-3 py-2 text-xs text-left hover:bg-[#1A1A18] ${activityLogFilter.length === 0 ? 'text-[#E7E1D5] font-bold bg-[#1A1A18]' : 'text-[#A8A08F]'}`}
                    >
                      ALL AGENTS
                    </button>
                    {Array.from(new Set(centralLogs.map(l => l.agent_id).filter(id => id !== 'SYSTEM'))).sort().map(agentId => (
                      <button 
                        key={agentId}
                        onClick={() => { 
                          setActivityLogFilter(prev => prev.includes(agentId) ? prev.filter(id => id !== agentId) : [...prev, agentId]); 
                        }}
                        className={`px-3 py-2 text-xs text-left hover:bg-[#1A1A18] font-mono ${activityLogFilter.includes(agentId) ? 'text-[#C49A53] font-bold bg-[#1A1A18]' : 'text-[#A8A08F]'}`}
                      >
                        {agentId}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Scrollable Event List */}
        {isActivityFeedExpanded && (
          <div className="w-[320px] h-[420px] bg-[#0A0A09]/95 backdrop-blur-md border border-[#3B3A35] rounded-lg shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2">
            <div ref={logsContainerRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-4">
              {centralLogs && centralLogs.length > 0 ? (
                centralLogs
                  .filter(log => activityLogFilter.length === 0 || activityLogFilter.includes(log.agent_id) || log.agent_id === 'SYSTEM')
                  .slice(-200).map((log, i) => {
                  const isWar = log.action.includes('ATTACK') || log.action.includes('FIGHT') || log.action.includes('WAR') || log.action.includes('SMITED');
                  const isAction = log.action.includes('FARM') || log.action.includes('GATHER') || log.action.includes('DRINK') || log.action.includes('BUILD') || log.action.includes('EAT');
                  const isTrade = log.action.includes('COMMUNICATE') || log.action.includes('BELIEF') || log.action.includes('TRADE');
                  const isSystem = log.action.includes('SPAWN') || log.action.includes('RESET');
                  const isSocial = log.action.includes('REPRODUCE') || log.action.includes('BIRTH');
                  
                  let colorClass = 'text-[#A8A08F]';
                  let icon = '•';
                  
                  if (isWar) { colorClass = 'text-[#FF4444]'; icon = '🔴'; }
                  else if (isAction) { colorClass = 'text-[#7DBB5A]'; icon = '🟢'; }
                  else if (isTrade) { colorClass = 'text-[#C4A053]'; icon = '🟡'; }
                  else if (isSocial) { colorClass = 'text-[#B86B52]'; icon = '🟣'; }
                  else if (isSystem) { colorClass = 'text-[#8D6AB0]'; icon = '⚪'; }

                  return (
                    <div key={i} className="flex flex-col text-sm transition-colors cursor-pointer group" onClick={() => setFocusedAgent(log.agent_id)}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 font-bold uppercase tracking-wide text-xs">
                          <span className="text-xs leading-none">{icon}</span>
                          <span className={colorClass}>{log.action}</span>
                          <span className="font-mono text-[#C49A53] font-bold text-xs group-hover:underline ml-1">{log.agent_id}</span>
                        </div>
                        <span className="font-mono text-[10px] text-[#A8A08F]">T{log.tick}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[#E7E1D5] text-xs leading-relaxed break-words opacity-80 group-hover:opacity-100 transition-opacity">{log.reasoning}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-[10px] font-bold text-[#A8A08F]/50 italic w-full h-full flex items-center justify-center">Awaiting events...</div>
              )}
            </div>
          </div>
        )}

        {/* TRACK AGENT BOX */}
        <div className="flex items-center gap-2 mt-2 animate-in fade-in slide-in-from-top-2">
          <div className={`h-10 px-4 font-bold uppercase tracking-widest text-xs flex items-center justify-between gap-2 transition-all bg-[#111110]/95 backdrop-blur border border-[#3B3A35] rounded shadow-2xl flex-1 ${trackedAgentId ? 'text-[#E7E1D5]' : 'text-[#A8A08F]'}`}>
            <div className="flex items-center gap-2">
              <MonitorPlay className={`w-4 h-4 ${trackedAgentId ? 'text-[#7DBB5A]' : 'text-[#C49A53]'}`} />
              {trackedAgentId ? <span>Tracking: <span className="text-[#C49A53]">{trackedAgentId}</span></span> : <span>Follow Camera</span>}
            </div>
            {trackedAgentId && (
              <button onClick={() => setTrackedAgentId(null)} className="text-[#FF4444] hover:text-white transition-colors" title="Stop Tracking">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setShowTrackAgentDropdown(!showTrackAgentDropdown)}
              className={`h-10 w-10 flex items-center justify-center bg-[#111110]/95 backdrop-blur border border-[#3B3A35] rounded shadow-2xl transition-all ${showTrackAgentDropdown ? 'bg-[#E7E1D5] text-[#111110]' : 'text-[#A8A08F] hover:bg-[#1A1A18] hover:text-white'}`}
              title="Select Agent to Track"
            >
              <Users className="w-4 h-4" />
            </button>
            
            {showTrackAgentDropdown && (
              <div className="absolute bottom-0 left-12 w-48 bg-[#111110]/95 backdrop-blur-md border border-[#3B3A35] rounded shadow-2xl overflow-hidden flex flex-col z-40">
                <div className="px-3 py-2 border-b border-[#3B3A35] flex justify-between items-center bg-[#0A0A09]">
                  <span className="text-[10px] font-bold text-[#A8A08F] uppercase tracking-wider">Agents</span>
                  <button onClick={() => setShowTrackAgentDropdown(false)} className="text-[#A8A08F] hover:text-white"><X className="w-3 h-3" /></button>
                </div>
                <div className="max-h-48 overflow-y-auto custom-scrollbar flex flex-col">
                  <button 
                    onClick={() => { setTrackedAgentId(null); setShowTrackAgentDropdown(false); }}
                    className={`px-3 py-2 text-xs text-left hover:bg-[#1A1A18] ${!trackedAgentId ? 'text-[#E7E1D5] font-bold bg-[#1A1A18]' : 'text-[#A8A08F]'}`}
                  >
                    NONE
                  </button>
                  {agents.map(a => (
                    <button 
                      key={a.id}
                      onClick={() => { setTrackedAgentId(a.id); setShowTrackAgentDropdown(false); }}
                      className={`px-3 py-2 text-xs text-left hover:bg-[#1A1A18] font-mono ${trackedAgentId === a.id ? 'text-[#C49A53] font-bold bg-[#1A1A18]' : 'text-[#A8A08F]'}`}
                    >
                      {a.id} <span className="opacity-50 text-[10px] font-sans">({a.civ})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* API KEY CONFIG BOX */}
        <div className="flex items-center gap-2 mt-2 animate-in fade-in slide-in-from-top-2">
          <button
            onClick={() => setShowApiKeyModal(true)}
            className="h-10 px-4 font-bold uppercase tracking-widest text-xs flex items-center gap-2 transition-all bg-[#111110]/95 backdrop-blur border border-[#3B3A35] rounded shadow-2xl flex-1 text-[#A8A08F] hover:bg-[#1A1A18] hover:text-white"
            title="Configure API Key"
          >
            <Key className="w-4 h-4 text-[#C49A53]" />
            <span>API Key Config</span>
          </button>
        </div>
      </div>

      {/* MAP LEGEND DROPDOWN */}
      {showLegend && (
        <div className="absolute top-20 right-4 z-30 bg-[#0A0A09]/95 backdrop-blur border border-[#3B3A35] p-4 rounded shadow-[0_10px_40px_rgba(0,0,0,0.8)] w-56 animate-in fade-in slide-in-from-top-2 text-sm font-bold text-[#E7E1D5]">
             <div className="flex flex-col gap-2">
               {/* Civs */}
               <div className="flex items-center justify-between w-full">
                 <div className="flex items-center gap-2">
                   <span className="w-3 h-3 rounded-full bg-[#6C8BC4] shadow-[0_0_8px_rgba(108,139,196,0.7)]"></span>
                   <span>Civ A</span>
                 </div>
                 <span className="text-[10px] font-mono text-[#A8A08F]">{agents?.filter((a: any) => a.civ === 'civ_a').length || 0} pop</span>
               </div>
               <div className="flex items-center justify-between w-full">
                 <div className="flex items-center gap-2">
                   <span className="w-3 h-3 rounded-full bg-[#8470A5] shadow-[0_0_8px_rgba(132,112,165,0.7)]"></span>
                   <span>Civ B</span>
                 </div>
                 <span className="text-[10px] font-mono text-[#A8A08F]">{agents?.filter((a: any) => a.civ === 'civ_b').length || 0} pop</span>
               </div>

               <hr className="border-[#3B3A35] my-0.5" />

               {/* Resources */}
               <div className="text-[9px] uppercase tracking-widest text-[#A8A08F] font-black mb-0.5">Resources</div>
               <div className="flex items-center gap-2">
                 <span className="w-3 h-3 rounded-full bg-[#FFA500] shadow-[0_0_6px_rgba(255,165,0,0.6)]"></span>
                 <span>Food</span>
               </div>
               <div className="flex items-center gap-2">
                 <span className="w-3 h-3 rounded-full bg-[#4E7A41] shadow-[0_0_6px_rgba(78,122,65,0.5)]"></span>
                 <span>Crop <span className="text-[9px] text-[#A8A08F]">(grows)</span></span>
               </div>
               <div className="flex items-center gap-2">
                 <span className="w-3 h-3 bg-[#B95D3D] shadow-[0_0_6px_rgba(185,93,61,0.5)]"></span>
                 <span>Wood</span>
               </div>
               <div className="flex items-center gap-2">
                 <span className="w-3 h-3 bg-[#60A5FA] shadow-[0_0_6px_rgba(96,165,250,0.5)]" style={{clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'}}></span>
                 <span>Water</span>
               </div>
               <div className="flex items-center gap-2">
                 <span className="w-3 h-3 rounded-full bg-[#FFD700] shadow-[0_0_8px_rgba(255,215,0,0.9)]"></span>
                 <span>Gold</span>
               </div>
               <div className="flex items-center gap-2">
                 <span className="w-3 h-3 bg-[#9CA3AF] shadow-[0_0_4px_rgba(156,163,175,0.5)]" style={{clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)'}}></span>
                 <span>Stone</span>
               </div>

               <hr className="border-[#3B3A35] my-0.5" />

               {/* Structures */}
               <div className="text-[9px] uppercase tracking-widest text-[#A8A08F] font-black mb-0.5">Structures</div>
               <div className="flex items-center gap-2">
                 <span className="w-3 h-3 bg-[#9370DB] shadow-[0_0_8px_rgba(147,112,219,0.8)]" style={{clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)'}}></span>
                 <span>Temple / Shrine</span>
               </div>
               <div className="flex items-center gap-2">
                 <span className="w-3 h-3 bg-[#8B0000] shadow-[0_0_8px_rgba(139,0,0,0.8)]" style={{clipPath: 'polygon(50% 0%, 95% 35%, 79% 91%, 21% 91%, 5% 35%)'}}></span>
                 <span>Barracks / Fort</span>
               </div>
               <div className="flex items-center gap-2">
                 <span className="w-3 h-3 bg-[#7DBB5A] shadow-[0_0_6px_rgba(125,187,90,0.6)]"></span>
                 <span>Granary / Farm</span>
               </div>
               <div className="flex items-center gap-2">
                 <span className="w-3 h-3 bg-[#C49A53] shadow-[0_0_6px_rgba(196,154,83,0.6)]"></span>
                 <span>Building</span>
               </div>

               <hr className="border-[#3B3A35] my-0.5" />

               {/* State rings */}
               <div className="text-[9px] uppercase tracking-widest text-[#A8A08F] font-black mb-0.5">Agent State Rings</div>
               <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                 <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#FF4444]"></span><span className="text-[10px]">Attack</span></div>
                 <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#7DBB5A]"></span><span className="text-[10px]">Farm</span></div>
                 <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#C49A53]"></span><span className="text-[10px]">Build</span></div>
                 <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#5AB8C4]"></span><span className="text-[10px]">Speak</span></div>
                 <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#D4A44C]"></span><span className="text-[10px]">Gather</span></div>
                 <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#A8D48A]"></span><span className="text-[10px]">Trade</span></div>
                 <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#C084FC]"></span><span className="text-[10px]">Belief</span></div>
                 <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#FB923C]"></span><span className="text-[10px]">Eat</span></div>
               </div>

               <hr className="border-[#3B3A35] my-0.5" />

               <div className="flex items-center gap-2">
                 <Swords className="w-3.5 h-3.5 text-[#FF4444]" />
                 <span>At War <span className="text-[9px] text-[#A8A08F]">(dashed line)</span></span>
               </div>
             </div>
          </div>
        )}

      {/* 5. AGENT DIRECTORY MODAL */}
      {activeSlideout === 'directory' && (
        <div className="absolute inset-0 z-[50] bg-[#050505]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-[600px] h-[500px] max-w-full max-h-[90vh] bg-[#111110] border border-[#3B3A35] rounded shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-[#3B3A35] bg-[#0A0A09]">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#E7E1D5] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#7A8A58]" /> Agent Directory
              </h3>
              <button onClick={() => setActiveSlideout('none')} className="text-[#A8A08F] hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {agents && agents.length > 0 ? agents.map((a: any) => (
                  <Link key={a.id} href={`/agent/${a.id}`} className="bg-[#050505] border border-[#3B3A35] p-3 flex flex-col gap-2 hover:border-[#7A8A58] transition-all rounded">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-[#E7E1D5] truncate">Agent {a.id}</span>
                      <span className="text-[9px] font-black uppercase text-[#A8A08F] tracking-widest px-2 py-0.5 border border-[#3B3A35] rounded-full">Civ {a.civ}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#A8A08F]">
                      <div className="flex gap-3">
                        <span className="flex items-center gap-1.5"><span className="text-[10px] uppercase font-bold text-[#A8A08F]/70">Food</span> <span className="text-[#C49A53] font-mono">{a.inventory?.food ?? 0}</span></span>
                        <span className="flex items-center gap-1.5"><span className="text-[10px] uppercase font-bold text-[#A8A08F]/70">Wood</span> <span className="text-[#7DBB5A] font-mono">{a.inventory?.wood ?? 0}</span></span>
                        <span className="flex items-center gap-1.5"><span className="text-[10px] uppercase font-bold text-[#A8A08F]/70">Water</span> <span className="text-[#6C8BC4] font-mono">{a.inventory?.water ?? 0}</span></span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-[#E7E1D5] opacity-60">Inspect &gt;</span>
                    </div>
                  </Link>
                )) : (
                  <div className="text-xs font-bold text-[#A8A08F] p-4 text-center italic col-span-full">No active agents.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. SLIDE-OUT: TELEMETRY (RIGHT) */}
      <div className={`absolute top-20 right-4 bottom-32 w-[420px] bg-[#111110]/95 backdrop-blur border border-[#3B3A35] rounded shadow-2xl transition-transform duration-300 z-20 flex flex-col ${activeSlideout === 'telemetry' ? 'translate-x-0' : 'translate-x-[120%]'}`}>
        <div className="flex justify-between items-center p-4 border-b border-[#3B3A35] bg-[#0A0A09]">
          <h2 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-[#E7E1D5]">
            <Database className="w-4 h-4 text-[#7A8A58]" /> System Telemetry
          </h2>
          <button onClick={() => setActiveSlideout('none')} className="text-[#A8A08F] hover:text-white"><X className="w-4 h-4"/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 custom-scrollbar">
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#050505] border border-[#3B3A35] p-3 flex flex-col items-center rounded">
              <span className="text-[10px] font-black uppercase text-[#A8A08F] tracking-widest mb-1 flex items-center gap-1">
                <Users className="w-3 h-3 text-[#7A8A58]" /> Population
              </span>
              <span className="text-2xl font-black text-[#E7E1D5]">{agents.length}</span>
            </div>
            <div className="bg-[#050505] border border-[#3B3A35] p-3 flex flex-col items-center rounded">
              <span className="text-[10px] font-black uppercase text-[#A8A08F] tracking-widest mb-1 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-[#B95D3D]" /> At War
              </span>
              <span className="text-2xl font-black text-[#E7E1D5]">{Object.keys(cpr?.war_state || {}).length}</span>
            </div>
          </div>

          <div className="bg-[#050505] border border-[#3B3A35] p-4 rounded">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#A8A08F] mb-3 border-b border-[#3B3A35] pb-2">Resource Breakdown</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-2 font-bold"><span className="w-2 h-2 bg-[#7DBB5A]"></span> Food</span>
                <span className="font-mono text-[#E7E1D5]">{cpr?.resources?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-2 font-bold"><span className="w-2 h-2 bg-[#C49A53]"></span> Wood</span>
                <span className="font-mono text-[#E7E1D5]">{cpr?.wood || 0}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-2 font-bold"><span className="w-2 h-2 bg-[#5AB8C4]"></span> Water</span>
                <span className="font-mono text-[#E7E1D5]">{cpr?.water || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#050505] border border-[#3B3A35] p-4 rounded">
            <div className="flex justify-between text-xs font-bold uppercase mb-2">
              <span className="flex items-center gap-1 text-[#A8A08F]">
                Asabiyyah Index
                <TooltipIcon title="Asabiyyah" description="A measure of social cohesion and solidarity. High values indicate a strong, unified civilization." />
              </span>
              <span className="font-mono text-[#E7E1D5]">
                {typeof asabiyyah === 'number' ? asabiyyah.toFixed(2) : Object.values(asabiyyah).reduce((a:any, b:any) => a + b, 0).toFixed(2)}
              </span>
            </div>
            <div className="h-1.5 bg-[#111110] rounded-none overflow-hidden border border-[#3B3A35]">
              <div className="h-full bg-[#8D6AB0] transition-all duration-500" style={{ width: `${Math.min(100, (typeof asabiyyah === 'number' ? asabiyyah : Object.values(asabiyyah).reduce((a:any, b:any) => a + b, 0)) * 100)}%` }}></div>
            </div>
          </div>

          <div className="flex-1 min-h-[200px] bg-[#050505] border border-[#3B3A35] p-3 flex flex-col rounded">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#A8A08F] mb-2 flex items-center gap-1">
              <LineChart className="w-3 h-3 text-[#7A8A58]"/> Historical Trend
            </h3>
            <div className="flex-1 w-full relative">
               <TelemetryChart />
            </div>
          </div>

        </div>
      </div>

      {/* SLIDE-OUT: CULTURE (RIGHT) */}
      <div className={`absolute top-20 right-4 bottom-32 w-[420px] bg-[#111110]/95 backdrop-blur border border-[#3B3A35] rounded shadow-2xl transition-transform duration-300 z-20 flex flex-col ${activeSlideout === 'culture' ? 'translate-x-0' : 'translate-x-[120%]'}`}>
        <div className="flex justify-between items-center p-4 border-b border-[#3B3A35] bg-[#0A0A09]">
          <h2 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-[#E7E1D5]">
            <Globe className="w-4 h-4 text-[#C49A53]" /> Cultural Records
          </h2>
          <button onClick={() => setActiveSlideout('none')} className="text-[#A8A08F] hover:text-white"><X className="w-4 h-4"/></button>
        </div>
        <div className="flex-1 overflow-hidden p-0">
          <LorePanel civId="civ_a" />
        </div>
      </div>

      {/* 7. GENESIS MODAL */}
      {isGenesisOpen && (
        <div className="absolute inset-0 z-[60] bg-[#050505]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-[#111110] border border-[#3B3A35] rounded-lg shadow-2xl relative">
            <button 
              onClick={() => setIsGenesisOpen(false)}
              className="absolute top-4 right-4 text-[#A8A08F] hover:text-white z-10 bg-[#1A1A18] p-1.5 rounded border border-[#3B3A35] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <DemiurgicLayer 
              onClose={() => setIsGenesisOpen(false)} 
              isRunning={isRunning} 
              setIsInitializingWorld={armInitializingWorld}
              onNeedApiKey={() => { setIsGenesisOpen(false); setShowApiKeyModal(true); }}
            />
          </div>
        </div>
      )}

      {/* COMMAND DECK: TIMELINE */}
      <div className="absolute bottom-4 left-4 right-4 z-30 flex flex-col bg-[#111110]/95 backdrop-blur border border-[#3B3A35] rounded shadow-[0_20px_60px_rgba(0,0,0,0.8)] pointer-events-auto h-[48px] overflow-hidden">
        <TimelineSlider 
          isRunning={isRunning} 
          onStart={startSimulation} 
          onPause={pauseSimulation} 
          onReset={resetSimulation} 
        />
      </div>

      {/* Guide / How to Play Modal */}
      {showHowToPlay && (
        <HowToPlayModal onClose={() => {
          setShowHowToPlay(false);
          if (!localStorage.getItem('doxa_api_key')) {
            setShowApiKeyModal(true);
          }
        }} />
      )}

      <ApiKeyModal 
        isOpen={showApiKeyModal} 
        onClose={() => setShowApiKeyModal(false)} 
      />
    </div>
  );
}
