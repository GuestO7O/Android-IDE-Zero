import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FileNode, FileType, PanelView, LogMessage, Snippet, EditorSettings, FileHistoryEntry, Task, IDECommand } from './types';
import { INITIAL_FILE_SYSTEM } from './constants';
import Sidebar from './components/Sidebar';
import EditorComponent from './components/Editor';
import BottomPanel from './components/BottomPanel';
import CommandPalette from './components/CommandPalette';
// Added CommandIcon alias for the Command icon from lucide-react
import { Menu, Play, TerminalSquare, Sparkles, Command as CommandIcon } from 'lucide-react';

function App() {
  // Layout State
  const [isSidebarVisible, setSidebarVisible] = useState(true);
  const [isBottomPanelVisible, setBottomPanelVisible] = useState(true);
  const [isCommandPaletteVisible, setIsCommandPaletteVisible] = useState(false);
  
  // Editor & Theme State
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(() => {
    const saved = localStorage.getItem('zero_editor_settings');
    const defaultSettings: EditorSettings = {
      theme: 'default',
      tabSize: 2,
      indentStyle: 'spaces',
      aiAutocomplete: true,
      terminalAliases: {
        'b': 'run build',
        't': 'run test',
        'd': 'run deploy',
        'nf': 'neofetch'
      }
    };
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaultSettings, ...parsed };
    }
    return defaultSettings;
  });
  
  // Content State
  const [files, setFiles] = useState<FileNode[]>(INITIAL_FILE_SYSTEM);
  const [activeTab, setActiveTab] = useState<string | null>('main_ts');
  const [openFiles, setOpenFiles] = useState<Map<string, string>>(new Map());
  const [panelView, setPanelView] = useState<PanelView>(PanelView.AI_CHAT);
  const [clipboard, setClipboard] = useState<FileNode | null>(null);

  // File History State
  const [fileHistory, setFileHistory] = useState<Record<string, FileHistoryEntry[]>>(() => {
    const saved = localStorage.getItem('zero_file_history');
    return saved ? JSON.parse(saved) : {};
  });
  
  // Snippets
  const [snippets, setSnippets] = useState<Snippet[]>(() => {
    const saved = localStorage.getItem('zero_snippets');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'React Component', code: 'import React from "react";\n\nexport const MyComp = () => {\n  return <div>Hello</div>;\n};', language: 'javascript' }
    ];
  });

  const [logs, setLogs] = useState<LogMessage[]>([
      { id: '1', source: 'System', text: 'Zero-IDE Brain Operational.', timestamp: Date.now(), type: 'info' },
      { id: '2', source: 'Agent Zero', text: 'Directive accepted. JwP Environment Synchronized.', timestamp: Date.now(), type: 'success' }
  ]);

  // JwP Directive: Implement Layout Toggles
  const toggleSidebar = () => setSidebarVisible(!isSidebarVisible);
  const toggleBottomPanel = () => setBottomPanelVisible(!isBottomPanelVisible);
  const toggleCommandPalette = () => setIsCommandPaletteVisible(!isCommandPaletteVisible);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+P for Command Palette
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        toggleCommandPalette();
      }
      // Ctrl+B for Sidebar
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
      // Ctrl+` for Terminal
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        toggleBottomPanel();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isSidebarVisible, isBottomPanelVisible, isCommandPaletteVisible]);

  useEffect(() => {
    const initialMap = new Map();
    const traverse = (nodes: FileNode[]) => {
      nodes.forEach(node => {
        if (node.type === FileType.FILE) {
          initialMap.set(node.id, node.content || '');
        }
        if (node.children) traverse(node.children);
      });
    };
    traverse(files);
    setOpenFiles(initialMap);
  }, []);

  useEffect(() => {
    localStorage.setItem('zero_snippets', JSON.stringify(snippets));
  }, [snippets]);

  useEffect(() => {
    localStorage.setItem('zero_editor_settings', JSON.stringify(editorSettings));
    document.body.className = `theme-${editorSettings.theme}`;
  }, [editorSettings]);

  useEffect(() => {
    localStorage.setItem('zero_file_history', JSON.stringify(fileHistory));
  }, [fileHistory]);

  const findFile = (id: string, nodes: FileNode[]): FileNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findFile(id, node.children);
        if (found) return found;
      }
    }
    return null;
  };

  const activeFileNode = activeTab ? findFile(activeTab, files) : null;

  const handleFileSelect = (file: FileNode) => {
    if (file.type === FileType.FILE) {
      setActiveTab(file.id);
      if (window.innerWidth < 768) setSidebarVisible(false);
    }
  };

  const saveToHistory = useCallback((fileId: string, content: string) => {
    setFileHistory(prev => {
      const history = prev[fileId] || [];
      if (history.length > 0 && history[history.length - 1].content === content) {
        return prev;
      }
      const newEntry: FileHistoryEntry = { content, timestamp: Date.now() };
      return { ...prev, [fileId]: [...history, newEntry].slice(-50) };
    });
  }, []);

  const historyTimeoutRef = useRef<Record<string, any>>({});

  const handleEditorChange = (value: string | undefined) => {
    if (activeTab && value !== undefined) {
      setOpenFiles(prev => {
        const next = new Map(prev);
        next.set(activeTab, value);
        return next;
      });

      if (historyTimeoutRef.current[activeTab]) {
        clearTimeout(historyTimeoutRef.current[activeTab]);
      }
      historyTimeoutRef.current[activeTab] = setTimeout(() => {
        saveToHistory(activeTab, value);
      }, 1000);
    }
  };

  const handleRevert = (fileId: string, content: string) => {
    setOpenFiles(prev => {
      const next = new Map(prev);
      next.set(fileId, content);
      return next;
    });
  };

  const handlePasteToEditor = (text: string) => {
    if (activeTab) {
      const currentContent = openFiles.get(activeTab) || '';
      const newContent = currentContent + "\n" + text;
      setOpenFiles(prev => {
        const next = new Map(prev);
        next.set(activeTab, newContent);
        return next;
      });
      saveToHistory(activeTab, newContent);
    }
  };

  const handleCodeGenerated = (code: string) => {
    if (activeTab) {
      setOpenFiles(prev => {
        const next = new Map(prev);
        next.set(activeTab, code);
        return next;
      });
      saveToHistory(activeTab, code);
    }
  };

  // --- File System Operations ---
  const handleAddNode = (parentId: string | null, type: FileType) => {
    const name = window.prompt(`Enter ${type.toLowerCase()} name:`);
    if (!name) return;
    const newNodeId = Math.random().toString(36).substr(2, 9);
    const newNode: FileNode = {
      id: newNodeId,
      name,
      type,
      parentId,
      children: type === FileType.FOLDER ? [] : undefined,
      content: '',
      language: name.split('.').pop() || 'typescript'
    };
    const updateRecursive = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(n => {
        if (n.id === parentId) return { ...n, children: [...(n.children || []), newNode] };
        if (n.children) return { ...n, children: updateRecursive(n.children) };
        return n;
      });
    };
    setFiles(prev => updateRecursive(prev));
    if (type === FileType.FILE) {
      setOpenFiles(prev => new Map(prev).set(newNodeId, ''));
      setActiveTab(newNodeId);
      saveToHistory(newNodeId, '');
    }
  };

  const handleDeleteNode = (nodeId: string) => {
    const node = findFile(nodeId, files);
    if (!node || !window.confirm(`Delete ${node.name}?`)) return;
    const removeRecursive = (nodes: FileNode[]): FileNode[] => {
      return nodes.filter(n => n.id !== nodeId).map(n => ({
        ...n,
        children: n.children ? removeRecursive(n.children) : undefined
      }));
    };
    setFiles(prev => removeRecursive(prev));
    if (activeTab === nodeId) setActiveTab(null);
  };

  const handleCopyNode = (nodeId: string) => {
    const node = findFile(nodeId, files);
    if (node) setClipboard(node);
  };

  const handlePasteNode = (parentId: string | null) => {
    if (!clipboard) return;
    const duplicateNode = (node: FileNode, newParent: string | null): FileNode => {
      const newId = Math.random().toString(36).substr(2, 9);
      const duplicated = {
        ...node,
        id: newId,
        parentId: newParent,
        name: node.name + '_copy',
        children: node.children ? node.children.map(c => duplicateNode(c, newId)) : undefined
      };
      if (node.type === FileType.FILE) {
        setOpenFiles(prev => new Map(prev).set(newId, openFiles.get(node.id) || ''));
        saveToHistory(newId, openFiles.get(node.id) || '');
      }
      return duplicated;
    };
    const newNode = duplicateNode(clipboard, parentId);
    const updateRecursive = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(n => {
        if (n.id === parentId) return { ...n, children: [...(n.children || []), newNode] };
        if (n.children) return { ...n, children: updateRecursive(n.children) };
        return n;
      });
    };
    setFiles(prev => updateRecursive(prev));
  };

  // Memoized Commands Registry
  const ideCommands = useMemo<IDECommand[]>(() => [
    { id: 'sidebar.toggle', label: 'Sidebar: Toggle Visibility', category: 'View', action: toggleSidebar, shortcut: 'Ctrl+B' },
    { id: 'panel.toggle', label: 'Panel: Toggle Visibility', category: 'View', action: toggleBottomPanel, shortcut: 'Ctrl+`' },
    { id: 'file.newFile', label: 'File: New File', category: 'File', action: () => handleAddNode(null, FileType.FILE) },
    { id: 'file.newFolder', label: 'File: New Folder', category: 'File', action: () => handleAddNode(null, FileType.FOLDER) },
    { id: 'view.chat', label: 'View: Open Agent Zero Chat', category: 'View', action: () => { setBottomPanelVisible(true); setPanelView(PanelView.AI_CHAT); } },
    { id: 'view.terminal', label: 'View: Open Terminal', category: 'View', action: () => { setBottomPanelVisible(true); setPanelView(PanelView.TERMINAL); } },
    { id: 'view.settings', label: 'View: Open Settings', category: 'View', action: () => { setBottomPanelVisible(true); setPanelView(PanelView.SETTINGS); } },
    { id: 'view.history', label: 'View: Open Timeline', category: 'View', action: () => { setBottomPanelVisible(true); setPanelView(PanelView.HISTORY); } },
    { id: 'theme.toggle', label: 'Theme: Toggle Light/Dark Mode', category: 'Settings', action: () => setEditorSettings(s => ({ ...s, theme: s.theme === 'light' ? 'default' : 'light' })) },
    { id: 'ai.toggleAutocomplete', label: 'AI: Toggle Autocomplete', category: 'Agent Zero', action: () => setEditorSettings(s => ({ ...s, aiAutocomplete: !s.aiAutocomplete })) },
  ], [isSidebarVisible, isBottomPanelVisible]);

  // Task Runner Integration
  const tasks = useMemo(() => {
    const tasksFile = findFile('tasks_json', files);
    if (!tasksFile) return [];
    try {
      const currentContent = openFiles.get('tasks_json') || tasksFile.content || '{}';
      const parsed = JSON.parse(currentContent);
      return (parsed.tasks || []) as Task[];
    } catch {
      return [];
    }
  }, [files, openFiles]);

  // Project Context for AI completion
  const projectContext = useMemo(() => {
    let context = "Files in project:\n";
    const traverse = (nodes: FileNode[], path: string = "") => {
      nodes.forEach(n => {
        const fullPath = path + n.name;
        if (n.type === FileType.FILE) {
          context += `- ${fullPath}\n`;
        } else if (n.children) {
          traverse(n.children, fullPath + "/");
        }
      });
    };
    traverse(files);
    return context;
  }, [files]);

  return (
    <div className="flex flex-col h-screen w-screen bg-vscode-bg text-vscode-text overflow-hidden font-sans selection:bg-vscode-accent selection:text-white">
      <CommandPalette 
        isVisible={isCommandPaletteVisible} 
        onClose={() => setIsCommandPaletteVisible(false)} 
        commands={ideCommands} 
      />

      <div className="h-12 flex items-center justify-between px-4 bg-vscode-activityBar border-b border-black shrink-0 z-30 shadow-md">
        <div className="flex items-center space-x-4">
           <button onClick={toggleSidebar} className="p-2 hover:bg-vscode-active/50 rounded-lg transition-colors">
             <Menu size={20} />
           </button>
           <div className="flex items-center space-x-2 cursor-pointer" onClick={toggleCommandPalette}>
             <Sparkles size={16} className="text-vscode-accent" />
             <span className="font-bold text-xs tracking-widest uppercase">Zero-IDE</span>
           </div>
           {activeFileNode && (
               <div className="bg-vscode-active/30 px-3 py-1 rounded-md text-[10px] border border-vscode-active flex items-center space-x-2">
                 <CommandIcon size={10} />
                 <span>{activeFileNode.name}</span>
               </div>
           )}
        </div>
        <div className="flex items-center space-x-2">
           <button onClick={toggleCommandPalette} className="p-2 text-slate-400 hover:text-white rounded-lg transition-all" title="Command Palette (Ctrl+Shift+P)">
             <CommandIcon size={18} />
           </button>
           <button className="p-2 text-green-500 hover:bg-vscode-active/50 rounded-lg transition-all active:scale-90">
             <Play size={18} fill="currentColor" />
           </button>
           <button onClick={toggleBottomPanel} className={`p-2 hover:bg-vscode-active/50 rounded-lg transition-all ${isBottomPanelVisible ? 'text-vscode-accent' : 'text-gray-500'}`}>
             <TerminalSquare size={20} />
           </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <div className={`absolute md:static z-20 h-full transition-all duration-300 ease-in-out ${isSidebarVisible ? 'translate-x-0 w-full sm:w-[280px]' : '-translate-x-full w-0 md:hidden'}`}>
            {isSidebarVisible && (
                <Sidebar 
                    files={files} onFileSelect={handleFileSelect} selectedFileId={activeTab || undefined}
                    width={window.innerWidth < 768 ? window.innerWidth : 280}
                    onAddFile={(p) => handleAddNode(p, FileType.FILE)} onAddFolder={(p) => handleAddNode(p, FileType.FOLDER)}
                    onDeleteNode={handleDeleteNode} onCopyNode={handleCopyNode} onPasteNode={handlePasteNode} hasClipboard={!!clipboard}
                />
            )}
        </div>

        {isSidebarVisible && window.innerWidth < 768 && (
            <div className="absolute inset-0 bg-black/40 z-10 backdrop-blur-[2px]" onClick={() => setSidebarVisible(false)}></div>
        )}

        <div className="flex-1 flex flex-col bg-vscode-bg min-w-0">
          {activeTab && activeFileNode ? (
             <EditorComponent 
               fileId={activeTab}
               fileName={activeFileNode.name}
               fileContent={openFiles.get(activeTab) || ''} 
               language={activeFileNode.language || 'javascript'} 
               onChange={handleEditorChange}
               theme={editorSettings.theme === 'light' ? 'vs-light' : 'vs-dark'}
               tabSize={editorSettings.tabSize}
               insertSpaces={editorSettings.indentStyle === 'spaces'}
               aiAutocomplete={editorSettings.aiAutocomplete}
               projectContext={projectContext}
             />
          ) : (
             <div className="flex items-center justify-center h-full text-gray-500 flex-col space-y-6 animate-in fade-in zoom-in">
                <div className="w-32 h-32 rounded-full border border-vscode-active flex items-center justify-center bg-vscode-active/10">
                   <Sparkles size={64} className="text-vscode-accent opacity-20" />
                </div>
                <div className="text-center">
                  <h2 className="text-xl font-bold tracking-tighter text-white uppercase">Ready for JwP</h2>
                  <p className="text-xs tracking-widest text-gray-600 mt-1 uppercase">Select artifact to begin orchestration</p>
                </div>
             </div>
          )}
        </div>
      </div>

      {isBottomPanelVisible && (
        <div className="shrink-0 z-30 shadow-2xl transition-all duration-300 ease-in-out" style={{ height: window.innerWidth < 768 ? '60%' : '320px' }}>
           <BottomPanel 
             isVisible={isBottomPanelVisible} activeView={panelView} onToggle={toggleBottomPanel} onViewChange={setPanelView}
             logs={logs} currentFileContext={activeTab ? (openFiles.get(activeTab) || '') : ''} onCodeGenerated={handleCodeGenerated}
             editorSettings={editorSettings} onSettingsChange={(s) => setEditorSettings(prev => ({...prev, ...s}))}
             snippets={snippets} onAddSnippet={(s) => setSnippets([...snippets, s])} onDeleteSnippet={(id) => setSnippets(snippets.filter(s => s.id !== id))}
             fileHistory={activeTab ? (fileHistory[activeTab] || []) : []} onRevert={(content) => activeTab && handleRevert(activeTab, content)}
             onTerminalLog={(log) => setLogs(prev => [...prev, log])} onPasteToEditor={handlePasteToEditor} tasks={tasks}
           />
        </div>
      )}
    </div>
  );
}

export default App;
