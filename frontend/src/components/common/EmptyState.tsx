import type { LucideIcon } from 'lucide-react';
import { SearchX } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = SearchX,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-findit-card/50 border border-dashed border-findit-border my-6">
      <div className="w-14 h-14 rounded-2xl bg-findit-border/50 flex items-center justify-center text-findit-muted mb-4">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-semibold text-findit-text mb-1">{title}</h3>
      <p className="text-sm text-findit-muted max-w-sm mb-6">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 text-sm font-medium rounded-xl bg-findit-primary hover:bg-findit-primary-hover text-white transition-all shadow-glow-primary"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
