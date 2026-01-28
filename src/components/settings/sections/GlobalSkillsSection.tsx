import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Zap, Code, FileCode, Loader2, Folder } from 'lucide-react';
import { electronAPI } from '../../../lib/electronAPI';
import CategorySelector from '../../common/CategorySelector';

interface Skill {
  id: string;
  workspace_id?: string;
  name: string;
  description?: string;
  category?: string | null;
  type: 'mcp' | 'function' | 'script';
  config: string;
  created_at: string;
}

const TYPE_ICONS = {
  mcp: <Zap size={14} className="text-purple-400" />,
  function: <Code size={14} className="text-blue-400" />,
  script: <FileCode size={14} className="text-green-400" />,
};

const TYPE_LABELS = {
  mcp: 'MCP Tool',
  function: 'Function',
  script: 'Script',
};

export default function GlobalSkillsSection() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [type, setType] = useState<'mcp' | 'function' | 'script'>('function');
  const [config, setConfig] = useState('{}');

  useEffect(() => {
    loadSkills();
  }, []);

  async function loadSkills() {
    setLoading(true);
    try {
      const data = await electronAPI.skill.listGlobal();
      setSkills(data);
    } catch (error) {
      console.error('Failed to load global skills:', error);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setName('');
    setDescription('');
    setCategory(null);
    setType('function');
    setConfig('{}');
    setShowForm(false);
    setEditingSkill(null);
  }

  function startEdit(skill: Skill) {
    setEditingSkill(skill);
    setName(skill.name);
    setDescription(skill.description || '');
    setCategory(skill.category || null);
    setType(skill.type);
    setConfig(skill.config);
    setShowForm(true);
  }

  async function handleSave() {
    if (!name.trim()) return;

    setSaving(true);
    try {
      // Validate JSON config
      JSON.parse(config);

      if (editingSkill) {
        await electronAPI.skill.update(editingSkill.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          category: category || undefined,
          type,
          config,
        });
      } else {
        await electronAPI.skill.create({
          workspace_id: null, // Global skill
          name: name.trim(),
          description: description.trim() || undefined,
          category: category || undefined,
          type,
          config,
        });
      }

      await loadSkills();
      resetForm();
    } catch (error: any) {
      console.error('Failed to save skill:', error);
      alert(error.message || 'Failed to save skill');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this skill?')) return;

    try {
      await electronAPI.skill.delete(id);
      setSkills((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error('Failed to delete skill:', error);
    }
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
          <h3 className="text-sm font-semibold text-foreground">Global Skills</h3>
          <p className="text-xs text-muted-foreground">
            Skills available to all agents across all workspaces
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm"
          >
            <Plus size={14} />
            Add Skill
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-3">
          <h4 className="text-sm font-medium text-foreground">
            {editingSkill ? 'Edit Skill' : 'New Global Skill'}
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Skill name"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                <option value="function">Function</option>
                <option value="script">Script</option>
                <option value="mcp">MCP Tool</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this skill do?"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <CategorySelector
              value={category}
              onChange={setCategory}
              type="skill"
              workspaceId={null}
              placeholder="Select or create category..."
              allowCustom={true}
              allowNone={true}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Config (JSON)</label>
            <textarea
              value={config}
              onChange={(e) => setConfig(e.target.value)}
              placeholder="{}"
              rows={3}
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
              disabled={!name.trim() || saving}
              className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editingSkill ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Skills List */}
      {skills.length === 0 && !showForm ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No global skills yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Group skills by category */}
          {(() => {
            // Group skills
            const categorized = skills.reduce((acc, skill) => {
              const cat = skill.category || 'Uncategorized';
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(skill);
              return acc;
            }, {} as Record<string, Skill[]>);

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

                {/* Skills in category */}
                <div className="space-y-2">
                  {categorized[category].map((skill) => (
                    <div
                      key={skill.id}
                      className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {TYPE_ICONS[skill.type]}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{skill.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                              {TYPE_LABELS[skill.type]}
                            </span>
                          </div>
                          {skill.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{skill.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(skill)}
                          className="p-1.5 hover:bg-muted rounded transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} className="text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => handleDelete(skill.id)}
                          className="p-1.5 hover:bg-red-500/10 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} className="text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
}
