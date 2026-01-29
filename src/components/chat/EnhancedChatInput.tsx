import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Loader2,
  Paperclip,
  X,
  AtSign,
  Folder,
  Image as ImageIcon,
  Globe,
  ChevronDown,
  ArrowUp,
} from 'lucide-react';
import { electronAPI } from '../../lib/electronAPI';
import { type Agent } from '../../lib/types';
import { AVAILABLE_MODELS } from '../../lib/types';
import AgentMentionDropdown from './AgentMentionDropdown';

interface EnhancedChatInputProps {
  onSend: (message: string, mentionedAgents?: Agent[], attachedFiles?: File[], browserMode?: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  workspaceId?: string;
  currentModel: string;
  onModelChange: (modelId: string) => void;
}

export default function EnhancedChatInput({
  onSend,
  disabled,
  placeholder,
  workspaceId,
  currentModel,
  onModelChange,
}: EnhancedChatInputProps) {
  const [message, setMessage] = useState('');
  const [browserMode, setBrowserMode] = useState(false);
  const [contextUsage, setContextUsage] = useState(0);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [agents, setAgents] = useState<Agent[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const selectedModelInfo = AVAILABLE_MODELS.find((m) => m.id === currentModel);

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
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  // Calculate context usage (simplified - should be calculated from actual token usage)
  useEffect(() => {
    // Estimate tokens: ~4 characters per token
    const estimatedTokens = message.length / 4;
    const maxTokens = 200000; // Context window
    const usage = Math.min((estimatedTokens / maxTokens) * 100, 100);
    setContextUsage(Math.round(usage));
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
      if (!/\s/.test(query)) {
        setShowMentions(true);
        setMentionQuery(query);

        const textarea = textareaRef.current;
        if (textarea) {
          const rect = textarea.getBoundingClientRect();
          setMentionPosition({
            top: rect.top - 200,
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
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const beforeCursor = message.substring(0, cursorPos);
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    const afterCursor = message.substring(cursorPos);

    const newMessage = message.substring(0, lastAtIndex) + `@${agent.name} ` + afterCursor;
    setMessage(newMessage);
    setShowMentions(false);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = lastAtIndex + agent.name.length + 2;
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
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
      attachedFiles.length > 0 ? attachedFiles : undefined,
      browserMode
    );
    setMessage('');
    setAttachedFiles([]);
    setShowMentions(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (showMentions && ['ArrowUp', 'ArrowDown', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function insertMention() {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const newMessage = message.substring(0, cursorPos) + '@' + message.substring(cursorPos);
    setMessage(newMessage);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPos + 1, cursorPos + 1);
    }, 0);
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-border bg-background">
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
        <div className="px-4 pt-3 flex flex-wrap gap-2">
          {attachedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs"
            >
              <Paperclip size={12} className="text-muted-foreground" />
              <span className="text-foreground">{file.name}</span>
              <span className="text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Input Container */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 bg-muted/30 border border-border rounded-lg px-3 py-2">
          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={imageInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Model Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              className="flex items-center gap-1.5 px-2 py-1 text-xs rounded hover:bg-background/80 transition-colors"
            >
              <span className="text-muted-foreground">🤖</span>
              <span className="text-foreground font-medium">
                {selectedModelInfo?.name.replace('Claude ', '') || currentModel}
              </span>
              <ChevronDown size={12} className="text-muted-foreground" />
            </button>

            {showModelDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowModelDropdown(false)} />
                <div className="absolute bottom-full left-0 mb-2 w-64 bg-card border border-border rounded-lg shadow-lg z-20 max-h-80 overflow-y-auto">
                  <div className="p-1 space-y-0.5">
                    {AVAILABLE_MODELS.map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => {
                          onModelChange(model.id);
                          setShowModelDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                          currentModel === model.id
                            ? 'bg-accent text-white'
                            : 'hover:bg-background/80'
                        }`}
                      >
                        <div className="font-medium">{model.name}</div>
                        <div className="text-[10px] opacity-70 mt-0.5">{model.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="w-px h-4 bg-border" />

          {/* Text Input */}
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder || 'Plan, @ for context, / for commands'}
              disabled={disabled}
              rows={1}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Right Side Icons */}
          <div className="flex items-center gap-1">
            {/* @ Mention */}
            <button
              type="button"
              onClick={insertMention}
              disabled={disabled}
              className="p-1.5 rounded hover:bg-background/80 transition-colors disabled:opacity-50"
              title="Mention agent (@)"
            >
              <AtSign size={16} className="text-muted-foreground" />
            </button>

            {/* Folder/Files */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="p-1.5 rounded hover:bg-background/80 transition-colors disabled:opacity-50"
              title="Attach files"
            >
              <Folder size={16} className="text-muted-foreground" />
            </button>

            {/* Image */}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={disabled}
              className="p-1.5 rounded hover:bg-background/80 transition-colors disabled:opacity-50"
              title="Attach images"
            >
              <ImageIcon size={16} className="text-muted-foreground" />
            </button>

            {/* Browser Mode */}
            <button
              type="button"
              onClick={() => setBrowserMode(!browserMode)}
              disabled={disabled}
              className={`p-1.5 rounded transition-colors disabled:opacity-50 ${
                browserMode
                  ? 'bg-accent/20 text-accent'
                  : 'hover:bg-background/80 text-muted-foreground'
              }`}
              title={browserMode ? 'Browser mode: ON' : 'Browser mode: OFF'}
            >
              <Globe size={16} />
            </button>

            <div className="w-px h-4 bg-border" />

            {/* Context Usage */}
            <div className="flex items-center gap-1 px-2">
              <span className="text-[10px] text-muted-foreground">{contextUsage}%</span>
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={(!message.trim() && attachedFiles.length === 0) || disabled}
              className="p-1.5 bg-accent text-white rounded hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Send (Enter)"
            >
              {disabled ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ArrowUp size={16} />
              )}
            </button>
          </div>
        </div>

        {/* Browser Mode Indicator */}
        {browserMode && (
          <div className="mt-2 flex items-center gap-2 text-xs text-accent">
            <Globe size={12} />
            <span>Browser control enabled - Agent can interact with web pages</span>
          </div>
        )}

        {/* Hint Text */}
        <div className="mt-2 text-[10px] text-muted-foreground text-center">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </form>
  );
}
