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
  MessageSquare,
  Smartphone,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getAvatarFallback } from '../../utils/imageUtils';
import { formatDate } from '../../utils/formatters';
import { ContactSettingsModal } from '../ContactSettingsModal';

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
  const [contactModalOpen, setContactModalOpen] = useState(false);
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
        return <CheckCircle2 className="w-4 h-4 text-[#3E6B4A] shrink-0" />;
      case 'claim_rejected':
        return <XCircle className="w-4 h-4 text-[#A84A42] shrink-0" />;
      case 'claim_under_review':
        return <Clock className="w-4 h-4 text-[#4A6478] shrink-0" />;
      case 'claim_submitted':
        return <FileText className="w-4 h-4 text-[#8F6325] shrink-0" />;
      case 'handover_arranged':
        return <Sparkles className="w-4 h-4 text-findit-primary shrink-0" />;
      case 'new_message':
        return <MessageSquare className="w-4 h-4 text-findit-primary shrink-0" />;
      case 'contact_shared':
        return <Smartphone className="w-4 h-4 text-[#3E6B4A] shrink-0" />;
      default:
        return <Bell className="w-4 h-4 text-findit-primary shrink-0" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#F8F6F0]/90 backdrop-blur-md border-b border-findit-border px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2">
      {/* Left: Mobile Toggle & Quick Search */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onOpenSidebar}
          className="p-2 rounded-xl text-findit-text bg-white border border-findit-border hover:bg-findit-secondary_bg lg:hidden min-w-[42px] min-h-[42px] flex items-center justify-center shadow-subtle"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link
          to="/dashboard/browse"
          className="hidden sm:flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white border border-findit-border text-xs text-findit-muted hover:text-findit-text hover:border-findit-primary transition-all w-52 md:w-64 shadow-subtle"
        >
          <Search className="w-3.5 h-3.5 text-findit-subtle" />
          <span>Search items...</span>
        </Link>
      </div>

      {/* Right: Actions, Notification Dropdown & User Badge */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          to="/dashboard/report"
          className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-findit-primary hover:bg-findit-primary-hover shadow-subtle transition-all"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Report Item</span>
        </Link>

        {/* Notifications Icon & Interactive Panel */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setPanelOpen(!panelOpen)}
            className={`relative p-2 rounded-xl border transition-all min-w-[40px] min-h-[40px] flex items-center justify-center ${
              panelOpen
                ? 'bg-findit-primary/10 text-findit-primary border-findit-primary'
                : 'bg-white border-findit-border text-findit-text hover:bg-findit-secondary_bg shadow-subtle'
            }`}
            aria-label="Notifications"
            aria-expanded={panelOpen}
          >
            <Bell className="w-4 h-4" />
            {effectiveUnread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-findit-primary text-white text-[10px] font-bold flex items-center justify-center shadow-subtle">
                {effectiveUnread > 9 ? '9+' : effectiveUnread}
              </span>
            )}
          </button>

          {/* Notification Dropdown Panel */}
          {panelOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-findit-border shadow-card z-50 animate-fade-in overflow-hidden">
              <div className="p-3.5 px-4 border-b border-findit-border flex items-center justify-between bg-findit-bg/60">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-findit-text uppercase tracking-wider">Notifications</h4>
                  {effectiveUnread > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-findit-primary/15 text-findit-primary border border-findit-primary/25">
                      {effectiveUnread} new
                    </span>
                  )}
                </div>

                {effectiveUnread > 0 && (
                  <button
                    onClick={markAllNotificationsAsRead}
                    className="text-[11px] font-semibold text-findit-primary hover:underline flex items-center gap-1"
                  >
                    <CheckCheck className="w-3 h-3" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* Notification Items List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-findit-border/60">
                {recentNotifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-findit-muted space-y-1">
                    <p className="font-semibold text-findit-text">You're all caught up!</p>
                    <p>No new notifications right now.</p>
                  </div>
                ) : (
                  recentNotifications.map((notif) => {
                    const isUnread = !notif.isRead && !notif.read;
                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif.id, notif.link)}
                        className={`p-3.5 px-4 text-left transition-colors cursor-pointer flex items-start gap-3 ${
                          isUnread
                            ? 'bg-findit-primary/5 hover:bg-findit-primary/10'
                            : 'hover:bg-findit-bg/80'
                        }`}
                      >
                        <div className="mt-0.5">{getNotificationIcon(notif.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p
                              className={`text-xs font-semibold truncate ${
                                isUnread ? 'text-findit-text font-bold' : 'text-findit-muted'
                              }`}
                            >
                              {notif.title}
                            </p>
                            <span className="text-[10px] text-findit-muted shrink-0">
                              {notif.createdAt ? formatDate(notif.createdAt) : notif.timestamp || 'recent'}
                            </span>
                          </div>
                          <p className="text-[11px] text-findit-muted line-clamp-2 mt-0.5 leading-snug">
                            {notif.message}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Panel Footer */}
              <div className="p-2.5 px-4 bg-findit-bg/60 border-t border-findit-border text-center">
                <Link
                  to="/dashboard/notifications"
                  onClick={() => setPanelOpen(false)}
                  className="text-xs font-semibold text-findit-primary hover:underline inline-flex items-center gap-1"
                >
                  <span>View all notifications</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Contact Preferences Trigger */}
        <button
          onClick={() => setContactModalOpen(true)}
          className="p-2 rounded-xl text-findit-text bg-white border border-findit-border hover:bg-findit-secondary_bg min-w-[40px] min-h-[40px] flex items-center justify-center shadow-subtle"
          title="Contact & Return Preferences"
          aria-label="Contact and Return Preferences"
        >
          <Smartphone className="w-4 h-4 text-findit-primary" />
        </button>

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-1 border-l border-findit-border">
          <div className="w-8 h-8 rounded-full bg-findit-primary/15 text-findit-primary font-bold text-xs flex items-center justify-center border border-findit-primary/30 shrink-0 overflow-hidden">
            <img
              src={getAvatarFallback(user.fullName)}
              alt={user.fullName || 'User'}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-findit-text leading-tight truncate max-w-[120px]">
              {user.fullName}
            </p>
            <p className="text-[10px] text-findit-subtle leading-tight capitalize">
              {user.role} • {user.campus ? user.campus.split(' ')[0] : 'Campus'}
            </p>
          </div>
        </div>
      </div>

      {/* Contact Settings Modal */}
      <ContactSettingsModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
      />
    </header>
  );
};
