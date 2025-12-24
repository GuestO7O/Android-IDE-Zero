export enum FileType {
  FILE = 'FILE',
  FOLDER = 'FOLDER'
}

export interface FileNode {
  id: string;
  name: string;
  type: FileType;
  content?: string; // Only for files
  language?: string; // language for syntax highlighting
  isOpen?: boolean;
  children?: FileNode[]; // Only for folders
  parentId?: string | null;
}

export interface Tab {
  id: string;
  fileId: string;
  name: string;
}

export enum PanelView {
  TERMINAL = 'TERMINAL',
  AI_CHAT = 'AI_CHAT',
  PROBLEMS = 'PROBLEMS',
  IMAGE_EDITOR = 'IMAGE_EDITOR',
  IMAGE_GENERATOR = 'IMAGE_GENERATOR',
  IMAGE_ANALYSIS = 'IMAGE_ANALYSIS',
  LIVE_AUDIO = 'LIVE_AUDIO',
  VIDEO_GENERATOR = 'VIDEO_GENERATOR',
  SNIPPETS = 'SNIPPETS',
  SETTINGS = 'SETTINGS',
  HISTORY = 'HISTORY',
  VIDEO_ANALYSIS = 'VIDEO_ANALYSIS',
  TRANSCRIPTION = 'TRANSCRIPTION'
}

export interface LogMessage {
  id: string;
  source: 'System' | 'Agent Zero' | 'User' | 'Compiler' | 'Terminal';
  text: string;
  timestamp: number;
  type: 'info' | 'error' | 'success' | 'warning';
  groundingUrls?: { uri: string; title: string; type: 'web' | 'maps' }[];
}

export interface TerminalTab {
  id: string;
  name: string;
  logs: LogMessage[];
  history: string[];
}

export interface Task {
  name: string;
  command: string;
  description?: string;
}

export interface Snippet {
  id: string;
  name: string;
  code: string;
  language: string;
}

export interface EditorSettings {
  tabSize: number;
  indentStyle: 'spaces' | 'tabs';
  theme: string;
  aiAutocomplete: boolean;
  terminalAliases: Record<string, string>;
}

export interface FileHistoryEntry {
  content: string;
  timestamp: number;
}

export interface IDECommand {
  id: string;
  label: string;
  category: string;
  action: () => void;
  shortcut?: string;
}
