import { useRef, useState, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface CodeEditorProps {
  filePath: string;
  initialContent?: string;
  language?: string;
  onSave?: (content: string) => void;
  onChange?: (content: string) => void;
  readOnly?: boolean;
  theme?: 'vs-dark' | 'light';
}

export default function CodeEditor({
  filePath,
  initialContent = '',
  language,
  onSave,
  onChange,
  readOnly = false,
  theme = 'vs-dark',
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [content, setContent] = useState(initialContent);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Auto-detect language from file extension if not provided
  const detectedLanguage = language || detectLanguage(filePath);

  useEffect(() => {
    setContent(initialContent);
    setHasUnsavedChanges(false);
  }, [filePath, initialContent]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Add keyboard shortcut for save (Cmd+S / Ctrl+S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });

    // Configure editor options
    editor.updateOptions({
      fontSize: 13,
      fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace",
      lineNumbers: 'on',
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      automaticLayout: true,
      tabSize: 2,
      insertSpaces: true,
      formatOnPaste: true,
      formatOnType: true,
    });
  };

  const handleEditorChange = (value: string | undefined) => {
    const newContent = value || '';
    setContent(newContent);
    setHasUnsavedChanges(newContent !== initialContent);
    onChange?.(newContent);
  };

  const handleSave = () => {
    if (onSave && hasUnsavedChanges) {
      onSave(content);
      setHasUnsavedChanges(false);
    }
  };

  const formatDocument = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Editor toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-background border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{getFileName(filePath)}</span>
          {hasUnsavedChanges && (
            <span className="text-xs text-muted-foreground">(unsaved)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={formatDocument}
            className="px-3 py-1 text-xs rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
            title="Format Document"
          >
            Format
          </button>
          {onSave && hasUnsavedChanges && (
            <button
              onClick={handleSave}
              className="px-3 py-1 text-xs rounded bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
              title="Save (⌘S)"
            >
              Save
            </button>
          )}
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={detectedLanguage}
          value={content}
          theme={theme}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            readOnly,
          }}
        />
      </div>
    </div>
  );
}

// Helper: Detect language from file extension
function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';

  const languageMap: Record<string, string> = {
    // JavaScript/TypeScript
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',

    // Web
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',

    // Data formats
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    toml: 'toml',

    // Markdown
    md: 'markdown',
    markdown: 'markdown',

    // Config files
    env: 'shell',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',

    // Python
    py: 'python',

    // Other languages
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    swift: 'swift',
    kt: 'kotlin',

    // SQL
    sql: 'sql',

    // Others
    txt: 'plaintext',
  };

  return languageMap[ext] || 'plaintext';
}

// Helper: Get file name from path
function getFileName(filePath: string): string {
  return filePath.split('/').pop() || filePath;
}
