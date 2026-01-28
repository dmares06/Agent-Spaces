import { useState } from 'react';
import { electronAPI } from '../../../lib/electronAPI';
import type { Agent } from '../../../lib/types';
import { ChevronRight, Loader2, Check } from 'lucide-react';
import EmojiPicker from '../../common/EmojiPicker';
import CategorySelector from '../../common/CategorySelector';
import SkillsSelector from './SkillsSelector';
import MCPSelector from './MCPSelector';
import PermissionsConfig, { type AgentPermissions, DEFAULT_PERMISSIONS } from './PermissionsConfig';
import SubagentsSelector from './SubagentsSelector';

interface ManualModeProps {
  workspaceId: string | null;
  onAgentCreated: (agent: Agent) => void;
}

interface AccordionSectionProps {
  title: string;
  subtitle?: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function AccordionSection({
  title,
  subtitle,
  expanded,
  onToggle,
  children,
}: AccordionSectionProps) {
  return (
    <div className="border-b border-border">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            size={16}
            className={`text-muted-foreground transition-transform ${
              expanded ? 'rotate-90' : ''
            }`}
          />
          <span className="text-sm font-medium text-foreground">{title}</span>
          {subtitle && (
            <span className="text-xs text-muted-foreground">({subtitle})</span>
          )}
        </div>
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

export default function ManualMode({
  workspaceId,
  onAgentCreated,
}: ManualModeProps) {
  // Form state
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [model, setModel] = useState('claude-sonnet-4.5');
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [permissions, setPermissions] = useState<AgentPermissions>(DEFAULT_PERMISSIONS);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [selectedMCPIds, setSelectedMCPIds] = useState<string[]>([]);
  const [selectedSubagentIds, setSelectedSubagentIds] = useState<string[]>([]);

  // UI state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['basic'])
  );
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSection(section: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError('Agent name is required');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      // Create the agent with config containing permissions
      const config = JSON.stringify({ permissions });

      const agent = await electronAPI.agent.create({
        workspace_id: workspaceId,
        name: name.trim(),
        description: description.trim() || undefined,
        avatar: avatar || undefined,
        category: category || undefined,
        system_prompt: systemPrompt.trim() || undefined,
        model,
        thinking_enabled: thinkingEnabled ? 1 : 0,
        config,
      });

      // Assign skills to agent
      for (const skillId of selectedSkillIds) {
        await electronAPI.skill.assignToAgent(agent.id, skillId);
      }

      // Set subagent relationships (update parent_agent_id for selected agents)
      for (const subagentId of selectedSubagentIds) {
        await electronAPI.agent.update(subagentId, { parent_agent_id: agent.id });
      }

      // Note: MCP server assignment would require extending the database schema
      // For now, we store it in the config
      if (selectedMCPIds.length > 0) {
        const updatedConfig = JSON.stringify({
          permissions,
          mcpServerIds: selectedMCPIds,
        });
        await electronAPI.agent.update(agent.id, { config: updatedConfig });
      }

      onAgentCreated(agent);
    } catch (err: any) {
      setError(err.message || 'Failed to create agent');
      setCreating(false);
    }
  }

  const supportsThinking = model !== 'claude-haiku-3.5';

  return (
    <div className="flex flex-col">
      {/* Accordion Sections */}
      <div className="flex-1">
        {/* Basic Info */}
        <AccordionSection
          title="Basic Info"
          expanded={expandedSections.has('basic')}
          onToggle={() => toggleSection('basic')}
        >
          <div className="space-y-3">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Agent"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {/* Avatar */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Avatar
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center text-2xl hover:bg-muted/80 transition-colors"
                >
                  {avatar || '🤖'}
                </button>
                {showEmojiPicker && (
                  <div className="absolute top-14 left-0 z-10">
                    <EmojiPicker
                      onSelect={(emoji) => {
                        setAvatar(emoji);
                        setShowEmojiPicker(false);
                      }}
                      onClose={() => setShowEmojiPicker(false)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A helpful assistant for..."
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Category (Folder)
              </label>
              <CategorySelector
                value={category}
                onChange={setCategory}
                type="agent"
                workspaceId={workspaceId}
                placeholder="Select or create category..."
                allowCustom={true}
                allowNone={true}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Organize your agents into folders for easier management
              </p>
            </div>
          </div>
        </AccordionSection>

        {/* Model & Behavior */}
        <AccordionSection
          title="Model & Behavior"
          expanded={expandedSections.has('model')}
          onToggle={() => toggleSection('model')}
        >
          <div className="space-y-3">
            {/* Model Selection */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Model
              </label>
              <select
                value={model}
                onChange={(e) => {
                  setModel(e.target.value);
                  if (e.target.value === 'claude-haiku-3.5') {
                    setThinkingEnabled(false);
                  }
                }}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="claude-sonnet-4.5">Claude Sonnet 4.5 (Recommended)</option>
                <option value="claude-opus-4.5">Claude Opus 4.5 (Most Capable)</option>
                <option value="claude-haiku-3.5">Claude Haiku 3.5 (Fastest)</option>
              </select>
            </div>

            {/* Extended Thinking */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={thinkingEnabled}
                  onChange={(e) => setThinkingEnabled(e.target.checked)}
                  disabled={!supportsThinking}
                  className="w-4 h-4 rounded border-border text-accent focus:ring-accent disabled:opacity-50"
                />
                <span className={`text-sm ${supportsThinking ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Enable Extended Thinking
                </span>
              </label>
              {!supportsThinking && (
                <p className="text-xs text-muted-foreground mt-1 ml-6">
                  Not available for Haiku model
                </p>
              )}
            </div>
          </div>
        </AccordionSection>

        {/* System Prompt */}
        <AccordionSection
          title="System Prompt"
          expanded={expandedSections.has('prompt')}
          onToggle={() => toggleSection('prompt')}
        >
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Instructions for the agent
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are a helpful assistant that..."
              rows={6}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>
        </AccordionSection>

        {/* Permissions */}
        <AccordionSection
          title="Permissions"
          expanded={expandedSections.has('permissions')}
          onToggle={() => toggleSection('permissions')}
        >
          <PermissionsConfig
            permissions={permissions}
            onPermissionsChange={setPermissions}
          />
        </AccordionSection>

        {/* Skills */}
        <AccordionSection
          title="Skills"
          subtitle={selectedSkillIds.length > 0 ? `${selectedSkillIds.length} selected` : undefined}
          expanded={expandedSections.has('skills')}
          onToggle={() => toggleSection('skills')}
        >
          <SkillsSelector
            workspaceId={workspaceId}
            selectedSkillIds={selectedSkillIds}
            onSelectionChange={setSelectedSkillIds}
          />
        </AccordionSection>

        {/* MCP Servers */}
        <AccordionSection
          title="MCP Servers"
          subtitle={selectedMCPIds.length > 0 ? `${selectedMCPIds.length} selected` : undefined}
          expanded={expandedSections.has('mcp')}
          onToggle={() => toggleSection('mcp')}
        >
          <MCPSelector
            workspaceId={workspaceId}
            selectedServerIds={selectedMCPIds}
            onSelectionChange={setSelectedMCPIds}
          />
        </AccordionSection>

        {/* Subagents */}
        <AccordionSection
          title="Subagents"
          subtitle={selectedSubagentIds.length > 0 ? `${selectedSubagentIds.length} assigned` : undefined}
          expanded={expandedSections.has('subagents')}
          onToggle={() => toggleSection('subagents')}
        >
          <SubagentsSelector
            workspaceId={workspaceId}
            selectedAgentIds={selectedSubagentIds}
            onSelectionChange={setSelectedSubagentIds}
          />
        </AccordionSection>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Create Button */}
      <div className="p-4">
        <button
          onClick={handleCreate}
          disabled={creating || !name.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          {creating ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Check size={18} />
              Create Agent
            </>
          )}
        </button>
      </div>
    </div>
  );
}
