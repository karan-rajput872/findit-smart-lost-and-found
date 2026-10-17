import React, { useState } from 'react';
import { Filter, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { CATEGORIES, CAMPUSES } from '../../data/mockData';
import type { FilterOptions } from '../../types';

interface FilterPanelProps {
  filters: FilterOptions;
  onChange: (filters: FilterOptions) => void;
  onReset: () => void;
  itemCount?: number;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onChange,
  onReset,
  itemCount: _itemCount,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveFilters =
    filters.type !== 'all' ||
    filters.category !== 'all' ||
    filters.campus !== 'all' ||
    filters.dateRange !== 'all' ||
    filters.searchQuery !== '';

  return (
    <div className="bg-white rounded-2xl border border-findit-border p-4 mb-6 shadow-card">
      {/* Top Filter Bar Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status / Type Toggle */}
        <div className="flex items-center bg-findit-bg p-1 rounded-xl border border-findit-border">
          <button
            type="button"
            onClick={() => onChange({ ...filters, type: 'all' })}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[36px] flex items-center justify-center ${
              filters.type === 'all'
                ? 'bg-white text-findit-primary shadow-subtle border border-findit-border font-bold'
                : 'text-findit-muted hover:text-findit-text'
            }`}
          >
            All Items
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...filters, type: 'lost' })}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 min-h-[36px] ${
              filters.type === 'lost'
                ? 'bg-findit-lost-bg text-findit-lost shadow-subtle border border-[#EED7D4] font-bold'
                : 'text-findit-muted hover:text-findit-lost'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#C25E54]" />
            Lost Only
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...filters, type: 'found' })}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 min-h-[36px] ${
              filters.type === 'found'
                ? 'bg-findit-found-bg text-findit-found shadow-subtle border border-[#CEE0D0] font-bold'
                : 'text-findit-muted hover:text-findit-found'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#4E7A5A]" />
            Found Only
          </button>
        </div>

        {/* Toggle detailed filters on mobile / Quick reset */}
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 text-xs text-findit-muted hover:text-findit-text px-3 py-1.5 rounded-lg border border-findit-border hover:bg-findit-bg transition-colors min-h-[36px]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="md:hidden inline-flex items-center gap-1.5 text-xs font-medium text-findit-text px-3 py-1.5 rounded-lg border border-findit-border bg-findit-bg min-h-[36px]"
          >
            <Filter className="w-3.5 h-3.5 text-findit-primary" />
            <span>Filters</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Extended Filters Grid (Desktop always visible, Mobile collapsible) */}
      <div className={`pt-4 mt-3 border-t border-findit-border ${isExpanded ? 'block' : 'hidden md:block'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Category Filter */}
          <div>
            <label className="block text-xs font-semibold text-findit-muted uppercase tracking-wider mb-1.5">
              Category
            </label>
            <select
              value={filters.category}
              onChange={(e) => onChange({ ...filters, category: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-findit-bg border border-findit-border text-sm text-findit-text focus:border-findit-primary focus:ring-1 focus:ring-findit-primary outline-none min-h-[40px]"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Campus Filter */}
          <div>
            <label className="block text-xs font-semibold text-findit-muted uppercase tracking-wider mb-1.5">
              Campus Location
            </label>
            <select
              value={filters.campus}
              onChange={(e) => onChange({ ...filters, campus: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-findit-bg border border-findit-border text-sm text-findit-text focus:border-findit-primary focus:ring-1 focus:ring-findit-primary outline-none min-h-[40px]"
            >
              <option value="all">All Campuses & Sites</option>
              {CAMPUSES.map((camp) => (
                <option key={camp} value={camp}>
                  {camp}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-xs font-semibold text-findit-muted uppercase tracking-wider mb-1.5">
              Timeframe
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) =>
                onChange({ ...filters, dateRange: e.target.value as FilterOptions['dateRange'] })
              }
              className="w-full px-3 py-2 rounded-xl bg-findit-bg border border-findit-border text-sm text-findit-text focus:border-findit-primary focus:ring-1 focus:ring-findit-primary outline-none min-h-[40px]"
            >
              <option value="all">Anytime (All records)</option>
              <option value="today">Today only</option>
              <option value="this_week">Past 7 days</option>
              <option value="this_month">Past 30 days</option>
            </select>
          </div>
        </div>

        {/* Quick Category Pills */}
        <div className="mt-3.5 pt-3 border-t border-findit-border/80 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-findit-subtle shrink-0 mr-1 font-medium">Quick categories:</span>
          {CATEGORIES.slice(0, 5).map((cat) => {
            const isSelected = filters.category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onChange({ ...filters, category: isSelected ? 'all' : cat })}
                className={`px-3 py-1 rounded-lg shrink-0 transition-colors text-[11px] font-semibold border min-h-[30px] ${
                  isSelected
                    ? 'bg-findit-primary text-white border-findit-primary shadow-subtle'
                    : 'bg-findit-bg hover:bg-findit-secondary_bg border-findit-border text-findit-text'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
