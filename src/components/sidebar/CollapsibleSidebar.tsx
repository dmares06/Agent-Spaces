import { ReactNode } from 'react';

interface CollapsibleSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export default function CollapsibleSidebar({ isCollapsed, onToggle, children }: CollapsibleSidebarProps) {
  return (
    <div
      className={`${
        isCollapsed ? 'w-16' : 'w-72'
      } border-r border-border/50 flex flex-col bg-card transition-all duration-300 ease-in-out`}
    >
      {/* Sidebar Content */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
