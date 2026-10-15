import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: {
    value: string;
    positive: boolean;
  };
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-findit-primary',
  trend,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-2xl bg-findit-card border border-findit-border card-hover relative overflow-hidden group ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-findit-primary/5 rounded-full blur-2xl group-hover:bg-findit-primary/10 transition-colors pointer-events-none" />
      
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-findit-muted mb-1">{title}</p>
          <h3 className="text-3xl font-bold tracking-tight text-findit-text">{value}</h3>
          
          {subtitle && (
            <p className="text-xs text-findit-subtle mt-1.5 flex items-center gap-1.5">
              {subtitle}
            </p>
          )}

          {trend && (
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <span
                className={`font-medium ${
                  trend.positive ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {trend.value}
              </span>
              <span className="text-findit-subtle">vs last week</span>
            </div>
          )}
        </div>

        <div className={`p-3 rounded-xl bg-findit-bg/80 border border-findit-border/80 ${iconColor} group-hover:scale-105 transition-transform`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
