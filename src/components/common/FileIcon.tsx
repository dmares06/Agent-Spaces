import {
  FileText,
  FileCode,
  FileImage,
  FileVideo,
  FileArchive,
  File,
  Folder,
} from 'lucide-react';

interface FileIconProps {
  fileName: string;
  isDirectory?: boolean;
  size?: number;
}

export default function FileIcon({ fileName, isDirectory, size = 16 }: FileIconProps) {
  if (isDirectory) {
    return <Folder size={size} className="text-blue-500" />;
  }

  const ext = fileName.split('.').pop()?.toLowerCase();

  // Code files
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'c', 'cpp', 'go', 'rs', 'rb', 'php', 'css', 'html', 'json', 'xml', 'yaml', 'yml'].includes(ext || '')) {
    return <FileCode size={size} className="text-green-500" />;
  }

  // Images
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext || '')) {
    return <FileImage size={size} className="text-purple-500" />;
  }

  // Videos
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext || '')) {
    return <FileVideo size={size} className="text-red-500" />;
  }

  // Archives
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext || '')) {
    return <FileArchive size={size} className="text-yellow-500" />;
  }

  // Text files
  if (['txt', 'md', 'log'].includes(ext || '')) {
    return <FileText size={size} className="text-gray-500" />;
  }

  // Default
  return <File size={size} className="text-muted-foreground" />;
}
