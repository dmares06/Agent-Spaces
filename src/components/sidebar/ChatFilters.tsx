import React, { useState } from 'react';
import { ChatStatus, CHAT_STATUS_CONFIG } from '../../lib/types';

interface ChatFiltersProps {
  selectedStatus: ChatStatus | 'all';
  showFlaggedOnly: boolean;
  onStatusChange: (status: ChatStatus | 'all') => void;
  onFlaggedToggle: (showFlagged: boolean) => void;
}

export function ChatFilters({
  selectedStatus,
  showFlaggedOnly,
  onStatusChange,
  onFlaggedToggle,
}: ChatFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeFilterCount = (selectedStatus !== 'all' ? 1 : 0) + (showFlaggedOnly ? 1 : 0);

  return (
    <div className="border-b border-border/50 mb-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-foreground hover:bg-background/50 transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-accent/10 text-accent rounded-full font-medium">
              {activeFilterCount}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 py-3 space-y-3 bg-background/50">
          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">Status</label>
            <div className="space-y-2">
              <button
                onClick={() => onStatusChange('all')}
                className={`w-full px-3 py-2 text-left text-sm rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  selectedStatus === 'all'
                    ? 'bg-card text-foreground font-medium shadow-sm'
                    : 'text-muted-foreground hover:bg-background/80 hover:text-foreground'
                }`}
              >
                All Chats
              </button>
              {CHAT_STATUS_CONFIG.map((config) => {
                // Map status IDs to design token colors
                const statusColorClass =
                  config.id === 'active' ? 'bg-status-active' :
                  config.id === 'todo' ? 'bg-status-todo' :
                  config.id === 'in_progress' ? 'bg-status-progress' :
                  config.id === 'review' ? 'bg-status-review' :
                  config.id === 'done' ? 'bg-status-done' :
                  config.id === 'archived' ? 'bg-status-archived' :
                  'bg-muted-foreground';

                return (
                  <button
                    key={config.id}
                    onClick={() => onStatusChange(config.id)}
                    className={`w-full px-3 py-2 text-left text-sm rounded-md flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      selectedStatus === config.id
                        ? 'bg-card text-foreground font-medium shadow-sm'
                        : 'text-muted-foreground hover:bg-background/80 hover:text-foreground'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${statusColorClass}`} />
                    <span>{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Flagged Filter */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">Flagged</label>
            <button
              onClick={() => onFlaggedToggle(!showFlaggedOnly)}
              className={`w-full px-3 py-2 text-left text-sm rounded-md flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                showFlaggedOnly
                  ? 'bg-card text-foreground font-medium shadow-sm'
                  : 'text-muted-foreground hover:bg-background/80 hover:text-foreground'
              }`}
            >
              <svg
                className={`w-4 h-4 ${showFlaggedOnly ? 'text-status-progress' : 'text-muted-foreground'}`}
                fill={showFlaggedOnly ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                />
              </svg>
              <span>Show Flagged Only</span>
            </button>
          </div>

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                onStatusChange('all');
                onFlaggedToggle(false);
              }}
              className="w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors rounded-md hover:bg-background/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
