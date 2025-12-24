import React from 'react';
import { FileJson, FileCode, FileType, Folder, FolderOpen, FileText } from 'lucide-react';

interface FileIconProps {
  name: string;
  isDirectory: boolean;
  isOpen?: boolean;
}

export const FileIcon: React.FC<FileIconProps> = ({ name, isDirectory, isOpen }) => {
  if (isDirectory) {
    return isOpen ? <FolderOpen size={16} className="text-blue-400" /> : <Folder size={16} className="text-blue-400" />;
  }

  const ext = name.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'ts':
    case 'tsx':
      return <FileCode size={16} className="text-blue-500" />;
    case 'js':
    case 'jsx':
      return <FileCode size={16} className="text-yellow-400" />;
    case 'html':
      return <FileCode size={16} className="text-orange-500" />;
    case 'css':
      return <FileCode size={16} className="text-blue-300" />;
    case 'json':
      return <FileJson size={16} className="text-yellow-200" />;
    case 'md':
      return <FileText size={16} className="text-gray-300" />;
    default:
      return <FileText size={16} className="text-gray-400" />;
  }
};