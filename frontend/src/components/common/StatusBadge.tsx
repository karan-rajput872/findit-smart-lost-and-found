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
            isLost ? 'bg-[#C25E54]' : 'bg-[#4E7A5A]'
          }`}
        />
        {isLost ? 'Lost Item' : 'Found Item'}
      </span>
    );
  }

  if (status) {
    let colorClasses = 'text-[#5C665F] bg-[#EFECE6] border-[#DDD8CD]';
    if (status === 'open') colorClasses = 'text-[#3E6B4A] bg-[#E5EFE6] border-[#CEE0D0]';
    if (status === 'pending_verification') colorClasses = 'text-[#8F6325] bg-[#F7EBD7] border-[#EADABF]';
    if (status === 'claimed') colorClasses = 'text-[#4A6478] bg-[#EBF1F5] border-[#D4E0E8]';
    if (status === 'resolved') colorClasses = 'text-[#3E6B4A] bg-[#E5EFE6] border-[#CEE0D0]';

    return (
      <span className={`inline-flex items-center font-medium rounded-full border ${colorClasses} ${sizeClasses}`}>
        {getStatusLabel(status)}
      </span>
    );
  }

  return null;
};
