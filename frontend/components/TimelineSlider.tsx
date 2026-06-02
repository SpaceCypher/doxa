import React, { useState, useEffect } from 'react';
import { useTelemetry } from '../stores/useTelemetry';
import { Play, Pause, ChevronDown, SkipBack, SkipForward, ChevronLeft, ChevronRight } from 'lucide-react';

interface TimelineSliderProps {
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onScrub?: (tick: number | null) => void;
}

export const TimelineSlider: React.FC<TimelineSliderProps> = ({ isRunning, onStart, onPause, onReset, onScrub }) => {
  const history = useTelemetry((state) => state.history);
  const currentTick = useTelemetry((state) => state.tick);
  const centralLogs = useTelemetry((state) => state.centralLogs);
  
  const [scrubValue, setScrubValue] = useState<number | null>(null);

  const maxTick = history.length > 0 ? history[history.length - 1].tick : currentTick;
  const minTick = history.length > 0 ? history[0].tick : 0;

  const displayTick = scrubValue !== null ? scrubValue : currentTick;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setScrubValue(val);
    if (onScrub) onScrub(val);
  };

  const handleRelease = () => {
    // Optional: snap to live on release
  };

  const jumpToLive = () => {
    setScrubValue(null);
    if (onScrub) onScrub(null);
  };

  const togglePlay = () => {
    if (isRunning) {
      onPause();
    } else {
      onStart();
    }
  };

  return (
    <div className="w-full h-full flex items-center px-4 gap-4 relative z-50">
      
      {/* Left: Play/Pause & Speed */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button 
          onClick={togglePlay}
          className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${isRunning ? 'bg-[#7DBB5A]/20 text-[#7DBB5A] border border-[#7DBB5A]/50' : 'bg-[#1A1A18] text-[#A8A08F] border border-[#3B3A35] hover:bg-[#3B3A35]'}`}
          title={isRunning ? "Pause" : "Play"}
        >
          {isRunning ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
        </button>
        <div className="flex items-center gap-1 bg-[#0A0A09] border border-[#3B3A35] px-1.5 h-7 rounded cursor-not-allowed opacity-80" title="Playback speed">
          <span className="text-[10px] font-bold text-[#E7E1D5]">1x</span>
          <ChevronDown className="w-3 h-3 text-[#A8A08F]" />
        </div>
      </div>

      {/* Center: Timeline Rail & Inline Badges */}
      <div className="flex-1 flex items-center gap-3 h-full">
        <span className="text-[9px] font-mono text-[#A8A08F] bg-[#1A1A18] px-1.5 py-0.5 rounded border border-[#3B3A35] flex-shrink-0" title="History Start">
          {minTick}
        </span>
        
        <div className="flex-1 relative flex items-center group h-full">
          <input 
            type="range" 
            min={minTick} 
            max={maxTick} 
            value={displayTick}
            onChange={handleSliderChange}
            onMouseUp={handleRelease}
            onTouchEnd={handleRelease}
            className="w-full h-0.5 bg-[#3B3A35] appearance-none cursor-pointer rounded-full relative z-10 custom-slider transition-all group-hover:h-1"
          />
        </div>

        <span className="text-[9px] font-mono text-[#E7E1D5] bg-[#1A1A18] px-1.5 py-0.5 rounded border border-[#3B3A35] flex-shrink-0" title="Current Tick">
          {maxTick}
        </span>
        <span className={`text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded border flex-shrink-0 ${scrubValue !== null ? 'border-[#B95D3D] text-[#B95D3D] bg-[#B95D3D]/10' : 'border-[#7DBB5A] text-[#7DBB5A] bg-[#7DBB5A]/10'}`}>
          {scrubValue !== null ? `PAUSED: ${displayTick}` : `LIVE: ${displayTick}`}
        </span>
      </div>

      {/* Right: Skip Controls */}
      <div className="flex items-center gap-0.5 border border-[#3B3A35] rounded bg-[#0A0A09] p-0.5 h-7 flex-shrink-0">
        <button className="w-6 h-6 flex items-center justify-center text-[#A8A08F] hover:text-[#E7E1D5] hover:bg-[#1A1A18] rounded transition-colors" title="Skip to Start">
          <SkipBack className="w-3 h-3" />
        </button>
        <button className="w-6 h-6 flex items-center justify-center text-[#A8A08F] hover:text-[#E7E1D5] hover:bg-[#1A1A18] rounded transition-colors" title="Step Back">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button className="w-6 h-6 flex items-center justify-center text-[#A8A08F] hover:text-[#E7E1D5] hover:bg-[#1A1A18] rounded transition-colors" title="Step Forward">
          <ChevronRight className="w-4 h-4" />
        </button>
        <button onClick={jumpToLive} className="w-6 h-6 flex items-center justify-center text-[#A8A08F] hover:text-[#E7E1D5] hover:bg-[#1A1A18] rounded transition-colors" title="Jump to Live">
          <SkipForward className="w-3 h-3" />
        </button>
      </div>

      <style jsx>{`
        .custom-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #7DBB5A;
          cursor: pointer;
        }
        .custom-slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #7DBB5A;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
};
