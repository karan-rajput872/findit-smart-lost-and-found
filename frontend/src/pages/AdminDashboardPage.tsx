import React, { useState } from 'react';
import {
  ShieldAlert,
  FileCheck,
  FileX,
  Users,
  Flag,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { ItemImage } from '../components/common/ItemImage';
import { useApp } from '../context/AppContext';
import { formatDate } from '../utils/formatters';
import type { ClaimStatus } from '../types';

export const AdminDashboardPage: React.FC = () => {
  const { items, claims, updateClaimStatus, updateItemStatus } = useApp();
  const [activeTab, setActiveTab] = useState<'claims' | 'reports'>('claims');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const totalReports = items.length;
  const lostCount = items.filter((i) => i.type === 'lost').length;
  const foundCount = items.filter((i) => i.type === 'found').length;
  const pendingClaims = claims.filter((c) => c.status === 'pending' || c.status === 'under_review').length;

  const triggerActionNotice = (message: string) => {
    setActionNotice(message);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleClaimAction = (id: string, status: ClaimStatus) => {
    updateClaimStatus(id, status);
    triggerActionNotice(`Claim status updated to ${status.toUpperCase()} in demo state.`);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Campus Administration & Moderation"
        description="Review incoming ownership claims, monitor campus lost and found listings, and moderate community activity."
        badge={
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-findit-warning text-findit-warning-text border border-amber-200">
            Staff Access
          </span>
        }
      />

      {/* Admin Notice Banner */}
      <div className="p-4 rounded-2xl bg-findit-warning/80 border border-amber-200 flex items-start gap-3 text-xs text-findit-warning-text">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-findit-text">Campus Staff & Administrative Moderation</p>
          <p className="text-findit-warning-text leading-relaxed">
            This dashboard enables administrative oversight, campus item status moderation, and ownership claim verification across university facilities.
          </p>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-findit-primary/10 border border-findit-primary text-xs text-findit-text font-medium animate-in fade-in flex items-center justify-between">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-findit-muted hover:text-findit-text min-h-[32px] px-2">✕</button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Reports Logged"
          value={totalReports}
          subtitle="All campus submissions"
          icon={Users}
          iconColor="text-findit-primary"
        />
        <StatCard
          title="Lost Item Reports"
          value={lostCount}
          subtitle="Currently unaccounted"
          icon={FileX}
          iconColor="text-findit-danger-text"
        />
        <StatCard
          title="Found Items Turned In"
          value={foundCount}
          subtitle="Held at campus offices"
          icon={FileCheck}
          iconColor="text-findit-primary"
        />
        <StatCard
          title="Pending Claims to Review"
          value={pendingClaims}
          subtitle="Awaiting staff approval"
          icon={AlertTriangle}
          iconColor="text-findit-warning-text"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-findit-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('claims')}
          className={`px-4 py-2 min-h-[40px] rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'claims'
              ? 'bg-findit-primary text-white shadow-subtle'
              : 'text-findit-muted hover:text-findit-text bg-white border border-findit-border'
          }`}
        >
          Ownership Claims ({claims.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 min-h-[40px] rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'reports'
              ? 'bg-findit-primary text-white shadow-subtle'
              : 'text-findit-muted hover:text-findit-text bg-white border border-findit-border'
          }`}
        >
          Report Management ({items.length})
        </button>
      </div>

      {/* Table Section */}
      <div className="rounded-2xl bg-white border border-findit-border overflow-hidden shadow-subtle">
        {activeTab === 'claims' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-findit-muted">
              <thead className="bg-findit-bg text-findit-muted uppercase font-bold text-[10px] tracking-wider border-b border-findit-border">
                <tr>
                  <th className="py-3.5 px-4">Item & Claim ID</th>
                  <th className="py-3.5 px-4">Claimant</th>
                  <th className="py-3.5 px-4">Verification Proof (Private)</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-findit-border">
                {claims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-findit-bg/60 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-bold text-findit-text">{claim.itemTitle}</div>
                      <div className="text-[10px] text-findit-muted font-mono">{claim.id} • {claim.dateSubmitted}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium text-findit-text">{claim.claimantName}</div>
                      <div className="text-[11px] text-findit-muted">{claim.claimantEmail}</div>
                    </td>
                    <td className="py-4 px-4 max-w-xs">
                      <p className="line-clamp-2 text-findit-text font-mono text-[11px] bg-findit-bg p-2 rounded-lg border border-findit-border">
                        {claim.proofDescription}
                      </p>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          claim.status === 'approved'
                            ? 'bg-findit-success text-findit-success-text border border-emerald-300'
                            : claim.status === 'rejected'
                            ? 'bg-findit-danger text-findit-danger-text border border-red-300'
                            : 'bg-findit-warning text-findit-warning-text border border-amber-300'
                        }`}
                      >
                        {claim.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleClaimAction(claim.id, 'approved')}
                          className="px-2.5 py-1.5 min-h-[34px] rounded-lg bg-findit-success hover:bg-emerald-100 text-findit-success-text border border-emerald-200 font-semibold"
                          title="Approve Claim"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClaimAction(claim.id, 'rejected')}
                          className="px-2.5 py-1.5 min-h-[34px] rounded-lg bg-findit-danger hover:bg-red-100 text-findit-danger-text border border-red-200 font-semibold"
                          title="Reject Claim"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-findit-muted">
              <thead className="bg-findit-bg text-findit-muted uppercase font-bold text-[10px] tracking-wider border-b border-findit-border">
                <tr>
                  <th className="py-3.5 px-4">Listing Details</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Campus Location</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Moderator Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-findit-border">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-findit-bg/60 transition-colors">
                    <td className="py-3.5 px-4 flex items-center gap-3">
                      <ItemImage
                        src={item.imageUrl}
                        alt={item.title}
                        category={item.category}
                        itemType={item.type}
                        className="w-10 h-10 rounded-lg object-cover border border-findit-border shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-findit-text truncate max-w-[200px]">{item.title}</div>
                        <div className="text-[10px] text-findit-muted">{item.category} • {formatDate(item.date)}</div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge type={item.type} size="sm" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-findit-text truncate max-w-[180px]">{item.location}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={item.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            updateItemStatus(item.id, 'resolved');
                            triggerActionNotice(`Item "${item.title}" marked as resolved.`);
                          }}
                          className="px-2.5 py-1.5 min-h-[34px] rounded-lg bg-white hover:bg-findit-bg border border-findit-border text-findit-text font-medium"
                        >
                          Resolve
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerActionNotice(`Flagged item "${item.title}" for review.`)}
                          className="p-1.5 min-h-[34px] min-w-[34px] rounded-lg text-findit-muted hover:text-amber-700 hover:bg-findit-bg flex items-center justify-center"
                          title="Flag for review"
                        >
                          <Flag className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
