import type { ItemCategory, ItemStatus, ItemType } from '../types';

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatTimeAgo(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Recently';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(dateString);
  } catch {
    return dateString;
  }
}

export function getStatusLabel(status: ItemStatus): string {
  switch (status) {
    case 'open':
      return 'Active Listing';
    case 'pending_verification':
      return 'Claim Pending';
    case 'claimed':
      return 'Claimed';
    case 'resolved':
      return 'Reunited / Resolved';
    default:
      return status;
  }
}

export function getCategoryBadgeColor(category: ItemCategory): string {
  switch (category) {
    case 'Electronics':
      return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    case 'Wallets & Bags':
      return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    case 'Keys':
      return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    case 'IDs & Cards':
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    case 'Clothing & Accessories':
      return 'text-pink-400 bg-pink-500/10 border-pink-500/20';
    case 'Books & Stationery':
      return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    case 'Jewelry & Watches':
      return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    default:
      return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  }
}

export function getTypeBadgeColor(type: ItemType): string {
  return type === 'lost'
    ? 'text-red-400 bg-red-500/10 border-red-500/20'
    : 'text-teal-300 bg-teal-500/10 border-teal-500/20';
}
