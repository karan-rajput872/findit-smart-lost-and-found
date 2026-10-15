import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';
import type { Item } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { formatDate, getCategoryBadgeColor } from '../../utils/formatters';

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
    <div className="flex flex-col rounded-2xl bg-findit-card border border-findit-border overflow-hidden card-hover group h-full">
      {/* Thumbnail Area */}
      <div className="relative aspect-[16/10] overflow-hidden bg-findit-sidebar">
        <img
          src={item.imageUrl}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            // Fallback placeholder image if network issue occurs
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=800&q=80';
          }}
        />
        
        {/* Top Badges Overlay */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
          <StatusBadge type={item.type} />
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium border backdrop-blur-md bg-findit-bg/85 ${getCategoryBadgeColor(
              item.category
            )}`}
          >
            {item.category}
          </span>
        </div>

        {/* Demo Indicator */}
        {item.isDemo && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] text-findit-muted border border-white/10">
            Demo Record
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-base text-findit-text line-clamp-1 group-hover:text-findit-primary transition-colors">
            {item.title}
          </h3>
          <StatusBadge status={item.status} />
        </div>

        <p className="text-sm text-findit-muted line-clamp-2 mb-4 flex-1">
          {item.description}
        </p>

        {/* Meta Info */}
        <div className="space-y-1.5 pt-3 border-t border-findit-border/60 text-xs text-findit-muted mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-findit-secondary shrink-0" />
            <span className="truncate">{item.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-findit-primary shrink-0" />
            <span>{formatDate(item.date)} • {item.campus}</span>
          </div>
        </div>

        {/* Action Button */}
        {showActions ? (
          <div className="flex items-center gap-2 pt-2">
            <Link
              to={`/dashboard/items/${item.id}`}
              className="flex-1 text-center py-2 px-3 text-xs font-semibold rounded-xl bg-findit-bg hover:bg-findit-card-hover border border-findit-border text-findit-text transition-colors"
            >
              View
            </Link>
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="py-2 px-3 text-xs font-semibold rounded-xl bg-findit-bg hover:bg-findit-card-hover border border-findit-border text-findit-primary transition-colors"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="py-2 px-3 text-xs font-semibold rounded-xl bg-findit-danger/10 hover:bg-findit-danger/20 border border-findit-danger/30 text-findit-danger transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        ) : (
          <Link
            to={`/dashboard/items/${item.id}`}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-findit-bg hover:bg-findit-card-hover border border-findit-border text-findit-text hover:text-white transition-all group-hover:border-findit-primary/40"
          >
            <span>View Details</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        )}
      </div>
    </div>
  );
};
