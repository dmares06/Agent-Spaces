import React, { useState, useEffect } from 'react';
import { PermissionCategory } from '../../lib/types';

interface ApprovalRequest {
  id: string;
  category: PermissionCategory;
  operation: string;
  details?: string;
}

interface ApprovalRequestModalProps {
  onApprovalComplete?: () => void;
}

export function ApprovalRequestModal({ onApprovalComplete }: ApprovalRequestModalProps) {
  const [request, setRequest] = useState<ApprovalRequest | null>(null);
  const [remember, setRemember] = useState(false);
  const [pattern, setPattern] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Listen for approval requests
  useEffect(() => {
    const handleRequest = (newRequest: ApprovalRequest) => {
      console.log('[ApprovalModal] Received approval request:', newRequest);
      setRequest(newRequest);
      setRemember(false);
      setPattern(newRequest.operation); // Default pattern to the exact operation
      setIsProcessing(false);
    };

    window.electronAPI.onApprovalRequest(handleRequest);

    return () => {
      window.electronAPI.offApprovalRequest();
    };
  }, []);

  const handleRespond = async (approved: boolean) => {
    if (!request || isProcessing) return;

    setIsProcessing(true);

    try {
      // Send response to backend via IPC
      await window.electronAPI.approval.respond({
        id: request.id,
        approved,
        remember,
        pattern: remember ? pattern : undefined,
      });

      console.log('[ApprovalModal] Sent approval response:', { approved, remember, pattern });

      // Close modal
      setRequest(null);
      onApprovalComplete?.();
    } catch (error) {
      console.error('[ApprovalModal] Failed to send approval response:', error);
      setIsProcessing(false);
    }
  };

  const getCategoryIcon = (category: PermissionCategory) => {
    const icons: Record<PermissionCategory, string> = {
      bash: '💻',
      git: '🔀',
      file_write: '📝',
      file_read: '📖',
      network: '🌐',
      mcp: '🔌',
    };
    return icons[category] || '❓';
  };

  const getCategoryLabel = (category: PermissionCategory) => {
    const labels: Record<PermissionCategory, string> = {
      bash: 'Bash Command',
      git: 'Git Operation',
      file_write: 'File Write',
      file_read: 'File Read',
      network: 'Network Request',
      mcp: 'MCP Server',
    };
    return labels[category] || 'Unknown';
  };

  const getCategoryColor = (category: PermissionCategory) => {
    const colors: Record<PermissionCategory, string> = {
      bash: 'bg-purple-100 text-purple-700 border-purple-200',
      git: 'bg-orange-100 text-orange-700 border-orange-200',
      file_write: 'bg-red-100 text-red-700 border-red-200',
      file_read: 'bg-blue-100 text-blue-700 border-blue-200',
      network: 'bg-green-100 text-green-700 border-green-200',
      mcp: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    };
    return colors[category] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  if (!request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{getCategoryIcon(request.category)}</div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">Permission Required</h2>
              <p className="text-sm text-gray-600">The agent is requesting permission to proceed</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Category Badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${getCategoryColor(request.category)}`}>
            <span>{getCategoryLabel(request.category)}</span>
          </div>

          {/* Operation Details */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Operation</label>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <code className="text-sm text-gray-900 break-all">{request.operation}</code>
            </div>
          </div>

          {request.details && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Details</label>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-700">{request.details}</p>
              </div>
            </div>
          )}

          {/* Remember Decision */}
          <div className="pt-3 border-t border-gray-200">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900 group-hover:text-gray-700">
                  Remember this decision
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Apply this decision to similar operations matching the pattern below
                </p>
              </div>
            </label>

            {remember && (
              <div className="mt-3 ml-7">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Pattern (supports * and ? wildcards)
                </label>
                <input
                  type="text"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  placeholder="e.g., *.txt or /path/to/*"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  Use <code className="px-1 py-0.5 bg-gray-100 rounded">*</code> to match any characters,{' '}
                  <code className="px-1 py-0.5 bg-gray-100 rounded">?</code> to match a single character
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={() => handleRespond(false)}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Deny
          </button>
          <button
            onClick={() => handleRespond(true)}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? 'Processing...' : 'Allow'}
          </button>
        </div>
      </div>
    </div>
  );
}
