import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, FileText, CheckCircle2, Bell, Check, Clock, XCircle } from 'lucide-react';
import type { Notification } from '../../types';

interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onMarkAsRead,
}) => {
  const getIcon = () => {
    const t = (notification.notificationType || notification.type || '').toLowerCase();
    switch (t) {
      case 'claim_approved':
      case 'item_returned':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'claim_rejected':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'claim_under_review':
        return <Clock className="w-5 h-5 text-blue-400" />;
      case 'claim_submitted':
        return <FileText className="w-5 h-5 text-amber-400" />;
      case 'handover_arranged':
        return <Sparkles className="w-5 h-5 text-purple-400" />;
      case 'match_found':
        return <Sparkles className="w-5 h-5 text-findit-primary" />;
      default:
        return <Bell className="w-5 h-5 text-findit-primary" />;
    }
  };

  const isUnread = !(notification.isRead ?? notification.read);

  const getBorderColor = () => {
    if (isUnread) {
      return 'border-findit-primary/40 bg-findit-card shadow-sm';
    }
    return 'border-findit-border/60 bg-findit-card/50';
  };

  const timeStr = notification.createdAt || notification.timestamp || '';
  const displayTime = timeStr ? new Date(timeStr).toLocaleString() : 'Just now';

  return (
    <div
      className={`p-4 rounded-2xl border transition-all duration-200 flex items-start gap-4 ${getBorderColor()}`}
    >
      <div className="p-2.5 rounded-xl bg-findit-bg border border-findit-border/80 shrink-0 mt-0.5">
        {getIcon()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <h4
              className={`text-sm font-bold truncate ${
                isUnread ? 'text-white' : 'text-findit-text'
              }`}
            >
              {notification.title}
            </h4>
            {isUnread && (
              <span className="w-2 h-2 rounded-full bg-findit-primary shrink-0 animate-pulse" />
            )}
          </div>
          <span className="text-[11px] text-findit-subtle shrink-0">
            {displayTime}
          </span>
        </div>

        <p className="text-xs text-findit-muted leading-relaxed mb-3">
          {notification.message}
        </p>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-findit-border/40 text-xs">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-findit-subtle">
            {(notification.notificationType || notification.type || 'SYSTEM').replace('_', ' ')}
          </span>

          <div className="flex items-center gap-2">
            {!notification.read && (
              <button
                type="button"
                onClick={() => onMarkAsRead(notification.id)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-findit-muted hover:text-white transition-colors"
              >
                <Check className="w-3 h-3" />
                <span>Mark read</span>
              </button>
            )}

            {notification.link && (
              <Link
                to={notification.link}
                className="text-[11px] font-semibold text-findit-primary hover:text-findit-primary-light transition-colors"
              >
                View Details &rarr;
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
