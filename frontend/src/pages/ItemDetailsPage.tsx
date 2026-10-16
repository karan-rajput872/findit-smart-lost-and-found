import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  Lock,
  AlertCircle,
  Share2,
  Edit3,
  Trash2,
  Clock,
  RefreshCw,
  Inbox,
} from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { ItemImage } from '../components/common/ItemImage';
import { useApp } from '../context/AppContext';
import { fetchItemByIdApi } from '../services/api';
import { formatDate, getCategoryBadgeColor } from '../utils/formatters';
import type { Item, ItemStatus } from '../types';

export const ItemDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    items,
    myClaims,
    submitClaim,
    deleteItem,
    updateItem,
    user,
    isAuthenticated,
    isBackendOnline,
  } = useApp();

  const [item, setItem] = useState<Item | null>(() => {
    return items.find((i) => i.id === id) || null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(!item);
  const [notFound, setNotFound] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function loadItemDetails() {
      if (!id) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      // Check context items first for instant display
      const localMatch = items.find((i) => i.id === id);
      if (localMatch && isMounted) {
        setItem(localMatch);
      }

      // If backend is reachable, fetch latest record
      if (isBackendOnline) {
        try {
          const remoteItem = await fetchItemByIdApi(id);
          if (isMounted) {
            setItem(remoteItem);
            setNotFound(false);
          }
        } catch {
          if (isMounted && !localMatch) {
            setNotFound(true);
          }
        } finally {
          if (isMounted) setIsLoading(false);
        }
      } else {
        if (isMounted) {
          if (!localMatch) setNotFound(true);
          setIsLoading(false);
        }
      }
    }

    loadItemDetails();

    return () => {
      isMounted = false;
    };
  }, [id, isBackendOnline, items]);

  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimReason, setClaimReason] = useState('');
  const [proofDescription, setProofDescription] = useState('');
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Owner action states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editStatus, setEditStatus] = useState<ItemStatus>('open');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="text-center py-24 space-y-3">
        <RefreshCw className="w-7 h-7 animate-spin text-findit-primary mx-auto" />
        <p className="text-sm font-semibold text-white">Loading item details...</p>
        <p className="text-xs text-findit-muted">Retrieving verified report from the campus directory</p>
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-6 rounded-2xl bg-findit-card border border-findit-border space-y-4 shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-findit-bg border border-findit-border text-findit-muted flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Item Listing Not Found</h2>
        <p className="text-xs text-findit-muted leading-relaxed">
          The item report <code className="text-findit-primary font-mono">{id}</code> could not be located in the current database. It may have been deleted, resolved, or the ID is invalid.
        </p>
        <Link
          to="/dashboard/browse"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-findit-primary hover:bg-findit-primary-hover text-white shadow-glow-primary transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Browse Directory</span>
        </Link>
      </div>
    );
  }

  // Determine whether caller owns this listing
  const isOwner = Boolean(
    user && (item.userId === user.id || user.role === 'admin' || item.reporterName.includes('You'))
  );

  // Check if caller already has an active claim on this item
  const activeUserClaim = myClaims.find(
    (c) =>
      c.itemId === item?.id &&
      ['pending', 'under_review', 'approved'].includes(c.status.toLowerCase())
  );

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimReason.trim()) {
      setClaimError('Please provide an explanation of why this item belongs to you.');
      return;
    }
    if (!proofDescription.trim()) {
      setClaimError('Please provide private verification proof to support your claim.');
      return;
    }

    setIsSubmittingClaim(true);
    setClaimError('');
    try {
      await submitClaim({
        itemId: item.id,
        description: claimReason.trim(),
        proofDetails: proofDescription.trim(),
      });

      setClaimSuccess(true);
      setTimeout(() => {
        setClaimModalOpen(false);
        setClaimSuccess(false);
        setClaimReason('');
        setProofDescription('');
      }, 1800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit claim request.';
      setClaimError(msg);
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  const handleCopyShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2000);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteItem(item.id);
      navigate('/dashboard/my-reports');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete listing.';
      setStatusMessage(msg);
      setDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenEdit = () => {
    setEditTitle(item.title);
    setEditDescription(item.description);
    setEditLocation(item.location);
    setEditStatus(item.status);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;

    setIsSavingEdit(true);
    try {
      const updated = await updateItem(item.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        location: editLocation.trim(),
        status: editStatus,
      });
      if (updated) {
        setItem(updated);
      }
      setEditModalOpen(false);
      setStatusMessage('Listing updated successfully.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save changes.';
      setStatusMessage(msg);
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button and share */}
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard/browse"
          className="inline-flex items-center gap-2 text-xs font-semibold text-findit-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Browse Directory</span>
        </Link>

        <div className="flex items-center gap-2">
          {isOwner && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-findit-primary/15 text-findit-primary border border-findit-primary/30">
              You own this listing
            </span>
          )}
          <button
            onClick={handleCopyShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-findit-card border border-findit-border text-xs text-findit-muted hover:text-white transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copiedNotice ? 'Link Copied!' : 'Share Listing'}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-findit-primary/10 border border-findit-primary/30 text-xs text-findit-primary flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="font-bold text-white">✕</button>
        </div>
      )}

      {/* Main Item Container */}
      <div className="rounded-3xl bg-findit-card border border-findit-border overflow-hidden shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Image Side */}
          <div className="relative aspect-[4/3] md:aspect-auto bg-findit-sidebar overflow-hidden min-h-[300px]">
            <ItemImage
              src={item.imageUrl}
              alt={item.title}
              category={item.category}
              itemType={item.type}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <StatusBadge type={item.type} size="md" />
            </div>
            <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-[11px] text-findit-muted flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-findit-secondary shrink-0" />
              <span>Listing verified in campus directory.</span>
            </div>
          </div>

          {/* Details Side */}
          <div className="p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${getCategoryBadgeColor(
                    item.category
                  )}`}
                >
                  {item.category}
                </span>
                <StatusBadge status={item.status} size="sm" />
              </div>

              <h1 className="text-2xl font-black text-white tracking-tight">{item.title}</h1>

              <div className="space-y-2 py-3 border-y border-findit-border/60 text-xs text-findit-muted">
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-findit-secondary shrink-0" />
                  <span className="font-medium text-findit-text">{item.location}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-findit-primary shrink-0" />
                  <span>Incident Date: {formatDate(item.date)} ({item.campus})</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-findit-subtle shrink-0" />
                  <span>Submitted: {formatDate(item.createdAt.slice(0, 10))}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-findit-muted mb-1.5">
                  Description
                </h4>
                <p className="text-sm text-findit-text leading-relaxed whitespace-pre-line">
                  {item.description}
                </p>
              </div>

              {/* Public Reporter Info (Security-safe) */}
              <div className="p-3.5 rounded-xl bg-findit-bg/80 border border-findit-border/80 space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-findit-text">
                  <UserCheck className="w-4 h-4 text-findit-primary" />
                  <span>Reported by: {item.reporterName}</span>
                </div>
                {item.reporterContact && (
                  <p className="text-[11px] text-findit-subtle pl-6">
                    Contact: {item.reporterContact}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons Section */}
            <div className="pt-4 border-t border-findit-border space-y-3">
              {['returned', 'resolved'].includes(item.status.toLowerCase()) ? (
                /* Item is already resolved/returned */
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-1.5">
                  <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Listing Resolved & Item Returned</span>
                  </div>
                  <p className="text-xs text-emerald-300/80">
                    This item has been successfully verified and returned to its verified campus owner.
                  </p>
                </div>
              ) : isOwner ? (
                /* Owner Controls */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleOpenEdit}
                      className="py-3 px-4 rounded-xl font-bold text-xs text-white bg-findit-primary hover:bg-findit-primary-hover shadow-glow-primary transition-all flex items-center justify-center gap-2"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Listing</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteModalOpen(true)}
                      className="py-3 px-4 rounded-xl font-bold text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Listing</span>
                    </button>
                  </div>

                  <Link
                    to="/dashboard/received-claims"
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-findit-primary hover:text-white bg-findit-primary/10 hover:bg-findit-primary border border-findit-primary/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Inbox className="w-3.5 h-3.5" />
                    <span>Review Received Claims for this Item</span>
                  </Link>

                  <p className="text-[11px] text-center text-findit-subtle">
                    You reported this item listing. Review incoming claims and manage resolution above.
                  </p>
                </div>
              ) : !isAuthenticated ? (
                /* Unauthenticated User */
                <div className="space-y-2">
                  <Link
                    to="/login"
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-findit-primary hover:bg-findit-primary-hover shadow-glow-primary transition-all flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Sign in to Claim This Item</span>
                  </Link>
                  <p className="text-[11px] text-center text-findit-subtle">
                    Registered campus members can verify ownership and coordinate returns.
                  </p>
                </div>
              ) : activeUserClaim ? (
                /* User already has an active claim */
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      <span>You have an active claim</span>
                    </span>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 capitalize border border-blue-500/30">
                      {activeUserClaim.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-findit-muted leading-relaxed">
                    Your claim submitted on{' '}
                    <strong className="text-white">
                      {activeUserClaim.createdAt ? formatDate(activeUserClaim.createdAt) : 'Recently'}
                    </strong>{' '}
                    is currently being processed. You will be notified once reviewed.
                  </p>
                  <Link
                    to="/dashboard/my-claims"
                    className="inline-flex items-center gap-1 text-xs font-bold text-findit-primary hover:text-findit-primary-light transition-colors"
                  >
                    <span>Track progress in My Claims &rarr;</span>
                  </Link>
                </div>
              ) : (
                /* Authenticated, available item: Claim action */
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setClaimModalOpen(true)}
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-findit-primary to-findit-primary-hover hover:opacity-95 shadow-glow-primary transition-all flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {item.type === 'found'
                        ? 'Claim This Item (Prove Ownership)'
                        : 'I Found This Item (Notify Reporter)'}
                    </span>
                  </button>
                  <p className="text-[11px] text-center text-findit-subtle flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>Private verification: identifying answers will never be displayed publicly.</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Owner Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteModalOpen}
        title="Delete Item Listing?"
        message="Are you sure you want to delete this listing from FindIt? This action will remove the record from the campus directory."
        confirmLabel={isDeleting ? 'Deleting...' : 'Yes, Delete Listing'}
        isDestructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />

      {/* Owner Edit Modal Dialog */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg p-6 sm:p-7 rounded-2xl bg-findit-card border border-findit-border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-findit-primary">
                  Owner Management
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">Edit Listing Details</h3>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-findit-muted hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-semibold uppercase tracking-wider text-findit-muted">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-findit-bg border border-findit-border text-sm text-findit-text focus:border-findit-primary outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-semibold uppercase tracking-wider text-findit-muted">
                  Location
                </label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-findit-bg border border-findit-border text-sm text-findit-text focus:border-findit-primary outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-semibold uppercase tracking-wider text-findit-muted">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-findit-bg border border-findit-border text-sm text-findit-text focus:border-findit-primary outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-semibold uppercase tracking-wider text-findit-muted">
                  Listing Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'open', label: 'Open' },
                    { value: 'matched', label: 'Matched' },
                    { value: 'returned', label: 'Returned' },
                    { value: 'closed', label: 'Closed' },
                    { value: 'pending_verification', label: 'Claim Pending' },
                    { value: 'resolved', label: 'Resolved' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer text-xs transition-colors ${
                        editStatus === option.value
                          ? 'bg-findit-primary/15 border-findit-primary text-white font-semibold'
                          : 'bg-findit-bg border-findit-border text-findit-muted hover:border-findit-border-light'
                      }`}
                    >
                      <input
                        type="radio"
                        name="detailEditStatus"
                        value={option.value}
                        checked={editStatus === option.value}
                        onChange={() => setEditStatus(option.value as ItemStatus)}
                        className="text-findit-primary"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-findit-border/60">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  disabled={isSavingEdit}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-findit-border text-findit-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-findit-primary hover:bg-findit-primary-hover shadow-glow-primary transition-all disabled:opacity-50"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Claim Modal Dialog */}
      {claimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg p-6 sm:p-7 rounded-2xl bg-findit-card border border-findit-border shadow-2xl relative space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-findit-primary">
                  Ownership Verification
                </span>
                <h3 className="text-xl font-bold text-white mt-1">Submit Claim for: {item.title}</h3>
              </div>
              <button
                onClick={() => setClaimModalOpen(false)}
                className="text-findit-muted hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {claimSuccess ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="text-base font-bold text-white">Ownership Claim Submitted!</h4>
                <p className="text-xs text-emerald-300/90 leading-relaxed">
                  Your private verification proof has been forwarded to campus moderation.
                </p>
              </div>
            ) : (
              <form onSubmit={handleClaimSubmit} className="space-y-4">
                <div className="p-3.5 rounded-xl bg-findit-bg/80 border border-findit-border text-xs text-findit-muted space-y-1.5">
                  <div className="flex items-center gap-1.5 text-findit-text font-semibold">
                    <Lock className="w-3.5 h-3.5 text-findit-secondary" />
                    <span>How Claim Verification Works</span>
                  </div>
                  <p className="text-[11px] text-findit-subtle leading-relaxed">
                    To prevent fraudulent pickup, describe private details not visible in photos (e.g. wallpaper picture, specific scratches, contents of inner pockets, or matching serial digits).
                  </p>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-findit-muted">
                    Claim Explanation / Circumstances <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={claimReason}
                    onChange={(e) => {
                      setClaimReason(e.target.value);
                      setClaimError('');
                    }}
                    placeholder="Describe when and where you lost this item and why you believe it is yours..."
                    className="w-full px-4 py-2.5 rounded-xl bg-findit-bg border border-findit-border text-sm text-findit-text placeholder-findit-subtle focus:border-findit-primary focus:ring-1 focus:ring-findit-primary outline-none resize-none"
                    required
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Private Proof of Ownership (Confidential)</span> <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={proofDescription}
                    onChange={(e) => {
                      setProofDescription(e.target.value);
                      setClaimError('');
                    }}
                    placeholder="e.g. My student card ending in 4421 is inside the hidden pouch, or the device phone lockscreen is a picture of my dog..."
                    className="w-full px-4 py-2.5 rounded-xl bg-findit-bg border border-findit-border text-sm text-findit-text placeholder-findit-subtle focus:border-findit-primary focus:ring-1 focus:ring-findit-primary outline-none resize-none"
                    required
                  />
                  {claimError && (
                    <p className="text-xs text-findit-danger flex items-center gap-1 pt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{claimError}</span>
                    </p>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setClaimModalOpen(false)}
                    disabled={isSubmittingClaim}
                    className="px-4 py-2 text-xs font-semibold rounded-xl border border-findit-border text-findit-muted hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingClaim}
                    className="px-5 py-2.5 text-xs font-bold rounded-xl text-white bg-findit-primary hover:bg-findit-primary-hover shadow-glow-primary transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isSubmittingClaim ? 'Submitting Claim...' : 'Submit Claim Request'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
