interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'accent' | 'green' | 'blue' | 'yellow' | 'red';
}

const sizeConfig = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

const colorConfig = {
  accent: 'bg-accent',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
};

export default function ProgressBar({
  value,
  max = 100,
  showLabel = false,
  size = 'md',
  color = 'accent',
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">
            {value} / {max}
          </span>
          <span className="text-xs text-muted-foreground">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={`w-full bg-muted rounded-full overflow-hidden ${sizeConfig[size]}`}>
        <div
          className={`${sizeConfig[size]} ${colorConfig[color]} transition-all duration-300 ease-in-out rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
