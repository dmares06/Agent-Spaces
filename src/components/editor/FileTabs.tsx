import { X } from 'lucide-react';

export interface OpenFile {
  path: string;
  content: string;
  isDirty: boolean; // Has unsaved changes
}

interface FileTabsProps {
  openFiles: OpenFile[];
  activeFilePath: string | null;
  onSelectFile: (filePath: string) => void;
  onCloseFile: (filePath: string) => void;
}

export default function FileTabs({
  openFiles,
  activeFilePath,
  onSelectFile,
  onCloseFile,
}: FileTabsProps) {
  const getFileName = (path: string): string => {
    return path.split('/').pop() || path;
  };

  if (openFiles.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center bg-background border-b border-border overflow-x-auto">
      {openFiles.map((file) => {
        const isActive = file.path === activeFilePath;
        const fileName = getFileName(file.path);

        return (
          <div
            key={file.path}
            className={`flex items-center gap-2 px-4 py-2 min-w-0 cursor-pointer border-r border-border transition-colors ${
              isActive
                ? 'bg-secondary text-foreground'
                : 'bg-background text-muted-foreground hover:bg-secondary/50'
            }`}
            onClick={() => onSelectFile(file.path)}
          >
            {/* File name */}
            <span className="text-sm truncate max-w-[150px]" title={file.path}>
              {fileName}
            </span>

            {/* Dirty indicator (unsaved changes) */}
            {file.isDirty && (
              <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" title="Unsaved changes" />
            )}

            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseFile(file.path);
              }}
              className="flex-shrink-0 hover:bg-secondary/80 rounded p-0.5 transition-colors"
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
