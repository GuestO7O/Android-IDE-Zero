import React, { useState, useEffect, useRef } from 'react';
import { Search, Command as CommandIcon, Terminal, Bot, Settings, FilePlus, FolderPlus, Palette, Eye, EyeOff } from 'lucide-react';
import { IDECommand } from '../types';

interface CommandPaletteProps {
  isVisible: boolean;
  onClose: () => void;
  commands: IDECommand[];
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isVisible, onClose, commands }) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(search.toLowerCase()) ||
    cmd.category.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (isVisible) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isVisible]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center pt-[10vh] px-4 pointer-events-none">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
      <div 
        className="w-full max-w-2xl glassmorphism rounded-xl border border-slate-700 shadow-2xl overflow-hidden pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-200"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center px-4 py-3 border-b border-slate-800 bg-slate-900/50">
          <Search size={18} className="text-slate-500 mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder:text-slate-600"
            placeholder="Search commands (e.g. 'toggle', 'ai', 'file')..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="flex items-center space-x-1 ml-3 px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800 text-[10px] text-slate-400 font-mono">
            <span>ESC</span>
          </div>
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto py-2 no-scrollbar">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, idx) => (
              <div
                key={cmd.id}
                className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors ${idx === selectedIndex ? 'bg-blue-600 text-white' : 'hover:bg-slate-800/50 text-slate-300'}`}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => {
                  cmd.action();
                  onClose();
                }}
              >
                <div className="flex items-center space-x-3">
                  <span className={`text-[10px] uppercase font-black px-1.5 rounded ${idx === selectedIndex ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500'}`}>
                    {cmd.category}
                  </span>
                  <span className="text-sm font-medium">{cmd.label}</span>
                </div>
                {cmd.shortcut && (
                  <span className={`text-[10px] font-mono ${idx === selectedIndex ? 'text-white/70' : 'text-slate-500'}`}>
                    {cmd.shortcut}
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-slate-500 text-xs italic">
              No matching commands found for "{search}"
            </div>
          )}
        </div>
        
        <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between text-[10px] text-slate-600">
          <div className="flex items-center space-x-4">
            <span className="flex items-center"><ChevronDown size={10} className="mr-1" /><ChevronUp size={10} className="mr-1" /> Navigate</span>
            <span className="flex items-center"><CornerDownLeft size={10} className="mr-1" /> Execute</span>
          </div>
          <div className="flex items-center">
            <Bot size={10} className="mr-1 text-blue-500" />
            <span>Agent Zero Command Hub</span>
          </div>
        </div>
      </div>
    </div>
  );
};

import { ChevronDown, ChevronUp, CornerDownLeft } from 'lucide-react';

export default CommandPalette;
