import { useState, useRef, useEffect } from 'react';
import {
  RefreshCw,
  X,
  ExternalLink,
  Monitor,
  Tablet,
  Smartphone,
  AlertCircle,
} from 'lucide-react';

interface LivePreviewPanelProps {
  initialUrl?: string;
  height: number;
  onHeightChange: (height: number) => void;
  onClose: () => void;
}

type DeviceFrame = 'desktop' | 'tablet' | 'mobile';

export default function LivePreviewPanel({
  initialUrl = 'http://localhost:3000',
  height,
  onHeightChange,
  onClose,
}: LivePreviewPanelProps) {
  const [url, setUrl] = useState(initialUrl);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceFrame, setDeviceFrame] = useState<DeviceFrame>('desktop');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false);
    setError(null);
    try {
      // Try to get the actual URL from iframe (may fail due to CORS)
      const iframeUrl = iframeRef.current?.contentWindow?.location.href;
      if (iframeUrl && iframeUrl !== 'about:blank') {
        setCurrentUrl(iframeUrl);
      }
    } catch (e) {
      // CORS prevents access, that's fine
    }
  };

  // Handle iframe error
  const handleIframeError = () => {
    setIsLoading(false);
    setError('Failed to load preview. Make sure your dev server is running.');
  };

  // Refresh preview
  const handleRefresh = () => {
    if (iframeRef.current) {
      setIsLoading(true);
      setError(null);
      iframeRef.current.src = currentUrl;
    }
  };

  // Navigate to URL
  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setCurrentUrl(url);
  };

  // Open in external browser
  const handleOpenExternal = () => {
    window.open(currentUrl, '_blank');
  };

  // Device frame dimensions
  const getFrameDimensions = () => {
    switch (deviceFrame) {
      case 'mobile':
        return { width: '375px', height: '100%' };
      case 'tablet':
        return { width: '768px', height: '100%' };
      case 'desktop':
      default:
        return { width: '100%', height: '100%' };
    }
  };

  // Resize handlers
  const handleMouseDown = (e: React.MouseEvent) => {
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

  const frameDimensions = getFrameDimensions();

  return (
    <div className="border-t border-border bg-background" style={{ height: `${height}px` }}>
      {/* Resize Handle */}
      <div
        ref={resizeRef}
        onMouseDown={handleMouseDown}
        className="h-1 bg-border hover:bg-accent cursor-row-resize transition-colors"
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1.5 hover:bg-background rounded transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleOpenExternal}
            className="p-1.5 hover:bg-background rounded transition-colors"
            title="Open in browser"
          >
            <ExternalLink size={14} />
          </button>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Device Frame Selector */}
          <button
            onClick={() => setDeviceFrame('desktop')}
            className={`p-1.5 rounded transition-colors ${
              deviceFrame === 'desktop' ? 'bg-accent text-white' : 'hover:bg-background'
            }`}
            title="Desktop"
          >
            <Monitor size={14} />
          </button>
          <button
            onClick={() => setDeviceFrame('tablet')}
            className={`p-1.5 rounded transition-colors ${
              deviceFrame === 'tablet' ? 'bg-accent text-white' : 'hover:bg-background'
            }`}
            title="Tablet"
          >
            <Tablet size={14} />
          </button>
          <button
            onClick={() => setDeviceFrame('mobile')}
            className={`p-1.5 rounded transition-colors ${
              deviceFrame === 'mobile' ? 'bg-accent text-white' : 'hover:bg-background'
            }`}
            title="Mobile"
          >
            <Smartphone size={14} />
          </button>
        </div>

        {/* URL Bar */}
        <form onSubmit={handleNavigate} className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="http://localhost:3000"
            className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:border-accent font-mono"
          />
        </form>

        <div className="flex items-center gap-1">
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-background rounded transition-colors"
            title="Close preview"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="h-[calc(100%-48px)] overflow-auto bg-muted/10 flex items-start justify-center p-4">
        {error ? (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-lg">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        ) : (
          <div
            className="bg-white rounded-lg shadow-xl overflow-hidden transition-all duration-300"
            style={{
              width: frameDimensions.width,
              height: deviceFrame === 'desktop' ? '100%' : frameDimensions.height,
              maxWidth: '100%',
            }}
          >
            <iframe
              ref={iframeRef}
              src={currentUrl}
              className="w-full h-full border-0"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              sandbox="allow-same-origin allow-scripts allow-forms allow-modals allow-popups allow-downloads"
              title="Live Preview"
            />
          </div>
        )}
      </div>
    </div>
  );
}
