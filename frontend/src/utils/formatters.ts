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
      return 'Active';
    case 'pending_verification':
      return 'Under Review';
    case 'claimed':
      return 'Claim Approved';
    case 'resolved':
      return 'Successfully Returned';
    default:
      return status;
  }
}

export function getCategoryBadgeColor(category: ItemCategory): string {
  switch (category) {
    case 'Electronics':
      return 'text-[#4A6478] bg-[#EBF1F5] border-[#D4E0E8]';
    case 'Wallets & Bags':
      return 'text-[#6F5B78] bg-[#F3ECF5] border-[#E4D8E7]';
    case 'Keys':
      return 'text-[#876536] bg-[#F7EEDF] border-[#EADECA]';
    case 'IDs & Cards':
      return 'text-[#3E6B4A] bg-[#E5EFE6] border-[#CEE0D0]';
    case 'Clothing & Accessories':
      return 'text-[#825463] bg-[#F7ECF0] border-[#EAD6DE]';
    case 'Books & Stationery':
      return 'text-[#486D6B] bg-[#EAF2F1] border-[#D3E3E1]';
    case 'Jewelry & Watches':
      return 'text-[#7D6B37] bg-[#F6F1DF] border-[#E7DEBE]';
    default:
      return 'text-[#616B64] bg-[#EEF2EF] border-[#DCE3DD]';
  }
}

export function getTypeBadgeColor(type: ItemType): string {
  return type === 'lost'
    ? 'text-[#A84A42] bg-[#F6E5E2] border-[#EAD2CE]'
    : 'text-[#3E6B4A] bg-[#E5EFE6] border-[#CEE0D0]';
}
