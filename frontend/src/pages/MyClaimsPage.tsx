import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  ExternalLink,
  Calendar,
  Lock,
  MessageSquare,
  PackageCheck,
  RefreshCw,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { EmptyState } from '../components/common/EmptyState';
import { ClaimCoordinationCard } from '../components/ClaimCoordinationCard';
import { useApp } from '../context/AppContext';
import { formatDate } from '../utils/formatters';
import type { Claim, ClaimStatus } from '../types';

export const MyClaimsPage: React.FC = () => {
  const navigate = useNavigate();
  const { myClaims, fetchMyClaims, cancelClaim, isLoadingClaims } = useApp();

  const [statusFilter, setStatusFilter] = useState<'all' | ClaimStatus>('all');
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [claimToCancel, setClaimToCancel] = useState<Claim | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchMyClaims();
  }, [fetchMyClaims]);

  const filteredClaims = myClaims.filter((claim) => {
    if (statusFilter === 'all') return true;
    return claim.status.toLowerCase() === statusFilter.toLowerCase();
  });

  const counts = {
    total: myClaims.length,
    pending: myClaims.filter((c) => ['pending', 'under_review'].includes(c.status.toLowerCase())).length,
    approved: myClaims.filter((c) => c.status.toLowerCase() === 'approved').length,
    completed: myClaims.filter((c) => c.status.toLowerCase() === 'completed').length,
  };

  const handleConfirmCancel = async () => {
    if (!claimToCancel) return;
    setIsCancelling(true);
    try {
      await cancelClaim(claimToCancel.id);
      setFeedback({ type: 'success', message: 'Claim was cancelled successfully.' });
      setClaimToCancel(null);
      if (selectedClaim?.id === claimToCancel.id) {
        setSelectedClaim(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel claim.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsCancelling(false);
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
            <XCircle className="w-3 h-3" /> Cancelled
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
        title="My Submitted Claims"
        description="Track ownership verification progress and return coordination for items you have claimed."
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

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-findit-card border border-findit-border shadow-sm">
          <p className="text-[11px] font-semibold text-findit-muted uppercase tracking-wider">Total Claims</p>
          <p className="text-2xl font-black text-white mt-1">{counts.total}</p>
        </div>
        <div className="p-4 rounded-2xl bg-findit-card border border-amber-500/20 shadow-sm">
          <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">In Review</p>
          <p className="text-2xl font-black text-amber-300 mt-1">{counts.pending}</p>
        </div>
        <div className="p-4 rounded-2xl bg-findit-card border border-emerald-500/20 shadow-sm">
          <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Approved</p>
          <p className="text-2xl font-black text-emerald-300 mt-1">{counts.approved}</p>
        </div>
        <div className="p-4 rounded-2xl bg-findit-card border border-purple-500/20 shadow-sm">
          <p className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">Completed</p>
          <p className="text-2xl font-black text-purple-300 mt-1">{counts.completed}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-findit-border pb-3">
        {(['all', 'pending', 'under_review', 'approved', 'completed', 'rejected', 'cancelled'] as const).map(
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
          <p className="text-sm font-semibold text-white">Loading your claims...</p>
        </div>
      ) : filteredClaims.length === 0 ? (
        <EmptyState
          title="No claims found"
          description="You haven't submitted any claims under this filter yet. Browse found items in the directory to submit a claim."
          actionText="Browse Found Items"
          onAction={() => navigate('/dashboard/browse')}
        />
      ) : (
        <div className="space-y-3">
          {filteredClaims.map((claim) => (
            <div
              key={claim.id}
              className="p-5 rounded-2xl bg-findit-card border border-findit-border hover:border-findit-primary/40 transition-all flex flex-col gap-3"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-white truncate">
                      {claim.itemTitle || `Claim for Item #${claim.itemId}`}
                    </h3>
                    {getStatusBadge(claim.status)}
                  </div>

                  <p className="text-xs text-findit-muted line-clamp-2">
                    <span className="font-semibold text-findit-text">Your explanation:</span> {claim.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-findit-subtle pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Submitted: {(claim.createdAt || claim.dateSubmitted) ? formatDate(claim.createdAt || claim.dateSubmitted!) : 'Recently'}
                    </span>
                    {claim.reviewNotes && (
                      <span className="flex items-center gap-1 text-emerald-400 font-medium">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Review note attached
                      </span>
                    )}
                    {claim.handoverStatus && (
                      <span className="flex items-center gap-1 text-purple-400 font-medium">
                        <PackageCheck className="w-3.5 h-3.5" />
                        {claim.handoverStatus.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedClaim(claim)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-findit-primary hover:bg-findit-primary-hover transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Details</span>
                  </button>

                  <Link
                    to={`/dashboard/items/${claim.itemId}`}
                    className="p-2 rounded-xl text-findit-muted hover:text-white bg-findit-bg border border-findit-border hover:border-findit-border-light transition-colors"
                    title="View Item Listing"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>

                  {['pending', 'under_review'].includes(claim.status.toLowerCase()) && (
                    <button
                      type="button"
                      onClick={() => setClaimToCancel(claim)}
                      className="p-2 rounded-xl text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors"
                      title="Cancel Claim"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Direct Return Coordination & Contact Widget */}
              {['approved', 'completed'].includes(claim.status.toLowerCase()) && (
                <div className="pt-2 border-t border-findit-border/70">
                  <ClaimCoordinationCard
                    claim={claim}
                    onStatusChange={fetchMyClaims}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Claim Detail Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-findit-sidebar border border-findit-border rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Claim Verification Details</h3>
                <p className="text-xs text-findit-muted mt-0.5">
                  ID: <span className="font-mono text-findit-primary">{selectedClaim.id}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedClaim(null)}
                className="p-1 rounded-lg text-findit-muted hover:text-white hover:bg-findit-card transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-findit-card border border-findit-border flex items-center justify-between">
              <div>
                <span className="text-[11px] text-findit-muted uppercase font-bold block">Target Item</span>
                <span className="text-sm font-semibold text-white">{selectedClaim.itemTitle || selectedClaim.itemId}</span>
              </div>
              {getStatusBadge(selectedClaim.status)}
            </div>

            {/* Handover Progress Tracker (if approved/completed) */}
            {['approved', 'completed'].includes(selectedClaim.status.toLowerCase()) && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wide">
                  <PackageCheck className="w-4 h-4" />
                  <span>Return & Handover Coordination</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    1. Claim Approved
                  </div>
                  <div
                    className={`p-2 rounded-xl border ${
                      ['handover_arranged', 'returned_successfully'].includes(selectedClaim.handoverStatus || '')
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-findit-bg text-findit-subtle border-findit-border'
                    }`}
                  >
                    2. Handover Arranged
                  </div>
                  <div
                    className={`p-2 rounded-xl border ${
                      selectedClaim.status.toLowerCase() === 'completed'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        : 'bg-findit-bg text-findit-subtle border-findit-border'
                    }`}
                  >
                    3. Returned
                  </div>
                </div>

                {selectedClaim.handoverDetails && (
                  <div className="p-3 rounded-xl bg-findit-bg/80 border border-findit-border text-xs text-white">
                    <span className="font-bold text-findit-primary block text-[11px] mb-1">
                      Meeting / Handover Instructions:
                    </span>
                    {selectedClaim.handoverDetails}
                  </div>
                )}
              </div>
            )}

            {/* Claim Explanation */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-findit-text uppercase tracking-wider">
                Claim Explanation
              </label>
              <div className="p-3.5 rounded-xl bg-findit-bg border border-findit-border text-xs text-white leading-relaxed">
                {selectedClaim.description}
              </div>
            </div>

            {/* Confidential Proof of Ownership */}
            {selectedClaim.proofDetails && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Private Proof of Ownership (Confidential)</span>
                </label>
                <div className="p-3.5 rounded-xl bg-findit-bg border border-amber-500/20 text-xs text-amber-200 leading-relaxed font-mono">
                  {selectedClaim.proofDetails}
                </div>
              </div>
            )}

            {/* Review Notes from Reporter */}
            {selectedClaim.reviewNotes && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-findit-primary flex items-center gap-1.5 uppercase tracking-wider">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Reporter Review Notes</span>
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

      {/* Cancel Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={Boolean(claimToCancel)}
        title="Cancel Ownership Claim?"
        message="Are you sure you want to cancel this claim? This action will withdraw your verification request. You may re-claim if needed."
        confirmLabel={isCancelling ? 'Cancelling...' : 'Yes, Cancel Claim'}
        isDestructive
        onConfirm={handleConfirmCancel}
        onCancel={() => setClaimToCancel(null)}
      />
    </div>
  );
};
