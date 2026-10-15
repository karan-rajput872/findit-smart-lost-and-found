import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-16 space-y-5">
      <div className="w-16 h-16 rounded-3xl bg-findit-primary/10 border border-findit-primary/30 flex items-center justify-center text-findit-primary">
        <Compass className="w-8 h-8 animate-pulse" />
      </div>

      <div className="space-y-2">
        <h1 className="text-4xl font-black text-white">404 — Page Not Found</h1>
        <p className="text-sm text-findit-muted max-w-md mx-auto">
          It looks like this page wandered off somewhere on campus. Let's get you back to safety.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-findit-primary hover:bg-findit-primary-hover shadow-glow-primary transition-all"
        >
          <Home className="w-4 h-4" />
          <span>Return Home</span>
        </Link>
        <Link
          to="/dashboard/browse"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-findit-text bg-findit-card hover:bg-findit-card-hover border border-findit-border transition-colors"
        >
          <span>Explore Directory</span>
        </Link>
      </div>
    </div>
  );
};
