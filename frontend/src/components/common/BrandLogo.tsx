import React from 'react';
import { Link } from 'react-router-dom';

interface BrandLogoProps {
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
  linkTo?: string;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  showTagline = false,
  size = 'md',
  linkTo = '/',
  className = '',
}) => {
  const iconSize = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';

  const content = (
    <div className={`flex items-center gap-2.5 group ${className}`}>
      {/* Search Pin Emblem in Sage Green */}
      <div
        className={`${iconSize} rounded-xl bg-findit-primary text-white flex items-center justify-center shadow-subtle transition-transform group-hover:scale-105 shrink-0`}
      >
        <svg
          className="w-4/6 h-4/6 text-white"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
          <circle cx="12" cy="9" r="2.5" fill="#FFFFFF" stroke="none" />
        </svg>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center tracking-tight">
          <span className={`font-black ${textSize} text-findit-text font-sans tracking-tight`}>
            Find<span className="text-findit-primary">It</span>
          </span>
          <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-findit-primary/10 text-findit-primary border border-findit-primary/25 uppercase tracking-widest hidden sm:inline-block">
            Campus
          </span>
        </div>
        {showTagline && (
          <span className="text-[11px] text-findit-muted tracking-normal hidden md:inline">
            Don't lose hope. Find what matters.
          </span>
        )}
      </div>
    </div>
  );

  if (linkTo) {
    return <Link to={linkTo} className="inline-block focus:outline-none">{content}</Link>;
  }

  return content;
};
