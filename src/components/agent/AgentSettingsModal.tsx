import { useState, useEffect } from 'react';
import { electronAPI } from '../../lib/electronAPI';
import { Agent, PermissionMode } from '../../lib/types';
import { X, Save, Loader2 } from 'lucide-react';
import GeneralSection from './sections/GeneralSection';
import CoreSection from './sections/CoreSection';
import CapabilitiesSection from './sections/CapabilitiesSection';
import LocationSection from './sections/LocationSection';
import DangerZoneSection from './sections/DangerZoneSection';
import { PermissionModeSelector } from '../settings/PermissionModeSelector';

interface AgentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent;
  onUpdate: (updatedAgent: Agent) => void;
  onDelete: () => void;
  onMove?: () => void;
}

export default function AgentSettingsModal({
  isOpen,
  onClose,
  agent,
  onUpdate,
  onDelete,
  onMove,
}: AgentSettingsModalProps) {
  // Form state
  const [name, setName] = useState(agent.name);
  const [avatar, setAvatar] = useState(agent.avatar || '🤖');
  const [description, setDescription] = useState(agent.description || '');
  const [category, setCategory] = useState<string | null>(agent.category || null);
  const [systemPrompt, setSystemPrompt] = useState(agent.system_prompt || '');
  const [model, setModel] = useState(agent.model);
  const [thinkingEnabled, setThinkingEnabled] = useState(agent.thinking_enabled === 1);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when agent changes
  useEffect(() => {
    if (isOpen) {
      setName(agent.name);
      setAvatar(agent.avatar || '🤖');
      setDescription(agent.description || '');
      setCategory(agent.category || null);
      setSystemPrompt(agent.system_prompt || '');
      setModel(agent.model);
      setThinkingEnabled(agent.thinking_enabled === 1);
      setError(null);
    }
  }, [isOpen, agent]);

  async function handleSave() {
    // Validate required fields
    if (!name.trim()) {
      setError('Agent name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await electronAPI.agent.update(agent.id, {
        name: name.trim(),
        avatar,
        description: description.trim() || undefined,
        category: category || undefined,
        system_prompt: systemPrompt.trim() || undefined,
        model,
        thinking_enabled: thinkingEnabled ? 1 : 0,
      });

      // Fetch updated agent
      const updatedAgent = await electronAPI.agent.get(agent.id);
      onUpdate(updatedAgent);

      console.log('[AgentSettings] Agent updated successfully');
    } catch (err: any) {
      console.error('[AgentSettings] Failed to save:', err);
      setError(err.message || 'Failed to save agent settings');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    // Reset form to original values
    setName(agent.name);
    setAvatar(agent.avatar || '🤖');
    setDescription(agent.description || '');
    setCategory(agent.category || null);
    setSystemPrompt(agent.system_prompt || '');
    setModel(agent.model);
    setThinkingEnabled(agent.thinking_enabled === 1);
    setError(null);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleCancel} />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Agent Settings</h2>
          <button
            onClick={handleCancel}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* GENERAL Section */}
          <GeneralSection
            name={name}
            avatar={avatar}
            description={description}
            category={category}
            workspaceId={agent.workspace_id}
            onNameChange={setName}
            onAvatarChange={setAvatar}
            onDescriptionChange={setDescription}
            onCategoryChange={setCategory}
          />

          {/* CORE Section */}
          <CoreSection
            systemPrompt={systemPrompt}
            model={model}
            thinkingEnabled={thinkingEnabled}
            onSystemPromptChange={setSystemPrompt}
            onModelChange={setModel}
            onThinkingChange={setThinkingEnabled}
          />

          {/* CAPABILITIES Section */}
          <CapabilitiesSection agent={agent} />

          {/* PERMISSIONS Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Permissions</h3>
              <p className="text-xs text-muted-foreground">
                Control how this agent handles permission requests
              </p>
            </div>
            <PermissionModeSelector
              currentMode={(agent.permission_mode as PermissionMode) || 'inherit'}
              onModeChange={async (mode) => {
                await electronAPI.permission.setAgentMode(agent.id, mode);
                // Fetch updated agent to refresh the UI
                const updatedAgent = await electronAPI.agent.get(agent.id);
                onUpdate(updatedAgent);
              }}
              showInheritOption={true}
            />
          </div>

          {/* LOCATION Section */}
          <LocationSection
            agent={agent}
            onMove={onMove || onDelete}
            onClose={onClose}
          />

          {/* DANGER ZONE Section */}
          <DangerZoneSection agent={agent} onDelete={onDelete} onClose={onClose} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
