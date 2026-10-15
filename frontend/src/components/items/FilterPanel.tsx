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
    <div className="bg-findit-card rounded-2xl border border-findit-border p-4 mb-6 shadow-sm">
      {/* Top Filter Bar Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status / Type Toggle */}
        <div className="flex items-center bg-findit-bg p-1 rounded-xl border border-findit-border">
          <button
            type="button"
            onClick={() => onChange({ ...filters, type: 'all' })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filters.type === 'all'
                ? 'bg-findit-card text-white shadow-sm border border-findit-border'
                : 'text-findit-muted hover:text-findit-text'
            }`}
          >
            All Items
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...filters, type: 'lost' })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filters.type === 'lost'
                ? 'bg-red-500/20 text-red-300 shadow-sm border border-red-500/30'
                : 'text-findit-muted hover:text-red-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-400" />
            Lost Only
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...filters, type: 'found' })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filters.type === 'found'
                ? 'bg-teal-500/20 text-teal-300 shadow-sm border border-teal-500/30'
                : 'text-findit-muted hover:text-teal-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-teal-400" />
            Found Only
          </button>
        </div>

        {/* Toggle detailed filters on mobile / Quick reset */}
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 text-xs text-findit-muted hover:text-findit-text px-2.5 py-1.5 rounded-lg border border-findit-border hover:bg-findit-bg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="md:hidden inline-flex items-center gap-1.5 text-xs font-medium text-findit-muted hover:text-white px-3 py-1.5 rounded-lg border border-findit-border bg-findit-bg"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Extended Filters Grid (Desktop always visible, Mobile collapsible) */}
      <div className={`pt-4 mt-3 border-t border-findit-border/60 ${isExpanded ? 'block' : 'hidden md:block'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Category Filter */}
          <div>
            <label className="block text-xs font-semibold text-findit-muted uppercase tracking-wider mb-1.5">
              Category
            </label>
            <select
              value={filters.category}
              onChange={(e) => onChange({ ...filters, category: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-findit-bg border border-findit-border text-sm text-findit-text focus:border-findit-primary focus:ring-1 focus:ring-findit-primary outline-none"
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
              Campus / Location
            </label>
            <select
              value={filters.campus}
              onChange={(e) => onChange({ ...filters, campus: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-findit-bg border border-findit-border text-sm text-findit-text focus:border-findit-primary focus:ring-1 focus:ring-findit-primary outline-none"
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
              className="w-full px-3 py-2 rounded-xl bg-findit-bg border border-findit-border text-sm text-findit-text focus:border-findit-primary focus:ring-1 focus:ring-findit-primary outline-none"
            >
              <option value="all">Anytime (All records)</option>
              <option value="today">Today only</option>
              <option value="this_week">Past 7 days</option>
              <option value="this_month">Past 30 days</option>
            </select>
          </div>
        </div>

        {/* Quick Category Pills */}
        <div className="mt-3 pt-3 border-t border-findit-border/40 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-findit-subtle shrink-0 mr-1 font-medium">Quick categories:</span>
          {CATEGORIES.slice(0, 5).map((cat) => {
            const isSelected = filters.category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onChange({ ...filters, category: isSelected ? 'all' : cat })}
                className={`px-2.5 py-1 rounded-lg shrink-0 transition-colors text-[11px] font-medium border ${
                  isSelected
                    ? 'bg-findit-primary/20 text-findit-primary border-findit-primary/40'
                    : 'bg-findit-bg hover:bg-findit-card border-findit-border text-findit-muted'
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
