import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Heart, MapPin } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-findit-border/80 bg-findit-sidebar/60 text-findit-muted text-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Column */}
          <div className="md:col-span-1 space-y-3">
            <BrandLogo size="md" showTagline={false} />
            <p className="text-xs text-findit-muted leading-relaxed">
              Don't lose hope. Find what matters. Campus-first lost and found intelligence platform.
            </p>
            <div className="flex items-center gap-2 text-xs text-findit-subtle pt-1">
              <MapPin className="w-3.5 h-3.5 text-findit-secondary shrink-0" />
              <span>Multi-Campus Network</span>
            </div>
          </div>

          {/* Directory Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-findit-text">Platform</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/dashboard/browse" className="hover:text-findit-primary transition-colors">
                  Explore Directory
                </Link>
              </li>
              <li>
                <Link to="/dashboard/report" className="hover:text-findit-primary transition-colors">
                  Report Lost / Found Item
                </Link>
              </li>
              <li>
                <Link to="/dashboard/ai-matches" className="hover:text-findit-primary transition-colors">
                  AI Potential Matches
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-findit-primary transition-colors">
                  User Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Account & Administration */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-findit-text">Account</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/login" className="hover:text-findit-primary transition-colors">
                  Student & Staff Login
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-findit-primary transition-colors">
                  Register Campus Profile
                </Link>
              </li>
              <li>
                <Link to="/dashboard/my-reports" className="hover:text-findit-primary transition-colors">
                  My Item Reports
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-findit-primary transition-colors">
                  Admin Moderation Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform Status */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-findit-text">
              Platform Status
            </h4>
            <div className="p-3.5 rounded-xl bg-findit-card border border-findit-border/80 text-xs space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Production Ready (v1.0.0)</span>
              </div>
              <p className="text-[11px] text-findit-subtle leading-normal">
                Full-stack lost & found platform with persistent SQLite/PostgreSQL storage, JWT security, claim verification, and real-time in-app notifications.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-findit-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-findit-subtle">
          <p>© {new Date().getFullYear()} FindIt Platform. Built for University & College Campuses.</p>
          <div className="flex items-center gap-1">
            <span>Crafted with</span>
            <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" />
            <span>for portfolio showcase</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
