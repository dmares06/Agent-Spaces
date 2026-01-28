export type Status = 'pending' | 'in_progress' | 'completed' | 'failed' | 'allow' | 'deny' | 'ask';

interface StatusBadgeProps {
  status: Status;
  label?: string;
}

const statusConfig: Record<Status, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', label: 'Pending' },
  in_progress: { bg: 'bg-blue-500/10', text: 'text-blue-500', label: 'In Progress' },
  completed: { bg: 'bg-green-500/10', text: 'text-green-500', label: 'Completed' },
  failed: { bg: 'bg-red-500/10', text: 'text-red-500', label: 'Failed' },
  allow: { bg: 'bg-green-500/10', text: 'text-green-500', label: 'Allow' },
  deny: { bg: 'bg-red-500/10', text: 'text-red-500', label: 'Deny' },
  ask: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', label: 'Ask' },
};

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status];
  const displayLabel = label || config.label;

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${config.bg} ${config.text}`}
    >
      {displayLabel}
    </span>
  );
}
