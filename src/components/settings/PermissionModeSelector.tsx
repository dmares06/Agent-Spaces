import React, { useState } from 'react';
import { PermissionMode } from '../../lib/types';

interface PermissionModeSelectorProps {
  currentMode?: PermissionMode;
  onModeChange: (mode: PermissionMode) => Promise<void>;
  showInheritOption?: boolean;
}

interface ModeConfig {
  id: PermissionMode;
  label: string;
  description: string;
  icon: string;
  color: string;
}

const MODE_CONFIGS: ModeConfig[] = [
  {
    id: 'safe',
    label: 'Safe Mode',
    description: 'Read-only operations. Blocks file writes, bash commands, git operations, and network requests.',
    icon: '🔒',
    color: 'green',
  },
  {
    id: 'ask',
    label: 'Ask Mode',
    description: 'Approval required for dangerous operations. Respects session rules and permission memory.',
    icon: '❓',
    color: 'yellow',
  },
  {
    id: 'allow-all',
    label: 'Allow All',
    description: 'Full autonomy. No restrictions on operations. Use with caution.',
    icon: '🚀',
    color: 'red',
  },
  {
    id: 'inherit',
    label: 'Inherit',
    description: 'Use the permission mode from the workspace.',
    icon: '⬆️',
    color: 'gray',
  },
];

export function PermissionModeSelector({
  currentMode = 'ask',
  onModeChange,
  showInheritOption = false,
}: PermissionModeSelectorProps) {
  const [isChanging, setIsChanging] = useState(false);

  const modes = showInheritOption
    ? MODE_CONFIGS
    : MODE_CONFIGS.filter((m) => m.id !== 'inherit');

  const handleModeChange = async (mode: PermissionMode) => {
    if (mode === currentMode || isChanging) return;

    setIsChanging(true);
    try {
      await onModeChange(mode);
    } catch (error) {
      console.error('Failed to change permission mode:', error);
    } finally {
      setIsChanging(false);
    }
  };

  const getCardStyle = (mode: ModeConfig) => {
    const isSelected = mode.id === currentMode;

    const baseStyle = 'relative p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md';

    if (isSelected) {
      if (mode.color === 'green') {
        return `${baseStyle} border-green-500 bg-green-50`;
      } else if (mode.color === 'yellow') {
        return `${baseStyle} border-yellow-500 bg-yellow-50`;
      } else if (mode.color === 'red') {
        return `${baseStyle} border-red-500 bg-red-50`;
      } else {
        return `${baseStyle} border-gray-500 bg-gray-50`;
      }
    }

    return `${baseStyle} border-gray-200 bg-white hover:border-gray-300`;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-900">Permission Mode</h3>
        <p className="text-xs text-gray-600">
          Control what operations this {showInheritOption ? 'agent' : 'workspace'} can perform.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => handleModeChange(mode.id)}
            disabled={isChanging}
            className={getCardStyle(mode)}
          >
            {/* Selected indicator */}
            {mode.id === currentMode && (
              <div className="absolute top-3 right-3">
                <svg
                  className={`w-5 h-5 ${
                    mode.color === 'green'
                      ? 'text-green-600'
                      : mode.color === 'yellow'
                      ? 'text-yellow-600'
                      : mode.color === 'red'
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            )}

            <div className="flex items-start gap-3 text-left">
              <div className="text-2xl flex-shrink-0">{mode.icon}</div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 mb-1">{mode.label}</h4>
                <p className="text-xs text-gray-600 leading-relaxed">{mode.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Information box */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex gap-2">
          <svg
            className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-xs text-blue-800">
            <p className="font-medium mb-1">Permission Memory</p>
            <p>
              In Ask Mode, you can choose to &quot;remember this decision&quot; to avoid repeated
              approvals for similar operations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
