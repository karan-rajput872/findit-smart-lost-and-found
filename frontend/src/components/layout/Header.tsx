import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  PlusCircle,
  Search,
  CheckCheck,
  ExternalLink,
  Sparkles,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface HeaderProps {
  onOpenSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSidebar }) => {
  const navigate = useNavigate();
  const {
    notifications,
    user,
    unreadNotifCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useApp();

  const [panelOpen, setPanelOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const effectiveUnread = unreadNotifCount > 0 ? unreadNotifCount : notifications.filter((n) => !n.isRead && !n.read).length;
  const recentNotifications = notifications.slice(0, 6);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setPanelOpen(false);
      }
    }
    if (panelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [panelOpen]);

  const handleNotificationClick = async (notifId: string, link?: string) => {
    await markNotificationAsRead(notifId);
    setPanelOpen(false);
    if (link) {
      navigate(link);
    }
  };

  const getNotificationIcon = (type?: string) => {
    switch ((type || '').toLowerCase()) {
      case 'claim_approved':
      case 'item_returned':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'claim_rejected':
        return <XCircle className="w-4 h-4 text-red-400 shrink-0" />;
      case 'claim_under_review':
        return <Clock className="w-4 h-4 text-blue-400 shrink-0" />;
      case 'claim_submitted':
        return <FileText className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'handover_arranged':
        return <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />;
      default:
        return <Bell className="w-4 h-4 text-findit-primary shrink-0" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-findit-bg/85 backdrop-blur-md border-b border-findit-border px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      {/* Left: Mobile Toggle & Quick Search */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="p-2 rounded-xl text-findit-muted hover:text-white hover:bg-findit-card lg:hidden border border-findit-border"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link
          to="/dashboard/browse"
          className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-findit-card/80 border border-findit-border text-xs text-findit-muted hover:text-findit-text hover:border-findit-primary/40 transition-all w-64"
        >
          <Search className="w-3.5 h-3.5 text-findit-subtle" />
          <span>Quick search directory...</span>
        </Link>
      </div>

      {/* Right: Actions, Notification Dropdown & User Badge */}
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard/report"
          className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-findit-primary hover:bg-findit-primary-hover shadow-glow-primary transition-all"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Report Item</span>
        </Link>

        {/* Notifications Icon & Interactive Panel */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setPanelOpen(!panelOpen)}
            className={`relative p-2 rounded-xl border transition-all ${
              panelOpen
                ? 'bg-findit-card text-white border-findit-primary shadow-glow-primary'
                : 'bg-findit-card border-findit-border text-findit-muted hover:text-white hover:border-findit-border-light'
            }`}
            aria-label="Notifications"
            aria-expanded={panelOpen}
          >
            <Bell className="w-4 h-4" />
            {effectiveUnread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-findit-primary text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {effectiveUnread > 9 ? '9+' : effectiveUnread}
              </span>
            )}
          </button>

          {/* Notification Dropdown Panel */}
          {panelOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-findit-sidebar border border-findit-border shadow-2xl z-50 animate-fade-in overflow-hidden">
              <div className="p-3.5 px-4 border-b border-findit-border flex items-center justify-between bg-findit-card/60">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Notifications</h4>
                  {effectiveUnread > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-findit-primary/20 text-findit-primary border border-findit-primary/30">
                      {effectiveUnread} new
                    </span>
                  )}
                </div>

                {effectiveUnread > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllNotificationsAsRead()}
                    className="text-[11px] font-semibold text-findit-primary hover:text-findit-primary-light flex items-center gap-1 transition-colors"
                  >
                    <CheckCheck className="w-3 h-3" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* Notification list */}
              <div className="max-h-80 overflow-y-auto divide-y divide-findit-border/40">
                {recentNotifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-findit-muted">
                    <p>No notifications yet.</p>
                    <p className="text-[11px] text-findit-subtle mt-1">Updates on claims and returns will appear here.</p>
                  </div>
                ) : (
                  recentNotifications.map((notif) => {
                    const isUnread = !notif.isRead && !notif.read;
                    const timeStr = notif.createdAt || notif.timestamp || '';
                    const timeAgo = timeStr ? new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now';

                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif.id, notif.link)}
                        className={`p-3.5 px-4 transition-colors cursor-pointer flex items-start gap-3 hover:bg-findit-card/80 ${
                          isUnread ? 'bg-findit-primary/5' : ''
                        }`}
                      >
                        <div className="mt-0.5">
                          {getNotificationIcon(notif.notificationType || notif.type)}
                        </div>

                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center justify-between gap-1">
                            <p className={`text-xs font-bold truncate ${isUnread ? 'text-white' : 'text-findit-text'}`}>
                              {notif.title}
                            </p>
                            <span className="text-[10px] text-findit-subtle shrink-0">{timeAgo}</span>
                          </div>
                          <p className="text-[11px] text-findit-muted line-clamp-2 leading-relaxed">
                            {notif.message}
                          </p>
                        </div>

                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-findit-primary shrink-0 mt-1.5" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer link to full notification center */}
              <div className="p-2.5 px-4 border-t border-findit-border bg-findit-card/40 flex items-center justify-between text-xs">
                <Link
                  to="/dashboard/notifications"
                  onClick={() => setPanelOpen(false)}
                  className="font-bold text-findit-primary hover:text-findit-primary-light flex items-center gap-1 transition-colors"
                >
                  <span>Open Full Notification Center</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <button
                  type="button"
                  onClick={() => setPanelOpen(false)}
                  className="text-findit-muted hover:text-white text-[11px]"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-findit-border/80">
          <img
            src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}
            alt={user.fullName}
            className="w-8 h-8 rounded-xl object-cover border border-findit-border"
          />
          <div className="hidden md:block text-left">
            <span className="block text-xs font-bold text-findit-text leading-tight">
              {user.fullName}
            </span>
            <span className="block text-[10px] text-findit-subtle leading-tight">
              {user.role.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
