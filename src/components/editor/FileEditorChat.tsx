import { useState, useEffect, useRef } from 'react';
import { electronAPI } from '../../lib/electronAPI';
import type { OpenFile } from '../../lib/types';
import { AVAILABLE_MODELS, type ModelOption } from '../../lib/types';
import { Send, Loader2, ChevronDown, ChevronRight, Check, Copy } from 'lucide-react';

// Local message type for file editor chat (not persisted to database)
interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking_content?: string;
  created_at: string;
}

interface FileEditorChatProps {
  file: OpenFile;
  workspaceId?: string;
  onApplyEdit: (newContent: string) => void;
}

interface StreamingMessage {
  content: string;
  thinkingContent: string;
}

export default function FileEditorChat({
  file,
  workspaceId,
  onApplyEdit,
}: FileEditorChatProps) {
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelOption>('claude-sonnet-4.5');
  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Setup streaming listener
  useEffect(() => {
    function handleMessageChunk(data: { type: string; content?: string; error?: string }) {
      if (data.type === 'text') {
        setStreamingMessage((prev) => ({
          content: (prev?.content || '') + (data.content || ''),
          thinkingContent: prev?.thinkingContent || '',
        }));
      } else if (data.type === 'thinking') {
        setStreamingMessage((prev) => ({
          content: prev?.content || '',
          thinkingContent: (prev?.thinkingContent || '') + (data.content || ''),
        }));
      } else if (data.type === 'complete') {
        // Add the complete message to history
        if (streamingMessage?.content) {
          const assistantMessage: LocalMessage = {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: streamingMessage.content,
            thinking_content: streamingMessage.thinkingContent || undefined,
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
        setStreamingMessage(null);
        setSending(false);
      } else if (data.type === 'error') {
        setError(data.error || 'An error occurred');
        setStreamingMessage(null);
        setSending(false);
      }
    }

    electronAPI.onMessageChunk(handleMessageChunk);
    return () => {
      electronAPI.offMessageChunk();
    };
  }, [streamingMessage]);

  async function handleSend() {
    if (!input.trim() || sending) return;

    const userMessage: LocalMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);
    setError(null);
    setStreamingMessage({ content: '', thinkingContent: '' });

    // Build file context system prompt
    const systemPrompt = `You are a helpful coding assistant. The user is working on a file and needs your help.

File: ${file.name}
Path: ${file.path}
Language: ${file.language}

Current file content:
\`\`\`${file.language}
${file.content}
\`\`\`

When suggesting code changes:
1. Be specific about what to change and why
2. Wrap code suggestions in code blocks with the language specified
3. If you provide a complete replacement for the file, start the code block with "// FULL FILE" as the first line
4. Keep explanations concise but helpful`;

    const chatHistory = messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    try {
      await electronAPI.chat.sendMessage({
        workspace_id: workspaceId,
        messages: [...chatHistory, { role: 'user', content: input.trim() }],
        system_prompt: systemPrompt,
        model: selectedModel,
        thinking_enabled: selectedModel === 'claude-sonnet-4.5' || selectedModel === 'claude-opus-4.5',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      setSending(false);
      setStreamingMessage(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Extract code blocks from content
  function extractCodeBlocks(content: string): { code: string; isFullFile: boolean }[] {
    const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
    const blocks: { code: string; isFullFile: boolean }[] = [];
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const code = match[1].trim();
      const isFullFile = code.startsWith('// FULL FILE');
      blocks.push({
        code: isFullFile ? code.replace('// FULL FILE\n', '').replace('// FULL FILE', '') : code,
        isFullFile,
      });
    }

    return blocks;
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header with model selector */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground">File Assistant</span>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value as ModelOption)}
          className="text-xs bg-muted border border-border rounded px-2 py-1"
        >
          {AVAILABLE_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && !streamingMessage && (
          <div className="text-center text-sm text-muted-foreground py-8">
            <p>Ask questions about this file or request changes.</p>
            <p className="text-xs mt-1">Examples: "Explain this code", "Add error handling", "Refactor for performance"</p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onApply={(code) => onApplyEdit(code)}
            extractCodeBlocks={extractCodeBlocks}
          />
        ))}

        {streamingMessage && streamingMessage.content && (
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-sm text-foreground whitespace-pre-wrap">
              {streamingMessage.content}
            </div>
          </div>
        )}

        {sending && !streamingMessage?.content && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this file..."
            disabled={sending}
            rows={1}
            className="flex-1 px-3 py-2 text-sm bg-muted border border-border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="px-3 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Message bubble component
interface MessageBubbleProps {
  message: LocalMessage;
  onApply: (code: string) => void;
  extractCodeBlocks: (content: string) => { code: string; isFullFile: boolean }[];
}

function MessageBubble({ message, onApply, extractCodeBlocks }: MessageBubbleProps) {
  const [showThinking, setShowThinking] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const isUser = message.role === 'user';
  const codeBlocks = !isUser ? extractCodeBlocks(message.content) : [];

  async function handleCopy(code: string, index: number) {
    await navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  return (
    <div className={`${isUser ? 'ml-8' : ''}`}>
      <div
        className={`rounded-lg p-3 ${
          isUser ? 'bg-accent/10 text-foreground' : 'bg-muted/50 text-foreground'
        }`}
      >
        {/* Thinking toggle */}
        {!isUser && message.thinking_content && (
          <button
            onClick={() => setShowThinking(!showThinking)}
            className="flex items-center gap-1 text-xs text-muted-foreground mb-2 hover:text-foreground"
          >
            {showThinking ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span>Thinking</span>
          </button>
        )}

        {showThinking && message.thinking_content && (
          <div className="mb-2 p-2 bg-background/50 rounded text-xs text-muted-foreground italic">
            {message.thinking_content}
          </div>
        )}

        {/* Message content */}
        <div className="text-sm whitespace-pre-wrap">{message.content}</div>

        {/* Code blocks with Apply buttons */}
        {codeBlocks.length > 0 && (
          <div className="mt-3 space-y-2">
            {codeBlocks.map((block, index) => (
              <div key={index} className="relative">
                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    onClick={() => handleCopy(block.code, index)}
                    className="p-1 bg-background/80 hover:bg-background rounded text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy code"
                  >
                    {copiedIndex === index ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                  {block.isFullFile && (
                    <button
                      onClick={() => onApply(block.code)}
                      className="px-2 py-0.5 text-xs bg-accent text-white rounded hover:bg-accent/90 transition-colors"
                    >
                      Apply
                    </button>
                  )}
                </div>
                <pre className="bg-background/50 p-3 rounded text-xs overflow-x-auto">
                  <code>{block.code}</code>
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
