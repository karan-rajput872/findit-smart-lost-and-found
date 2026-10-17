import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileQuestion,
  CheckCircle2,
  FileText,
  Sparkles,
  PlusCircle,
  Compass,
  ArrowRight,
  MapPin,
  ListOrdered,
  Clock,
  Smartphone,
  Check,
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { ItemImage } from '../components/common/ItemImage';
import { ContactSettingsModal } from '../components/ContactSettingsModal';
import { useApp } from '../context/AppContext';

export const DashboardPage: React.FC = () => {
  const { user, items, myItems, stats, potentialMatches, notifications, isLoadingItems } = useApp();
  const [contactModalOpen, setContactModalOpen] = useState(false);

  // Prefer backend live statistics, fall back to loaded items
  const lostCount = stats ? stats.lost_items : items.filter((i) => i.type === 'lost').length;
  const foundCount = stats ? stats.found_items : items.filter((i) => i.type === 'found').length;
  const openCount = stats ? stats.open_items : items.filter((i) => i.status === 'open').length;
  const myReportsCount = stats ? stats.my_items_count : myItems.length;
  const topMatch = potentialMatches[0];

  const recentItems = items.slice(0, 4);

  return (
    <div className="space-y-8">
      {/* Welcome & Overview Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl bg-white border border-findit-border shadow-subtle relative overflow-hidden">
        <div className="space-y-1.5 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-findit-primary/15 border border-findit-primary/30 text-[11px] font-bold text-findit-primary">
            <span>Logged in as {user.role.toUpperCase()}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-findit-text">
            Welcome back, {user.fullName}! 👋
          </h1>
          <p className="text-xs sm:text-sm text-findit-muted">
            Viewing real-time reports and activity for <strong className="text-findit-text">{user.campus}</strong>.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          <Link
            to="/dashboard/report?type=lost"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-[#A84A42] bg-[#F6E5E2] hover:bg-[#F0D5D1] border border-[#ECD1CC] transition-all"
          >
            <PlusCircle className="w-4 h-4 text-[#A84A42]" />
            <span>Report Lost</span>
          </Link>
          <Link
            to="/dashboard/report?type=found"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-white bg-findit-primary hover:bg-findit-primary-hover shadow-subtle transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Report Found</span>
          </Link>
          <Link
            to="/dashboard/browse"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-findit-text bg-white hover:bg-findit-bg border border-findit-border transition-all"
          >
            <Compass className="w-4 h-4 text-findit-primary" />
            <span>Browse Items</span>
          </Link>
          <Link
            to="/dashboard/my-reports"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-findit-primary bg-findit-primary/10 hover:bg-findit-primary/20 border border-findit-primary/30 transition-all"
          >
            <ListOrdered className="w-4 h-4" />
            <span>My Listings</span>
          </Link>
        </div>
      </div>

      {/* Contact & Return Coordination Quick Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-findit-border shadow-subtle">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-findit-primary/15 border border-findit-primary/25 flex items-center justify-center text-findit-primary shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-findit-text">
                Item Return Contact Preferences
              </h3>
              {user.phoneNumber ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <Check className="w-2.5 h-2.5" /> Configured
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-amber-800 bg-[#F7EBD7] px-2 py-0.5 rounded-full border border-[#EEDCBE]">
                  Not Configured
                </span>
              )}
            </div>
            <p className="text-xs text-findit-muted mt-0.5">
              {user.phoneNumber
                ? `Phone: ${user.phoneNumber} · Preferred Method: ${user.preferredContactMethod === 'whatsapp' ? 'WhatsApp' : user.preferredContactMethod === 'phone_call' ? 'Phone Call' : 'FindIt Chat'}`
                : 'Add your Mobile or WhatsApp number for direct handover coordination when claims are approved.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setContactModalOpen(true)}
          className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-white bg-findit-primary hover:bg-findit-primary-hover transition-all shrink-0 self-start sm:self-auto shadow-subtle"
        >
          {user.phoneNumber ? 'Manage Contact Settings' : 'Set Up Contact Number'}
        </button>
      </div>

      {/* Summary Stat Cards from live Backend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Lost Items"
          value={isLoadingItems ? '...' : lostCount}
          subtitle="Currently missing"
          icon={FileQuestion}
          iconColor="text-red-400"
        />
        <StatCard
          title="Found Items Turned In"
          value={isLoadingItems ? '...' : foundCount}
          subtitle="Awaiting claimants"
          icon={CheckCircle2}
          iconColor="text-teal-400"
        />
        <StatCard
          title="Active Open Listings"
          value={isLoadingItems ? '...' : openCount}
          subtitle="Unresolved campus records"
          icon={Clock}
          iconColor="text-amber-400"
        />
        <StatCard
          title="My Listings"
          value={isLoadingItems ? '...' : myReportsCount}
          subtitle="Submitted by you"
          icon={FileText}
          iconColor="text-findit-primary"
        />
      </div>


      {/* Suggested Matches Section (Featured Match Prototype) */}
      {topMatch && (
        <div className="p-5 rounded-2xl bg-white border border-findit-border shadow-subtle relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-findit-border/60">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-findit-primary/15 text-findit-primary border border-findit-primary/25">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-findit-text">High Confidence Potential Match</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E5EFE6] text-[#3E6B4A] border border-[#D3E4D5]">
                    {topMatch.similarityScore}% Match (Demo)
                  </span>
                </div>
                <p className="text-xs text-findit-muted">
                  The system detected high similarity between your lost report and a recently turned-in item.
                </p>
              </div>
            </div>

            <Link
              to="/dashboard/ai-matches"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-bold text-white bg-findit-primary hover:bg-findit-primary-hover shadow-subtle transition-all self-start md:self-auto"
            >
              <span>View Match Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            {/* Lost Card */}
            <div className="p-3.5 rounded-xl bg-findit-bg border border-findit-border flex items-center gap-3">
              <ItemImage
                src={topMatch.lostItem.imageUrl}
                alt={topMatch.lostItem.title}
                category={topMatch.lostItem.category}
                itemType="lost"
                className="w-14 h-14 rounded-lg object-cover border border-findit-border shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <StatusBadge type="lost" size="sm" />
                  <span className="text-[10px] text-findit-muted font-medium">{topMatch.lostItem.category}</span>
                </div>
                <h4 className="text-xs font-bold text-findit-text truncate mt-1">{topMatch.lostItem.title}</h4>
                <p className="text-[11px] text-findit-muted truncate">{topMatch.lostItem.location}</p>
              </div>
            </div>

            {/* Found Card */}
            <div className="p-3.5 rounded-xl bg-findit-bg border border-findit-border flex items-center gap-3">
              <ItemImage
                src={topMatch.foundItem.imageUrl}
                alt={topMatch.foundItem.title}
                category={topMatch.foundItem.category}
                itemType="found"
                className="w-14 h-14 rounded-lg object-cover border border-findit-border shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <StatusBadge type="found" size="sm" />
                  <span className="text-[10px] text-findit-muted font-medium">{topMatch.foundItem.category}</span>
                </div>
                <h4 className="text-xs font-bold text-findit-text truncate mt-1">{topMatch.foundItem.title}</h4>
                <p className="text-[11px] text-findit-muted truncate">{topMatch.foundItem.location}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Split: Recent Listings & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Listings (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-findit-text">Recent Campus Listings</h3>
              <p className="text-xs text-findit-muted">Latest reports submitted across campus</p>
            </div>
            <Link
              to="/dashboard/browse"
              className="text-xs font-semibold text-findit-primary hover:text-findit-primary-hover flex items-center gap-1 min-h-[36px] items-center"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recentItems.length === 0 ? (
              <div className="col-span-full p-8 rounded-2xl bg-white border border-findit-border text-center space-y-3 shadow-subtle">
                <FileText className="w-8 h-8 text-findit-muted mx-auto" />
                <h4 className="text-sm font-bold text-findit-text">No Items Reported Yet</h4>
                <p className="text-xs text-findit-muted max-w-sm mx-auto">
                  No lost or found items have been recorded in the platform catalog yet. Be the first to report an item!
                </p>
                <div className="flex justify-center gap-2 pt-2">
                  <Link
                    to="/dashboard/report?type=lost"
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#F6E5E2] text-[#A84A42] hover:bg-[#F0D5D1] transition-colors"
                  >
                    Report Lost Item
                  </Link>
                  <Link
                    to="/dashboard/report?type=found"
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-findit-primary text-white hover:bg-findit-primary-hover transition-colors"
                  >
                    Report Found Item
                  </Link>
                </div>
              </div>
            ) : (
              recentItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-white border border-findit-border shadow-subtle card-hover flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <ItemImage
                      src={item.imageUrl}
                      alt={item.title}
                      category={item.category}
                      itemType={item.type}
                      className="w-16 h-16 rounded-xl object-cover border border-findit-border shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <StatusBadge type={item.type} size="sm" />
                      </div>
                      <h4 className="text-xs font-bold text-findit-text truncate">{item.title}</h4>
                      <p className="text-[11px] text-findit-muted line-clamp-1 mt-0.5">{item.description}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-findit-border/40 flex items-center justify-between text-[11px] text-findit-muted">
                    <span className="flex items-center gap-1 truncate max-w-[130px]">
                      <MapPin className="w-3 h-3 text-findit-primary shrink-0" />
                      {item.location.split(',')[0]}
                    </span>
                    <Link
                      to={`/dashboard/items/${item.id}`}
                      className="text-findit-primary hover:underline font-semibold"
                    >
                      Details &rarr;
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity Feed (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-findit-text">Recent Activity</h3>
              <p className="text-xs text-findit-muted">Notification updates</p>
            </div>
            <Link
              to="/dashboard/notifications"
              className="text-xs font-semibold text-findit-primary hover:text-findit-primary-hover"
            >
              Notifications
            </Link>
          </div>

          <div className="rounded-2xl bg-white border border-findit-border shadow-subtle p-4 space-y-3">
            {notifications.slice(0, 4).map((notif) => (
              <div
                key={notif.id}
                className="p-3 rounded-xl bg-findit-bg border border-findit-border/60 space-y-1"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-findit-text truncate max-w-[160px]">{notif.title}</span>
                  <span className="text-findit-muted text-[10px]">{notif.timestamp}</span>
                </div>
                <p className="text-[11px] text-findit-muted leading-relaxed line-clamp-2">
                  {notif.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ContactSettingsModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
      />
    </div>
  );
};
