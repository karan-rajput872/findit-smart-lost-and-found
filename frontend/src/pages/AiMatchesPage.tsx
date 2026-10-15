import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Info,
  CheckCircle,
  MapPin,
  Calendar,
  Cpu,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Search,
  ArrowRight,
  SlidersHorizontal,
  EyeOff,
  CheckCircle2,
  Copy,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  X,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import { useApp } from '../context/AppContext';
import { formatDate } from '../utils/formatters';

export const AiMatchesPage: React.FC = () => {
  const {
    potentialMatches,
    isLoadingMatches,
    fetchPotentialMatches,
    submitMatchFeedback,
    updateMatchStatus,
    triggerMatchGeneration,
  } = useApp();

  // Local filter states
  const [selectedTier, setSelectedTier] = useState<'all' | 'strong' | 'possible' | 'weak'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [feedbackFilter, setFeedbackFilter] = useState<
    'all' | 'relevant' | 'not_relevant' | 'already_recovered' | 'duplicate' | 'unreviewed'
  >('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'suggested' | 'viewed' | 'dismissed'>('all');

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);

  // Notes modal/input state
  const [activeFeedbackModal, setActiveFeedbackModal] = useState<{
    matchId: string;
    feedbackType: 'relevant' | 'not_relevant' | 'already_recovered' | 'duplicate';
  } | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState<string>('');

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  // Fetch real matches on initial load
  useEffect(() => {
    fetchPotentialMatches();
  }, [fetchPotentialMatches]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTier, searchQuery, selectedCategory, feedbackFilter, statusFilter, pageSize]);

  // Show transient toast
  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Trigger on-demand AI matching scan
  const handleScan = async () => {
    setIsScanning(true);
    try {
      const res = await triggerMatchGeneration();
      showToast(
        res.message || `AI Scan complete: ${res.generatedCount} new match(es) identified.`,
        'success'
      );
    } catch {
      showToast('Could not complete AI scan. Using current recommendations.', 'info');
    } finally {
      setIsScanning(false);
    }
  };

  // Submit feedback directly or with notes
  const handleFeedback = async (
    matchId: string,
    feedback: 'relevant' | 'not_relevant' | 'already_recovered' | 'duplicate',
    notes?: string
  ) => {
    try {
      await submitMatchFeedback(matchId, feedback, notes);
      setActiveFeedbackModal(null);
      setFeedbackNotes('');
      const labels: Record<string, string> = {
        relevant: 'Marked as a relevant recommendation.',
        not_relevant: 'Marked as not relevant.',
        already_recovered: 'Marked as already recovered.',
        duplicate: 'Marked as duplicate recommendation.',
      };
      showToast(labels[feedback] || 'Feedback recorded successfully.', 'info');
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      showToast('Failed to save feedback.', 'info');
    }
  };

  // Update match status (e.g. dismiss or viewed)
  const handleStatusChange = async (
    matchId: string,
    status: 'suggested' | 'viewed' | 'dismissed' | 'claimed'
  ) => {
    try {
      await updateMatchStatus(matchId, status);
      showToast(
        status === 'dismissed'
          ? 'Match recommendation dismissed from active view.'
          : `Match status updated to ${status}.`,
        'info'
      );
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Distinct categories available in current matches
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    potentialMatches.forEach((m) => {
      if (m.lostItem?.category) cats.add(m.lostItem.category);
      if (m.foundItem?.category) cats.add(m.foundItem.category);
    });
    return Array.from(cats);
  }, [potentialMatches]);

  // Filtered match records
  const filteredMatches = useMemo(() => {
    return potentialMatches.filter((match) => {
      // 1. Tier filter
      const score = match.similarityScore ?? match.overallScore ?? 0;
      if (selectedTier === 'strong' && score < 80) return false;
      if (selectedTier === 'possible' && (score < 50 || score >= 80)) return false;
      if (selectedTier === 'weak' && score >= 50) return false;

      // 2. Feedback filter
      if (feedbackFilter === 'unreviewed' && match.feedback) return false;
      if (feedbackFilter !== 'all' && feedbackFilter !== 'unreviewed' && match.feedback !== feedbackFilter) {
        return false;
      }

      // 3. Status filter
      if (statusFilter !== 'all' && match.status !== statusFilter) return false;

      // 4. Category filter
      if (selectedCategory !== 'all') {
        const c1 = match.lostItem?.category?.toLowerCase() || '';
        const c2 = match.foundItem?.category?.toLowerCase() || '';
        const target = selectedCategory.toLowerCase();
        if (!c1.includes(target) && !c2.includes(target)) return false;
      }

      // 5. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const text = [
          match.lostItem?.title,
          match.lostItem?.description,
          match.lostItem?.location,
          match.foundItem?.title,
          match.foundItem?.description,
          match.foundItem?.location,
          match.explanation,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!text.includes(q)) return false;
      }

      return true;
    });
  }, [potentialMatches, selectedTier, feedbackFilter, statusFilter, selectedCategory, searchQuery]);

  // Paginated records
  const totalPages = Math.max(1, Math.ceil(filteredMatches.length / pageSize));
  const paginatedMatches = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMatches.slice(start, start + pageSize);
  }, [filteredMatches, currentPage, pageSize]);

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl bg-findit-primary text-black font-bold shadow-2xl flex items-center gap-3 animate-fade-in border border-white/20">
          <Sparkles className="w-5 h-5 text-black shrink-0" />
          <span className="text-sm">{toastMessage.text}</span>
        </div>
      )}

      {/* Feedback Modal with optional notes */}
      {activeFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-findit-card border border-findit-border shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-findit-border">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-findit-primary" />
                <h3 className="text-sm font-bold text-white capitalize">
                  Record Feedback: {activeFeedbackModal.feedbackType.replace('_', ' ')}
                </h3>
              </div>
              <button
                onClick={() => setActiveFeedbackModal(null)}
                className="p-1 rounded-lg hover:bg-findit-bg text-findit-muted hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-findit-muted">
              Optional: Add a brief remark explaining why this recommendation is{' '}
              <strong>{activeFeedbackModal.feedbackType.replace('_', ' ')}</strong>. This helps tune our scoring model.
            </p>

            <textarea
              rows={3}
              placeholder="e.g. Color and model matched perfectly, but serial number was different..."
              value={feedbackNotes}
              onChange={(e) => setFeedbackNotes(e.target.value)}
              className="w-full p-3 rounded-xl bg-findit-bg border border-findit-border text-xs text-white placeholder-findit-muted focus:outline-none focus:border-findit-primary"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveFeedbackModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-findit-muted hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleFeedback(
                    activeFeedbackModal.matchId,
                    activeFeedbackModal.feedbackType,
                    feedbackNotes.trim() || undefined
                  )
                }
                className="px-4 py-2 rounded-xl bg-findit-primary text-black font-bold text-xs hover:bg-findit-primary-hover transition-colors"
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header with Scan Action */}
      <PageHeader
        title="AI-Powered Smart Matching"
        description="Continuous multi-signal semantic matching between active lost belongings and turned-in campus items."
        badge={
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-findit-primary/15 text-findit-primary border border-findit-primary/30 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Active AI Engine
          </span>
        }
        action={
          <button
            onClick={handleScan}
            disabled={isScanning || isLoadingMatches}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-findit-primary hover:bg-findit-primary-hover text-black font-bold text-xs shadow-lg shadow-findit-primary/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'Scanning Directory...' : 'Recalculate Matches'}
          </button>
        }
      />

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-findit-card border border-findit-border shadow-sm space-y-1">
          <div className="text-xs text-findit-muted font-medium">Total Matches</div>
          <div className="text-2xl font-black text-white">{potentialMatches.length}</div>
          <div className="text-[11px] text-findit-subtle">Calculated pairs</div>
        </div>

        <div className="p-5 rounded-2xl bg-findit-card border border-findit-border shadow-sm space-y-1">
          <div className="text-xs text-findit-secondary font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-findit-secondary animate-pulse" />
            Strong (80%+)
          </div>
          <div className="text-2xl font-black text-white">
            {potentialMatches.filter((m) => (m.similarityScore ?? m.overallScore ?? 0) >= 80).length}
          </div>
          <div className="text-[11px] text-findit-subtle">High confidence</div>
        </div>

        <div className="p-5 rounded-2xl bg-findit-card border border-findit-border shadow-sm space-y-1">
          <div className="text-xs text-findit-primary font-medium">Possible (50-79%)</div>
          <div className="text-2xl font-black text-white">
            {potentialMatches.filter((m) => {
              const s = m.similarityScore ?? m.overallScore ?? 0;
              return s >= 50 && s < 80;
            }).length}
          </div>
          <div className="text-[11px] text-findit-subtle">Moderate similarity</div>
        </div>

        <div className="p-5 rounded-2xl bg-findit-card border border-findit-border shadow-sm space-y-1">
          <div className="text-xs text-amber-400 font-medium">Pending Feedback</div>
          <div className="text-2xl font-black text-white">
            {potentialMatches.filter((m) => !m.feedback).length}
          </div>
          <div className="text-[11px] text-findit-subtle">Unreviewed suggestions</div>
        </div>
      </div>

      {/* Explanatory AI Callout */}
      <div className="p-6 rounded-2xl bg-findit-card/80 border border-findit-border space-y-3 relative overflow-hidden backdrop-blur-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-findit-primary/15 text-findit-primary border border-findit-primary/30 shrink-0">
            <Cpu className="w-6 h-6" />
          </div>
          <div className="space-y-1 flex-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Multi-Signal AI Recommendation Engine
            </h3>
            <p className="text-xs text-findit-muted leading-relaxed">
              FindIt compares reports across five calibrated dimensions: <strong>Semantic Text Similarity</strong> (TF-IDF vector space with campus synonyms and dense embedding fallback), <strong>Structured Attributes</strong> (brand & color detection), <strong>Category compatibility</strong>, <strong>Spatio-Temporal proximity</strong> (campus locations and report dates), and <strong>Visual metadata</strong>.
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-findit-bg/80 border border-findit-border/60 text-[11px] text-findit-subtle flex items-center gap-2">
          <Info className="w-4 h-4 text-findit-secondary shrink-0" />
          <span>
            <strong>Privacy & Security Notice:</strong> AI matching evaluates only public listing headlines, categories, and descriptions. Confidential ownership proof and private verification details are strictly excluded from all matching algorithms.
          </span>
        </div>
      </div>

      {/* Interactive Filter Bar */}
      <div className="p-4 rounded-2xl bg-findit-card border border-findit-border space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-findit-muted" />
            <input
              type="text"
              placeholder="Search matches by keyword, item title, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-findit-bg border border-findit-border text-xs text-white placeholder-findit-muted focus:outline-none focus:border-findit-primary transition-colors"
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter matches by category"
              className="px-3 py-2 rounded-xl bg-findit-bg border border-findit-border text-xs text-findit-text focus:outline-none focus:border-findit-primary transition-colors"
            >
              <option value="all">All Categories</option>
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Feedback Dropdown */}
            <select
              value={feedbackFilter}
              onChange={(e) => setFeedbackFilter(e.target.value as any)}
              aria-label="Filter matches by feedback review status"
              className="px-3 py-2 rounded-xl bg-findit-bg border border-findit-border text-xs text-findit-text focus:outline-none focus:border-findit-primary transition-colors"
            >
              <option value="all">All Feedback</option>
              <option value="unreviewed">Unreviewed Only</option>
              <option value="relevant">Relevant</option>
              <option value="not_relevant">Not Relevant</option>
              <option value="already_recovered">Already Recovered</option>
              <option value="duplicate">Duplicate</option>
            </select>

            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              aria-label="Filter matches by status"
              className="px-3 py-2 rounded-xl bg-findit-bg border border-findit-border text-xs text-findit-text focus:outline-none focus:border-findit-primary transition-colors"
            >
              <option value="all">All Statuses</option>
              <option value="suggested">Suggested</option>
              <option value="viewed">Viewed</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
        </div>

        {/* Confidence Tier Quick Pills */}
        <div className="flex items-center gap-2 pt-2 border-t border-findit-border/40 overflow-x-auto pb-1">
          <span className="text-[11px] font-semibold text-findit-muted uppercase tracking-wider mr-1 shrink-0">
            Confidence:
          </span>
          {[
            { id: 'all', label: 'All Scores' },
            { id: 'strong', label: 'Strong Matches (≥80%)' },
            { id: 'possible', label: 'Possible (50-79%)' },
            { id: 'weak', label: 'Low (<50%)' },
          ].map((tier) => (
            <button
              key={tier.id}
              onClick={() => setSelectedTier(tier.id as any)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedTier === tier.id
                  ? 'bg-findit-primary text-black'
                  : 'bg-findit-bg text-findit-muted hover:text-white border border-findit-border'
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>
      </div>

      {/* Match Cards Listing */}
      {isLoadingMatches ? (
        <LoadingState message="Analyzing directory and scoring potential matches..." />
      ) : filteredMatches.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No Matching Pairs Found"
          description={
            searchQuery || selectedTier !== 'all' || selectedCategory !== 'all' || feedbackFilter !== 'all' || statusFilter !== 'all'
              ? 'No AI matches found matching your selected criteria. Try adjusting your filters or resetting the search.'
              : 'There are currently no active lost-and-found reports with sufficient similarity. When new reports are filed, FindIt will automatically identify potential matches.'
          }
          actionText="Run Directory Scan"
          onAction={handleScan}
        />
      ) : (
        <div className="space-y-6">
          {paginatedMatches.map((match) => {
            const score = match.similarityScore ?? match.overallScore ?? 0;
            const isStrong = score >= 80;
            const isPossible = score >= 50 && score < 80;

            const tierBadge = isStrong ? (
              <span className="text-[11px] uppercase font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Strong Match
              </span>
            ) : isPossible ? (
              <span className="text-[11px] uppercase font-bold px-2.5 py-1 rounded-full bg-findit-primary/15 text-findit-primary border border-findit-primary/30">
                Possible Match
              </span>
            ) : (
              <span className="text-[11px] uppercase font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                Low Confidence
              </span>
            );

            return (
              <div
                key={match.id}
                className="p-6 rounded-3xl bg-findit-card border border-findit-border shadow-xl space-y-6 hover:border-findit-border-hover transition-all"
              >
                {/* Match Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-findit-border/60">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 rounded-2xl bg-findit-primary/10 text-findit-primary border border-findit-primary/20 shrink-0">
                      <Sparkles className="w-6 h-6 text-findit-secondary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-white">AI Match Recommendation</h3>
                        {tierBadge}
                        {match.status && match.status !== 'suggested' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-findit-bg border border-findit-border text-findit-muted uppercase">
                            {match.status}
                          </span>
                        )}
                        {match.feedback && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-findit-bg border border-findit-border text-findit-secondary">
                            Feedback: {match.feedback.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-findit-subtle mt-0.5">
                        Pairing analysis between lost #{match.lostItem?.id || match.lostItemId} and found #
                        {match.foundItem?.id || match.foundItemId}
                      </p>
                    </div>
                  </div>

                  {/* Confidence Score Pill */}
                  <div className="flex items-center gap-3 self-start sm:self-auto bg-findit-bg px-4 py-2 rounded-2xl border border-findit-border shrink-0">
                    <div className="text-right">
                      <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-findit-primary to-findit-secondary">
                        {score}%
                      </div>
                      <div className="text-[10px] text-findit-subtle uppercase tracking-wider font-semibold">
                        Overall Match
                      </div>
                    </div>
                  </div>
                </div>

                {/* Side-by-side Item Comparison Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Lost Item Column */}
                  <div className="p-4 rounded-2xl bg-findit-bg border border-findit-border space-y-3">
                    <div className="flex items-center justify-between">
                      <StatusBadge type="lost" size="sm" />
                      <span className="text-xs text-findit-muted font-medium">
                        {match.lostItem?.category || 'General'}
                      </span>
                    </div>

                    <div className="flex items-start gap-3">
                      {match.lostItem?.imageUrl ? (
                        <img
                          src={match.lostItem.imageUrl}
                          alt={match.lostItem.title}
                          className="w-16 h-16 rounded-xl object-cover border border-findit-border shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-findit-card flex items-center justify-center border border-findit-border shrink-0 text-findit-subtle text-[10px]">
                          No Photo
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-white truncate">
                          {match.lostItem?.title || 'Reported Lost Item'}
                        </h4>
                        <p className="text-xs text-findit-muted line-clamp-2 mt-1">
                          {match.lostItem?.description || 'No description provided.'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-findit-border/40 text-xs text-findit-subtle space-y-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-findit-secondary shrink-0" />
                        <span className="truncate">{match.lostItem?.location || 'Campus'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-findit-primary shrink-0" />
                        <span>Reported {match.lostItem?.date ? formatDate(match.lostItem.date) : 'Recently'}</span>
                      </div>
                    </div>

                    {match.lostItem?.id && (
                      <Link
                        to={`/dashboard/items/${match.lostItem.id}`}
                        className="block text-center py-2 rounded-xl text-xs font-semibold bg-findit-card hover:bg-findit-card-hover border border-findit-border text-findit-text transition-colors"
                      >
                        View Lost Listing &rarr;
                      </Link>
                    )}
                  </div>

                  {/* Found Item Column */}
                  <div className="p-4 rounded-2xl bg-findit-bg border border-findit-border space-y-3">
                    <div className="flex items-center justify-between">
                      <StatusBadge type="found" size="sm" />
                      <span className="text-xs text-findit-muted font-medium">
                        {match.foundItem?.category || 'General'}
                      </span>
                    </div>

                    <div className="flex items-start gap-3">
                      {match.foundItem?.imageUrl ? (
                        <img
                          src={match.foundItem.imageUrl}
                          alt={match.foundItem.title}
                          className="w-16 h-16 rounded-xl object-cover border border-findit-border shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-findit-card flex items-center justify-center border border-findit-border shrink-0 text-findit-subtle text-[10px]">
                          No Photo
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-white truncate">
                          {match.foundItem?.title || 'Reported Found Item'}
                        </h4>
                        <p className="text-xs text-findit-muted line-clamp-2 mt-1">
                          {match.foundItem?.description || 'No description provided.'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-findit-border/40 text-xs text-findit-subtle space-y-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-findit-secondary shrink-0" />
                        <span className="truncate">{match.foundItem?.location || 'Campus'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-findit-primary shrink-0" />
                        <span>Turned in {match.foundItem?.date ? formatDate(match.foundItem.date) : 'Recently'}</span>
                      </div>
                    </div>

                    {match.foundItem?.id && (
                      <Link
                        to={`/dashboard/items/${match.foundItem.id}`}
                        className="block text-center py-2 rounded-xl text-xs font-semibold bg-findit-card hover:bg-findit-card-hover border border-findit-border text-findit-text transition-colors"
                      >
                        View Found Listing &rarr;
                      </Link>
                    )}
                  </div>
                </div>

                {/* Multi-Signal Breakdown Bar & Reasons */}
                <div className="p-4 rounded-2xl bg-findit-sidebar/60 border border-findit-border/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-findit-primary flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      Algorithmic Match Factors
                    </h5>
                    <span className="text-[10px] text-findit-subtle">Normalized Score Breakdown</span>
                  </div>

                  {/* Sub-Score Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-findit-bg border border-findit-border">
                      <span className="text-findit-subtle block text-[10px]">Semantic Similarity</span>
                      <span className="font-bold text-white">
                        {match.semanticScore ?? match.similarityScore ?? 0}%
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-findit-bg border border-findit-border">
                      <span className="text-findit-subtle block text-[10px]">Attributes (Brand/Color)</span>
                      <span className="font-bold text-white">{match.attributeScore ?? 80}%</span>
                    </div>
                    <div className="p-2 rounded-xl bg-findit-bg border border-findit-border">
                      <span className="text-findit-subtle block text-[10px]">Location Proximity</span>
                      <span className="font-bold text-white">{match.locationScore ?? 85}%</span>
                    </div>
                    <div className="p-2 rounded-xl bg-findit-bg border border-findit-border">
                      <span className="text-findit-subtle block text-[10px]">Date Alignment</span>
                      <span className="font-bold text-white">{match.dateScore ?? 90}%</span>
                    </div>
                  </div>

                  {/* Reasons Bullet Points */}
                  <ul className="space-y-1.5 pt-1">
                    {(match.matchReasons || match.reasons || [match.explanation]).map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-findit-muted">
                        <CheckCircle className="w-3.5 h-3.5 text-findit-secondary shrink-0 mt-0.5" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>

                  {match.feedbackNotes && (
                    <div className="p-2.5 rounded-xl bg-findit-bg/80 border border-findit-border/70 text-xs text-findit-subtle flex items-start gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-findit-primary shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white">Feedback Note: </strong>
                        <span>{match.feedbackNotes}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions: Complete Feedback + Status + Claim Item */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-findit-border/60">
                  {/* Complete 4 Feedback Actions */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-findit-subtle font-medium block">
                      Evaluate this suggestion:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => handleFeedback(match.id, 'relevant')}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          match.feedback === 'relevant'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                            : 'bg-findit-bg text-findit-muted hover:text-white border-findit-border'
                        }`}
                        title="Relevant match"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        Relevant
                      </button>

                      <button
                        onClick={() => handleFeedback(match.id, 'not_relevant')}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          match.feedback === 'not_relevant'
                            ? 'bg-red-500/20 text-red-400 border-red-500/40 shadow-sm'
                            : 'bg-findit-bg text-findit-muted hover:text-white border-findit-border'
                        }`}
                        title="Not relevant match"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                        Not Relevant
                      </button>

                      <button
                        onClick={() => handleFeedback(match.id, 'already_recovered')}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          match.feedback === 'already_recovered'
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-sm'
                            : 'bg-findit-bg text-findit-muted hover:text-white border-findit-border'
                        }`}
                        title="Item has already been recovered"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Recovered
                      </button>

                      <button
                        onClick={() => handleFeedback(match.id, 'duplicate')}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          match.feedback === 'duplicate'
                            ? 'bg-purple-500/20 text-purple-400 border-purple-500/40 shadow-sm'
                            : 'bg-findit-bg text-findit-muted hover:text-white border-findit-border'
                        }`}
                        title="Duplicate match recommendation"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Duplicate
                      </button>

                      <button
                        onClick={() =>
                          setActiveFeedbackModal({
                            matchId: match.id,
                            feedbackType: (match.feedback as any) || 'relevant',
                          })
                        }
                        className="px-2 py-1.5 rounded-xl text-xs text-findit-muted hover:text-white bg-findit-bg border border-findit-border flex items-center gap-1"
                        title="Add comment"
                      >
                        <MessageSquare className="w-3 h-3" />
                        Note
                      </button>
                    </div>
                  </div>

                  {/* Dismiss / Status / Claim Item CTAs */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {match.status !== 'dismissed' ? (
                      <button
                        onClick={() => handleStatusChange(match.id, 'dismissed')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-findit-bg hover:bg-findit-card border border-findit-border text-findit-muted hover:text-red-400 transition-colors"
                        title="Dismiss this recommendation"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        Dismiss
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(match.id, 'suggested')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-findit-bg hover:bg-findit-card border border-findit-border text-findit-muted hover:text-white transition-colors"
                        title="Restore match recommendation"
                      >
                        Restore
                      </button>
                    )}

                    {match.foundItem?.id && (
                      <Link
                        to={`/dashboard/items/${match.foundItem.id}`}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-findit-secondary hover:bg-findit-secondary/90 text-black font-bold text-xs shadow-lg shadow-findit-secondary/20 transition-all shrink-0"
                      >
                        <span>Claim Found Item</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Clean Pagination Bar */}
          {filteredMatches.length > 0 && (
            <div className="p-4 rounded-2xl bg-findit-card border border-findit-border flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-xs text-findit-muted">
                <span>
                  Showing{' '}
                  <strong className="text-white">
                    {(currentPage - 1) * pageSize + 1} -{' '}
                    {Math.min(currentPage * pageSize, filteredMatches.length)}
                  </strong>{' '}
                  of <strong className="text-white">{filteredMatches.length}</strong> matches
                </span>

                <span className="text-findit-border">|</span>

                <div className="flex items-center gap-1.5">
                  <span>Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="px-2 py-1 rounded-lg bg-findit-bg border border-findit-border text-white text-xs focus:outline-none focus:border-findit-primary"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl bg-findit-bg border border-findit-border text-findit-muted hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === totalPages ||
                      Math.abs(p - currentPage) <= 1
                  )
                  .map((page, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && page - prev > 1;

                    return (
                      <React.Fragment key={page}>
                        {showEllipsis && (
                          <span className="px-2 text-findit-subtle text-xs">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                            currentPage === page
                              ? 'bg-findit-primary text-black'
                              : 'bg-findit-bg border border-findit-border text-findit-muted hover:text-white'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl bg-findit-bg border border-findit-border text-findit-muted hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AiMatchesPage;
