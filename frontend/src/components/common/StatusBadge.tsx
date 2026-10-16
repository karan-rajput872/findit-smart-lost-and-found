import React from 'react';
import type { ItemStatus, ItemType } from '../../types';
import { getStatusLabel, getTypeBadgeColor } from '../../utils/formatters';

interface StatusBadgeProps {
  status?: ItemStatus;
  type?: ItemType;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type, size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  if (type) {
    const isLost = type === 'lost';
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${getTypeBadgeColor(type)} ${sizeClasses}`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isLost ? 'bg-red-400' : 'bg-teal-400'
          }`}
        />
        {isLost ? 'Lost Item' : 'Found Item'}
      </span>
    );
  }

  if (status) {
    let colorClasses = 'text-slate-300 bg-slate-800/80 border-slate-700';
    if (status === 'open') colorClasses = 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20';
    if (status === 'pending_verification') colorClasses = 'text-amber-300 bg-amber-500/10 border-amber-500/20';
    if (status === 'claimed') colorClasses = 'text-blue-300 bg-blue-500/10 border-blue-500/20';
    if (status === 'resolved') colorClasses = 'text-purple-300 bg-purple-500/10 border-purple-500/20';

    return (
      <span className={`inline-flex items-center font-medium rounded-full border ${colorClasses} ${sizeClasses}`}>
        {getStatusLabel(status)}
      </span>
    );
  }

  return null;
};
