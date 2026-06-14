import React, { useState, useEffect } from 'react';
import { Key, X } from 'lucide-react';

interface ApiKeyModalProps {
  onClose: () => void;
  isOpen: boolean;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onClose, isOpen }) => {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const key = localStorage.getItem('doxa_api_key');
    if (key) setApiKey(key);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (apiKey) {
      localStorage.setItem('doxa_api_key', apiKey);
    } else {
      localStorage.removeItem('doxa_api_key');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#111110] border border-[#3B3A35] rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3B3A35] bg-[#0A0A09]">
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-[#C49A53]" />
            <h2 className="text-xl font-black uppercase tracking-widest text-[#E7E1D5]">API Setup</h2>
          </div>
          <button onClick={onClose} className="p-2 text-[#A8A08F] hover:text-white transition-colors rounded hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-[#A8A08F] text-sm leading-relaxed">
            Project Doxa requires an <strong className="text-[#E7E1D5]">API Key</strong> to power the agents' LLM cognition. Your key is stored locally in your browser.
          </p>
          <p className="text-[#A8A08F] text-xs bg-[#1A1A18] p-3 rounded border border-[#3B3A35]">
            If you don't have a key, get it from <a href="https://openrouter.ai/" target="_blank" rel="noopener noreferrer" className="text-[#C49A53] hover:underline font-bold">https://openrouter.ai/</a>
          </p>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#6B6458]">Provider API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-[#1A1A18] border border-[#3B3A35] rounded-lg px-4 py-3 text-sm text-[#E7E1D5] focus:outline-none focus:border-[#C49A53] transition-colors"
              placeholder="sk-or-v1-..."
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-[#3B3A35] bg-[#0A0A09] flex justify-end">
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-[#C49A53] hover:bg-[#d4aa63] text-[#111110] font-black uppercase tracking-widest text-sm transition-colors rounded"
          >
            Save Key & Close
          </button>
        </div>
      </div>
    </div>
  );
};
