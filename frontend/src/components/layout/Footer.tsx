import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Heart, MapPin } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-findit-border bg-findit-secondary_bg/80 text-findit-muted text-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Column */}
          <div className="md:col-span-1 space-y-3">
            <BrandLogo size="md" showTagline={false} />
            <p className="text-xs text-findit-muted leading-relaxed">
              Don't lose hope. Find what matters. Campus-first lost and found platform designed for everyone.
            </p>
            <div className="flex items-center gap-2 text-xs text-findit-subtle pt-1">
              <MapPin className="w-3.5 h-3.5 text-findit-primary shrink-0" />
              <span>Campus Community Network</span>
            </div>
          </div>

          {/* Directory Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-findit-text">Quick Links</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/dashboard/browse" className="hover:text-findit-primary transition-colors">
                  Browse Items
                </Link>
              </li>
              <li>
                <Link to="/dashboard/report" className="hover:text-findit-primary transition-colors">
                  Report an Item
                </Link>
              </li>
              <li>
                <Link to="/dashboard/ai-matches" className="hover:text-findit-primary transition-colors">
                  Smart Suggestions
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-findit-primary transition-colors">
                  My Account
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
                  Sign In
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-findit-primary transition-colors">
                  Create Account
                </Link>
              </li>
              <li>
                <Link to="/dashboard/my-reports" className="hover:text-findit-primary transition-colors">
                  My Reports
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-findit-primary transition-colors">
                  Admin Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform Status */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-findit-text">
              Platform
            </h4>
            <div className="p-3.5 rounded-xl bg-white border border-findit-border text-xs space-y-1.5 shadow-subtle">
              <div className="flex items-center gap-1.5 text-findit-primary font-bold">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Verified & Secure</span>
              </div>
              <p className="text-[11px] text-findit-muted leading-normal">
                Safe ownership verification, private messaging, and instant notification alerts for our campus.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-findit-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-findit-subtle">
          <p>© {new Date().getFullYear()} FindIt Platform. Built for University & College Campuses.</p>
          <div className="flex items-center gap-1">
            <span>Crafted with care</span>
            <Heart className="w-3.5 h-3.5 text-[#C25E54] fill-[#C25E54]" />
            <span>for our campus community</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
