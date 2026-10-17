import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, PlusCircle, Compass, LayoutDashboard, Sparkles } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import { useApp } from '../../context/AppContext';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated, user } = useApp();

  // Close mobile drawer when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { label: 'Browse Items', path: '/dashboard/browse', icon: Compass },
    { label: 'My Account', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Smart Suggestions', path: '/dashboard/ai-matches', icon: Sparkles },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand Logo */}
        <BrandLogo showTagline={false} size="md" />

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5" aria-label="Main Navigation">
          <Link
            to="/"
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
              location.pathname === '/'
                ? 'text-findit-primary bg-white shadow-subtle border border-findit-border'
                : 'text-findit-muted hover:text-findit-text hover:bg-white/60'
            }`}
          >
            Home
          </Link>
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? 'text-findit-primary bg-white shadow-subtle border border-findit-border'
                    : 'text-findit-muted hover:text-findit-text hover:bg-white/60'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="px-3.5 py-2 text-xs font-semibold text-findit-primary hover:text-findit-primary-hover transition-colors"
            >
              {user.fullName}
            </Link>
          ) : (
            <Link
              to="/login"
              className="px-3.5 py-2 text-xs font-semibold text-findit-text hover:text-findit-primary transition-colors"
            >
              Sign In
            </Link>
          )}
          <Link
            to="/dashboard/report"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-findit-primary hover:bg-findit-primary-hover shadow-subtle transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Report Item</span>
          </Link>
        </div>

        {/* Mobile controls */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            to="/dashboard/report"
            className="p-2.5 rounded-xl bg-findit-primary text-white text-xs font-semibold min-w-[44px] min-h-[44px] flex items-center justify-center shadow-subtle"
            aria-label="Report Item"
          >
            <PlusCircle className="w-5 h-5" />
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 rounded-xl text-findit-text bg-white border border-findit-border hover:bg-findit-secondary_bg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-findit-border bg-white/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-2 shadow-lg animate-fade-in">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3.5 py-2.5 rounded-xl text-sm font-semibold text-findit-text hover:bg-findit-bg"
          >
            Home
          </Link>
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-findit-muted hover:text-findit-text hover:bg-findit-bg"
            >
              <link.icon className="w-4 h-4 text-findit-primary" />
              <span>{link.label}</span>
            </Link>
          ))}
          <div className="pt-3 border-t border-findit-border flex flex-col gap-2.5">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-3 rounded-xl text-sm font-bold bg-findit-primary text-white shadow-subtle min-h-[44px] flex items-center justify-center"
              >
                Go to My Account ({user.fullName})
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-3 rounded-xl text-sm font-bold border border-findit-border text-findit-text hover:bg-findit-secondary_bg min-h-[44px] flex items-center justify-center"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-3 rounded-xl text-sm font-bold bg-findit-primary text-white hover:bg-findit-primary-hover shadow-subtle min-h-[44px] flex items-center justify-center"
                >
                  Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
