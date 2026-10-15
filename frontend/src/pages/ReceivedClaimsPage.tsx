import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  MessageSquare,
  PackageCheck,
  MapPin,
  ExternalLink,
  Lock,
  User,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { useApp } from '../context/AppContext';
import type { Claim, ClaimStatus, HandoverStatus } from '../types';

export const ReceivedClaimsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    receivedClaims,
    fetchReceivedClaims,
    reviewClaim,
    updateHandover,
    completeReturn,
    isLoadingClaims,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<'all' | ClaimStatus>('all');
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  // Review modal state
  const [reviewModalClaim, setReviewModalClaim] = useState<Claim | null>(null);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected' | 'under_review'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Handover modal state
  const [handoverModalClaim, setHandoverModalClaim] = useState<Claim | null>(null);
  const [handoverStatus, setHandoverStatus] = useState<HandoverStatus>('handover_arranged');
  const [handoverDetails, setHandoverDetails] = useState('');
  const [isSubmittingHandover, setIsSubmittingHandover] = useState(false);

  // Return completion confirmation state
  const [completeClaimTarget, setCompleteClaimTarget] = useState<Claim | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [isCompletingReturn, setIsCompletingReturn] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchReceivedClaims();
  }, [fetchReceivedClaims]);

  const filteredClaims = receivedClaims.filter((claim) => {
    if (statusFilter === 'all') return true;
    return claim.status.toLowerCase() === statusFilter.toLowerCase();
  });

  const counts = {
    total: receivedClaims.length,
    pending: receivedClaims.filter((c) => ['pending', 'under_review'].includes(c.status.toLowerCase())).length,
    approved: receivedClaims.filter((c) => c.status.toLowerCase() === 'approved').length,
    completed: receivedClaims.filter((c) => c.status.toLowerCase() === 'completed').length,
  };

  const handleOpenReview = (claim: Claim, action: 'approved' | 'rejected' | 'under_review') => {
    setReviewModalClaim(claim);
    setReviewAction(action);
    setReviewNotes('');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalClaim) return;
    setIsSubmittingReview(true);
    try {
      await reviewClaim(reviewModalClaim.id, {
        status: reviewAction,
        reviewNotes: reviewNotes.trim() || undefined,
      });
      setFeedback({
        type: 'success',
        message: `Claim successfully marked as ${reviewAction.replace('_', ' ')}.`,
      });
      setReviewModalClaim(null);
      if (selectedClaim?.id === reviewModalClaim.id) {
        setSelectedClaim(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update claim review.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleOpenHandover = (claim: Claim) => {
    setHandoverModalClaim(claim);
    setHandoverStatus(claim.handoverStatus || 'handover_arranged');
    setHandoverDetails(claim.handoverDetails || '');
  };

  const handleSubmitHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoverModalClaim) return;
    setIsSubmittingHandover(true);
    try {
      await updateHandover(handoverModalClaim.id, {
        handoverStatus,
        handoverDetails: handoverDetails.trim() || undefined,
      });
      setFeedback({
        type: 'success',
        message: 'Handover arrangements updated and sent to claimant.',
      });
      setHandoverModalClaim(null);
      if (selectedClaim?.id === handoverModalClaim.id) {
        setSelectedClaim(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update handover.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsSubmittingHandover(false);
    }
  };

  const handleConfirmCompleteReturn = async () => {
    if (!completeClaimTarget) return;
    setIsCompletingReturn(true);
    try {
      await completeReturn(completeClaimTarget.id, {
        completionNotes: completionNotes.trim() || undefined,
      });
      setFeedback({
        type: 'success',
        message: 'Item confirmed returned! Listing marked resolved in campus directory.',
      });
      setCompleteClaimTarget(null);
      if (selectedClaim?.id === completeClaimTarget.id) {
        setSelectedClaim(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to complete return.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsCompletingReturn(false);
    }
  };

  const getStatusBadge = (status: ClaimStatus) => {
    const s = status.toLowerCase();
    switch (s) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" /> Pending Review
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <RefreshCw className="w-3 h-3 animate-spin" /> Under Review
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <PackageCheck className="w-3 h-3" /> Returned Successfully
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-500/15 text-gray-400 border border-gray-500/30">
            <XCircle className="w-3 h-3" /> Cancelled by Claimant
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-findit-card text-findit-muted border border-findit-border">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Received Claims Review"
        description="Review ownership claims submitted for items you reported and coordinate secure physical returns."
      />

      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'bg-red-500/15 text-red-400 border border-red-500/30'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-white hover:opacity-80">
            ✕
          </button>
        </div>
      )}

      {/* Metric Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-findit-card border border-findit-border shadow-sm">
          <p className="text-[11px] font-semibold text-findit-muted uppercase tracking-wider">Incoming Claims</p>
          <p className="text-2xl font-black text-white mt-1">{counts.total}</p>
        </div>
        <div className="p-4 rounded-2xl bg-findit-card border border-amber-500/20 shadow-sm">
          <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Awaiting Decision</p>
          <p className="text-2xl font-black text-amber-300 mt-1">{counts.pending}</p>
        </div>
        <div className="p-4 rounded-2xl bg-findit-card border border-emerald-500/20 shadow-sm">
          <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">In Handover</p>
          <p className="text-2xl font-black text-emerald-300 mt-1">{counts.approved}</p>
        </div>
        <div className="p-4 rounded-2xl bg-findit-card border border-purple-500/20 shadow-sm">
          <p className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">Completed</p>
          <p className="text-2xl font-black text-purple-300 mt-1">{counts.completed}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-findit-border pb-3">
        {(['all', 'pending', 'under_review', 'approved', 'completed', 'rejected'] as const).map(
          (status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                statusFilter === status
                  ? 'bg-findit-primary text-white shadow-glow-primary'
                  : 'bg-findit-card border border-findit-border text-findit-muted hover:text-white hover:bg-findit-card/80'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          )
        )}
      </div>

      {/* Claims List */}
      {isLoadingClaims ? (
        <div className="text-center py-16 space-y-3">
          <RefreshCw className="w-7 h-7 animate-spin text-findit-primary mx-auto" />
          <p className="text-sm font-semibold text-white">Loading incoming claims...</p>
        </div>
      ) : filteredClaims.length === 0 ? (
        <EmptyState
          title="No incoming claims"
          description="You haven't received any claims for your reported items under this filter."
          actionText="View My Reported Items"
          onAction={() => navigate('/dashboard/my-reports')}
        />
      ) : (
        <div className="space-y-3">
          {filteredClaims.map((claim) => (
            <div
              key={claim.id}
              className="p-5 rounded-2xl bg-findit-card border border-findit-border hover:border-findit-primary/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-white truncate">
                    {claim.itemTitle || `Claim for Item #${claim.itemId}`}
                  </h3>
                  {getStatusBadge(claim.status)}
                </div>

                <div className="text-xs text-findit-muted flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-findit-primary" />
                  <span>Claimant: <strong className="text-findit-text">{claim.claimantName || 'Campus Member'}</strong></span>
                  {claim.claimantEmail && (
                    <span className="text-[11px] text-findit-subtle font-mono">({claim.claimantEmail})</span>
                  )}
                </div>

                <p className="text-xs text-findit-muted line-clamp-2">
                  <span className="font-semibold text-findit-text">Claim explanation:</span> {claim.description}
                </p>

                {claim.proofDetails && (
                  <p className="text-xs text-amber-300/90 flex items-center gap-1 font-mono">
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span className="truncate">Confidential proof provided: {claim.proofDetails}</span>
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 self-end md:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedClaim(claim)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-findit-card border border-findit-border hover:bg-findit-card/80 transition-all flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect</span>
                </button>

                {/* Approve/Reject when pending or under review */}
                {['pending', 'under_review'].includes(claim.status.toLowerCase()) && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenReview(claim, 'approved')}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-all flex items-center gap-1 shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenReview(claim, 'rejected')}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </>
                )}

                {/* Handover & Complete Return when approved */}
                {claim.status.toLowerCase() === 'approved' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenHandover(claim)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all flex items-center gap-1"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Coordinate Handover</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCompleteClaimTarget(claim);
                        setCompletionNotes('');
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-findit-primary hover:opacity-95 shadow-glow-primary transition-all flex items-center gap-1.5"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>Confirm Return</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal (Approve / Reject / Under Review) */}
      {reviewModalClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleSubmitReview}
            className="bg-findit-sidebar border border-findit-border rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-white capitalize">
                  {reviewAction.replace('_', ' ')} Claim Request
                </h3>
                <p className="text-xs text-findit-muted mt-0.5">
                  Item: <strong className="text-white">{reviewModalClaim.itemTitle}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalClaim(null)}
                className="p-1 rounded-lg text-findit-muted hover:text-white hover:bg-findit-card transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-findit-bg border border-findit-border text-xs text-findit-muted">
                <span className="font-bold text-white block mb-1">Claimant Proof:</span>
                {reviewModalClaim.proofDetails || reviewModalClaim.description}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-findit-text uppercase tracking-wider">
                  Review Notes / Feedback for Claimant
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={
                    reviewAction === 'approved'
                      ? 'Add instructions or verification confirmation notes...'
                      : 'Explain why the claim does not match this item...'
                  }
                  rows={4}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-findit-bg border border-findit-border text-xs text-white focus:outline-none focus:border-findit-primary transition-colors resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-findit-border">
              <button
                type="button"
                onClick={() => setReviewModalClaim(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-findit-muted hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingReview}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-sm ${
                  reviewAction === 'approved'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {isSubmittingReview ? 'Submitting...' : `Confirm ${reviewAction.replace('_', ' ')}`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Handover Arrangement Modal */}
      {handoverModalClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleSubmitHandover}
            className="bg-findit-sidebar border border-findit-border rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Coordinate Return Handover</h3>
                <p className="text-xs text-findit-muted mt-0.5">
                  Propose meeting arrangement for <strong className="text-white">{handoverModalClaim.itemTitle}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHandoverModalClaim(null)}
                className="p-1 rounded-lg text-findit-muted hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-findit-text uppercase tracking-wider">
                  Handover Status
                </label>
                <select
                  value={handoverStatus}
                  onChange={(e) => setHandoverStatus(e.target.value as HandoverStatus)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-findit-bg border border-findit-border text-xs text-white focus:outline-none focus:border-findit-primary"
                >
                  <option value="awaiting_handover">Awaiting Handover</option>
                  <option value="handover_arranged">Handover Arranged / Scheduled</option>
                  <option value="returned_successfully">Returned Successfully</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-findit-text uppercase tracking-wider">
                  Meeting Location & Schedule Details
                </label>
                <textarea
                  value={handoverDetails}
                  onChange={(e) => setHandoverDetails(e.target.value)}
                  placeholder="e.g. Meet at Main Campus Student Desk, Mon-Fri between 10am-4pm. Please bring student ID."
                  rows={4}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-findit-bg border border-findit-border text-xs text-white focus:outline-none focus:border-findit-primary resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-findit-border">
              <button
                type="button"
                onClick={() => setHandoverModalClaim(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-findit-muted hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingHandover}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-findit-primary hover:bg-findit-primary-hover shadow-glow-primary transition-all"
              >
                {isSubmittingHandover ? 'Saving...' : 'Send Arrangements'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Return Completion Confirmation Dialog */}
      {completeClaimTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-findit-sidebar border border-findit-border rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 shrink-0">
                <PackageCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Confirm Physical Item Return</h3>
                <p className="text-xs text-findit-muted mt-1 leading-relaxed">
                  Have you physically handed over <strong className="text-white">{completeClaimTarget.itemTitle}</strong> to claimant <strong className="text-white">{completeClaimTarget.claimantName}</strong>?
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300/90 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>System Impact:</strong> Confirming this will permanently mark this claim as <strong>Completed</strong> and atomically resolve the item listing status as <strong>Returned</strong> in the public directory.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-findit-text uppercase tracking-wider">
                Completion Remarks (Optional)
              </label>
              <input
                type="text"
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="e.g. Student ID verified, item safely handed over."
                className="w-full px-3.5 py-2.5 rounded-xl bg-findit-bg border border-findit-border text-xs text-white focus:outline-none focus:border-findit-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-findit-border">
              <button
                type="button"
                onClick={() => setCompleteClaimTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-findit-muted hover:text-white"
              >
                Not Yet
              </button>
              <button
                type="button"
                onClick={handleConfirmCompleteReturn}
                disabled={isCompletingReturn}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-glow-primary transition-all flex items-center gap-1.5"
              >
                <PackageCheck className="w-4 h-4" />
                <span>{isCompletingReturn ? 'Confirming...' : 'Yes, Confirm Return'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Claim Details Dialog */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-findit-sidebar border border-findit-border rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Incoming Claim Inspection</h3>
                <p className="text-xs text-findit-muted mt-0.5">
                  Claim ID: <span className="font-mono text-findit-primary">{selectedClaim.id}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedClaim(null)}
                className="p-1 rounded-lg text-findit-muted hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-findit-card border border-findit-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-findit-muted">Item:</span>
                <span className="text-xs font-bold text-white">{selectedClaim.itemTitle}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-findit-muted">Claimant:</span>
                <span className="text-xs font-bold text-findit-text">
                  {selectedClaim.claimantName} ({selectedClaim.claimantEmail})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-findit-muted">Status:</span>
                {getStatusBadge(selectedClaim.status)}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-findit-text uppercase tracking-wider">
                Claimant's Explanation
              </label>
              <div className="p-3.5 rounded-xl bg-findit-bg border border-findit-border text-xs text-white leading-relaxed">
                {selectedClaim.description}
              </div>
            </div>

            {selectedClaim.proofDetails && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Confidential Ownership Proof</span>
                </label>
                <div className="p-3.5 rounded-xl bg-findit-bg border border-amber-500/20 text-xs text-amber-200 leading-relaxed font-mono">
                  {selectedClaim.proofDetails}
                </div>
              </div>
            )}

            {selectedClaim.reviewNotes && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-findit-primary flex items-center gap-1.5 uppercase tracking-wider">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Your Review Notes</span>
                </label>
                <div className="p-3.5 rounded-xl bg-findit-primary/10 border border-findit-primary/20 text-xs text-findit-text leading-relaxed">
                  {selectedClaim.reviewNotes}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-findit-border">
              <Link
                to={`/dashboard/items/${selectedClaim.itemId}`}
                className="text-xs font-bold text-findit-primary hover:underline flex items-center gap-1"
              >
                <span>View Item Report</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setSelectedClaim(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-findit-card border border-findit-border hover:bg-findit-card/80 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
