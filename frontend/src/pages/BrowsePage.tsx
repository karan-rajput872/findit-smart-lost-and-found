import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RefreshCw, AlertCircle, ArrowUpDown } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { SearchBar } from '../components/items/SearchBar';
import { FilterPanel } from '../components/items/FilterPanel';
import { ItemGrid } from '../components/items/ItemGrid';
import { useApp } from '../context/AppContext';
import { fetchItemsApi } from '../services/api';
import type { FilterOptions, Item } from '../types';

export const BrowsePage: React.FC = () => {
  const { items: contextItems, isLoadingItems: isContextLoading, backendError, refreshBackendData, isBackendOnline } = useApp();

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
        const msg = err instanceof Error ? err.message : "We couldn't complete your request.";
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
        title="Browse Items"
        description="Search through lost and found belongings across our campus community."
        badge={
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-white text-findit-primary border border-findit-border shadow-subtle">
            {activeCount} {activeCount === 1 ? 'Item' : 'Items'} Listed
          </span>
        }
      />

      {/* Backend connection / query error alert */}
      {(backendError || queryError) && (
        <div className="p-3.5 rounded-xl bg-findit-warning-bg border border-[#EDDCBE] flex items-center justify-between text-xs text-[#8F6325]">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#996B26] shrink-0" />
            <span>
              {queryError || backendError || 'Something went wrong. Please try again.'}
            </span>
          </div>
          <button
            onClick={() => refreshBackendData()}
            className="px-3 py-1 rounded-lg bg-white hover:bg-findit-bg font-semibold text-findit-text border border-findit-border flex items-center gap-1 transition-colors min-h-[32px]"
          >
            <RefreshCw className="w-3 h-3 text-findit-primary" />
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
            placeholder="Search by title, description, or keyword (e.g. 'bottle', 'calculator', 'keys')..."
            totalResults={displayItems.length}
          />
        </div>

        {/* Sort Order Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-white border border-findit-border text-xs text-findit-muted shadow-subtle min-h-[44px]">
            <ArrowUpDown className="w-3.5 h-3.5 text-findit-primary ml-1.5" />
            <button
              onClick={() => setSortOrder('newest')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all min-h-[34px] flex items-center justify-center ${
                sortOrder === 'newest'
                  ? 'bg-findit-primary text-white shadow-subtle'
                  : 'text-findit-muted hover:text-findit-text'
              }`}
            >
              Newest
            </button>
            <button
              onClick={() => setSortOrder('oldest')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all min-h-[34px] flex items-center justify-center ${
                sortOrder === 'oldest'
                  ? 'bg-findit-primary text-white shadow-subtle'
                  : 'text-findit-muted hover:text-findit-text'
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
            <span>Loading items...</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-white border border-findit-border overflow-hidden p-4 space-y-3 animate-pulse shadow-card"
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
          emptyTitle="We couldn't find a matching item."
          emptyDescription="Try changing your search terms or clearing the filters above to see more items."
          emptyActionText="Clear All Filters"
          onEmptyAction={handleResetFilters}
        />
      )}
    </div>
  );
};
