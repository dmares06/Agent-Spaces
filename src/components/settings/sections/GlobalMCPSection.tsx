import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Server, Loader2, CheckCircle, XCircle, Play, Power, Folder } from 'lucide-react';
import { electronAPI } from '../../../lib/electronAPI';
import CategorySelector from '../../common/CategorySelector';

interface MCPServer {
  id: string;
  workspace_id?: string;
  name: string;
  command: string;
  args?: string;
  env?: string;
  category?: string | null;
  enabled: boolean;
  created_at: string;
}

interface TestStatus {
  status: 'idle' | 'testing' | 'success' | 'error';
  error?: string;
  tools?: string[];
}

export default function GlobalMCPSection() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingServer, setEditingServer] = useState<MCPServer | null>(null);
  const [saving, setSaving] = useState(false);
  const [testStatuses, setTestStatuses] = useState<Record<string, TestStatus>>({});

  // Form state
  const [name, setName] = useState('');
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState('[]');
  const [env, setEnv] = useState('{}');
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    loadServers();
  }, []);

  async function loadServers() {
    setLoading(true);
    try {
      const data = await electronAPI.mcp.listGlobal();
      setServers(data);
    } catch (error) {
      console.error('Failed to load global MCP servers:', error);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setName('');
    setCommand('');
    setArgs('[]');
    setEnv('{}');
    setCategory(null);
    setShowForm(false);
    setEditingServer(null);
  }

  function startEdit(server: MCPServer) {
    setEditingServer(server);
    setName(server.name);
    setCommand(server.command);
    setArgs(server.args || '[]');
    setEnv(server.env || '{}');
    setCategory(server.category || null);
    setShowForm(true);
  }

  async function handleSave() {
    if (!name.trim() || !command.trim()) return;

    setSaving(true);
    try {
      // Validate JSON fields
      JSON.parse(args);
      JSON.parse(env);

      if (editingServer) {
        await electronAPI.mcp.updateServer(editingServer.id, {
          name: name.trim(),
          command: command.trim(),
          args,
          env,
          category: category || undefined,
        });
      } else {
        await electronAPI.mcp.addServer({
          workspace_id: null, // Global server
          name: name.trim(),
          command: command.trim(),
          args,
          env,
          category: category || undefined,
          enabled: true,
        });
      }

      await loadServers();
      resetForm();
    } catch (error: any) {
      console.error('Failed to save MCP server:', error);
      alert(error.message || 'Failed to save MCP server');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this MCP server?')) return;

    try {
      await electronAPI.mcp.removeServer(id);
      setServers((prev) => prev.filter((s) => s.id !== id));
      setTestStatuses((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (error) {
      console.error('Failed to delete MCP server:', error);
    }
  }

  async function handleToggle(id: string) {
    try {
      await electronAPI.mcp.toggleServer(id);
      setServers((prev) =>
        prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
      );
    } catch (error) {
      console.error('Failed to toggle MCP server:', error);
    }
  }

  async function handleTest(id: string) {
    setTestStatuses((prev) => ({
      ...prev,
      [id]: { status: 'testing' },
    }));

    try {
      const result = await electronAPI.mcp.testServer(id);
      setTestStatuses((prev) => ({
        ...prev,
        [id]: {
          status: result.success ? 'success' : 'error',
          error: result.error,
          tools: result.tools,
        },
      }));
    } catch (error: any) {
      setTestStatuses((prev) => ({
        ...prev,
        [id]: { status: 'error', error: error.message },
      }));
    }
  }

  function getStatusIndicator(id: string, enabled: boolean) {
    const testStatus = testStatuses[id];

    if (!enabled) {
      return <span className="w-2 h-2 rounded-full bg-gray-500" title="Disabled" />;
    }

    if (!testStatus || testStatus.status === 'idle') {
      return <span className="w-2 h-2 rounded-full bg-gray-400" title="Not tested" />;
    }

    if (testStatus.status === 'testing') {
      return <Loader2 size={12} className="animate-spin text-blue-400" />;
    }

    if (testStatus.status === 'success') {
      return <span className="w-2 h-2 rounded-full bg-green-500" title="Connected" />;
    }

    return <span className="w-2 h-2 rounded-full bg-red-500" title={testStatus.error} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Global MCP Servers</h3>
          <p className="text-xs text-muted-foreground">
            MCP servers available to all agents across all workspaces
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm"
          >
            <Plus size={14} />
            Add Server
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-3">
          <h4 className="text-sm font-medium text-foreground">
            {editingServer ? 'Edit MCP Server' : 'New Global MCP Server'}
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Server name"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Command</label>
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="e.g., npx -y @modelcontextprotocol/server-filesystem"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Arguments (JSON array)</label>
            <input
              type="text"
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              placeholder='["arg1", "arg2"]'
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <CategorySelector
              value={category}
              onChange={setCategory}
              type="mcp"
              workspaceId={null}
              placeholder="Select or create category..."
              allowCustom={true}
              allowNone={true}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Environment Variables (JSON object)</label>
            <textarea
              value={env}
              onChange={(e) => setEnv(e.target.value)}
              placeholder='{"API_KEY": "..."}'
              rows={2}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={resetForm}
              className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || !command.trim() || saving}
              className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editingServer ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Servers List */}
      {servers.length === 0 && !showForm ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No global MCP servers yet. Add one to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Group servers by category */}
          {(() => {
            // Group servers
            const categorized = servers.reduce((acc, server) => {
              const cat = server.category || 'Uncategorized';
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(server);
              return acc;
            }, {} as Record<string, MCPServer[]>);

            // Sort categories
            const categories = Object.keys(categorized).sort((a, b) => {
              if (a === 'Uncategorized') return 1;
              if (b === 'Uncategorized') return -1;
              return a.localeCompare(b);
            });

            return categories.map((category) => (
              <div key={category}>
                {/* Category Header */}
                <div className="flex items-center gap-2 px-2 py-1.5 mb-2 bg-muted/30 rounded-lg">
                  <Folder size={14} className="text-accent flex-shrink-0" />
                  <span className="text-sm font-semibold text-foreground flex-1">
                    {category}
                  </span>
                  <span className="text-xs text-muted-foreground bg-background/50 px-2 py-0.5 rounded-full">
                    {categorized[category].length}
                  </span>
                </div>

                {/* Servers in category */}
                <div className="space-y-2">
                  {categorized[category].map((server) => (
            <div
              key={server.id}
              className={`p-3 bg-muted/30 border border-border rounded-lg hover:bg-muted/50 transition-colors ${
                !server.enabled ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIndicator(server.id, server.enabled)}
                  <Server size={14} className="text-purple-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{server.name}</span>
                      {!server.enabled && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {server.command}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Test Button */}
                  <button
                    onClick={() => handleTest(server.id)}
                    disabled={!server.enabled || testStatuses[server.id]?.status === 'testing'}
                    className="p-1.5 hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Test connection"
                  >
                    {testStatuses[server.id]?.status === 'testing' ? (
                      <Loader2 size={14} className="animate-spin text-blue-400" />
                    ) : testStatuses[server.id]?.status === 'success' ? (
                      <CheckCircle size={14} className="text-green-500" />
                    ) : testStatuses[server.id]?.status === 'error' ? (
                      <XCircle size={14} className="text-red-500" />
                    ) : (
                      <Play size={14} className="text-muted-foreground" />
                    )}
                  </button>

                  {/* Toggle Enable/Disable */}
                  <button
                    onClick={() => handleToggle(server.id)}
                    className={`p-1.5 hover:bg-muted rounded transition-colors ${
                      server.enabled ? 'text-green-500' : 'text-muted-foreground'
                    }`}
                    title={server.enabled ? 'Disable' : 'Enable'}
                  >
                    <Power size={14} />
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => startEdit(server)}
                    className="p-1.5 hover:bg-muted rounded transition-colors"
                    title="Edit"
                  >
                    <Pencil size={14} className="text-muted-foreground" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(server.id)}
                    className="p-1.5 hover:bg-red-500/10 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} className="text-red-500" />
                  </button>
                </div>
              </div>

              {/* Test Result Details */}
              {testStatuses[server.id]?.status === 'error' && testStatuses[server.id]?.error && (
                <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                  {testStatuses[server.id].error}
                </div>
              )}
              {testStatuses[server.id]?.status === 'success' && testStatuses[server.id]?.tools && (
                <div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-400">
                  Connection successful
                </div>
              )}
            </div>
                  ))}
                </div>
              </div>
            ));
          })()}
        </div>
      )}

      {/* Help text */}
      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          MCP servers extend agent capabilities with external tools. Use the test button to verify
          each server can start successfully.
        </p>
      </div>
    </div>
  );
}
