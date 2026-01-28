import { ReactNode, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface PanelSectionProps {
  title: string;
  icon?: React.ElementType;
  badge?: ReactNode;
  children: ReactNode;
  defaultExpanded?: boolean;
  collapsible?: boolean;
}

export default function PanelSection({
  title,
  icon: Icon,
  badge,
  children,
  defaultExpanded = true,
  collapsible = true,
}: PanelSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    if (collapsible) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className="border-b border-border/30 last:border-b-0">
      {/* Section Header */}
      <button
        onClick={toggleExpanded}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset ${
          collapsible ? 'hover:bg-background/50 cursor-pointer' : 'cursor-default'
        }`}
        disabled={!collapsible}
      >
        {collapsible && (
          <span className="text-muted-foreground/60">
            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </span>
        )}
        {Icon && <Icon size={18} className="text-muted-foreground/70" />}
        <h3 className="text-sm font-semibold text-foreground flex-1">{title}</h3>
        {badge && <div>{badge}</div>}
      </button>

      {/* Section Content */}
      {isExpanded && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}
