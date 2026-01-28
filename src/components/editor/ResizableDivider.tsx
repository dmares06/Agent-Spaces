import { useCallback, useEffect, useState } from 'react';

interface ResizableDividerProps {
  onResize: (ratio: number) => void;
  minRatio?: number;
  maxRatio?: number;
}

export default function ResizableDivider({
  onResize,
  minRatio = 0.2,
  maxRatio = 0.8,
}: ResizableDividerProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const container = document.getElementById('editor-layout-container');
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const relativeY = e.clientY - containerRect.top;
      let ratio = relativeY / containerRect.height;

      // Clamp to min/max
      ratio = Math.max(minRatio, Math.min(maxRatio, ratio));

      onResize(ratio);
    },
    [isDragging, onResize, minRatio, maxRatio]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      className={`h-1 bg-border hover:bg-accent cursor-row-resize transition-colors ${
        isDragging ? 'bg-accent' : ''
      }`}
      onMouseDown={handleMouseDown}
    />
  );
}
