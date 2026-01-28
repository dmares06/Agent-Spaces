import { useState, useEffect } from 'react';
import { electronAPI } from '../../../lib/electronAPI';
import type { Agent } from '../../../lib/types';
import { Bot, Loader2, Info } from 'lucide-react';

interface SubagentsSelectorProps {
  workspaceId: string | null;
  excludeAgentId?: string;
  selectedAgentIds: string[];
  onSelectionChange: (agentIds: string[]) => void;
}

export default function SubagentsSelector({
  workspaceId,
  excludeAgentId,
  selectedAgentIds,
  onSelectionChange,
}: SubagentsSelectorProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [globalAgents, setGlobalAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgents();
  }, [workspaceId]);

  async function loadAgents() {
    setLoading(true);
    try {
      // Load workspace agents if workspace is selected
      if (workspaceId) {
        const workspaceAgents = await electronAPI.agent.list(workspaceId);
        setAgents(workspaceAgents);
      } else {
        setAgents([]);
      }

      // Load global agents
      const global = await electronAPI.agent.listGlobal();
      setGlobalAgents(global);
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleAgent(agentId: string) {
    if (selectedAgentIds.includes(agentId)) {
      onSelectionChange(selectedAgentIds.filter((id) => id !== agentId));
    } else {
      onSelectionChange([...selectedAgentIds, agentId]);
    }
  }

  // Filter out the current agent being created/edited
  const availableWorkspaceAgents = agents.filter((a) => a.id !== excludeAgentId);
  const availableGlobalAgents = globalAgents.filter((a) => a.id !== excludeAgentId);
  const allAvailable = [...availableWorkspaceAgents, ...availableGlobalAgents];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Info Box */}
      <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
        <Info size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          Subagents can be delegated tasks by this agent. Select existing agents to
          make them available as subagents.
        </p>
      </div>

      {/* Workspace Agents */}
      {availableWorkspaceAgents.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Workspace Agents
          </p>
          <div className="space-y-1">
            {availableWorkspaceAgents.map((agent) => (
              <label
                key={agent.id}
                className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedAgentIds.includes(agent.id)}
                  onChange={() => toggleAgent(agent.id)}
                  className="mt-0.5 w-4 h-4 rounded border-border text-accent focus:ring-accent"
                />
                <div className="flex items-center gap-2 flex-shrink-0">
                  {agent.avatar ? (
                    <span className="text-lg">{agent.avatar}</span>
                  ) : (
                    <Bot size={18} className="text-accent" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">
                    {agent.name}
                  </span>
                  {agent.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {agent.description}
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Global Agents */}
      {availableGlobalAgents.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Global Agents
          </p>
          <div className="space-y-1">
            {availableGlobalAgents.map((agent) => (
              <label
                key={agent.id}
                className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedAgentIds.includes(agent.id)}
                  onChange={() => toggleAgent(agent.id)}
                  className="mt-0.5 w-4 h-4 rounded border-border text-accent focus:ring-accent"
                />
                <div className="flex items-center gap-2 flex-shrink-0">
                  {agent.avatar ? (
                    <span className="text-lg">{agent.avatar}</span>
                  ) : (
                    <Bot size={18} className="text-accent" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">
                    {agent.name}
                  </span>
                  {agent.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {agent.description}
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {allAvailable.length === 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            No other agents available to assign as subagents.
            Create more agents first.
          </p>
        </div>
      )}
    </div>
  );
}
