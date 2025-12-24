
import React, { useState, useMemo, useEffect } from 'react';
import { FileNode, FileType } from '../types';
import { ChevronRight, ChevronDown, FilePlus, FolderPlus, Search, MoreVertical, Copy, Clipboard, Trash2 } from 'lucide-react';
import { FileIcon } from './FileIcon';

interface SidebarProps {
  files: FileNode[];
  onFileSelect: (file: FileNode) => void;
  selectedFileId?: string;
  width: number;
  onAddFile: (parentId: string | null) => void;
  onAddFolder: (parentId: string | null) => void;
  onDeleteNode: (nodeId: string) => void;
  onCopyNode: (nodeId: string) => void;
  onPasteNode: (parentId: string | null) => void;
  hasClipboard: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  files, 
  onFileSelect, 
  selectedFileId, 
  width, 
  onAddFile, 
  onAddFolder,
  onDeleteNode,
  onCopyNode,
  onPasteNode,
  hasClipboard
}) => {
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set(['root', 'src']));
  const [searchTerm, setSearchTerm] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, nodeId: string, isFolder: boolean } | null>(null);

  const toggleFolder = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newOpen = new Set(openFolders);
    if (newOpen.has(id)) {
      newOpen.delete(id);
    } else {
      newOpen.add(id);
    }
    setOpenFolders(newOpen);
  };

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    setContextMenu({ 
      x: e.clientX, 
      y: e.clientY, 
      nodeId: node.id, 
      isFolder: node.type === FileType.FOLDER 
    });
  };

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const getParentIdForCreation = (): string | null => {
    if (!selectedFileId) return 'root';
    const findNode = (nodes: FileNode[]): FileNode | null => {
      for (const node of nodes) {
        if (node.id === selectedFileId) return node;
        if (node.children) {
          const found = findNode(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    const node = findNode(files);
    if (!node) return 'root';
    return node.type === FileType.FOLDER ? node.id : (node.parentId || 'root');
  };

  const filteredTree = useMemo(() => {
    if (!searchTerm.trim()) return files;
    const lowerSearch = searchTerm.toLowerCase();
    const filterNodes = (nodes: FileNode[]): FileNode[] => {
      return nodes.map((node): FileNode | null => {
          const hasMatchingChildren = node.children ? filterNodes(node.children) : [];
          const nameMatches = node.name.toLowerCase().includes(lowerSearch);
          if (nameMatches || hasMatchingChildren.length > 0) {
            return { ...node, children: node.children ? hasMatchingChildren : undefined };
          }
          return null;
        }).filter((node): node is FileNode => node !== null);
    };
    return filterNodes(files);
  }, [files, searchTerm]);

  const renderTree = (nodes: FileNode[], depth: number = 0) => {
    return nodes.map((node) => {
      const isOpen = openFolders.has(node.id) || searchTerm.length > 0;
      const isSelected = node.id === selectedFileId;

      return (
        <div key={node.id}>
          <div
            className={`flex items-center py-1 px-2 cursor-pointer select-none transition-colors duration-100 group ${
              isSelected ? 'bg-vscode-active text-white' : 'hover:bg-vscode-hover text-vscode-text'
            }`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={(e) => {
              if (node.type === FileType.FOLDER) {
                toggleFolder(node.id, e);
              } else {
                onFileSelect(node);
              }
            }}
            onContextMenu={(e) => handleContextMenu(e, node)}
          >
            <span className="mr-1.5 opacity-70">
              {node.type === FileType.FOLDER && (
                isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
              )}
               {node.type === FileType.FILE && <span className="w-3.5 inline-block" />}
            </span>
            <span className="mr-2">
              <FileIcon name={node.name} isDirectory={node.type === FileType.FOLDER} isOpen={isOpen} />
            </span>
            <span className="text-sm truncate flex-1">{node.name}</span>
            <div className="opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity">
               <button 
                 onClick={(e) => { e.stopPropagation(); handleContextMenu(e as any, node); }}
                 className="p-1"
               >
                 <MoreVertical size={12} />
               </button>
            </div>
          </div>
          {node.type === FileType.FOLDER && isOpen && node.children && (
            <div>{renderTree(node.children, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div 
      className="h-full flex flex-col bg-vscode-sidebar border-r border-black"
      style={{ width: `${width}px`, minWidth: `${width}px` }}
    >
      <div className="flex items-center justify-between px-4 py-2 text-xs font-bold uppercase tracking-wider text-vscode-text bg-vscode-sidebar border-b border-black">
        <span>Explorer</span>
        <div className="flex space-x-2">
           <button onClick={(e) => { e.stopPropagation(); onAddFile(getParentIdForCreation()); }} title="New File" className="hover:text-white">
            <FilePlus size={14} />
           </button>
           <button onClick={(e) => { e.stopPropagation(); onAddFolder(getParentIdForCreation()); }} title="New Folder" className="hover:text-white">
            <FolderPlus size={14} />
           </button>
        </div>
      </div>
      
      <div className="px-2 py-2">
        <div className="relative flex items-center bg-[#3c3c3c] rounded border border-transparent focus-within:border-vscode-accent group">
          <Search size={14} className="ml-2 text-gray-500 group-focus-within:text-vscode-accent" />
          <input 
            type="text" 
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-xs py-1.5 px-2 outline-none text-vscode-text"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {renderTree(filteredTree)}
        {filteredTree.length === 0 && (
          <div className="px-4 py-2 text-xs text-gray-500 italic">No files found.</div>
        )}
      </div>

      {/* Context Menu Portal-like Overlay */}
      {contextMenu && (
        <div 
          className="fixed z-[100] bg-vscode-sidebar border border-[#454545] shadow-2xl py-1 w-44 rounded-md text-vscode-text animate-in fade-in zoom-in duration-75"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className="w-full text-left px-3 py-1.5 hover:bg-vscode-accent hover:text-white flex items-center space-x-2 text-sm"
            onClick={() => { onCopyNode(contextMenu.nodeId); setContextMenu(null); }}
          >
            <Copy size={14} />
            <span>Copy</span>
          </button>
          
          <button 
            className={`w-full text-left px-3 py-1.5 hover:bg-vscode-accent hover:text-white flex items-center space-x-2 text-sm ${(!hasClipboard || !contextMenu.isFolder) ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''}`}
            onClick={() => { onPasteNode(contextMenu.nodeId); setContextMenu(null); }}
          >
            <Clipboard size={14} />
            <span>Paste</span>
          </button>

          <div className="h-[1px] bg-[#454545] my-1 mx-2" />

          <button 
            className="w-full text-left px-3 py-1.5 hover:bg-red-600 hover:text-white flex items-center space-x-2 text-sm text-red-400"
            onClick={() => { onDeleteNode(contextMenu.nodeId); setContextMenu(null); }}
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
