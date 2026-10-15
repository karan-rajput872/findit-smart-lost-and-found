import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RefreshCw, AlertCircle, Database, ArrowUpDown } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { SearchBar } from '../components/items/SearchBar';
import { FilterPanel } from '../components/items/FilterPanel';
import { ItemGrid } from '../components/items/ItemGrid';
import { useApp } from '../context/AppContext';
import { fetchItemsApi } from '../services/api';
import type { FilterOptions, Item } from '../types';

export const BrowsePage: React.FC = () => {
  const { items: contextItems, isLoadingItems: isContextLoading, backendError, refreshBackendData, isBackendOnline, storageMode } = useApp();

  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    type: 'all',
    category: 'all',
    campus: 'all',
    dateRange: 'all',
    status: 'all',
  });

  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [backendItems, setBackendItems] = useState<Item[] | null>(null);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [queryError, setQueryError] = useState<string | null>(null);

  const debounceTimerRef = useRef<number | null>(null);

  const handleResetFilters = () => {
    setFilters({
      searchQuery: '',
      type: 'all',
      category: 'all',
      campus: 'all',
      dateRange: 'all',
      status: 'all',
    });
  };

  // Fetch live items from backend when filters change
  useEffect(() => {
    if (!isBackendOnline) {
      setBackendItems(null);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(async () => {
      setIsLoadingResults(true);
      setQueryError(null);
      try {
        const response = await fetchItemsApi({
          type: filters.type,
          category: filters.category,
          campus: filters.campus,
          status: filters.status,
          searchQuery: filters.searchQuery,
        });
        setBackendItems(response.items);
        setTotalCount(response.total);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to query live items';
        setQueryError(msg);
        setBackendItems(null);
      } finally {
        setIsLoadingResults(false);
      }
    }, 250);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [filters, isBackendOnline]);

  // If backend results are available, use them; otherwise fall back to context items with local filtering
  const displayItems = useMemo(() => {
    let source = backendItems !== null ? backendItems : contextItems;

    // Local client-side fallback filtering if offline
    if (backendItems === null) {
      source = source.filter((item) => {
        if (filters.type !== 'all' && item.type !== filters.type) return false;
        if (filters.category !== 'all' && item.category !== filters.category) return false;
        if (filters.campus !== 'all' && item.campus !== filters.campus) return false;
        if (filters.status !== 'all' && item.status !== filters.status) return false;

        if (filters.searchQuery.trim() !== '') {
          const q = filters.searchQuery.toLowerCase();
          const matchesTitle = item.title.toLowerCase().includes(q);
          const matchesDesc = item.description.toLowerCase().includes(q);
          const matchesLoc = item.location.toLowerCase().includes(q);
          const matchesCategory = item.category.toLowerCase().includes(q);
          if (!matchesTitle && !matchesDesc && !matchesLoc && !matchesCategory) return false;
        }

        return true;
      });
    }

    // Apply date range filter client-side if selected
    if (filters.dateRange !== 'all') {
      const now = Date.now();
      source = source.filter((item) => {
        const itemDate = new Date(item.date).getTime();
        const diffDays = (now - itemDate) / (1000 * 3600 * 24);
        if (filters.dateRange === 'today' && diffDays > 1) return false;
        if (filters.dateRange === 'this_week' && diffDays > 7) return false;
        if (filters.dateRange === 'this_month' && diffDays > 30) return false;
        return true;
      });
    }

    // Sort items
    const sorted = [...source].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return sorted;
  }, [backendItems, contextItems, filters, sortOrder]);

  const activeCount = backendItems !== null ? totalCount : displayItems.length;
  const isLoading = isLoadingResults || isContextLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Explore Campus Directory"
        description="Search and filter through real-time lost and found reports across all campus departments, libraries, and sites."
        badge={
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-findit-primary/10 text-findit-primary border border-findit-primary/30">
              {activeCount} {activeCount === 1 ? 'Record' : 'Records'}
            </span>
            {isBackendOnline ? (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hidden sm:inline-flex items-center gap-1">
                <Database className="w-2.5 h-2.5" />
                Live API ({storageMode === 'in_memory_development' ? 'In-Memory Dev' : 'Postgres'})
              </span>
            ) : (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 hidden sm:inline-flex items-center gap-1">
                Local Dev Mode
              </span>
            )}
          </div>
        }
      />

      {/* Backend connection / query error alert */}
      {(backendError || queryError) && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {queryError || backendError} (Showing cached directory).
            </span>
          </div>
          <button
            onClick={() => refreshBackendData()}
            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 font-semibold text-white flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      {/* Search & Sort Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <SearchBar
            value={filters.searchQuery}
            onChange={(query) => setFilters((prev) => ({ ...prev, searchQuery: query }))}
            totalResults={displayItems.length}
          />
        </div>

        {/* Sort Order Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-findit-card border border-findit-border text-xs text-findit-muted">
            <ArrowUpDown className="w-3.5 h-3.5 text-findit-subtle ml-1" />
            <button
              onClick={() => setSortOrder('newest')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                sortOrder === 'newest'
                  ? 'bg-findit-primary text-white shadow-sm'
                  : 'hover:text-white'
              }`}
            >
              Newest
            </button>
            <button
              onClick={() => setSortOrder('oldest')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                sortOrder === 'oldest'
                  ? 'bg-findit-primary text-white shadow-sm'
                  : 'hover:text-white'
              }`}
            >
              Oldest
            </button>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <FilterPanel
        filters={filters}
        onChange={setFilters}
        onReset={handleResetFilters}
        itemCount={displayItems.length}
      />

      {/* Loading Skeleton or Item Grid */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 py-4 text-xs text-findit-muted">
            <RefreshCw className="w-4 h-4 animate-spin text-findit-primary" />
            <span>Syncing items from backend API...</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-findit-card border border-findit-border overflow-hidden p-4 space-y-3 animate-pulse"
              >
                <div className="aspect-[16/10] bg-findit-bg rounded-xl" />
                <div className="h-4 bg-findit-bg rounded w-3/4" />
                <div className="h-3 bg-findit-bg rounded w-full" />
                <div className="h-3 bg-findit-bg rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <ItemGrid
          items={displayItems}
          emptyTitle="No matching items found"
          emptyDescription="We couldn't find any lost or found records matching your current filter criteria. Try resetting filters or searching with broader terms."
          emptyActionText="Clear All Filters"
          onEmptyAction={handleResetFilters}
        />
      )}
    </div>
  );
};
