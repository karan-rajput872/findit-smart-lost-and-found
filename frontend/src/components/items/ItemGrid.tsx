import React from 'react';
import type { Item } from '../../types';
import { ItemCard } from './ItemCard';
import { EmptyState } from '../common/EmptyState';
import { Search } from 'lucide-react';

interface ItemGridProps {
  items: Item[];
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionText?: string;
  onEmptyAction?: () => void;
  showActions?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (item: Item) => void;
}

export const ItemGrid: React.FC<ItemGridProps> = ({
  items,
  emptyTitle = 'No items found',
  emptyDescription = 'Try adjusting your search criteria, category filters, or location to discover more listings.',
  emptyActionText,
  onEmptyAction,
  showActions = false,
  onDelete,
  onEdit,
}) => {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title={emptyTitle}
        description={emptyDescription}
        actionText={emptyActionText}
        onAction={onEmptyAction}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          showActions={showActions}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
};
