import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Compass,
  PlusCircle,
  FileText,
  Sparkles,
  Bell,
  ShieldAlert,
  Home,
  X,
  LogOut,
  ShieldCheck,
  Inbox,
  MessageSquare,
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import { useApp } from '../../context/AppContext';
import { getAvatarFallback } from '../../utils/imageUtils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, notifications, myClaims, receivedClaims, logout, isAuthenticated, unreadNotifCount, unreadMessagesCount } = useApp();
  const effectiveUnread = unreadNotifCount > 0 ? unreadNotifCount : notifications.filter((n) => !n.isRead && !n.read).length;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const pendingReceivedCount = receivedClaims.filter((c) =>
    ['pending', 'under_review'].includes(c.status.toLowerCase())
  ).length;

  const approvedClaimsCount = myClaims.filter((c) =>
    c.status.toLowerCase() === 'approved'
  ).length;

  const navItems = [
    { label: 'Overview', path: '/dashboard', icon: LayoutDashboard, exact: true },
    { label: 'Browse Items', path: '/dashboard/browse', icon: Compass },
    { label: 'Report Item', path: '/dashboard/report', icon: PlusCircle, highlight: true },
    { label: 'My Reports', path: '/dashboard/my-reports', icon: FileText },
    {
      label: 'My Claims',
      path: '/dashboard/my-claims',
      icon: ShieldCheck,
      count: approvedClaimsCount > 0 ? approvedClaimsCount : undefined,
    },
    {
      label: 'Received Claims',
      path: '/dashboard/received-claims',
      icon: Inbox,
      count: pendingReceivedCount > 0 ? pendingReceivedCount : undefined,
    },
    {
      label: 'Messages',
      path: '/dashboard/messages',
      icon: MessageSquare,
      count: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
    },
    { label: 'AI Matches', path: '/dashboard/ai-matches', icon: Sparkles, badge: 'Prototype' },
    { label: 'Notifications', path: '/dashboard/notifications', icon: Bell, count: effectiveUnread },
    { label: 'Admin Portal', path: '/admin', icon: ShieldAlert, badge: 'Mod' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-findit-sidebar border-r border-findit-border flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header / Brand */}
        <div className="h-16 px-5 border-b border-findit-border flex items-center justify-between">
          <BrandLogo size="sm" showTagline={false} linkTo="/dashboard" />
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-findit-muted hover:text-white hover:bg-findit-card lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-findit-subtle">
            Menu
          </div>

          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              onClick={() => {
                if (window.innerWidth < 1024) onClose();
              }}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-findit-primary/15 text-findit-primary border border-findit-primary/30 shadow-sm'
                    : item.highlight
                    ? 'text-findit-secondary hover:bg-findit-secondary/10 hover:text-white'
                    : 'text-findit-muted hover:text-findit-text hover:bg-findit-card'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-findit-bg border border-findit-border/80 text-findit-muted font-normal">
                  {item.badge}
                </span>
              )}

              {item.count !== undefined && item.count > 0 && (
                <span className="w-5 h-5 rounded-full bg-findit-primary text-white text-[11px] font-bold flex items-center justify-center">
                  {item.count}
                </span>
              )}
            </NavLink>
          ))}

          <div className="pt-4 mt-4 border-t border-findit-border/60">
            <NavLink
              to="/"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-findit-muted hover:text-findit-text hover:bg-findit-card transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Public Landing Page</span>
            </NavLink>
          </div>
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-findit-border bg-findit-bg/40 space-y-2">
          <div className="flex items-center gap-3">
            <img
              src={user.avatarUrl || getAvatarFallback(user.fullName)}
              alt={user.fullName}
              className="w-9 h-9 rounded-xl object-cover border border-findit-border/80 shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = getAvatarFallback(user.fullName);
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-findit-text truncate">{user.fullName}</p>
              <p className="text-[11px] text-findit-muted truncate">{user.campus}</p>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-findit-card border border-findit-border text-findit-primary">
              {isAuthenticated ? user.role.toUpperCase() : 'DEMO'}
            </span>
          </div>

          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-medium text-findit-muted hover:text-findit-danger hover:bg-findit-danger/10 border border-findit-border hover:border-findit-danger/30 transition-colors"
              title="Sign out of your session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
