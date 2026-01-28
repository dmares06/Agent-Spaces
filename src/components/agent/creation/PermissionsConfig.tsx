import { FileText, FileEdit, Globe, Terminal } from 'lucide-react';

export interface AgentPermissions {
  // Tool execution permissions
  allowFileRead: boolean;
  allowFileWrite: boolean;
  allowNetworkAccess: boolean;
  allowShellCommands: boolean;

  // Resource limits
  maxTokensPerMessage: number;
  maxTokensPerSession: number;
  maxApiCallsPerMinute: number;
  sessionTimeoutMinutes: number;
}

export const DEFAULT_PERMISSIONS: AgentPermissions = {
  allowFileRead: true,
  allowFileWrite: true,
  allowNetworkAccess: false,
  allowShellCommands: false,
  maxTokensPerMessage: 4096,
  maxTokensPerSession: 100000,
  maxApiCallsPerMinute: 20,
  sessionTimeoutMinutes: 30,
};

interface PermissionsConfigProps {
  permissions: AgentPermissions;
  onPermissionsChange: (permissions: AgentPermissions) => void;
}

const TOKEN_OPTIONS = [
  { value: 1024, label: '1,024' },
  { value: 2048, label: '2,048' },
  { value: 4096, label: '4,096' },
  { value: 8192, label: '8,192' },
  { value: 16384, label: '16,384' },
];

const SESSION_TOKEN_OPTIONS = [
  { value: 50000, label: '50,000' },
  { value: 100000, label: '100,000' },
  { value: 250000, label: '250,000' },
  { value: 500000, label: '500,000' },
  { value: 1000000, label: '1,000,000' },
];

const RATE_LIMIT_OPTIONS = [
  { value: 5, label: '5' },
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
];

const TIMEOUT_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 0, label: 'No timeout' },
];

export default function PermissionsConfig({
  permissions,
  onPermissionsChange,
}: PermissionsConfigProps) {
  function updatePermission<K extends keyof AgentPermissions>(
    key: K,
    value: AgentPermissions[K]
  ) {
    onPermissionsChange({ ...permissions, [key]: value });
  }

  return (
    <div className="space-y-4">
      {/* Tool Access */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Tool Access
        </p>
        <div className="space-y-2">
          <label className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={permissions.allowFileRead}
              onChange={(e) => updatePermission('allowFileRead', e.target.checked)}
              className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
            />
            <FileText size={16} className="text-muted-foreground" />
            <div>
              <span className="text-sm text-foreground">Read files</span>
              <p className="text-xs text-muted-foreground">Allow reading files from the workspace</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={permissions.allowFileWrite}
              onChange={(e) => updatePermission('allowFileWrite', e.target.checked)}
              className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
            />
            <FileEdit size={16} className="text-muted-foreground" />
            <div>
              <span className="text-sm text-foreground">Write files</span>
              <p className="text-xs text-muted-foreground">Allow creating and modifying files</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={permissions.allowNetworkAccess}
              onChange={(e) => updatePermission('allowNetworkAccess', e.target.checked)}
              className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
            />
            <Globe size={16} className="text-muted-foreground" />
            <div>
              <span className="text-sm text-foreground">Network access</span>
              <p className="text-xs text-muted-foreground">Allow making API calls and web requests</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={permissions.allowShellCommands}
              onChange={(e) => updatePermission('allowShellCommands', e.target.checked)}
              className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
            />
            <Terminal size={16} className="text-muted-foreground" />
            <div>
              <span className="text-sm text-foreground">Execute shell commands</span>
              <p className="text-xs text-muted-foreground">Allow running terminal commands</p>
            </div>
          </label>
        </div>
      </div>

      {/* Resource Limits */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Resource Limits
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Max tokens/message
            </label>
            <select
              value={permissions.maxTokensPerMessage}
              onChange={(e) =>
                updatePermission('maxTokensPerMessage', Number(e.target.value))
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {TOKEN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Max tokens/session
            </label>
            <select
              value={permissions.maxTokensPerSession}
              onChange={(e) =>
                updatePermission('maxTokensPerSession', Number(e.target.value))
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {SESSION_TOKEN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              API calls/minute
            </label>
            <select
              value={permissions.maxApiCallsPerMinute}
              onChange={(e) =>
                updatePermission('maxApiCallsPerMinute', Number(e.target.value))
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {RATE_LIMIT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Session timeout
            </label>
            <select
              value={permissions.sessionTimeoutMinutes}
              onChange={(e) =>
                updatePermission('sessionTimeoutMinutes', Number(e.target.value))
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {TIMEOUT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
