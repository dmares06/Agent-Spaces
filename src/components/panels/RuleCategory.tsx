import { type RuleCategory as RuleCategoryType, type RuleAction } from '../../lib/types';

interface RuleCategoryProps {
  category: RuleCategoryType;
  action?: RuleAction;
  onActionChange: (action: RuleAction) => void;
}

const categoryLabels: Record<RuleCategoryType, string> = {
  bash: 'Bash Commands',
  git: 'Git Operations',
  file_write: 'File Write',
  file_read: 'File Read',
  network: 'Network Access',
  mcp: 'MCP Tools',
};

export default function RuleCategory({ category, action = 'ask', onActionChange }: RuleCategoryProps) {
  const actions: RuleAction[] = ['allow', 'ask', 'deny'];

  return (
    <div className="flex items-center justify-between p-2 border border-border rounded-lg">
      <span className="text-sm font-medium text-foreground">{categoryLabels[category]}</span>
      <div className="flex gap-1">
        {actions.map((a) => (
          <button
            key={a}
            onClick={() => onActionChange(a)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              action === a
                ? 'bg-accent text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {a.charAt(0).toUpperCase() + a.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}
