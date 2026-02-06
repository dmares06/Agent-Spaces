import { useState, useEffect } from 'react';
import {
  Send,
  Check,
  X,
  RefreshCw,
  Trash2,
  AlertCircle,
  Power,
  User,
  Bot,
  Link,
  ExternalLink,
} from 'lucide-react';
import { electronAPI } from '../../../lib/electronAPI';
import type { TelegramAgentLink, Agent } from '../../../lib/types';

export default function TelegramSection() {
  const [token, setToken] = useState('');
  const [maskedToken, setMaskedToken] = useState<string | null>(null);
  const [botStatus, setBotStatus] = useState<{ running: boolean; token: string | null }>({
    running: false,
    token: null,
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; username?: string; error?: string } | null>(null);
  const [links, setLinks] = useState<TelegramAgentLink[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    loadData();

    // Listen for Telegram activity
    electronAPI.onTelegramActivity((data) => {
      console.log('[Telegram] Activity:', data);
      // Refresh links when new connections happen
      if (data.event === 'new-connection' || data.event === 'agent-switched') {
        loadLinks();
      }
    });

    return () => {
      electronAPI.offTelegramActivity();
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statusResult, tokenResult, linksResult, globalAgents] = await Promise.all([
        electronAPI.telegram.getStatus(),
        electronAPI.telegram.getToken(),
        electronAPI.telegram.listLinks(),
        electronAPI.agent.listGlobal(),
      ]);

      setBotStatus(statusResult);
      setMaskedToken(tokenResult);
      setLinks(linksResult);
      setAgents(globalAgents);
    } catch (error) {
      console.error('Failed to load Telegram data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLinks = async () => {
    try {
      const linksResult = await electronAPI.telegram.listLinks();
      setLinks(linksResult);
    } catch (error) {
      console.error('Failed to load links:', error);
    }
  };

  const handleSaveToken = async () => {
    if (!token.trim()) return;

    try {
      await electronAPI.telegram.setToken(token);
      setToken('');
      loadData();
      setTestResult(null);
    } catch (error) {
      console.error('Failed to save token:', error);
    }
  };

  const handleTestConnection = async () => {
    const testToken = token.trim() || undefined;
    setTesting(true);
    setTestResult(null);

    try {
      const result = await electronAPI.telegram.testConnection(testToken);
      setTestResult(result);
    } catch (error: any) {
      setTestResult({ success: false, error: error.message });
    } finally {
      setTesting(false);
    }
  };

  const handleStartBot = async () => {
    setStarting(true);
    try {
      const result = await electronAPI.telegram.startBot();
      if (!result.success) {
        setTestResult({ success: false, error: result.error });
      }
      loadData();
    } catch (error: any) {
      setTestResult({ success: false, error: error.message });
    } finally {
      setStarting(false);
    }
  };

  const handleStopBot = async () => {
    setStopping(true);
    try {
      await electronAPI.telegram.stopBot();
      loadData();
    } catch (error) {
      console.error('Failed to stop bot:', error);
    } finally {
      setStopping(false);
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (!confirm('Are you sure you want to remove this Telegram link?')) return;

    try {
      await electronAPI.telegram.deleteLink(id);
      loadLinks();
    } catch (error) {
      console.error('Failed to delete link:', error);
    }
  };

  const handleToggleLink = async (id: string) => {
    try {
      await electronAPI.telegram.toggleLink(id);
      loadLinks();
    } catch (error) {
      console.error('Failed to toggle link:', error);
    }
  };

  const getAgentName = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    return agent?.name || 'Unknown Agent';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-foreground">Telegram Bot</h3>
        <p className="text-sm text-muted-foreground">
          Chat with your agents via Telegram
        </p>
      </div>

      {/* Setup Instructions */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <h4 className="font-medium text-blue-400 mb-2">Setup Instructions</h4>
        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
          <li>
            Open Telegram and message{' '}
            <a
              href="https://t.me/BotFather"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline inline-flex items-center gap-1"
            >
              @BotFather <ExternalLink size={12} />
            </a>
          </li>
          <li>Send /newbot and follow the prompts to create your bot</li>
          <li>Copy the bot token and paste it below</li>
          <li>Start the bot and message it on Telegram!</li>
        </ol>
      </div>

      {/* Bot Token */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">Bot Token</label>

        {maskedToken ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 bg-muted rounded-lg text-foreground font-mono">
              {maskedToken}
            </div>
            <button
              onClick={() => setMaskedToken(null)}
              className="px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              className="flex-1 px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent font-mono"
            />
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
            >
              {testing ? <RefreshCw size={16} className="animate-spin" /> : 'Test'}
            </button>
            <button
              onClick={handleSaveToken}
              disabled={!token.trim()}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save
            </button>
          </div>
        )}

        {testResult && (
          <div
            className={`flex items-center gap-2 text-sm ${
              testResult.success ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {testResult.success ? (
              <>
                <Check size={16} />
                <span>Connected as @{testResult.username}</span>
              </>
            ) : (
              <>
                <X size={16} />
                <span>{testResult.error || 'Connection failed'}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bot Status & Controls */}
      {maskedToken && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  botStatus.running ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'
                }`}
              />
              <div>
                <div className="font-medium text-foreground">
                  Bot Status: {botStatus.running ? 'Running' : 'Stopped'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {botStatus.running
                    ? 'Listening for messages on Telegram'
                    : 'Start the bot to begin receiving messages'}
                </div>
              </div>
            </div>

            {botStatus.running ? (
              <button
                onClick={handleStopBot}
                disabled={stopping}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 disabled:opacity-50 transition-colors"
              >
                {stopping ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Power size={16} />
                )}
                Stop Bot
              </button>
            ) : (
              <button
                onClick={handleStartBot}
                disabled={starting}
                className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 disabled:opacity-50 transition-colors"
              >
                {starting ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Power size={16} />
                )}
                Start Bot
              </button>
            )}
          </div>
        </div>
      )}

      {/* Connected Chats */}
      <div>
        <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
          <Link size={16} />
          Connected Telegram Chats
        </h4>

        {links.length > 0 ? (
          <div className="space-y-2">
            {links.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between p-3 bg-card border border-border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${link.enabled ? 'bg-accent/10' : 'bg-muted'}`}>
                    <User size={16} className={link.enabled ? 'text-accent' : 'text-muted-foreground'} />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">
                      {link.telegram_username ? `@${link.telegram_username}` : `Chat ${link.telegram_chat_id}`}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Bot size={12} />
                      <span>{getAgentName(link.agent_id)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleLink(link.id)}
                    className={`px-3 py-1 rounded text-xs transition-colors ${
                      link.enabled
                        ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {link.enabled ? 'Active' : 'Disabled'}
                  </button>
                  <button
                    onClick={() => handleDeleteLink(link.id)}
                    className="p-2 text-muted-foreground hover:text-red-500 hover:bg-muted rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground bg-muted/50 rounded-lg">
            <Send size={32} className="mx-auto mb-2 opacity-50" />
            <p>No connected Telegram chats yet</p>
            <p className="text-xs mt-1">
              Start the bot and send /start in Telegram to connect
            </p>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
          <AlertCircle size={16} />
          Available Commands
        </h4>
        <div className="text-sm text-muted-foreground space-y-1">
          <p><code className="bg-muted px-1 rounded">/start</code> - Connect to AgentSpaces</p>
          <p><code className="bg-muted px-1 rounded">/agents</code> - List available agents</p>
          <p><code className="bg-muted px-1 rounded">/switch &lt;name&gt;</code> - Switch to a different agent</p>
          <p><code className="bg-muted px-1 rounded">/status</code> - Show connection status</p>
          <p><code className="bg-muted px-1 rounded">/help</code> - Show help message</p>
        </div>
      </div>
    </div>
  );
}
