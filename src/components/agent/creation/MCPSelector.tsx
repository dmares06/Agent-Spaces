import { useState, useEffect } from 'react';
import { electronAPI } from '../../../lib/electronAPI';
import type { MCPServer } from '../../../lib/types';
import { Server, Plus, Loader2 } from 'lucide-react';

interface MCPSelectorProps {
  workspaceId: string | null;
  selectedServerIds: string[];
  onSelectionChange: (serverIds: string[]) => void;
}

export default function MCPSelector({
  workspaceId,
  selectedServerIds,
  onSelectionChange,
}: MCPSelectorProps) {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newServerCommand, setNewServerCommand] = useState('');
  const [newServerArgs, setNewServerArgs] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadServers();
  }, [workspaceId]);

  async function loadServers() {
    setLoading(true);
    try {
      const allServers = await electronAPI.mcp.listServers(workspaceId || undefined);
      setServers(allServers);
    } catch (error) {
      console.error('Failed to load MCP servers:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleServer(serverId: string) {
    if (selectedServerIds.includes(serverId)) {
      onSelectionChange(selectedServerIds.filter((id) => id !== serverId));
    } else {
      onSelectionChange([...selectedServerIds, serverId]);
    }
  }

  async function handleAddServer() {
    if (!newServerName.trim() || !newServerCommand.trim()) return;

    setAdding(true);
    try {
      const server = await electronAPI.mcp.addServer({
        workspace_id: workspaceId,
        name: newServerName.trim(),
        command: newServerCommand.trim(),
        args: newServerArgs.trim() || '[]',
        enabled: 1,
      });

      setServers((prev) => [...prev, server]);
      onSelectionChange([...selectedServerIds, server.id]);

      // Reset form
      setNewServerName('');
      setNewServerCommand('');
      setNewServerArgs('');
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to add MCP server:', error);
    } finally {
      setAdding(false);
    }
  }

  // Separate global and workspace servers
  const globalServers = servers.filter((s) => !s.workspace_id);
  const workspaceServers = servers.filter((s) => s.workspace_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Add Server Button */}
      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 text-sm text-accent hover:text-accent/80 transition-colors"
        >
          <Plus size={14} />
          Add Server
        </button>
      )}

      {/* Add Server Form */}
      {showAddForm && (
        <div className="p-3 bg-muted/50 rounded-lg space-y-2">
          <input
            type="text"
            value={newServerName}
            onChange={(e) => setNewServerName(e.target.value)}
            placeholder="Server name (e.g., filesystem)"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            type="text"
            value={newServerCommand}
            onChange={(e) => setNewServerCommand(e.target.value)}
            placeholder="Command (e.g., npx -y @anthropic/mcp-filesystem)"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            type="text"
            value={newServerArgs}
            onChange={(e) => setNewServerArgs(e.target.value)}
            placeholder='Args JSON (e.g., ["/path/to/dir"])'
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="flex-1 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddServer}
              disabled={adding || !newServerName.trim() || !newServerCommand.trim()}
              className="flex-1 px-3 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {adding ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {/* Global Servers */}
      {globalServers.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Global Servers
          </p>
          <div className="space-y-1">
            {globalServers.map((server) => (
              <label
                key={server.id}
                className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedServerIds.includes(server.id)}
                  onChange={() => toggleServer(server.id)}
                  className="mt-0.5 w-4 h-4 rounded border-border text-accent focus:ring-accent"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Server size={14} className="text-accent flex-shrink-0" />
                    <span className="text-sm font-medium text-foreground">
                      {server.name}
                    </span>
                    {!server.enabled && (
                      <span className="text-xs text-muted-foreground">(disabled)</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">
                    {server.command}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Workspace Servers */}
      {workspaceServers.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Workspace Servers
          </p>
          <div className="space-y-1">
            {workspaceServers.map((server) => (
              <label
                key={server.id}
                className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedServerIds.includes(server.id)}
                  onChange={() => toggleServer(server.id)}
                  className="mt-0.5 w-4 h-4 rounded border-border text-accent focus:ring-accent"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Server size={14} className="text-accent flex-shrink-0" />
                    <span className="text-sm font-medium text-foreground">
                      {server.name}
                    </span>
                    {!server.enabled && (
                      <span className="text-xs text-muted-foreground">(disabled)</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">
                    {server.command}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {servers.length === 0 && !showAddForm && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            No MCP servers configured. Add one to extend agent capabilities.
          </p>
        </div>
      )}
    </div>
  );
}
