import { useState, useEffect } from 'react';
import { electronAPI } from '../../../lib/electronAPI';
import type { Skill } from '../../../lib/types';
import { Zap, Plus, Loader2 } from 'lucide-react';

interface SkillsSelectorProps {
  workspaceId: string | null;
  selectedSkillIds: string[];
  onSelectionChange: (skillIds: string[]) => void;
}

export default function SkillsSelector({
  workspaceId,
  selectedSkillIds,
  onSelectionChange,
}: SkillsSelectorProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillDescription, setNewSkillDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadSkills();
  }, [workspaceId]);

  async function loadSkills() {
    setLoading(true);
    try {
      // Load both global and workspace skills
      const allSkills = await electronAPI.skill.list(workspaceId || undefined);
      setSkills(allSkills);
    } catch (error) {
      console.error('Failed to load skills:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleSkill(skillId: string) {
    if (selectedSkillIds.includes(skillId)) {
      onSelectionChange(selectedSkillIds.filter((id) => id !== skillId));
    } else {
      onSelectionChange([...selectedSkillIds, skillId]);
    }
  }

  async function handleCreateSkill() {
    if (!newSkillName.trim()) return;

    setCreating(true);
    try {
      const skill = await electronAPI.skill.create({
        workspace_id: workspaceId,
        name: newSkillName.trim(),
        description: newSkillDescription.trim() || undefined,
        type: 'function',
        config: JSON.stringify({}),
      });

      // Add to list and select it
      setSkills((prev) => [...prev, skill]);
      onSelectionChange([...selectedSkillIds, skill.id]);

      // Reset form
      setNewSkillName('');
      setNewSkillDescription('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create skill:', error);
    } finally {
      setCreating(false);
    }
  }

  // Separate global and workspace skills
  const globalSkills = skills.filter((s) => !s.workspace_id);
  const workspaceSkills = skills.filter((s) => s.workspace_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Create Skill Button */}
      {!showCreateForm && (
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 text-sm text-accent hover:text-accent/80 transition-colors"
        >
          <Plus size={14} />
          Create Skill
        </button>
      )}

      {/* Create Skill Form */}
      {showCreateForm && (
        <div className="p-3 bg-muted/50 rounded-lg space-y-2">
          <input
            type="text"
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            placeholder="Skill name"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            type="text"
            value={newSkillDescription}
            onChange={(e) => setNewSkillDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateForm(false)}
              className="flex-1 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateSkill}
              disabled={creating || !newSkillName.trim()}
              className="flex-1 px-3 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Global Skills */}
      {globalSkills.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Global Skills
          </p>
          <div className="space-y-1">
            {globalSkills.map((skill) => (
              <label
                key={skill.id}
                className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedSkillIds.includes(skill.id)}
                  onChange={() => toggleSkill(skill.id)}
                  className="mt-0.5 w-4 h-4 rounded border-border text-accent focus:ring-accent"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-accent flex-shrink-0" />
                    <span className="text-sm font-medium text-foreground">
                      {skill.name}
                    </span>
                  </div>
                  {skill.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {skill.description}
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Workspace Skills */}
      {workspaceSkills.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Workspace Skills
          </p>
          <div className="space-y-1">
            {workspaceSkills.map((skill) => (
              <label
                key={skill.id}
                className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedSkillIds.includes(skill.id)}
                  onChange={() => toggleSkill(skill.id)}
                  className="mt-0.5 w-4 h-4 rounded border-border text-accent focus:ring-accent"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-accent flex-shrink-0" />
                    <span className="text-sm font-medium text-foreground">
                      {skill.name}
                    </span>
                  </div>
                  {skill.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {skill.description}
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {skills.length === 0 && !showCreateForm && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            No skills available. Create one to get started.
          </p>
        </div>
      )}
    </div>
  );
}
