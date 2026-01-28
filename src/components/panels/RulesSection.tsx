import { useState, useEffect } from 'react';
import { electronAPI } from '../../lib/electronAPI';
import { type SessionRule, type RuleCategory as RuleCategoryType, type RuleAction } from '../../lib/types';
import RuleCategoryComponent from './RuleCategory';

interface RulesSectionProps {
  chatId?: string;
}

const categories: RuleCategoryType[] = ['bash', 'git', 'file_write', 'file_read', 'network', 'mcp'];

export default function RulesSection({ chatId }: RulesSectionProps) {
  const [rules, setRules] = useState<SessionRule[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (chatId) {
      loadRules();
    } else {
      setRules([]);
    }
  }, [chatId]);

  async function loadRules() {
    if (!chatId) return;

    try {
      setLoading(true);
      const data = await electronAPI.rules.list(chatId);
      setRules(data);
    } catch (error) {
      console.error('Failed to load rules:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleActionChange(category: RuleCategoryType, action: RuleAction) {
    if (!chatId) return;

    try {
      await electronAPI.rules.set({
        chat_id: chatId,
        category,
        action,
      });
      await loadRules();
    } catch (error) {
      console.error('Failed to set rule:', error);
    }
  }

  function getRuleAction(category: RuleCategoryType): RuleAction {
    const rule = rules.find((r) => r.category === category);
    return rule?.action || 'ask';
  }

  if (!chatId) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        Select a chat to manage rules
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        Loading rules...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-3">
        Control what actions the agent can perform in this chat session
      </p>
      {categories.map((category) => (
        <RuleCategoryComponent
          key={category}
          category={category}
          action={getRuleAction(category)}
          onActionChange={(action: RuleAction) => handleActionChange(category, action)}
        />
      ))}
    </div>
  );
}
