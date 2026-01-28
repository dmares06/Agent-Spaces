import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { Agent } from '../../../lib/types';
import { useState } from 'react';
import { electronAPI } from '../../../lib/electronAPI';

interface DangerZoneSectionProps {
  agent: Agent;
  onDelete: () => void;
  onClose: () => void;
}

export default function DangerZoneSection({
  agent,
  onDelete,
  onClose,
}: DangerZoneSectionProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    try {
      await electronAPI.agent.delete(agent.id);
      console.log('[DangerZone] Agent deleted:', agent.id);

      // Close the settings modal
      onClose();

      // Notify parent to refresh agent list
      onDelete();
    } catch (err: any) {
      console.error('[DangerZone] Failed to delete agent:', err);
      setError(err.message || 'Failed to delete agent');
      setDeleting(false);
    }
  }

  function handleCancel() {
    setShowConfirm(false);
    setError(null);
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <AlertTriangle size={18} className="text-destructive" />
        <h3 className="text-sm font-semibold text-destructive uppercase tracking-wide">
          Danger Zone
        </h3>
      </div>

      {/* Warning Box */}
      <div className="bg-destructive/10 border border-destructive rounded-lg p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Trash2 size={20} className="text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <h4 className="text-sm font-semibold text-destructive">Delete Agent</h4>
            <p className="text-xs text-muted-foreground">
              Once you delete an agent, there is no going back. This will permanently delete
              all associated chats and messages.
            </p>

            {error && (
              <div className="bg-destructive/20 border border-destructive rounded p-2">
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}

            {!showConfirm ? (
              <button
                onClick={() => setShowConfirm(true)}
                className="px-4 py-2 text-sm bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-colors"
              >
                Delete Agent
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Are you absolutely sure?
                </p>
                <p className="text-xs text-muted-foreground">
                  This action <strong>cannot</strong> be undone. This will permanently delete{' '}
                  <strong>{agent.name}</strong> and all associated data.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleCancel}
                    disabled={deleting}
                    className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50"
                  >
                    {deleting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        <span>Delete</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
