import { useState, useEffect } from 'react';
import { Github, Key, Loader2, CheckCircle, XCircle, FolderOpen, GitBranch, LogOut } from 'lucide-react';
import { electronAPI } from '../../../lib/electronAPI';

interface ConnectionStatus {
  connected: boolean;
  user?: string;
  testing: boolean;
  error?: string;
}

export default function GitHubSection() {
  const [token, setToken] = useState('');
  const [hasToken, setHasToken] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    testing: false,
  });
  const [saving, setSaving] = useState(false);

  // Clone form state
  const [repoUrl, setRepoUrl] = useState('');
  const [targetPath, setTargetPath] = useState('');
  const [cloning, setCloning] = useState(false);
  const [cloneResult, setCloneResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    checkToken();
  }, []);

  async function checkToken() {
    try {
      const has = await electronAPI.github.hasToken();
      setHasToken(has);
      if (has) {
        setToken('ghp_••••••••••••••••••••••••••••••••••••');
        // Auto-test connection if token exists
        await testConnection();
      }
    } catch (error) {
      console.error('Failed to check GitHub token:', error);
    }
  }

  async function testConnection() {
    setConnectionStatus((prev) => ({ ...prev, testing: true, error: undefined }));

    try {
      const result = await electronAPI.github.testConnection();
      setConnectionStatus({
        connected: result.success,
        user: result.user,
        testing: false,
        error: result.error,
      });
    } catch (error: any) {
      setConnectionStatus({
        connected: false,
        testing: false,
        error: error.message,
      });
    }
  }

  async function handleSaveToken() {
    if (!token || token.includes('••')) return;

    setSaving(true);
    try {
      await electronAPI.github.setToken(token);
      setHasToken(true);
      setToken('ghp_••••••••••••••••••••••••••••••••••••');
      await testConnection();
    } catch (error: any) {
      console.error('Failed to save GitHub token:', error);
      setConnectionStatus({
        connected: false,
        testing: false,
        error: error.message,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect from GitHub? This will remove your stored token.')) return;

    try {
      await electronAPI.github.disconnect();
      setHasToken(false);
      setToken('');
      setConnectionStatus({ connected: false, testing: false });
    } catch (error) {
      console.error('Failed to disconnect from GitHub:', error);
    }
  }

  async function handleBrowseFolder() {
    try {
      const path = await electronAPI.system.selectFolder();
      if (path) {
        setTargetPath(path);
      }
    } catch (error) {
      console.error('Failed to browse folder:', error);
    }
  }

  async function handleClone() {
    if (!repoUrl.trim() || !targetPath.trim()) return;

    setCloning(true);
    setCloneResult(null);

    try {
      const result = await electronAPI.github.cloneRepo(repoUrl.trim(), targetPath.trim());
      if (result.success) {
        setCloneResult({ success: true, message: `Cloned to ${result.path}` });
        setRepoUrl('');
        setTargetPath('');
      } else {
        setCloneResult({ success: false, message: result.error || 'Clone failed' });
      }
    } catch (error: any) {
      setCloneResult({ success: false, message: error.message });
    } finally {
      setCloning(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Connection Status Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Github size={16} />
            GitHub Connection
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Connect with a Personal Access Token to clone repositories and create pull requests
          </p>
        </div>

        {/* Token Input */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Key size={14} />
            Personal Access Token
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setConnectionStatus((prev) => ({ ...prev, error: undefined }));
              }}
              placeholder="ghp_..."
              className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
            <button
              onClick={handleSaveToken}
              disabled={!token || token.includes('••') || saving}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Save
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Create a token at github.com/settings/tokens with repo scope
          </p>
        </div>

        {/* Connection Status */}
        {hasToken && (
          <div className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              {connectionStatus.testing ? (
                <Loader2 size={16} className="animate-spin text-blue-400" />
              ) : connectionStatus.connected ? (
                <CheckCircle size={16} className="text-green-500" />
              ) : (
                <XCircle size={16} className="text-red-500" />
              )}
              <div>
                {connectionStatus.connected ? (
                  <span className="text-sm text-foreground">
                    Connected as <span className="font-medium">@{connectionStatus.user}</span>
                  </span>
                ) : connectionStatus.error ? (
                  <span className="text-sm text-red-400">{connectionStatus.error}</span>
                ) : connectionStatus.testing ? (
                  <span className="text-sm text-muted-foreground">Testing connection...</span>
                ) : (
                  <span className="text-sm text-muted-foreground">Not connected</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={testConnection}
                disabled={connectionStatus.testing}
                className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-muted transition-colors disabled:opacity-50"
              >
                Test
              </button>
              <button
                onClick={handleDisconnect}
                className="p-1.5 hover:bg-red-500/10 rounded transition-colors"
                title="Disconnect"
              >
                <LogOut size={14} className="text-red-500" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Clone Repository Section */}
      {connectionStatus.connected && (
        <div className="space-y-4 pt-4 border-t border-border">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <GitBranch size={16} />
              Clone Repository
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Clone a repository to your local machine
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Repository URL</label>
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Target Folder</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={targetPath}
                  onChange={(e) => setTargetPath(e.target.value)}
                  placeholder="/path/to/folder"
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
                <button
                  onClick={handleBrowseFolder}
                  className="px-3 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                  title="Browse"
                >
                  <FolderOpen size={16} className="text-muted-foreground" />
                </button>
              </div>
            </div>

            <button
              onClick={handleClone}
              disabled={!repoUrl.trim() || !targetPath.trim() || cloning}
              className="w-full px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {cloning && <Loader2 size={14} className="animate-spin" />}
              Clone Repository
            </button>

            {cloneResult && (
              <div
                className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                  cloneResult.success
                    ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                    : 'bg-red-500/10 border border-red-500/20 text-red-400'
                }`}
              >
                {cloneResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
                {cloneResult.message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Help text */}
      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          Your token is stored locally and only used to authenticate with GitHub. It is never sent
          to any other server.
        </p>
      </div>
    </div>
  );
}
