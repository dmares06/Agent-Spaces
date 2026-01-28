import { Bot } from 'lucide-react';

interface TypingIndicatorProps {
  isThinking?: boolean;
}

export default function TypingIndicator({ isThinking = false }: TypingIndicatorProps) {
  return (
    <div className="flex items-start gap-3 p-4">
      {/* Agent avatar */}
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
        <Bot size={16} className="text-muted-foreground" />
      </div>

      {/* Indicator bubble */}
      <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {isThinking ? 'Thinking' : 'Typing'}
          </span>
          {/* Animated dots */}
          <span className="flex gap-1">
            <span
              className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
              style={{ animationDelay: '0ms', animationDuration: '600ms' }}
            />
            <span
              className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
              style={{ animationDelay: '150ms', animationDuration: '600ms' }}
            />
            <span
              className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
              style={{ animationDelay: '300ms', animationDuration: '600ms' }}
            />
          </span>
        </div>
      </div>
    </div>
  );
}
