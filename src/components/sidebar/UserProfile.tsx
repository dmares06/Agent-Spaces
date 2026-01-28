import { User, Settings, Monitor } from 'lucide-react';

interface UserProfileProps {
  onSettingsClick: () => void;
  isCollapsed?: boolean;
}

export default function UserProfile({ onSettingsClick, isCollapsed }: UserProfileProps) {
  if (isCollapsed) {
    return (
      <div className="p-2 border-t border-border/50">
        <button
          onClick={onSettingsClick}
          className="w-full p-2 rounded-lg hover:bg-muted transition-colors flex items-center justify-center"
          title="Settings"
        >
          <Settings size={18} className="text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-border/50 bg-background">
      <div className="flex items-center gap-3">
        {/* User Avatar */}
        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
          <User size={20} className="text-accent" />
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate">
            User
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Monitor size={12} />
            <span>Desktop Mode</span>
          </div>
        </div>

        {/* Settings Button */}
        <button
          onClick={onSettingsClick}
          className="p-2 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
          title="Settings"
        >
          <Settings size={18} className="text-muted-foreground hover:text-foreground" />
        </button>
      </div>
    </div>
  );
}
