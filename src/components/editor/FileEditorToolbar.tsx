import { Save, X, Loader2 } from 'lucide-react';
import type { OpenFile } from '../../lib/types';
import { getLanguageDisplayName } from '../../utils/languageDetection';

interface FileEditorToolbarProps {
  file: OpenFile;
  onSave: () => Promise<void>;
  onClose: () => void;
  saving?: boolean;
}

export default function FileEditorToolbar({
  file,
  onSave,
  onClose,
  saving = false,
}: FileEditorToolbarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border">
      {/* Left side - File name and status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{file.name}</span>
          {file.isDirty && (
            <span className="w-2 h-2 rounded-full bg-warning" title="Unsaved changes" />
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {getLanguageDisplayName(file.language)}
        </span>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSave}
          disabled={saving || !file.isDirty}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Save (Cmd/Ctrl+S)"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          <span>Save</span>
        </button>
        <button
          onClick={onClose}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          title="Close file"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
