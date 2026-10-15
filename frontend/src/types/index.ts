export type ItemType = 'lost' | 'found';

export type ItemCategory =
  | 'Electronics'
  | 'Books and Stationery'
  | 'Books & Stationery'
  | 'Bags and Accessories'
  | 'Wallets & Bags'
  | 'Clothing'
  | 'Clothing & Accessories'
  | 'Documents and IDs'
  | 'IDs & Cards'
  | 'Keys'
  | 'Jewellery'
  | 'Jewelry & Watches'
  | 'Sports Equipment'
  | 'Other';


export type ItemStatus =
  | 'open'
  | 'matched'
  | 'returned'
  | 'closed'
  | 'claimed'
  | 'resolved'
  | 'pending_verification';

export interface Item {
  id: string;
  userId?: string;
  type: ItemType;
  title: string;
  category: ItemCategory;
  description: string;
  date: string;
  location: string;
  campus: string;
  imageUrl: string;
  status: ItemStatus;
  reporterName: string;
  reporterContact?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ItemStats {
  total_items: number;
  lost_items: number;
  found_items: number;
  open_items: number;
  my_items_count: number;
  my_lost_count: number;
  my_found_count: number;
  my_open_count: number;
}


export interface User {
  id: string;
  fullName: string;
  email: string;
  campus: string;
  role: 'student' | 'staff' | 'admin';
  avatarUrl?: string;
}

export type ClaimStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'cancelled';

export type HandoverStatus =
  | 'awaiting_handover'
  | 'handover_arranged'
  | 'returned_successfully';

export interface Claim {
  id: string;
  itemId: string;
  itemTitle?: string;
  itemType?: ItemType;
  itemCategory?: string;
  claimantId?: string;
  claimantName?: string;
  claimantEmail?: string;
  itemOwnerId?: string;
  itemOwnerName?: string;
  description?: string;
  proofDetails?: string;
  status: ClaimStatus;
  reviewNotes?: string;
  handoverStatus?: HandoverStatus;
  handoverDetails?: string;
  createdAt?: string;
  updatedAt?: string;
  // Legacy / UI aliases
  dateSubmitted?: string;
  proofDescription?: string;
  resolvedAt?: string;
}

export interface Notification {
  id: string;
  userId?: string;
  title: string;
  message: string;
  notificationType?: string;
  type?: string;
  isRead?: boolean;
  read?: boolean;
  itemId?: string;
  claimId?: string;
  createdAt?: string;
  timestamp?: string;
  link?: string;
  badgeType?: 'info' | 'success' | 'warning' | 'primary';
}

export interface PotentialMatch {
  id: string;
  lostItemId: string;
  foundItemId: string;
  lostItem: Item;
  foundItem: Item;
  similarityScore: number; // e.g. 94 for 94%
  matchReasons: string[];
  status: 'suggested' | 'dismissed' | 'claimed' | 'viewed';
  generatedAt?: string;
  overallScore?: number;
  confidenceTier?: 'strong' | 'possible' | 'weak';
  titleScore?: number;
  semanticScore?: number;
  attributeScore?: number;
  locationScore?: number;
  dateScore?: number;
  imageScore?: number;
  explanation?: string;
  reasons?: string[];
  feedback?: 'relevant' | 'not_relevant' | 'already_recovered' | 'duplicate';
  feedbackNotes?: string;
  createdAt?: string;
}

export interface MatchFilterOptions {
  tier: 'all' | 'strong' | 'possible' | 'weak';
  category: string;
  minScore: number;
  feedback: 'all' | 'relevant' | 'not_relevant' | 'unreviewed';
  searchQuery: string;
}

export interface FilterOptions {
  searchQuery: string;
  type: 'all' | 'lost' | 'found';
  category: string;
  campus: string;
  dateRange: 'all' | 'today' | 'this_week' | 'this_month';
  status: 'all' | ItemStatus;
}
