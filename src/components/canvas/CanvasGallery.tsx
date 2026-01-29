import { useState, useEffect } from 'react';
import { X, FolderOpen, Trash2, Calendar, Clock } from 'lucide-react';
import { electronAPI } from '../../lib/electronAPI';
import type { SavedCanvas } from '../../lib/types';

interface CanvasGalleryProps {
  workspaceId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onLoadCanvas: (canvasId: string) => void;
  onDeleteCanvas: (canvasId: string) => void;
}

export default function CanvasGallery({
  workspaceId,
  isOpen,
  onClose,
  onLoadCanvas,
  onDeleteCanvas
}: CanvasGalleryProps) {
  const [canvases, setCanvases] = useState<SavedCanvas[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCanvases();
    }
  }, [isOpen, workspaceId]);

  async function loadCanvases() {
    setLoading(true);
    try {
      const list = await electronAPI.canvas.list(workspaceId);
      setCanvases(list);
    } catch (error) {
      console.error('Failed to load canvases:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(canvasId: string, canvasName: string) {
    const confirmed = confirm(`Delete canvas "${canvasName}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await onDeleteCanvas(canvasId);
      // Reload canvases after deletion
      await loadCanvases();
    } catch (error) {
      console.error('Failed to delete canvas:', error);
    }
  }

  function handleLoad(canvasId: string) {
    onLoadCanvas(canvasId);
    onClose();
  }

  function formatDate(dateString: string) {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  function formatTime(dateString: string) {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Saved Canvases</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              Loading canvases...
            </div>
          ) : canvases.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <FolderOpen size={48} className="mb-3 opacity-50" />
              <p>No saved canvases yet</p>
              <p className="text-sm mt-1">Create and save a canvas to see it here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {canvases.map((canvas) => (
                <div
                  key={canvas.id}
                  className="border border-border rounded-lg overflow-hidden hover:border-accent transition-colors bg-background"
                >
                  {/* Thumbnail */}
                  <div className="h-32 bg-muted flex items-center justify-center border-b border-border">
                    {canvas.thumbnail ? (
                      <img
                        src={canvas.thumbnail}
                        alt={canvas.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-muted-foreground text-sm">No preview</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <h3 className="font-medium text-foreground truncate mb-2" title={canvas.name}>
                      {canvas.name}
                    </h3>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>{formatDate(canvas.created_at)}</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>{formatTime(canvas.updated_at)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleLoad(canvas.id)}
                        className="flex-1 px-3 py-1.5 text-sm bg-accent text-accent-foreground rounded hover:bg-accent/90"
                      >
                        Open
                      </button>
                      <button
                        onClick={() => handleDelete(canvas.id, canvas.name)}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                        title="Delete canvas"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {canvases.length} {canvases.length === 1 ? 'canvas' : 'canvases'}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm hover:bg-muted rounded text-foreground"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
