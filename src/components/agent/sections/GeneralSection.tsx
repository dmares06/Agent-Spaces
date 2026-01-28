import { User } from 'lucide-react';
import { useState } from 'react';
import EmojiPicker from '../../common/EmojiPicker';
import CategorySelector from '../../common/CategorySelector';

interface GeneralSectionProps {
  name: string;
  avatar: string;
  description: string;
  category: string | null;
  workspaceId: string | null;
  onNameChange: (value: string) => void;
  onAvatarChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryChange: (value: string | null) => void;
}

export default function GeneralSection({
  name,
  avatar,
  description,
  category,
  workspaceId,
  onNameChange,
  onAvatarChange,
  onDescriptionChange,
  onCategoryChange,
}: GeneralSectionProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  function handleEmojiSelect(emoji: string) {
    onAvatarChange(emoji);
    setShowEmojiPicker(false);
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <User size={18} className="text-accent" />
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          General
        </h3>
      </div>

      {/* Agent Name */}
      <div className="space-y-2">
        <label htmlFor="agent-name" className="block text-sm font-medium text-foreground">
          Agent Name *
        </label>
        <input
          id="agent-name"
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Enter agent name"
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          required
        />
      </div>

      {/* Agent Avatar */}
      <div className="space-y-2">
        <label htmlFor="agent-avatar" className="block text-sm font-medium text-foreground">
          Agent Avatar
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="w-full flex items-center gap-3 px-3 py-2 bg-background border border-border rounded-lg text-sm hover:bg-muted transition-colors"
          >
            <span className="text-2xl">{avatar}</span>
            <span className="text-muted-foreground">Click to change</span>
          </button>

          {showEmojiPicker && (
            <EmojiPicker
              onSelect={handleEmojiSelect}
              onClose={() => setShowEmojiPicker(false)}
            />
          )}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label htmlFor="agent-description" className="block text-sm font-medium text-foreground">
          Description
        </label>
        <textarea
          id="agent-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Optional description for this agent"
          rows={3}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
        />
      </div>

      {/* Category */}
      <div className="space-y-2">
        <label htmlFor="agent-category" className="block text-sm font-medium text-foreground">
          Category (Folder)
        </label>
        <CategorySelector
          value={category}
          onChange={onCategoryChange}
          type="agent"
          workspaceId={workspaceId}
          placeholder="Select or create category..."
          allowCustom={true}
          allowNone={true}
        />
        <p className="text-xs text-muted-foreground">
          Organize your agents into folders for easier management
        </p>
      </div>
    </div>
  );
}
