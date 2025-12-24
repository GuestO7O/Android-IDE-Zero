import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PanelView, LogMessage, Snippet, EditorSettings, FileHistoryEntry, TerminalTab, Task } from '../types';
import { X, Terminal, Bot, Send, Play, Mic, MicOff, Image as ImageIcon, CheckCircle, Video, Film, ExternalLink, Key, MapPin, Download, Wand2, Hash, Settings, Palette, Plus, Trash, Copy, Clipboard, BrainCircuit, ScanSearch, FileType as FileTypeIcon, Indent, Zap, History, Video as VideoIcon, Music, Ghost, RotateCcw, Volume2, PlusSquare, Layout, Square, Terminal as TerminalIcon, Command, Trash2 } from 'lucide-react';
import { generateCodeResponse, decodeBase64, decodeAudioData, generateTTS } from '../services/geminiService';

interface BottomPanelProps {
  isVisible: boolean;
  activeView: PanelView;
  onToggle: () => void;
  onViewChange: (view: PanelView) => void;
  logs: LogMessage[];
  currentFileContext: string;
  onCodeGenerated: (code: string) => void;
  editorSettings: EditorSettings;
  onSettingsChange: (settings: Partial<EditorSettings>) => void;
  snippets: Snippet[];
  onAddSnippet: (s: Snippet) => void;
  onDeleteSnippet: (id: string) => void;
  fileHistory: FileHistoryEntry[];
  onRevert: (content: string) => void;
  onTerminalLog: (log: LogMessage) => void;
  onPasteToEditor?: (text: string) => void;
  tasks?: Task[];
}

