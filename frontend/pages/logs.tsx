import Head from 'next/head';
import Link from 'next/link';
import { useTelemetry } from '../stores/useTelemetry';

export default function LogsPage() {
 const { centralLogs, connected } = useTelemetry();

 return (
 <div className="h-screen bg-[#050505] text-[#E7E1D5] p-8 font-sans flex flex-col">
 <Head>
 <title>Project Doxa - Agent Logs</title>
 </Head>

 <div className="max-w-6xl mx-auto w-full flex flex-col flex-grow space-y-6 overflow-hidden">
 <div className="flex justify-between items-center pb-4 border-b-4 border-[#3B3A35]">
 <h1 className="text-3xl font-black tracking-widest uppercase">AGENT ACTIVITY LOGS</h1>
 <div className="flex items-center space-x-4">
 <div className={`px-3 py-1 border border-[#3B3A35] text-sm font-bold ${connected ? 'bg-[#7A8A58] text-white' : 'bg-[#B95D3D] text-white'}`}>
 {connected ? 'CONNECTED' : 'DISCONNECTED'}
 </div>
 <Link href="/" className="px-4 py-2 bg-[#1A1A18] border border-[#3B3A35] hover: text-[#E7E1D5] font-bold uppercase transition-all">
 Back to Dashboard
 </Link>
 </div>
 </div>

 <div className="bg-[#1A1A18] border border-[#3B3A35] p-6 text-base overflow-y-auto space-y-4 font-mono flex-grow custom-scrollbar pb-8">
 {!centralLogs || centralLogs.length === 0 ? (
 <div className="text-[#A8A08F] font-bold flex items-center justify-center h-full uppercase tracking-wider">
 Waiting for agent activity...
 </div>
 ) : (
 centralLogs.map((log, i) => (
 <div key={i} className="border-b border-[#3B3A35] pb-4 flex flex-col gap-2">
 <div className="flex justify-between items-center text-[#E7E1D5] font-black">
 <span className="text-lg">[{log.tick}] <span className="text-[#6C8BC4]">{log.agent_id}</span></span>
 <span className="bg-[#7A8A58] text-white px-3 py-1 border border-[#3B3A35] text-xs uppercase tracking-widest">{log.action}</span>
 </div>
 <p className="text-[#A8A08F] leading-relaxed italic border-l-4 border-[#B95D3D] pl-4 mt-1 whitespace-pre-wrap">
 {log.reasoning}
 </p>
 </div>
 ))
 )}
 </div>
 </div>
 </div>
 );
}
