import { useState } from 'react';
import { diffLines } from 'diff';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface DiffViewerProps {
  filePath: string;
  oldContent: string;
  newContent: string;
  language?: string;
}

export default function DiffViewer({
  filePath,
  oldContent,
  newContent,
  language = 'typescript',
}: DiffViewerProps) {
  const [showFullDiff, setShowFullDiff] = useState(false);
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');

  const diff = diffLines(oldContent, newContent);

  // Count changes
  const addedLines = diff.filter((part) => part.added).reduce((sum, part) => sum + part.count!, 0);
  const removedLines = diff.filter((part) => part.removed).reduce((sum, part) => sum + part.count!, 0);

  return (
    <div className="w-full border border-border rounded-lg overflow-hidden bg-muted/30">
      {/* Header */}
      <div className="bg-muted px-3 py-2 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFullDiff(!showFullDiff)}
              className="flex items-center gap-1 text-xs text-foreground hover:text-accent transition-colors"
            >
              {showFullDiff ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span className="font-mono">{filePath}</span>
            </button>
            <span className="text-xs text-green-500">+{addedLines}</span>
            <span className="text-xs text-destructive">-{removedLines}</span>
          </div>

          {showFullDiff && (
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode('unified')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  viewMode === 'unified'
                    ? 'bg-accent text-white'
                    : 'bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                Unified
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  viewMode === 'split'
                    ? 'bg-accent text-white'
                    : 'bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                Split
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Diff Content */}
      {showFullDiff && (
        <div className="max-h-[500px] overflow-auto">
          {viewMode === 'unified' ? (
            <UnifiedDiffView diff={diff} language={language} />
          ) : (
            <SplitDiffView oldContent={oldContent} newContent={newContent} language={language} />
          )}
        </div>
      )}
    </div>
  );
}

// Unified Diff View
function UnifiedDiffView({ diff }: { diff: any[]; language: string }) {
  return (
    <div className="font-mono text-xs">
      {diff.map((part, index) => {
        const lines = part.value.split('\n').filter((line: string) => line !== '');

        return lines.map((line: string, lineIndex: number) => (
          <div
            key={`${index}-${lineIndex}`}
            className={`px-3 py-0.5 ${
              part.added
                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                : part.removed
                ? 'bg-destructive/10 text-destructive'
                : 'bg-background text-muted-foreground'
            }`}
          >
            <span className="select-none mr-2">
              {part.added ? '+' : part.removed ? '-' : ' '}
            </span>
            <span>{line}</span>
          </div>
        ));
      })}
    </div>
  );
}

// Split Diff View
function SplitDiffView({
  oldContent,
  newContent,
  language,
}: {
  oldContent: string;
  newContent: string;
  language: string;
}) {
  return (
    <div className="grid grid-cols-2 divide-x divide-border">
      {/* Old Content */}
      <div className="overflow-auto">
        <div className="bg-destructive/10 px-3 py-1 text-xs text-destructive font-semibold border-b border-border">
          Original
        </div>
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: '12px',
            background: 'transparent',
            fontSize: '11px',
          }}
          showLineNumbers
        >
          {oldContent}
        </SyntaxHighlighter>
      </div>

      {/* New Content */}
      <div className="overflow-auto">
        <div className="bg-green-500/10 px-3 py-1 text-xs text-green-600 dark:text-green-400 font-semibold border-b border-border">
          Modified
        </div>
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: '12px',
            background: 'transparent',
            fontSize: '11px',
          }}
          showLineNumbers
        >
          {newContent}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
