import { useEffect, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { OpenFile } from '../../lib/types';
import FileEditorToolbar from './FileEditorToolbar';

interface FileEditorProps {
  file: OpenFile;
  onChange: (content: string) => void;
  onSave: () => Promise<void>;
  onClose: () => void;
  saving?: boolean;
}

export default function FileEditor({
  file,
  onChange,
  onSave,
  onClose,
  saving = false,
}: FileEditorProps) {
  const editorRef = useRef<any>(null);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;

    // Add keyboard shortcut for save
    editor.addCommand(
      // Cmd/Ctrl + S
      2048 | 49, // KeyMod.CtrlCmd | KeyCode.KeyS
      () => {
        onSave();
      }
    );
  };

  // Update editor content when file changes externally
  useEffect(() => {
    if (editorRef.current) {
      const currentValue = editorRef.current.getValue();
      if (currentValue !== file.content) {
        editorRef.current.setValue(file.content);
      }
    }
  }, [file.path]); // Only re-sync when file path changes (new file opened)

  return (
    <div className="flex flex-col h-full">
      <FileEditorToolbar
        file={file}
        onSave={onSave}
        onClose={onClose}
        saving={saving}
      />
      <div className="flex-1">
        <Editor
          height="100%"
          language={file.language}
          value={file.content}
          theme="vs-dark"
          onChange={(value) => onChange(value || '')}
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: true },
            fontSize: 13,
            fontFamily: "'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
            wordWrap: 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            folding: true,
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            tabSize: 2,
            insertSpaces: true,
            bracketPairColorization: { enabled: true },
            scrollbar: {
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
            padding: { top: 10 },
          }}
        />
      </div>
    </div>
  );
}
