import { type FileInfo } from '../../lib/types';
import FileIcon from '../common/FileIcon';
import { Trash2 } from 'lucide-react';

interface FileItemProps {
  file: FileInfo | { id: string; name: string; path: string; size?: number };
  onRemove?: (id: string) => void;
  onClick?: () => void;
  onDoubleClick?: () => void;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileItem({ file, onRemove, onClick, onDoubleClick }: FileItemProps) {
  const isAttachment = 'id' in file;

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors ${
        onClick || onDoubleClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <FileIcon fileName={file.name} isDirectory={'isDirectory' in file ? file.isDirectory : false} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
        {file.size !== undefined && (
          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
        )}
      </div>
      {isAttachment && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove((file as any).id);
          }}
          className="flex-shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors"
          title="Remove file"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
