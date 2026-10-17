import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';
import type { Item } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { formatDate, getCategoryBadgeColor } from '../../utils/formatters';
import { ItemImage } from '../common/ItemImage';

interface ItemCardProps {
  item: Item;
  showActions?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (item: Item) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  showActions = false,
  onDelete,
  onEdit,
}) => {
  return (
    <div className="flex flex-col rounded-2xl bg-white border border-findit-border overflow-hidden card-hover group h-full shadow-card">
      {/* Thumbnail Area */}
      <div className="relative aspect-[16/10] overflow-hidden bg-findit-secondary_bg">
        <ItemImage
          src={item.imageUrl}
          alt={item.title}
          category={item.category}
          itemType={item.type}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        
        {/* Top Badges Overlay */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none gap-2">
          <StatusBadge type={item.type} />
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-subtle ${getCategoryBadgeColor(
              item.category
            )}`}
          >
            {item.category}
          </span>
        </div>

        {/* Demo Indicator */}
        {item.isDemo && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/50 text-[10px] text-white font-medium">
            Demo
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-bold text-sm sm:text-base text-findit-text line-clamp-1 group-hover:text-findit-primary transition-colors">
              {item.title}
            </h3>
            <StatusBadge status={item.status} />
          </div>

          <p className="text-xs sm:text-sm text-findit-muted line-clamp-2 mb-3 leading-relaxed">
            {item.description}
          </p>
        </div>

        <div>
          {/* Meta Info */}
          <div className="space-y-1.5 pt-2.5 border-t border-findit-border/80 text-xs text-findit-muted mb-3.5">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-findit-primary shrink-0" />
              <span className="truncate">{item.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-findit-primary shrink-0" />
              <span>{formatDate(item.date)} • {item.campus}</span>
            </div>
          </div>

          {/* Action Button */}
          {showActions ? (
            <div className="flex items-center gap-2 pt-1">
              <Link
                to={`/dashboard/items/${item.id}`}
                className="flex-1 text-center py-2 px-3 text-xs font-semibold rounded-xl bg-findit-bg hover:bg-findit-secondary_bg border border-findit-border text-findit-text transition-colors min-h-[38px] flex items-center justify-center"
              >
                View
              </Link>
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  className="py-2 px-3 text-xs font-semibold rounded-xl bg-findit-bg hover:bg-findit-secondary_bg border border-findit-border text-findit-primary transition-colors min-h-[38px]"
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="py-2 px-3 text-xs font-semibold rounded-xl bg-findit-danger-bg hover:bg-findit-danger-bg/80 border border-findit-border text-findit-danger transition-colors min-h-[38px]"
                >
                  Delete
                </button>
              )}
            </div>
          ) : (
            <Link
              to={`/dashboard/items/${item.id}`}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-findit-bg hover:bg-findit-primary hover:text-white border border-findit-border text-findit-text transition-all group-hover:border-findit-primary/40 min-h-[40px]"
            >
              <span>View Details</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
