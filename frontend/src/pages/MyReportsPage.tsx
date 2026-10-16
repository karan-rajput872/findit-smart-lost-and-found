import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  PlusCircle,
  Trash2,
  Edit3,
  Eye,
  Calendar,
  MapPin,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { EmptyState } from '../components/common/EmptyState';
import { ItemImage } from '../components/common/ItemImage';
import { useApp } from '../context/AppContext';
import type { Item, ItemStatus, ItemType } from '../types';
import { formatDate } from '../utils/formatters';

export const MyReportsPage: React.FC = () => {
  const {
    myItems,
    items,
    user,
    deleteItem,
    updateItem,
    fetchMyItems,
    isLoadingMyItems,
  } = useApp();

  const [typeFilter, setTypeFilter] = useState<'all' | ItemType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Full item editing state
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editStatus, setEditStatus] = useState<ItemStatus>('open');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Re-fetch user listings on mount
  useEffect(() => {
    fetchMyItems();
  }, [fetchMyItems]);

  const { isBackendOnline } = useApp();

  // Use live user items from backend when online, with fallback only when offline
  const baseUserItems = useMemo(() => {
    if (isBackendOnline) {
      return myItems;
    }
    return items.filter(
      (item) => item.userId === user.id || item.reporterName.includes('You') || item.reporterName === user.fullName
    );
  }, [isBackendOnline, myItems, items, user.id, user.fullName]);

  // Apply frontend filters
  const filteredItems = useMemo(() => {
    return baseUserItems.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      return true;
    });
  }, [baseUserItems, typeFilter, statusFilter]);

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    setActionMessage(null);
    try {
      await deleteItem(deleteConfirmId);
      setActionMessage({ type: 'success', text: 'Listing successfully deleted.' });
      setDeleteConfirmId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete listing.';
      setActionMessage({ type: 'error', text: msg });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenEdit = (item: Item) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditDescription(item.description);
    setEditLocation(item.location);
    setEditStatus(item.status);
    setActionMessage(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    if (!editTitle.trim()) {
      setActionMessage({ type: 'error', text: 'Title cannot be empty.' });
      return;
    }

    setIsSavingEdit(true);
    setActionMessage(null);
    try {
      await updateItem(editingItem.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        location: editLocation.trim(),
        status: editStatus,
      });
      setActionMessage({ type: 'success', text: 'Listing successfully updated.' });
      setEditingItem(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update listing.';
      setActionMessage({ type: 'error', text: msg });
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Item Listings"
        description="View and manage all lost and found listings submitted by your account. Edit details, change lifecycle status, or remove items."
        badge={
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-findit-primary/10 text-findit-primary border border-findit-primary/30">
            {baseUserItems.length} {baseUserItems.length === 1 ? 'My Report' : 'My Reports'}
          </span>
        }
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchMyItems()}
              title="Refresh listings"
              className="p-2 rounded-xl bg-findit-card border border-findit-border hover:bg-findit-card-hover text-findit-muted transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingMyItems ? 'animate-spin' : ''}`} />
            </button>
            <Link
              to="/dashboard/report"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-findit-primary hover:bg-findit-primary-hover shadow-glow-primary transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report New Item</span>
            </Link>
          </div>
        }
      />

      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-findit-muted hover:text-white px-1 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-findit-card border border-findit-border">
        {/* Type Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-findit-muted mr-1">Type:</span>
          {(['all', 'lost', 'found'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                typeFilter === t
                  ? 'bg-findit-primary text-white shadow-sm'
                  : 'bg-findit-bg text-findit-muted hover:text-white border border-findit-border'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-findit-muted">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-findit-bg border border-findit-border text-xs text-findit-text focus:border-findit-primary outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="matched">Matched</option>
            <option value="returned">Returned</option>
            <option value="closed">Closed</option>
            <option value="resolved">Resolved</option>
            <option value="pending_verification">Claim Pending</option>
          </select>
        </div>
      </div>

      {/* Loading state */}
      {isLoadingMyItems && (
        <div className="py-12 text-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-findit-primary mx-auto" />
          <p className="text-xs text-findit-muted">Loading your listings from backend...</p>
        </div>
      )}

      {/* Listing Content */}
      {!isLoadingMyItems && filteredItems.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={baseUserItems.length === 0 ? "You haven't submitted any listings yet" : "No listings match this filter"}
          description={
            baseUserItems.length === 0
              ? "Misplaced something or found an item on campus? Submit a report to list it in the live campus directory."
              : "Try switching between 'Lost' and 'Found' filters or reset the status dropdown."
          }
          actionText={baseUserItems.length === 0 ? "Report an Item" : "Show All My Listings"}
          onAction={() => {
            if (baseUserItems.length === 0) {
              window.location.assign('/dashboard/report');
            } else {
              setTypeFilter('all');
              setStatusFilter('all');
            }
          }}
        />
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-findit-card border border-findit-border flex flex-col md:flex-row md:items-center justify-between gap-5 card-hover transition-all"
            >
              {/* Item Thumbnail & Basic Info */}
              <div className="flex items-start gap-4 flex-1">
                <ItemImage
                  src={item.imageUrl}
                  alt={item.title}
                  category={item.category}
                  itemType={item.type}
                  className="w-20 h-20 rounded-xl object-cover border border-findit-border shrink-0"
                />

                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge type={item.type} size="sm" />
                    <StatusBadge status={item.status} size="sm" />
                    <span className="text-[11px] text-findit-subtle font-medium">
                      Category: {item.category}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white truncate">{item.title}</h3>
                  <p className="text-xs text-findit-muted line-clamp-1">{item.description}</p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-findit-subtle pt-1">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-findit-secondary shrink-0" />
                      {item.location}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-findit-primary shrink-0" />
                      {formatDate(item.date)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-findit-border/60">
                <Link
                  to={`/dashboard/items/${item.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-findit-bg hover:bg-findit-card-hover border border-findit-border text-findit-text transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Details</span>
                </Link>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(item)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-findit-primary/15 hover:bg-findit-primary/25 border border-findit-primary/30 text-findit-primary transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Listing</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(item.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationDialog
        isOpen={deleteConfirmId !== null}
        title="Delete Item Listing?"
        message="Are you sure you want to delete this listing? It will be permanently removed from the lost and found database."
        confirmLabel={isDeleting ? 'Deleting...' : 'Yes, Delete Listing'}
        isDestructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />

      {/* Comprehensive Edit Listing Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg p-6 sm:p-7 rounded-2xl bg-findit-card border border-findit-border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-findit-primary">
                  Owner Edit Mode
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">Edit Item Listing</h3>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-findit-muted hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Title */}
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-semibold uppercase tracking-wider text-findit-muted">
                  Listing Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-findit-bg border border-findit-border text-sm text-findit-text focus:border-findit-primary outline-none"
                  required
                />
              </div>

              {/* Location */}
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

              {/* Description */}
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

              {/* Lifecycle Status Selection */}
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-semibold uppercase tracking-wider text-findit-muted">
                  Listing Status
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { value: 'open', label: 'Open (Active)' },
                    { value: 'matched', label: 'Matched (Potential Owner)' },
                    { value: 'returned', label: 'Returned (Completed)' },
                    { value: 'closed', label: 'Closed (Withdrawn)' },
                    { value: 'pending_verification', label: 'Claim Pending' },
                    { value: 'resolved', label: 'Resolved' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer text-xs transition-colors ${
                        editStatus === option.value
                          ? 'bg-findit-primary/15 border-findit-primary text-white font-semibold'
                          : 'bg-findit-bg border-findit-border text-findit-muted hover:border-findit-border-light'
                      }`}
                    >
                      <input
                        type="radio"
                        name="editStatus"
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

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-findit-border/60">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
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
                  {isSavingEdit ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
