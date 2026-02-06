import { useState, useEffect, useRef } from 'react';
import { electronAPI } from '../../lib/electronAPI';
import ChatMessage, { type Message } from './ChatMessage';
import EnhancedChatInput from './EnhancedChatInput';
import TypingIndicator from './TypingIndicator';
import TaskCreationModal from './TaskCreationModal';
import { ChatStatusDropdown } from './ChatStatusDropdown';
import { ChatFlagButton } from './ChatFlagButton';
import { Bot, AlertCircle, Settings } from 'lucide-react';
import type { Agent, Chat, ToolExecution } from '../../lib/types';

interface ChatPanelProps {
  agent: Agent;
  workspaceId?: string;
  selectedChat?: Chat | null;
  onOpenSettings: () => void;
  onChatUpdated?: () => void;
}

interface StreamingMessage {
  content: string;
  thinkingContent: string;
}

export default function ChatPanel({ agent, workspaceId, selectedChat: selectedChatProp, onOpenSettings, onChatUpdated }: ChatPanelProps) {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null);
  const [streamingToolExecutions, setStreamingToolExecutions] = useState<ToolExecution[]>([]);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [mentionedAgents, setMentionedAgents] = useState<Agent[]>([]);
  const [currentModel, setCurrentModel] = useState(agent.model);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check for API key on mount
  useEffect(() => {
    checkApiKey();
  }, []);

  // Load or create chat based on selectedChat prop and agent
  useEffect(() => {
    async function initializeChat() {
      console.log('[ChatPanel] initializeChat called - selectedChatProp:', selectedChatProp?.id, 'agent:', agent.id, agent.name);

      if (selectedChatProp) {
        // A specific chat was selected - load its messages
        console.log('[ChatPanel] Loading selected chat:', selectedChatProp.id, selectedChatProp.title);
        await loadChatMessages(selectedChatProp);
      } else if (agent) {
        // No specific chat selected, but we have an agent - find or create a chat
        console.log('[ChatPanel] No selected chat, finding/creating for agent:', agent.id);
        await loadOrCreateChat();
      }
    }

    initializeChat();
  }, [selectedChatProp?.id, agent.id]);

  // Set up streaming listener
  useEffect(() => {
    function handleMessageChunk(data: any) {
      if (data.type === 'text') {
        setStreamingMessage((prev) => ({
          content: (prev?.content || '') + data.content,
          thinkingContent: prev?.thinkingContent || '',
        }));
      } else if (data.type === 'thinking') {
        setStreamingMessage((prev) => ({
          content: prev?.content || '',
          thinkingContent: (prev?.thinkingContent || '') + data.content,
        }));
      } else if (data.type === 'tool_use_start') {
        // Tool execution starting
        setStreamingToolExecutions((prev) => [
          ...prev,
          {
            toolUseId: data.toolUseId,
            toolName: data.toolName,
            input: {},
            status: 'executing' as const,
          },
        ]);
      } else if (data.type === 'tool_result') {
        // Tool execution completed
        setStreamingToolExecutions((prev) =>
          prev.map((tool) =>
            tool.toolUseId === data.toolUseId
              ? {
                  ...tool,
                  input: tool.input,
                  result: data.result,
                  isError: data.isError,
                  status: data.isError ? ('error' as const) : ('completed' as const),
                }
              : tool
          )
        );
      } else if (data.type === 'complete') {
        setStreamingMessage(null);
        setStreamingToolExecutions([]);
      } else if (data.type === 'error') {
        setError(data.error);
        setStreamingMessage(null);
        setStreamingToolExecutions([]);
        setSending(false);
      }
    }

    electronAPI.onMessageChunk(handleMessageChunk);

    return () => {
      electronAPI.offMessageChunk();
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage, streamingToolExecutions]);

  async function checkApiKey() {
    try {
      const has = await electronAPI.claude.hasApiKey();
      setHasApiKey(has);
    } catch (error) {
      console.error('Failed to check API key:', error);
    }
  }

  async function loadChatMessages(chatToLoad: Chat) {
    console.log('[ChatPanel] loadChatMessages called for chat:', chatToLoad.id, chatToLoad.title);
    setLoading(true);
    setError(null);

    try {
      setChat(chatToLoad);
      console.log('[ChatPanel] Fetching messages via electronAPI.chat.getMessages...');
      const msgs = await electronAPI.chat.getMessages(chatToLoad.id);
      console.log('[ChatPanel] Loaded', msgs.length, 'messages for chat:', chatToLoad.id);
      if (msgs.length > 0) {
        console.log('[ChatPanel] First message:', msgs[0]);
        console.log('[ChatPanel] Last message:', msgs[msgs.length - 1]);
      }
      setMessages(msgs);
      console.log('[ChatPanel] Messages state updated');
    } catch (error: any) {
      console.error('[ChatPanel] Failed to load chat messages:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      console.log('[ChatPanel] Loading complete, loading state set to false');
    }
  }

  async function loadOrCreateChat() {
    setLoading(true);
    setError(null);

    try {
      // Try to find existing chat for this agent
      // For global chats (no workspace), use listGlobal; otherwise use list
      const chats = workspaceId
        ? await electronAPI.chat.list(workspaceId)
        : await electronAPI.chat.listGlobal();
      const existingChat = chats.find((c: Chat) => c.agent_id === agent.id);

      if (existingChat) {
        setChat(existingChat);
        const msgs = await electronAPI.chat.getMessages(existingChat.id);
        setMessages(msgs);
      } else {
        // Create new chat (workspace_id can be null for global chats)
        const newChat = await electronAPI.chat.create({
          workspace_id: workspaceId || null,
          agent_id: agent.id,
          title: `Chat with ${agent.name}`,
        });
        setChat(newChat);
        setMessages([]);
        // Notify parent that a chat was created
        onChatUpdated?.();
      }
    } catch (error: any) {
      console.error('Failed to load chat:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendMessage(content: string, mentionedAgents?: Agent[], attachedFiles?: File[], browserMode?: boolean) {
    if (!chat || !hasApiKey) return;

    // If agents were mentioned, show task creation modal
    if (mentionedAgents && mentionedAgents.length > 0) {
      setMentionedAgents(mentionedAgents);
      setShowTaskModal(true);
    }

    // Process attached files and include their contents in the message
    let enrichedContent = content;
    if (attachedFiles && attachedFiles.length > 0) {
      enrichedContent += '\n\n**Attached Files:**\n';
      for (const file of attachedFiles) {
        try {
          const text = await file.text();
          enrichedContent += `\n### ${file.name}\n\`\`\`\n${text}\n\`\`\`\n`;
        } catch (error) {
          console.error(`Failed to read file ${file.name}:`, error);
          enrichedContent += `\n### ${file.name}\n[Could not read file contents]\n`;
        }
      }
    }

    // Also include context attachments from the panel
    try {
      const contextAttachments = await electronAPI.attachment.list(chat.id);
      if (contextAttachments && contextAttachments.length > 0) {
        enrichedContent += '\n\n**Context Files (for reference):**\n';
        for (const attachment of contextAttachments) {
          try {
            const fileContent = await electronAPI.files.readFile(attachment.path);
            enrichedContent += `\n### ${attachment.name}\n\`\`\`\n${fileContent}\n\`\`\`\n`;
          } catch (error) {
            console.error(`Failed to read context file ${attachment.name}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load context attachments:', error);
    }

    // Check if this is the first message (for auto-title generation)
    const isFirstMessage = messages.length === 0;
    const hasDefaultTitle = chat.title?.startsWith('Chat with ');

    // Create a temporary user message to show immediately
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };

    // Add user message to UI immediately
    setMessages((prev) => [...prev, tempUserMessage]);

    setSending(true);
    setError(null);
    setStreamingMessage({ content: '', thinkingContent: '' });

    try {
      const result = await electronAPI.chat.sendMessage({
        chat_id: chat.id,
        content: enrichedContent,
        browserMode: browserMode || false,
      });

      // Replace temp message with real ones (user + assistant)
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMessage.id),
        result.userMessage,
        result.assistantMessage,
      ]);

      // Auto-generate title after first message if still has default title
      if (isFirstMessage && hasDefaultTitle) {
        generateChatTitle();
      }
    } catch (error: any) {
      console.error('Failed to send message:', error);
      setError(error.message);
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
    } finally {
      setSending(false);
      setStreamingMessage(null);
    }
  }

  async function generateChatTitle() {
    if (!chat) return;

    try {
      const result = await electronAPI.chat.generateTitle(chat.id);
      if (result.title) {
        // Update local chat state
        setChat((prev) => prev ? { ...prev, title: result.title! } : prev);
        // Notify parent to refresh chat list
        onChatUpdated?.();
      }
    } catch (error) {
      console.error('Failed to generate chat title:', error);
      // Non-critical error - don't show to user
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!hasApiKey) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle size={48} className="text-warning mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            API Key Required
          </h2>
          <p className="text-muted-foreground mb-4">
            Please configure your Anthropic API key in settings to start chatting with Claude.
          </p>
          <button
            onClick={onOpenSettings}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors flex items-center gap-2 mx-auto"
          >
            <Settings size={16} />
            Open Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="px-6 py-3 border-b border-border/30 bg-card flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
          {agent.avatar ? (
            <span className="text-xl">{agent.avatar}</span>
          ) : (
            <Bot size={20} className="text-accent" />
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-foreground">{agent.name}</h2>
          <p className="text-xs text-muted-foreground">
            {agent.description || (agent.thinking_enabled ? 'Extended Thinking' : 'AI Assistant')}
          </p>
        </div>

        {/* Chat Status Controls */}
        {chat && (
          <div className="flex items-center gap-2">
            <ChatStatusDropdown
              chat={chat}
              onStatusChange={() => {
                // Reload messages to refresh chat data
                if (chat.id) {
                  electronAPI.chat.getMessages(chat.id).then(setMessages);
                }
                // Notify parent to refresh chat list
                onChatUpdated?.();
              }}
            />
            <ChatFlagButton
              chat={chat}
              onFlagToggle={() => {
                // Reload messages to refresh chat data
                if (chat.id) {
                  electronAPI.chat.getMessages(chat.id).then(setMessages);
                }
                // Notify parent to refresh chat list
                onChatUpdated?.();
              }}
            />
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !streamingMessage ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <Bot size={48} className="text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Start a conversation
              </h3>
              <p className="text-muted-foreground text-sm">
                {agent.description || `Chat with ${agent.name} to get started.`}
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {/* Typing/Thinking indicator - shows before streaming content arrives */}
            {sending && streamingMessage && !streamingMessage.content && !streamingMessage.thinkingContent && (
              <TypingIndicator isThinking={false} />
            )}

            {/* Thinking indicator - shows when thinking content is streaming but no text yet */}
            {sending && streamingMessage && streamingMessage.thinkingContent && !streamingMessage.content && (
              <TypingIndicator isThinking={true} />
            )}

            {/* Streaming message */}
            {(streamingMessage && (streamingMessage.content || streamingMessage.thinkingContent)) ||
            streamingToolExecutions.length > 0 ? (
              <ChatMessage
                message={{
                  id: 'streaming',
                  role: 'assistant',
                  content: streamingMessage?.content || '...',
                  thinking_content: streamingMessage?.thinkingContent,
                  created_at: new Date().toISOString(),
                }}
                isStreaming={true}
                streamingToolExecutions={streamingToolExecutions}
              />
            ) : null}
          </>
        )}

        {/* Error message */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <EnhancedChatInput
        onSend={handleSendMessage}
        disabled={sending}
        placeholder={`Message ${agent.name}...`}
        workspaceId={workspaceId}
        currentModel={currentModel}
        onModelChange={setCurrentModel}
      />

      {/* Task Creation Modal */}
      {showTaskModal && mentionedAgents.length > 0 && (
        <TaskCreationModal
          mentionedAgents={mentionedAgents}
          workspaceId={workspaceId}
          onClose={() => {
            setShowTaskModal(false);
            setMentionedAgents([]);
          }}
          onTasksCreated={() => {
            // Notify parent to refresh task list
            onChatUpdated?.();
          }}
        />
      )}
    </div>
  );
}
