import { useState } from 'react';
import {
  User,
  Bot,
  ChevronDown,
  ChevronRight,
  Brain,
  Wrench,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import type { ToolExecution } from '../../lib/types';
import ScreenshotDisplay from './ScreenshotDisplay';
import DiffViewer from './DiffViewer';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking_content?: string;
  created_at: string;
}

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  streamingToolExecutions?: ToolExecution[];
}

export default function ChatMessage({
  message,
  isStreaming,
  streamingToolExecutions,
}: ChatMessageProps) {
  const [showThinking, setShowThinking] = useState(false);
  const [showTools, setShowTools] = useState(true);
  const isUser = message.role === 'user';

  const toolExecutions = streamingToolExecutions || [];

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-accent' : 'bg-muted'
        }`}
      >
        {isUser ? (
          <User size={16} className="text-white" />
        ) : (
          <Bot size={16} className="text-foreground" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        {/* Thinking content (for assistant) */}
        {!isUser && message.thinking_content && (
          <button
            onClick={() => setShowThinking(!showThinking)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-1 transition-colors"
          >
            {showThinking ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Brain size={14} />
            <span>Thinking</span>
          </button>
        )}

        {showThinking && message.thinking_content && (
          <div className="mb-2 p-3 bg-muted/50 rounded-lg border border-border text-sm text-muted-foreground whitespace-pre-wrap">
            {message.thinking_content}
          </div>
        )}

        {/* Tool Executions */}
        {!isUser && toolExecutions.length > 0 && (
          <div className="mb-2 text-left">
            <button
              onClick={() => setShowTools(!showTools)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-1 transition-colors"
            >
              {showTools ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Wrench size={14} />
              <span>Tools ({toolExecutions.length})</span>
            </button>

            {showTools && (
              <div className="space-y-2">
                {toolExecutions.map((execution) => (
                  <ToolExecutionCard key={execution.toolUseId} execution={execution} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`inline-block px-4 py-2 rounded-2xl ${
            isUser
              ? 'bg-accent text-white rounded-tr-md'
              : 'bg-muted text-foreground rounded-tl-md'
          }`}
        >
          <div className="whitespace-pre-wrap text-sm">
            {message.content}
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
            )}
          </div>
        </div>

        {/* Timestamp */}
        <div className="mt-1 text-xs text-muted-foreground">
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}

// Tool Execution Card Component
interface ToolExecutionCardProps {
  execution: ToolExecution;
}

function ToolExecutionCard({ execution }: ToolExecutionCardProps) {
  const [expanded, setExpanded] = useState(false);

  const toolNameDisplay: Record<string, string> = {
    create_task: 'Create Task',
    update_task: 'Update Task',
    attach_file: 'Attach File',
    read_file: 'Read File',
    browser_navigate: 'Navigate',
    browser_click: 'Click Element',
    browser_fill_form: 'Fill Form',
    browser_screenshot: 'Screenshot',
    browser_read_content: 'Read Page Content',
    browser_wait: 'Wait for Element',
  };

  const statusIcon = {
    pending: <Loader2 size={14} className="animate-spin text-muted-foreground" />,
    executing: <Loader2 size={14} className="animate-spin text-accent" />,
    completed: <CheckCircle size={14} className="text-green-500" />,
    error: <XCircle size={14} className="text-destructive" />,
  };

  // Parse result to show a summary
  let resultSummary = '';
  let screenshotPath: string | null = null;
  let diffData: { filePath: string; oldContent: string; newContent: string; language: string } | null = null;

  if (execution.result) {
    try {
      const parsed = JSON.parse(execution.result);

      // Check for screenshot
      if (parsed.screenshotPath && execution.toolName === 'browser_screenshot') {
        screenshotPath = parsed.screenshotPath;
        resultSummary = 'Screenshot captured';
      }
      // Check for diff data (file edits)
      else if (parsed.filePath && parsed.oldContent !== undefined && parsed.newContent !== undefined) {
        diffData = {
          filePath: parsed.filePath,
          oldContent: parsed.oldContent,
          newContent: parsed.newContent,
          language: parsed.language || 'typescript',
        };
        resultSummary = `File ${parsed.filePath} modified`;
      }
      // Standard result parsing
      else if (parsed.message) {
        resultSummary = parsed.message;
      } else if (parsed.error) {
        resultSummary = parsed.error;
      } else if (parsed.success) {
        resultSummary = 'Success';
      }
    } catch {
      resultSummary = execution.result.substring(0, 50);
    }
  }

  return (
    <div className="p-2 bg-muted/30 rounded-lg border border-border/50">
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {statusIcon[execution.status]}
        <span className="text-xs font-medium text-foreground">
          {toolNameDisplay[execution.toolName] || execution.toolName}
        </span>
        {resultSummary && !expanded && (
          <span className="text-xs text-muted-foreground truncate flex-1">
            - {resultSummary}
          </span>
        )}
        {expanded ? (
          <ChevronDown size={12} className="text-muted-foreground" />
        ) : (
          <ChevronRight size={12} className="text-muted-foreground" />
        )}
      </div>

      {expanded && (
        <div className="mt-2 space-y-2">
          {/* Screenshot Display */}
          {screenshotPath && (
            <div className="mt-2">
              <ScreenshotDisplay screenshotPath={screenshotPath} />
            </div>
          )}

          {/* Diff Viewer */}
          {diffData && (
            <div className="mt-2">
              <DiffViewer
                filePath={diffData.filePath}
                oldContent={diffData.oldContent}
                newContent={diffData.newContent}
                language={diffData.language}
              />
            </div>
          )}

          {/* Standard Input/Result Display */}
          {!screenshotPath && !diffData && (
            <>
              <div className="text-xs">
                <span className="text-muted-foreground">Input:</span>
                <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto max-h-32">
                  {JSON.stringify(execution.input, null, 2)}
                </pre>
              </div>
              {execution.result && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Result:</span>
                  <pre
                    className={`mt-1 p-2 rounded text-xs overflow-x-auto max-h-32 ${
                      execution.isError
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-green-500/10 text-green-700 dark:text-green-400'
                    }`}
                  >
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(execution.result), null, 2);
                      } catch {
                        return execution.result;
                      }
                    })()}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
