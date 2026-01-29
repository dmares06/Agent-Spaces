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
  FolderOpen,
  Plus,
  Eraser,
  Type,
} from 'lucide-react';
import { electronAPI } from '../../lib/electronAPI';
import SaveCanvasDialog from './SaveCanvasDialog';
import CanvasGallery from './CanvasGallery';

interface CanvasPanelProps {
  workspaceId?: string;
  height: number;
  onHeightChange: (height: number) => void;
  onClose: () => void;
}

interface OpenCanvas {
  id: string | null; // null for unsaved canvases
  name: string;
  editorState: any;
}

function generateId(): string {
  return `canvas-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

  // Multi-canvas state
  const [openCanvases, setOpenCanvases] = useState<OpenCanvas[]>([
    { id: null, name: 'Untitled Canvas', editorState: null }
  ]);
  const [activeCanvasIndex, setActiveCanvasIndex] = useState(0);

  // Dialog state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showGallery, setShowGallery] = useState(false);

  // Quick text mode
  const [quickTextMode, setQuickTextMode] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Get current active canvas
  const currentCanvas = openCanvases[activeCanvasIndex];

  // Switch between canvases
  async function switchToCanvas(index: number) {
    if (index === activeCanvasIndex || !editor) return;

    // Save current canvas state
    const shapes = editor.getCurrentPageShapes();
    const updatedCanvases = [...openCanvases];
    updatedCanvases[activeCanvasIndex] = {
      ...updatedCanvases[activeCanvasIndex],
      editorState: { shapes }
    };
    setOpenCanvases(updatedCanvases);

    // Switch to new canvas
    setActiveCanvasIndex(index);
    const targetCanvas = updatedCanvases[index];

    // Load target canvas shapes
    if (targetCanvas.editorState?.shapes) {
      editor.deleteShapes(editor.getCurrentPageShapeIds());
      editor.createShapes(targetCanvas.editorState.shapes);
    } else {
      editor.deleteShapes(editor.getCurrentPageShapeIds());
    }
  }

  // Create new canvas tab
  function createNewCanvasTab() {
    const newCanvas: OpenCanvas = {
      id: null,
      name: 'Untitled Canvas',
      editorState: { shapes: [] },
    };

    setOpenCanvases([...openCanvases, newCanvas]);
    setActiveCanvasIndex(openCanvases.length);
  }

  // Close canvas tab
  function closeCanvas(index: number) {
    if (openCanvases.length === 1) {
      // Can't close last canvas, just clear it
      if (editor) {
        editor.deleteShapes(editor.getCurrentPageShapeIds());
      }
      setOpenCanvases([{ id: null, name: 'Untitled Canvas', editorState: { shapes: [] } }]);
      setActiveCanvasIndex(0);
      return;
    }

    const updated = openCanvases.filter((_, i) => i !== index);
    setOpenCanvases(updated);

    // Adjust active index
    if (index === activeCanvasIndex) {
      const newIndex = Math.max(0, index - 1);
      setActiveCanvasIndex(newIndex);
      // Load the new active canvas
      const targetCanvas = updated[newIndex];
      if (editor) {
        if (targetCanvas.editorState?.shapes) {
          editor.deleteShapes(editor.getCurrentPageShapeIds());
          editor.createShapes(targetCanvas.editorState.shapes);
        } else {
          editor.deleteShapes(editor.getCurrentPageShapeIds());
        }
      }
    } else if (index < activeCanvasIndex) {
      setActiveCanvasIndex(activeCanvasIndex - 1);
    }
  }

  // Save canvas to database
  async function saveCanvas(name: string) {
    if (!editor) return;

    try {
      const shapes = editor.getCurrentPageShapes();
      const data = JSON.stringify({ shapes });

      const canvasId = currentCanvas.id || generateId();

      const saved = await electronAPI.canvas.save({
        id: canvasId,
        workspace_id: workspaceId || null,
        name,
        data,
        thumbnail: null, // We can add thumbnail generation later
      });

      // Update current canvas
      const updatedCanvases = [...openCanvases];
      updatedCanvases[activeCanvasIndex] = {
        id: saved.id,
        name: saved.name,
        editorState: { shapes }
      };
      setOpenCanvases(updatedCanvases);

      console.log('Canvas saved:', saved.name);
    } catch (error) {
      console.error('Failed to save canvas:', error);
      alert('Failed to save canvas. Please try again.');
    }
  }

  // Load canvas from database
  async function loadCanvas(canvasId: string) {
    try {
      const canvas = await electronAPI.canvas.get(canvasId);
      const { shapes } = JSON.parse(canvas.data);

      // Check if canvas is already open
      const existingIndex = openCanvases.findIndex(c => c.id === canvasId);
      if (existingIndex !== -1) {
        // Switch to existing tab
        switchToCanvas(existingIndex);
        return;
      }

      // Open in new tab
      const newCanvas: OpenCanvas = {
        id: canvas.id,
        name: canvas.name,
        editorState: { shapes },
      };

      setOpenCanvases([...openCanvases, newCanvas]);
      setActiveCanvasIndex(openCanvases.length);
    } catch (error) {
      console.error('Failed to load canvas:', error);
      alert('Failed to load canvas. Please try again.');
    }
  }

  // Delete current canvas
  async function deleteCurrentCanvas() {
    if (!currentCanvas.id) {
      alert('This canvas has not been saved yet.');
      return;
    }

    const confirmed = confirm(`Delete "${currentCanvas.name}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await electronAPI.canvas.delete(currentCanvas.id);
      console.log('Canvas deleted:', currentCanvas.name);

      // Close this tab
      closeCanvas(activeCanvasIndex);
    } catch (error) {
      console.error('Failed to delete canvas:', error);
      alert('Failed to delete canvas. Please try again.');
    }
  }

  // Clear shapes (not delete canvas)
  function handleClearShapes() {
    if (editor && confirm('Clear all shapes? This cannot be undone.')) {
      editor.deleteShapes(editor.getCurrentPageShapeIds());
    }
  }

  // Export canvas as JSON
  const handleExport = () => {
    if (editor) {
      try {
        const shapes = editor.getCurrentPageShapes();
        const data = { shapes };
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${currentCanvas.name}-${Date.now()}.json`;
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

  // Click-to-type handler
  function handleCanvasClick(e: React.MouseEvent) {
    if (!quickTextMode || !editor) return;

    // Don't interfere with tldraw's own click handling on shapes
    const target = e.target as HTMLElement;
    if (!target.classList.contains('tl-canvas')) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Create text shape at click position
    const textShapeId = editor.createShapes([{
      type: 'text',
      x: x,
      y: y,
      props: {
        text: '',
        size: 'm',
        font: 'sans',
      },
    }]);

    // Immediately start editing
    if (textShapeId && textShapeId.length > 0) {
      editor.setSelectedShapes([textShapeId[0]]);
      editor.setEditingShape(textShapeId[0]);
    }
  }

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Custom UI overrides for tldraw
  const uiOverrides: TLUiOverrides = {
    tools(_editor, tools) {
      return tools;
    },
  };

  const panelHeight = isFullscreen ? '100vh' : `${height}px`;
  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 bg-background'
    : 'border-t border-border bg-background';

  return (
    <>
      <div className={containerClass} style={{ height: panelHeight }}>
        {/* Resize Handle (only when not fullscreen) */}
        {!isFullscreen && (
          <div
            ref={resizeRef}
            onMouseDown={handleMouseDown}
            className="h-1 bg-border hover:bg-accent cursor-row-resize transition-colors"
          />
        )}

        {/* Canvas Tabs Bar */}
        <div className="border-b border-border bg-card px-2 py-1 flex items-center gap-1 overflow-x-auto">
          {openCanvases.map((canvas, index) => (
            <button
              key={index}
              onClick={() => switchToCanvas(index)}
              className={`px-3 py-1.5 rounded-t text-sm flex items-center gap-2 flex-shrink-0 ${
                index === activeCanvasIndex
                  ? 'bg-background border border-b-0 border-border text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <span className="truncate max-w-[120px]">{canvas.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeCanvas(index);
                }}
                className="hover:text-destructive"
              >
                <X size={14} />
              </button>
            </button>
          ))}

          {/* New Tab Button */}
          <button
            onClick={createNewCanvasTab}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded flex-shrink-0"
            title="New Canvas Tab"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Header */}
        <div className="h-[41px] min-h-[41px] border-b border-border flex items-center justify-between px-3 bg-card gap-4">
          {/* Left section */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* New Canvas */}
            <button
              onClick={createNewCanvasTab}
              className="p-1.5 hover:bg-muted rounded flex-shrink-0"
              title="New Canvas"
            >
              <Plus size={18} />
            </button>

            {/* Save As */}
            <button
              onClick={() => setShowSaveDialog(true)}
              className="p-1.5 hover:bg-muted rounded flex-shrink-0"
              title="Save Canvas"
            >
              <Save size={18} />
            </button>

            {/* Open Gallery */}
            <button
              onClick={() => setShowGallery(true)}
              className="p-1.5 hover:bg-muted rounded flex-shrink-0"
              title="Open Canvas"
            >
              <FolderOpen size={18} />
            </button>

            <div className="w-px h-4 bg-border" />

            {/* Export JSON */}
            <button
              onClick={handleExport}
              className="p-1.5 hover:bg-muted rounded flex-shrink-0"
              title="Export JSON"
            >
              <Download size={18} />
            </button>

            {/* Import JSON */}
            <button
              onClick={handleImport}
              className="p-1.5 hover:bg-muted rounded flex-shrink-0"
              title="Import JSON"
            >
              <Upload size={18} />
            </button>

            <div className="w-px h-4 bg-border" />

            {/* Clear Shapes */}
            <button
              onClick={handleClearShapes}
              className="p-1.5 hover:bg-muted rounded flex-shrink-0"
              title="Clear All Shapes"
            >
              <Eraser size={18} />
            </button>

            {/* Delete Canvas */}
            <button
              onClick={deleteCurrentCanvas}
              className="p-1.5 text-destructive hover:bg-destructive/10 rounded flex-shrink-0"
              title="Delete Canvas"
            >
              <Trash2 size={18} />
            </button>

            <div className="w-px h-4 bg-border" />

            {/* Quick Text Mode Toggle */}
            <button
              onClick={() => setQuickTextMode(!quickTextMode)}
              className={`p-1.5 rounded flex-shrink-0 ${
                quickTextMode
                  ? 'bg-accent/20 text-accent'
                  : 'hover:bg-muted text-muted-foreground'
              }`}
              title={quickTextMode ? 'Quick Text: ON (Click to type)' : 'Quick Text: OFF'}
            >
              <Type size={18} />
            </button>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={toggleFullscreen}
              className="p-1.5 hover:bg-muted rounded"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-muted rounded"
              title="Close canvas"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Quick Text Indicator */}
        {quickTextMode && (
          <div className="px-3 py-1 bg-accent/10 text-xs text-accent border-b border-border">
            Quick Text Mode: Click anywhere to type
          </div>
        )}

        {/* Canvas Content */}
        <div
          ref={canvasRef}
          onClick={quickTextMode ? handleCanvasClick : undefined}
          className={`${quickTextMode ? 'h-[calc(100%-90px)]' : 'h-[calc(100%-70px)]'}`}
        >
          <Tldraw
            onMount={setEditor}
            overrides={uiOverrides}
            autoFocus
          />
        </div>
      </div>

      {/* Save Canvas Dialog */}
      <SaveCanvasDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={saveCanvas}
        defaultName={currentCanvas.name !== 'Untitled Canvas' ? currentCanvas.name : ''}
      />

      {/* Canvas Gallery */}
      <CanvasGallery
        workspaceId={workspaceId || null}
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
        onLoadCanvas={loadCanvas}
        onDeleteCanvas={async (canvasId) => {
          await electronAPI.canvas.delete(canvasId);
        }}
      />
    </>
  );
}
