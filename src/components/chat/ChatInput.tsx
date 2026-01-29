import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Paperclip, X, Terminal } from 'lucide-react';
import { electronAPI } from '../../lib/electronAPI';
import { type Agent } from '../../lib/types';
import AgentMentionDropdown from './AgentMentionDropdown';

interface ChatInputProps {
  onSend: (message: string, mentionedAgents?: Agent[], attachedFiles?: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
  workspaceId?: string;
  onTerminalToggle?: () => void;
}

export default function ChatInput({ onSend, disabled, placeholder, workspaceId, onTerminalToggle }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [agents, setAgents] = useState<Agent[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  // Load agents
  useEffect(() => {
    async function loadAgents() {
      try {
        if (workspaceId) {
          const [workspaceAgents, globalAgents] = await Promise.all([
            electronAPI.agent.list(workspaceId),
            electronAPI.agent.listGlobal(),
          ]);
          setAgents([...workspaceAgents, ...globalAgents]);
        } else {
          const globalAgents = await electronAPI.agent.listGlobal();
          setAgents(globalAgents);
        }
      } catch (error) {
        console.error('Failed to load agents:', error);
      }
    }
    loadAgents();
  }, [workspaceId]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;

    setMessage(value);

    // Detect @ mentions
    const beforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = beforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const query = beforeCursor.substring(lastAtIndex + 1);
      // Check if there's no space after @
      if (!/\s/.test(query)) {
        setShowMentions(true);
        setMentionQuery(query);

        // Calculate dropdown position
        const textarea = textareaRef.current;
        if (textarea) {
          const rect = textarea.getBoundingClientRect();
          setMentionPosition({
            top: rect.top - 200, // Position above the textarea
            left: rect.left,
          });
        }
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  }

  function handleAgentSelect(agent: Agent) {
    // Replace @query with @agentName
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const beforeCursor = message.substring(0, cursorPos);
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    const afterCursor = message.substring(cursorPos);

    const newMessage = message.substring(0, lastAtIndex) + `@${agent.name} ` + afterCursor;
    setMessage(newMessage);
    setShowMentions(false);

    // Focus back on textarea
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = lastAtIndex + agent.name.length + 2; // +2 for @ and space
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }

  function extractMentions(): Agent[] {
    const mentionRegex = /@(\w+)/g;
    const mentions = [...message.matchAll(mentionRegex)].map((m) => m[1]);
    const uniqueMentions = [...new Set(mentions)];

    return agents.filter((agent) =>
      uniqueMentions.some((mention) => agent.name.toLowerCase() === mention.toLowerCase())
    );
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setAttachedFiles((prev) => [...prev, ...files]);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function removeFile(index: number) {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if ((!message.trim() && attachedFiles.length === 0) || disabled) return;

    const mentionedAgents = extractMentions();
    onSend(
      message.trim(),
      mentionedAgents.length > 0 ? mentionedAgents : undefined,
      attachedFiles.length > 0 ? attachedFiles : undefined
    );
    setMessage('');
    setAttachedFiles([]);
    setShowMentions(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Let AgentMentionDropdown handle keys if it's open
    if (showMentions && ['ArrowUp', 'ArrowDown', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-card">
      {/* Agent Mention Dropdown */}
      {showMentions && agents.length > 0 && (
        <AgentMentionDropdown
          agents={agents}
          query={mentionQuery}
          onSelect={handleAgentSelect}
          onClose={() => setShowMentions(false)}
          position={mentionPosition}
        />
      )}

      {/* Attached Files */}
      {attachedFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-1.5 bg-muted border border-border rounded-lg text-sm"
            >
              <Paperclip size={14} className="text-muted-foreground" />
              <span className="text-foreground">{file.name}</span>
              <span className="text-muted-foreground">
                ({(file.size / 1024).toFixed(1)} KB)
              </span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* File upload button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="p-3 border border-border rounded-xl hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Attach files"
        >
          <Paperclip size={20} className="text-foreground" />
        </button>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || 'Type a message... (use @ to mention agents)'}
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Terminal toggle button */}
        {onTerminalToggle && (
          <button
            type="button"
            onClick={onTerminalToggle}
            disabled={disabled}
            className="p-3 rounded-xl transition-colors border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            title="Toggle Terminal (Ctrl+`)"
          >
            <Terminal size={20} className="text-foreground" />
          </button>
        )}

        <button
          type="submit"
          disabled={(!message.trim() && attachedFiles.length === 0) || disabled}
          className="p-3 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {disabled ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Send size={20} />
          )}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground text-center">
        Press Enter to send, Shift+Enter for new line
      </p>
    </form>
  );
}
