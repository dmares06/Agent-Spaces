import { useState, useEffect } from 'react';
import { ExternalLink, Download, Maximize2 } from 'lucide-react';

interface ScreenshotDisplayProps {
  screenshotPath: string;
  fileName?: string;
}

export default function ScreenshotDisplay({ screenshotPath, fileName }: ScreenshotDisplayProps) {
  const [imageData, setImageData] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadImage();
  }, [screenshotPath]);

  const loadImage = async () => {
    try {
      const data = await window.electronAPI.file.readImageAsBase64(screenshotPath);
      setImageData(data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load screenshot:', err);
      setError(err.message || 'Failed to load image');
    }
  };

  const handleDownload = () => {
    if (imageData) {
      const link = document.createElement('a');
      link.href = imageData;
      link.download = fileName || 'screenshot.png';
      link.click();
    }
  };

  const handleOpenExternal = async () => {
    try {
      await window.electronAPI.file.openExternal(screenshotPath);
    } catch (err) {
      console.error('Failed to open screenshot:', err);
    }
  };

  if (error) {
    return (
      <div className="border border-border rounded-lg p-4 bg-muted/30">
        <p className="text-sm text-destructive">Failed to load screenshot: {error}</p>
        <p className="text-xs text-muted-foreground mt-1 font-mono">{screenshotPath}</p>
      </div>
    );
  }

  if (!imageData) {
    return (
      <div className="border border-border rounded-lg p-4 bg-muted/30">
        <div className="animate-pulse">
          <div className="h-48 bg-muted rounded"></div>
          <p className="text-sm text-muted-foreground mt-2">Loading screenshot...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
        {/* Header */}
        <div className="bg-muted px-3 py-2 border-b border-border flex items-center justify-between">
          <span className="text-xs font-mono text-foreground">
            {fileName || screenshotPath.split('/').pop()}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-1 hover:bg-background rounded transition-colors"
              title="View full size"
            >
              <Maximize2 size={14} className="text-muted-foreground" />
            </button>
            <button
              onClick={handleDownload}
              className="p-1 hover:bg-background rounded transition-colors"
              title="Download"
            >
              <Download size={14} className="text-muted-foreground" />
            </button>
            <button
              onClick={handleOpenExternal}
              className="p-1 hover:bg-background rounded transition-colors"
              title="Open in default app"
            >
              <ExternalLink size={14} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Image */}
        <div className="p-2">
          <img
            src={imageData}
            alt="Screenshot"
            className="w-full h-auto max-h-[400px] object-contain rounded cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setIsModalOpen(true)}
          />
        </div>
      </div>

      {/* Full Size Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div className="relative max-w-7xl max-h-full">
            <img
              src={imageData}
              alt="Screenshot"
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 px-4 py-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
