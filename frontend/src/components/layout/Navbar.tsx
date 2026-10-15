import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, PlusCircle, Compass, LayoutDashboard, Shield } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import { useApp } from '../../context/AppContext';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated, user } = useApp();

  const navLinks = [
    { label: 'Explore Directory', path: '/dashboard/browse', icon: Compass },
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'AI Matches', path: '/dashboard/ai-matches', icon: Shield },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <BrandLogo showTagline={false} size="md" />

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === '/'
                ? 'text-white bg-findit-card'
                : 'text-findit-muted hover:text-white hover:bg-findit-card/50'
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
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-white bg-findit-card'
                    : 'text-findit-muted hover:text-white hover:bg-findit-card/50'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* CTA Actions */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="px-3.5 py-2 text-sm font-semibold text-findit-primary hover:text-findit-primary-light transition-colors"
            >
              {user.fullName}
            </Link>
          ) : (
            <Link
              to="/login"
              className="px-3.5 py-2 text-sm font-semibold text-findit-muted hover:text-white transition-colors"
            >
              Sign In
            </Link>
          )}
          <Link
            to="/dashboard/report"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-findit-primary to-findit-primary-hover hover:opacity-95 transition-all shadow-glow-primary"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Report Item</span>
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            to="/dashboard/report"
            className="p-2 rounded-lg bg-findit-primary text-white text-xs font-semibold"
            aria-label="Report Item"
          >
            <PlusCircle className="w-5 h-5" />
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-findit-muted hover:text-white hover:bg-findit-card transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-findit-border/80 bg-findit-bg/95 backdrop-blur-xl px-4 pt-3 pb-5 space-y-2">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-findit-text hover:bg-findit-card"
          >
            Home
          </Link>
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-findit-muted hover:text-white hover:bg-findit-card"
            >
              <link.icon className="w-4 h-4 text-findit-primary" />
              <span>{link.label}</span>
            </Link>
          ))}
          <div className="pt-3 border-t border-findit-border/60 flex flex-col gap-2">
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-xl text-sm font-medium border border-findit-border text-findit-text hover:bg-findit-card"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-xl text-sm font-medium bg-findit-primary text-white hover:bg-findit-primary-hover shadow-glow-primary"
            >
              Create Account
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
