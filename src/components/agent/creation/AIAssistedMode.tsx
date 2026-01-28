import { useState } from 'react';
import { electronAPI } from '../../../lib/electronAPI';
import type { Agent } from '../../../lib/types';
import { Sparkles, Loader2, Check, Edit3, Bot } from 'lucide-react';

interface GeneratedConfig {
  name: string;
  description: string;
  system_prompt: string;
  model: string;
  thinking_enabled: boolean;
}

interface AIAssistedModeProps {
  workspaceId: string | null;
  onAgentCreated: (agent: Agent) => void;
}

export default function AIAssistedMode({
  workspaceId,
  onAgentCreated,
}: AIAssistedModeProps) {
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState<GeneratedConfig | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  async function handleGenerate() {
    if (!description.trim()) return;

    setGenerating(true);
    setError(null);
    setGeneratedConfig(null);

    try {
      const result = await electronAPI.agent.generateFromDescription(description);
      if (result.success) {
        setGeneratedConfig(result.config);
      } else {
        setError(result.error || 'Failed to generate agent configuration');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate agent configuration');
    } finally {
      setGenerating(false);
    }
  }

  async function handleCreate() {
    if (!generatedConfig) return;

    setCreating(true);
    setError(null);

    try {
      const agent = await electronAPI.agent.create({
        workspace_id: workspaceId,
        name: generatedConfig.name,
        description: generatedConfig.description,
        system_prompt: generatedConfig.system_prompt,
        model: generatedConfig.model,
        thinking_enabled: generatedConfig.thinking_enabled ? 1 : 0,
      });
      onAgentCreated(agent);
    } catch (err: any) {
      setError(err.message || 'Failed to create agent');
      setCreating(false);
    }
  }

  function handleStartOver() {
    setGeneratedConfig(null);
    setDescription('');
    setEditMode(false);
  }

  // Show preview/edit mode if we have a generated config
  if (generatedConfig) {
    return (
      <div className="p-4 space-y-4">
        {/* Preview Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot size={20} className="text-accent" />
            <h3 className="font-medium text-foreground">Generated Agent</h3>
          </div>
          <button
            onClick={() => setEditMode(!editMode)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Edit3 size={14} />
            {editMode ? 'Done Editing' : 'Edit'}
          </button>
        </div>

        {/* Config Preview/Edit */}
        <div className="space-y-3">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Name
            </label>
            {editMode ? (
              <input
                type="text"
                value={generatedConfig.name}
                onChange={(e) =>
                  setGeneratedConfig({ ...generatedConfig, name: e.target.value })
                }
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            ) : (
              <p className="text-sm text-foreground">{generatedConfig.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Description
            </label>
            {editMode ? (
              <input
                type="text"
                value={generatedConfig.description}
                onChange={(e) =>
                  setGeneratedConfig({ ...generatedConfig, description: e.target.value })
                }
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            ) : (
              <p className="text-sm text-foreground">{generatedConfig.description}</p>
            )}
          </div>

          {/* Model */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Model
            </label>
            {editMode ? (
              <select
                value={generatedConfig.model}
                onChange={(e) =>
                  setGeneratedConfig({ ...generatedConfig, model: e.target.value })
                }
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="claude-sonnet-4.5">Claude Sonnet 4.5</option>
                <option value="claude-opus-4.5">Claude Opus 4.5</option>
                <option value="claude-haiku-3.5">Claude Haiku 3.5</option>
              </select>
            ) : (
              <p className="text-sm text-foreground">{generatedConfig.model}</p>
            )}
          </div>

          {/* Thinking */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Extended Thinking
            </label>
            {editMode ? (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generatedConfig.thinking_enabled}
                  onChange={(e) =>
                    setGeneratedConfig({
                      ...generatedConfig,
                      thinking_enabled: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                />
                <span className="text-sm text-foreground">Enabled</span>
              </label>
            ) : (
              <p className="text-sm text-foreground">
                {generatedConfig.thinking_enabled ? 'Enabled' : 'Disabled'}
              </p>
            )}
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              System Prompt
            </label>
            {editMode ? (
              <textarea
                value={generatedConfig.system_prompt}
                onChange={(e) =>
                  setGeneratedConfig({
                    ...generatedConfig,
                    system_prompt: e.target.value,
                  })
                }
                rows={6}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
            ) : (
              <div className="bg-muted/50 rounded-lg p-3 max-h-32 overflow-y-auto">
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {generatedConfig.system_prompt}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleStartOver}
            className="flex-1 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Start Over
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {creating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check size={16} />
                Create Agent
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Initial description input
  return (
    <div className="p-4 space-y-4">
      {/* Description Input */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Describe your agent
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="I need an agent that can help me analyze code, suggest refactoring opportunities, and write unit tests. It should be thorough but concise."
          rows={4}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
        />
      </div>

      {/* Examples */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Examples:</p>
        <div className="space-y-1">
          {[
            'A code reviewer that focuses on security issues',
            'A friendly assistant for learning Python',
            'A technical writer for API documentation',
          ].map((example) => (
            <button
              key={example}
              onClick={() => setDescription(example)}
              className="block w-full text-left text-xs text-muted-foreground hover:text-foreground px-2 py-1 hover:bg-muted rounded transition-colors"
            >
              "{example}"
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={generating || !description.trim()}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
      >
        {generating ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles size={18} />
            Generate Agent
          </>
        )}
      </button>
    </div>
  );
}
