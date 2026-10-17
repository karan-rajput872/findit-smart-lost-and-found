import React, { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { NotificationCard } from '../components/items/NotificationCard';
import { EmptyState } from '../components/common/EmptyState';
import { useApp } from '../context/AppContext';

export const NotificationsPage: React.FC = () => {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useApp();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = notifications.filter((n) => !(n.isRead ?? n.read)).length;

  const displayedNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !(n.isRead ?? n.read);
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Notifications & Updates"
        description="Stay informed about smart suggestions, claim verification reviews, and return updates."
        badge={
          unreadCount > 0 ? (
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E5EFE6] text-[#3E6B4A] border border-[#CDE1CE]">
              {unreadCount} Unread
            </span>
          ) : (
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-findit-bg border border-findit-border text-findit-muted">
              All Read
            </span>
          )
        }
        action={
          unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllNotificationsAsRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-semibold bg-white hover:bg-findit-bg border border-findit-border text-findit-text transition-colors shadow-subtle"
            >
              <CheckCheck className="w-3.5 h-3.5 text-findit-primary" />
              <span>Mark all read</span>
            </button>
          )
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-findit-border pb-3">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-semibold transition-all ${
            filter === 'all'
              ? 'bg-findit-primary text-white shadow-subtle'
              : 'bg-white border border-findit-border text-findit-muted hover:text-findit-text hover:bg-findit-bg'
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={`px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-semibold transition-all ${
            filter === 'unread'
              ? 'bg-findit-primary text-white shadow-subtle'
              : 'bg-white border border-findit-border text-findit-muted hover:text-findit-text hover:bg-findit-bg'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      {displayedNotifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={filter === 'unread' ? "You're all caught up!" : "No notifications found"}
          description="You are completely caught up! New match suggestions and claim updates will appear here."
          actionText={filter === 'unread' ? 'View All Notifications' : undefined}
          onAction={filter === 'unread' ? () => setFilter('all') : undefined}
        />
      ) : (
        <div className="space-y-3">
          {displayedNotifications.map((notif) => (
            <NotificationCard
              key={notif.id}
              notification={notif}
              onMarkAsRead={markNotificationAsRead}
            />
          ))}
        </div>
      )}
    </div>
  );
};
