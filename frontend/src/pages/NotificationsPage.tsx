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
        title="Notifications & Alerts"
        description="Stay informed about AI potential matches, claim verification reviews, and item status changes."
        badge={
          unreadCount > 0 ? (
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-findit-primary/20 text-findit-primary border border-findit-primary/30">
              {unreadCount} Unread
            </span>
          ) : (
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-findit-border/40 text-findit-muted">
              All Read
            </span>
          )
        }
        action={
          unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllNotificationsAsRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-findit-card hover:bg-findit-card-hover border border-findit-border text-findit-text transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-findit-border/60 pb-3">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filter === 'all'
              ? 'bg-findit-card text-white border border-findit-border'
              : 'text-findit-muted hover:text-white'
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filter === 'unread'
              ? 'bg-findit-card text-white border border-findit-border'
              : 'text-findit-muted hover:text-white'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      {displayedNotifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={filter === 'unread' ? 'No unread notifications' : 'No notifications found'}
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
