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
  const { user, notifications, myClaims, receivedClaims, logout, unreadNotifCount, unreadMessagesCount } = useApp();
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
    { label: 'Smart Suggestions', path: '/dashboard/ai-matches', icon: Sparkles },
    { label: 'Notifications', path: '/dashboard/notifications', icon: Bell, count: effectiveUnread },
    ...(user.role === 'admin'
      ? [{ label: 'Admin Portal', path: '/admin', icon: ShieldAlert, badge: 'Admin' }]
      : []),
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
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
            className="p-2 rounded-xl text-findit-muted hover:text-findit-text hover:bg-white lg:hidden min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Sidebar Menu">
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
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all min-h-[40px] ${
                  isActive
                    ? 'bg-white text-findit-primary font-bold shadow-subtle border border-findit-border'
                    : item.highlight
                    ? 'text-findit-primary hover:bg-white hover:text-findit-primary-hover'
                    : 'text-findit-text hover:text-findit-primary hover:bg-white/70'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 shrink-0 text-findit-primary" />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-findit-border text-findit-muted font-normal">
                  {item.badge}
                </span>
              )}

              {item.count !== undefined && item.count > 0 && (
                <span className="w-5 h-5 rounded-full bg-findit-primary text-white text-[11px] font-bold flex items-center justify-center">
                  {item.count > 9 ? '9+' : item.count}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Card & Logout Footer */}
        <div className="p-3 border-t border-findit-border bg-white/50 space-y-2">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-white border border-findit-border shadow-subtle">
            <div className="w-9 h-9 rounded-full bg-findit-primary/15 text-findit-primary font-bold text-xs flex items-center justify-center shrink-0 border border-findit-primary/25 overflow-hidden">
              <img
                src={getAvatarFallback(user.fullName)}
                alt={user.fullName || 'User'}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-bold text-findit-text truncate">{user.fullName}</p>
              <p className="text-[10px] text-findit-subtle truncate capitalize">
                {user.role} • {user.campus || 'Campus'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <NavLink
              to="/"
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-findit-muted hover:text-findit-text hover:bg-white border border-findit-border transition-colors min-h-[38px]"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </NavLink>

            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-findit-danger hover:bg-findit-danger-bg border border-findit-border transition-colors min-h-[38px]"
              title="Sign Out"
              aria-label="Sign out of account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