const BottomPanel: React.FC<BottomPanelProps> = ({ 
  isVisible, 
  activeView, 
  onToggle, 
  onViewChange,
  logs,
  currentFileContext,
  onCodeGenerated,
  editorSettings,
  onSettingsChange,
  snippets,
  onAddSnippet,
  onDeleteSnippet,
  fileHistory,
  onRevert,
  onTerminalLog,
  onPasteToEditor,
  tasks = []
}) => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [useThinking, setUseThinking] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Terminal State
  const [terminalTabs, setTerminalTabs] = useState<TerminalTab[]>([
    { id: 'bash-1', name: 'main bash', logs: [], history: [] }
  ]);
  const [activeTermId, setActiveTermId] = useState('bash-1');
  const [termInput, setTermInput] = useState('');

  // Alias Management State
  const [newAliasKey, setNewAliasKey] = useState('');
  const [newAliasValue, setNewAliasValue] = useState('');

  const currentTerm = terminalTabs.find(t => t.id === activeTermId) || terminalTabs[0];

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentTerm.logs, activeView, isVisible, logs]);

  const addLogToCurrentTerm = useCallback((text: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const log: LogMessage = {
      id: Date.now().toString(),
      source: 'Terminal',
      text,
      timestamp: Date.now(),
      type
    };
    setTerminalTabs(prev => prev.map(t => t.id === activeTermId ? { ...t, logs: [...t.logs, log] } : t));
  }, [activeTermId]);

  const runProjectTask = (taskName: string) => {
    const task = tasks.find(t => t.name === taskName);
    if (!task) {
      addLogToCurrentTerm(`Taak niet gevonden: ${taskName}`, 'error');
      return;
    }
    addLogToCurrentTerm(`Start taak: ${task.name}...`, 'warning');
    // Simulate task execution with micro-delays
    const cmdParts = task.command.split(';').map(p => p.trim());
    cmdParts.forEach((p, idx) => {
      setTimeout(() => {
        addLogToCurrentTerm(`[EXEC] ${p.replace(/echo\s+['"](.*)['"]/, '$1')}`, 'success');
      }, (idx + 1) * 600);
    });
  };

  const handleTermSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!termInput.trim()) return;

    let cmd = termInput.trim();
    addLogToCurrentTerm(`jwP@zero-ide:~$ ${cmd}`, 'info');
    setTermInput('');

    // Expand Aliases
    const parts = cmd.split(' ');
    const potentialAlias = parts[0].toLowerCase();
    if (editorSettings.terminalAliases?.[potentialAlias]) {
      const aliasValue = editorSettings.terminalAliases[potentialAlias];
      addLogToCurrentTerm(`[ALIAS] Expanding '${potentialAlias}' to '${aliasValue}'`, 'warning');
      cmd = aliasValue + (parts.length > 1 ? ' ' + parts.slice(1).join(' ') : '');
    }

    const lowerCmd = cmd.toLowerCase();
    const finalParts = lowerCmd.split(' ');
    
    if (finalParts[0] === 'help') {
      addLogToCurrentTerm("Beschikbare commando's:\n  help      - Toon hulp\n  run <task> - Voer taak uit uit tasks.json\n  tasks     - Lijst met taken\n  ls        - Bestanden overzicht\n  clear     - Buffer wissen\n  neofetch  - Systeem info\n  alias     - Toon actieve aliassen");
    } else if (finalParts[0] === 'run') {
      if (finalParts[1]) runProjectTask(finalParts[1]);
      else addLogToCurrentTerm("Gebruik: run <task-naam>", 'error');
    } else if (finalParts[0] === 'tasks') {
      addLogToCurrentTerm("Taken:\n" + tasks.map(t => `  - ${t.name}: ${t.description || 'Geen omschrijving'}`).join('\n'));
    } else if (finalParts[0] === 'alias') {
      const aliasList = Object.entries(editorSettings.terminalAliases || {})
        .map(([k, v]) => `  ${k} -> ${v}`)
        .join('\n');
      addLogToCurrentTerm("Actieve Aliassen:\n" + (aliasList || "  Geen aliassen geconfigureerd."));
    } else if (finalParts[0] === 'clear') {
      setTerminalTabs(prev => prev.map(t => t.id === activeTermId ? { ...t, logs: [] } : t));
    } else if (finalParts[0] === 'ls') {
      addLogToCurrentTerm("Project/  src/  README.md  node_modules/  tasks.json  .env  package.json", 'success');
    } else if (finalParts[0] === 'neofetch') {
      addLogToCurrentTerm(`            
   .---.    JwP@Zero-IDE
  /     \\   ------------
  | O O |   OS: Zero-DH Matrix v2.3
  \\  ^  /   Model: Gemini-3-Pro-Preview
   '---'    CPU: Quantum Neural Engine
            Uptime: ${Math.floor(performance.now() / 60000)}m
            Memory: 32K Thinking Budget
            Aliases: ${Object.keys(editorSettings.terminalAliases || {}).length} active
      `, 'success');
    } else {
      addLogToCurrentTerm(`Onbekend commando: ${finalParts[0]}. Typ 'help'.`, 'error');
    }
  };

  const addNewTab = () => {
    const id = `term-${Date.now()}`;
    setTerminalTabs([...terminalTabs, { id, name: `bash ${terminalTabs.length + 1}`, logs: [], history: [] }]);
    setActiveTermId(id);
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (terminalTabs.length === 1) return;
    const filtered = terminalTabs.filter(t => t.id !== id);
    setTerminalTabs(filtered);
    if (activeTermId === id) setActiveTermId(filtered[0].id);
  };

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: LogMessage = {
      id: Date.now().toString(),
      source: 'User',
      text: input,
      timestamp: Date.now(),
      type: 'info'
    };
    onTerminalLog(userMsg);
    setInput('');
    setIsProcessing(true);

    try {
      const response = await generateCodeResponse(input, currentFileContext, true, useThinking);
      const aiMsg: LogMessage = {
        id: (Date.now() + 1).toString(),
        source: 'Agent Zero',
        text: response.text,
        timestamp: Date.now(),
        type: 'success',
        groundingUrls: response.urls
      };
      onTerminalLog(aiMsg);
    } catch (err) {
      onTerminalLog({ id: Date.now().toString(), source: 'System', text: "Cognitieve protocolfout.", timestamp: Date.now(), type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const playSpeech = async (text: string) => {
    const base64 = await generateTTS(text);
    if (base64) {
      const ctx = new AudioContext();
      const buffer = await decodeAudioData(decodeBase64(base64), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
    }
  };

  const handleAddAlias = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAliasKey.trim() || !newAliasValue.trim()) return;
    const nextAliases = { ...editorSettings.terminalAliases, [newAliasKey.trim().toLowerCase()]: newAliasValue.trim() };
    onSettingsChange({ terminalAliases: nextAliases });
    setNewAliasKey('');
    setNewAliasValue('');
  };

  const handleRemoveAlias = (key: string) => {
    const nextAliases = { ...editorSettings.terminalAliases };
    delete nextAliases[key];
    onSettingsChange({ terminalAliases: nextAliases });
  };

  if (!isVisible) return null;

  return (
    <div className="h-full flex flex-col bg-vscode-panel border-t border-slate-800 text-vscode-text glassmorphism shadow-2xl relative">
      <div className="flex items-center justify-between px-2 bg-slate-900/50 border-b border-slate-800 h-10 shrink-0">
        <div className="flex space-x-1 h-full overflow-x-auto no-scrollbar">
          {[
            { id: PanelView.TERMINAL, icon: Terminal, label: 'Terminal' },
            { id: PanelView.AI_CHAT, icon: Bot, label: 'Agent Zero' },
            { id: PanelView.HISTORY, icon: History, label: 'Tijdlijn' },
            { id: PanelView.SETTINGS, icon: Settings, label: 'Instellingen' },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => onViewChange(tab.id as PanelView)}
              className={`flex items-center space-x-2 text-[11px] uppercase tracking-wider px-4 transition-all ${activeView === tab.id ? 'bg-slate-800 text-white border-b-2 border-blue-500 font-bold' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <tab.icon size={14} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        <button onClick={onToggle} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={16} /></button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeView === PanelView.TERMINAL && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center px-2 py-1 space-x-1 bg-slate-950/80 border-b border-slate-800 shrink-0">
              {terminalTabs.map(t => (
                <div 
                  key={t.id}
                  onClick={() => setActiveTermId(t.id)}
                  className={`flex items-center px-3 py-1 space-x-2 rounded-t-lg text-[10px] cursor-pointer transition-all ${activeTermId === t.id ? 'bg-slate-900 text-blue-400 border-b border-blue-500' : 'text-slate-600 hover:bg-slate-900/50'}`}
                >
                  <TerminalIcon size={12} />
                  <span className="truncate max-w-[100px]">{t.name}</span>
                  <X size={10} className="hover:text-red-500" onClick={(e) => closeTab(t.id, e)} />
                </div>
              ))}
              <button onClick={addNewTab} className="p-1 text-slate-500 hover:text-blue-400"><Plus size={14} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed space-y-1 bg-black/40 text-slate-300">
              {currentTerm.logs.map(log => (
                <div key={log.id} className="flex space-x-2">
                  <span className={log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : log.type === 'warning' ? 'text-yellow-400' : 'text-blue-400'}>
                    {log.text}
                  </span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
            <form onSubmit={handleTermSubmit} className="p-3 bg-slate-950 border-t border-slate-800 flex items-center">
              <span className="text-blue-500 font-bold mr-2 text-xs">jwP@zero-ide:~$</span>
              <input 
                type="text" 
                value={termInput}
                onChange={e => setTermInput(e.target.value)}
                className="flex-1 bg-transparent outline-none text-xs text-white font-mono placeholder-slate-700"
                placeholder="Voer commando uit... (help)"
                autoFocus
              />
            </form>
          </div>
        )}

        {activeView === PanelView.AI_CHAT && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 font-mono text-sm space-y-6 bg-slate-950/30">
              {logs.filter(l => l.source === 'Agent Zero' || l.source === 'User').map(log => (
                <div key={log.id} className="flex flex-col space-y-2 group animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between opacity-50 text-[10px] uppercase tracking-tighter">
                    <div className="flex items-center space-x-2">
                      <span className={log.source === 'Agent Zero' ? 'text-blue-400 font-black' : 'text-slate-400'}>{log.source}</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    {log.source === 'Agent Zero' && (
                      <button onClick={() => playSpeech(log.text)} className="hover:text-blue-400"><Volume2 size={14} /></button>
                    )}
                  </div>
                  <div className={`p-4 rounded-xl border ${log.source === 'Agent Zero' ? 'bg-slate-900/80 border-blue-900/50 shadow-blue-900/20 shadow-lg' : 'bg-slate-800/30 border-slate-700/50'} whitespace-pre-wrap leading-relaxed text-slate-200`}>
                    {log.text}
                    {log.groundingUrls && log.groundingUrls.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-slate-800">
                        {log.groundingUrls.map((u, i) => (
                          <a key={i} href={u.uri} target="_blank" className="text-[10px] px-2 py-1 bg-blue-900/30 text-blue-400 rounded-md border border-blue-800 hover:bg-blue-800 transition-colors flex items-center space-x-1">
                            {u.type === 'maps' ? <MapPin size={10} /> : <ExternalLink size={10} />}
                            <span>{u.title}</span>
                          </a>
                        ))}
                      </div>
                    )}
                    {log.text.includes('```') && (
                      <div className="mt-3 flex space-x-2">
                        <button 
                          onClick={() => {
                            const code = log.text.match(/```(?:\w+)?\n([\s\S]*?)\n```/)?.[1];
                            if (code) onCodeGenerated(code);
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500 transition-all active:scale-95 flex items-center space-x-2"
                        >
                          <Zap size={14} />
                          <span>Injecteer Code</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="flex items-center space-x-3 text-blue-400 animate-pulse p-2">
                  <BrainCircuit size={20} className="animate-spin-slow" />
                  <span className="text-xs font-black uppercase tracking-widest">{useThinking ? 'Agent Zero Thinking (32K Token Matrix)...' : 'Agent Zero Analyzing...'}</span>
                </div>
              )}
              <div ref={logsEndRef} />
            </div>
            
            <div className="p-4 border-t border-slate-800 bg-slate-900/80">
              <div className="flex items-center justify-between mb-3">
                <button 
                  onClick={() => setUseThinking(!useThinking)}
                  className={`flex items-center space-x-2 px-3 py-1 rounded-full text-[10px] font-bold transition-all ${useThinking ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}
                >
                  <BrainCircuit size={12} />
                  <span>Thinking Mode {useThinking ? 'Engaged' : 'Idle'}</span>
                </button>
              </div>
              <form onSubmit={handleAiSubmit} className="flex items-center space-x-3">
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Commando naar Agent Zero..."
                    className="w-full bg-slate-950 border border-slate-800 px-5 py-3 rounded-2xl outline-none focus:border-blue-500 text-sm shadow-inner text-white"
                    disabled={isProcessing}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isProcessing || !input.trim()}
                  className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-500 disabled:opacity-30 transition-all active:scale-90 shadow-lg shadow-blue-900/40"
                >
                  <Send size={22} />
                </button>
              </form>
            </div>
          </div>
        )}

        {activeView === PanelView.SETTINGS && (
          <div className="flex-1 p-6 space-y-8 overflow-y-auto bg-slate-950/20">
            {/* Terminal Aliases Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-blue-400">
                <Command size={18} />
                <h3 className="font-bold tracking-tight uppercase text-xs">Terminal Aliassen</h3>
              </div>
              
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-4">
                <form onSubmit={handleAddAlias} className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Alias (bijv. 'b')" 
                    value={newAliasKey}
                    onChange={e => setNewAliasKey(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                  />
                  <input 
                    type="text" 
                    placeholder="Commando (bijv. 'run build')" 
                    value={newAliasValue}
                    onChange={e => setNewAliasValue(e.target.value)}
                    className="flex-[2] bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                  />
                  <button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-all"
                    disabled={!newAliasKey.trim() || !newAliasValue.trim()}
                  >
                    <PlusSquare size={18} />
                  </button>
                </form>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 no-scrollbar">
                  {Object.entries(editorSettings.terminalAliases || {}).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between bg-slate-950/50 p-2 rounded-lg border border-slate-800/50 group">
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-400 font-bold text-xs">{key}</span>
                        <span className="text-slate-500 text-[10px]">→</span>
                        <span className="text-slate-300 text-xs italic">{val}</span>
                      </div>
                      <button 
                        onClick={() => handleRemoveAlias(key)}
                        className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {Object.keys(editorSettings.terminalAliases || {}).length === 0 && (
                    <p className="text-[10px] text-slate-600 italic text-center py-2">Geen aliassen gedefinieerd.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-blue-400">
                <Palette size={18} />
                <h3 className="font-bold tracking-tight uppercase text-xs">Visuele Matrix</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { id: 'default', name: 'Dark Zero', color: '#030712' },
                  { id: 'light', name: 'Bright Zero', color: '#f8fafc' },
                ].map(t => (
                  <button 
                    key={t.id} onClick={() => onSettingsChange({ theme: t.id })}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center space-y-2 ${editorSettings.theme === t.id ? 'border-blue-500 bg-blue-500/5 scale-105' : 'border-slate-800 hover:border-slate-600'}`}
                  >
                    <div className="w-8 h-8 rounded-full border border-slate-700 shadow-lg" style={{ backgroundColor: t.color }}></div>
                    <span className="text-[10px] font-bold uppercase">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BottomPanel;
