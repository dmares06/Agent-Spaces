import { useState, useEffect } from 'react';
import { X, Sparkles, Settings } from 'lucide-react';
import type { Agent } from '../../lib/types';
import AIAssistedMode from './creation/AIAssistedMode';
import ManualMode from './creation/ManualMode';

type CreationMode = 'ai-assisted' | 'manual';

interface AgentCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string | null;
  defaultGlobal?: boolean;
  onAgentCreated: (agent: Agent) => void;
}

export default function AgentCreationModal({
  isOpen,
  onClose,
  workspaceId,
  defaultGlobal = false,
  onAgentCreated,
}: AgentCreationModalProps) {
  const [mode, setMode] = useState<CreationMode>('ai-assisted');
  const [createAsGlobal, setCreateAsGlobal] = useState(defaultGlobal);

  // Reset createAsGlobal when modal opens or defaultGlobal changes
  useEffect(() => {
    if (isOpen) {
      setCreateAsGlobal(defaultGlobal);
    }
  }, [isOpen, defaultGlobal]);

  if (!isOpen) return null;

  function handleAgentCreated(agent: Agent) {
    onAgentCreated(agent);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-semibold text-foreground">Create Agent</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-border flex-shrink-0">
          <button
            onClick={() => setMode('ai-assisted')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              mode === 'ai-assisted'
                ? 'text-accent border-b-2 border-accent bg-accent/5'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Sparkles size={16} />
            AI-Assisted
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              mode === 'manual'
                ? 'text-accent border-b-2 border-accent bg-accent/5'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Settings size={16} />
            Manual
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {mode === 'ai-assisted' ? (
            <AIAssistedMode
              workspaceId={createAsGlobal ? null : workspaceId}
              onAgentCreated={handleAgentCreated}
            />
          ) : (
            <ManualMode
              workspaceId={createAsGlobal ? null : workspaceId}
              onAgentCreated={handleAgentCreated}
            />
          )}
        </div>

        {/* Footer - Global Toggle */}
        <div className="p-4 border-t border-border flex-shrink-0">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={createAsGlobal}
              onChange={(e) => setCreateAsGlobal(e.target.checked)}
              className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
            />
            <span className="text-sm text-foreground">
              Create as Global Agent
            </span>
            <span className="text-xs text-muted-foreground">
              (available in all workspaces)
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
