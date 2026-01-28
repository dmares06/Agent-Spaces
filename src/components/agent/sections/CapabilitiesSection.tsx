import { Zap } from 'lucide-react';
import { Agent } from '../../../lib/types';
import { useState } from 'react';

interface CapabilitiesSectionProps {
  agent: Agent;
}

type CapabilityTab = 'skills' | 'subagents' | 'mcp' | 'hooks';

export default function CapabilitiesSection({ agent: _agent }: CapabilitiesSectionProps) {
  const [activeTab, setActiveTab] = useState<CapabilityTab>('skills');

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <Zap size={18} className="text-accent" />
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Capabilities
        </h3>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('skills')}
          className={`px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'skills'
              ? 'text-accent border-b-2 border-accent'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Skills
        </button>
        <button
          onClick={() => setActiveTab('subagents')}
          className={`px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'subagents'
              ? 'text-accent border-b-2 border-accent'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Subagents
        </button>
        <button
          onClick={() => setActiveTab('mcp')}
          className={`px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'mcp'
              ? 'text-accent border-b-2 border-accent'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          MCP Servers
        </button>
        <button
          onClick={() => setActiveTab('hooks')}
          className={`px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'hooks'
              ? 'text-accent border-b-2 border-accent'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Hooks
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[200px]">
        {activeTab === 'skills' && (
          <div className="text-sm text-muted-foreground text-center py-8">
            Skills management coming soon
          </div>
        )}
        {activeTab === 'subagents' && (
          <div className="text-sm text-muted-foreground text-center py-8">
            Subagent management coming soon
          </div>
        )}
        {activeTab === 'mcp' && (
          <div className="text-sm text-muted-foreground text-center py-8">
            MCP server configuration coming soon
          </div>
        )}
        {activeTab === 'hooks' && (
          <div className="text-sm text-muted-foreground text-center py-8">
            Hook management coming soon
          </div>
        )}
      </div>
    </div>
  );
}
