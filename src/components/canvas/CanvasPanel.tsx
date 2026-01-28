import { useState, useRef, useEffect } from 'react';
import { Tldraw, Editor, TLUiOverrides } from 'tldraw';
import 'tldraw/tldraw.css';
import {
  X,
  Save,
  Download,
  Upload,
  Trash2,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface CanvasPanelProps {
  workspaceId?: string;
  height: number;
  onHeightChange: (height: number) => void;
  onClose: () => void;
}

export default function CanvasPanel({
  workspaceId,
  height,
  onHeightChange,
  onClose,
}: CanvasPanelProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  // Load canvas data from localStorage (we'll add DB persistence later)
  useEffect(() => {
    if (editor) {
      const canvasId = workspaceId || 'default';
      const savedData = localStorage.getItem(`canvas-${canvasId}`);
      if (savedData) {
        try {
          const data = JSON.parse(savedData);
          // Load shapes into editor
          const shapes = data.shapes || [];
          if (shapes.length > 0) {
            editor.createShapes(shapes);
          }
        } catch (error) {
          console.error('Failed to load canvas data:', error);
        }
      }
    }
  }, [editor, workspaceId]);

  // Auto-save canvas data
  useEffect(() => {
    if (!editor) return;

    const saveInterval = setInterval(() => {
      try {
        const canvasId = workspaceId || 'default';
        const shapes = editor.getCurrentPageShapes();
        const data = { shapes };
        localStorage.setItem(`canvas-${canvasId}`, JSON.stringify(data));
      } catch (error) {
        console.error('Failed to save canvas data:', error);
      }
    }, 5000); // Auto-save every 5 seconds

    return () => clearInterval(saveInterval);
  }, [editor, workspaceId]);

  // Save manually
  const handleSave = () => {
    if (editor) {
      try {
        const canvasId = workspaceId || 'default';
        const shapes = editor.getCurrentPageShapes();
        const data = { shapes };
        localStorage.setItem(`canvas-${canvasId}`, JSON.stringify(data));
        console.log('Canvas saved');
      } catch (error) {
        console.error('Failed to save canvas:', error);
      }
    }
  };

  // Export canvas as JSON
  const handleExport = () => {
    if (editor) {
      try {
        const canvasId = workspaceId || 'default';
        const shapes = editor.getCurrentPageShapes();
        const data = { shapes };
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `canvas-${canvasId}-${Date.now()}.json`;
        link.click();

        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Failed to export canvas:', error);
      }
    }
  };

  // Import canvas from JSON
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && editor) {
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          const shapes = data.shapes || [];
          if (shapes.length > 0) {
            editor.createShapes(shapes);
          }
        } catch (error) {
          console.error('Failed to import canvas:', error);
        }
      }
    };

    input.click();
  };

  // Clear canvas
  const handleClear = () => {
    if (editor && confirm('Are you sure you want to clear the canvas?')) {
      editor.selectAll();
      editor.deleteShapes(editor.getSelectedShapeIds());
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Resize handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isFullscreen) return;

    e.preventDefault();
    setIsResizing(true);
    startYRef.current = e.clientY;
    startHeightRef.current = height;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;

    const deltaY = startYRef.current - e.clientY;
    const newHeight = Math.min(Math.max(startHeightRef.current + deltaY, 200), 800);
    onHeightChange(newHeight);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Custom UI overrides for tldraw
  const uiOverrides: TLUiOverrides = {
    tools(_editor, tools) {
      // Keep default tools
      return tools;
    },
  };

  const panelHeight = isFullscreen ? '100vh' : `${height}px`;
  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 bg-background'
    : 'border-t border-border bg-background';

  return (
    <div className={containerClass} style={{ height: panelHeight }}>
      {/* Resize Handle (only when not fullscreen) */}
      {!isFullscreen && (
        <div
          ref={resizeRef}
          onMouseDown={handleMouseDown}
          className="h-1 bg-border hover:bg-accent cursor-row-resize transition-colors"
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-1">
          <button
            onClick={handleSave}
            className="p-1.5 hover:bg-background rounded transition-colors"
            title="Save canvas"
          >
            <Save size={14} />
          </button>

          <button
            onClick={handleExport}
            className="p-1.5 hover:bg-background rounded transition-colors"
            title="Export as JSON"
          >
            <Download size={14} />
          </button>

          <button
            onClick={handleImport}
            className="p-1.5 hover:bg-background rounded transition-colors"
            title="Import from JSON"
          >
            <Upload size={14} />
          </button>

          <div className="h-4 w-px bg-border mx-1" />

          <button
            onClick={handleClear}
            className="p-1.5 hover:bg-destructive hover:text-destructive-foreground rounded transition-colors"
            title="Clear canvas"
          >
            <Trash2 size={14} />
          </button>
        </div>

        <span className="text-xs text-muted-foreground flex-1">
          Visual Canvas - Plan, sketch, and brainstorm
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleFullscreen}
            className="p-1.5 hover:bg-background rounded transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-background rounded transition-colors"
            title="Close canvas"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Canvas Content */}
      <div className="h-[calc(100%-41px)]">
        <Tldraw
          onMount={setEditor}
          overrides={uiOverrides}
          autoFocus
        />
      </div>
    </div>
  );
}
