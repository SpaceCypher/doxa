import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipIconProps {
  title: string;
  description: string;
}

export const TooltipIcon: React.FC<TooltipIconProps> = ({ title, description }) => {
  const [show, setShow] = useState(false);

  return (
    <div 
      className="relative inline-flex items-center justify-center ml-1 z-50 cursor-help"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <HelpCircle className="w-3.5 h-3.5 text-[#8470A5] opacity-70 hover:opacity-100 transition-opacity" />
      
      {show && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-[#1A1A18] border border-[#3B3A35] shadow-xl rounded pointer-events-none">
          <div className="text-[#C49A53] font-black uppercase text-[10px] tracking-widest mb-1 border-b border-[#3B3A35] pb-1">
            {title}
          </div>
          <div className="text-[#E7E1D5] text-xs leading-tight">
            {description}
          </div>
          {/* Caret */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-[#3B3A35]"></div>
        </div>
      )}
    </div>
  );
};
