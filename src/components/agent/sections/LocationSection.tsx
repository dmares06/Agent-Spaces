import { useState, useEffect } from 'react';
import { FolderInput, Loader2 } from 'lucide-react';
import { Agent, Workspace } from '../../../lib/types';
import { electronAPI } from '../../../lib/electronAPI';

interface LocationSectionProps {
  agent: Agent;
  onMove: () => void;
  onClose: () => void;
}

export default function LocationSection({
  agent,
  onMove,
  onClose,
}: LocationSectionProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  async function loadWorkspaces() {
    try {
      const data = await electronAPI.workspace.list();
      setWorkspaces(data);
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleMove(targetWorkspaceId: string | null) {
    // Don't move if already in the target location
    if (targetWorkspaceId === agent.workspace_id) return;
    if (targetWorkspaceId === null && !agent.workspace_id) return;

    setMoving(true);
    setError(null);

    try {
      await electronAPI.agent.moveToWorkspace(agent.id, targetWorkspaceId);
      console.log('[LocationSection] Agent moved:', agent.id, 'to', targetWorkspaceId || 'global');

      // Close the modal
      onClose();

      // Notify parent to refresh agent lists
      onMove();
    } catch (err: any) {
      console.error('[LocationSection] Failed to move agent:', err);
      setError(err.message || 'Failed to move agent');
      setMoving(false);
    }
  }

  const currentLocation = agent.workspace_id
    ? workspaces.find((w) => w.id === agent.workspace_id)?.name || 'Unknown Workspace'
    : 'Global Agents';

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <FolderInput size={18} className="text-accent" />
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Location
        </h3>
      </div>

      {/* Location Box */}
      <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Current location:</span>
          <span className="font-medium text-foreground">{currentLocation}</span>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive rounded p-2">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />
            <span>Loading workspaces...</span>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Move to:</label>
            <select
              value={agent.workspace_id || 'global'}
              onChange={(e) => {
                const value = e.target.value;
                handleMove(value === 'global' ? null : value);
              }}
              disabled={moving}
              className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent disabled:opacity-50"
            >
              <option value="global">
                Global Agents
              </option>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>

            {moving && (
              <div className="flex items-center gap-2 text-sm text-accent">
                <Loader2 size={14} className="animate-spin" />
                <span>Moving agent...</span>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Move this agent to a different workspace or make it globally available.
        </p>
      </div>
    </div>
  );
}
