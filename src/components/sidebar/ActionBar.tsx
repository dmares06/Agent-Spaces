import { MessageSquarePlus, BookOpen } from 'lucide-react';

interface ActionBarProps {
  onNewChat: () => void;
  onAgentLibrary: () => void;
  isCollapsed?: boolean;
}

export default function ActionBar({ onNewChat, onAgentLibrary, isCollapsed }: ActionBarProps) {
  if (isCollapsed) {
    return (
      <div className="p-2 space-y-2 border-b border-border/50">
        <button
          onClick={onNewChat}
          className="w-full p-2 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors flex items-center justify-center"
          title="New Chat"
        >
          <MessageSquarePlus size={18} />
        </button>
        <button
          onClick={onAgentLibrary}
          className="w-full p-2 rounded-lg border border-border hover:bg-muted transition-colors flex items-center justify-center"
          title="Agent Library"
        >
          <BookOpen size={18} className="text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 pb-2 space-y-1.5 border-b border-border/50">
      <button
        onClick={onNewChat}
        className="w-full px-3 py-2 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors flex items-center justify-center gap-2 text-xs font-medium"
      >
        <MessageSquarePlus size={16} />
        <span>New Chat</span>
      </button>
      <button
        onClick={onAgentLibrary}
        className="w-full px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors flex items-center justify-center gap-2 text-xs font-medium text-foreground"
      >
        <BookOpen size={16} />
        <span>Agent Library</span>
      </button>
    </div>
  );
}
