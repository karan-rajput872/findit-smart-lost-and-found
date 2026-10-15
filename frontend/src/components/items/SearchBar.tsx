import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  totalResults?: number;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search by item title, description, or keyword (e.g. "MacBook", "blue wallet", "keys")...',
  totalResults,
  className = '',
}) => {
  return (
    <div className={`relative w-full ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-findit-muted">
        <Search className="w-4 h-4" />
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-24 py-3 rounded-xl bg-findit-card border border-findit-border focus:border-findit-primary focus:ring-1 focus:ring-findit-primary text-sm text-findit-text placeholder-findit-subtle outline-none transition-all shadow-sm"
      />

      <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-1 rounded-md text-findit-muted hover:text-findit-text hover:bg-findit-border/50 transition-colors"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {totalResults !== undefined && (
          <span className="hidden sm:inline-block text-[11px] font-medium text-findit-subtle bg-findit-bg/90 px-2 py-0.5 rounded-md border border-findit-border/80">
            {totalResults} {totalResults === 1 ? 'item' : 'items'}
          </span>
        )}
      </div>
    </div>
  );
};
