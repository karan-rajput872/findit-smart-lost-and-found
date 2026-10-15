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
  const iconSize = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-11 h-11' : 'w-9 h-9';
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';

  const content = (
    <div className={`flex items-center gap-2.5 group ${className}`}>
      {/* Search Pin Emblem */}
      <div
        className={`${iconSize} rounded-xl bg-gradient-to-tr from-findit-primary via-[#9F8EFF] to-findit-secondary p-[1.5px] shadow-glow-primary transition-transform group-hover:scale-105 shrink-0`}
      >
        <div className="w-full h-full bg-findit-bg rounded-[10px] flex items-center justify-center relative overflow-hidden">
          <svg
            className="w-5/6 h-5/6 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
              stroke="url(#logoGradient)"
            />
            <circle cx="12" cy="9" r="2.5" stroke="#36CFC9" strokeWidth="2" />
          </svg>
          <svg className="hidden">
            <defs>
              <linearGradient id="logoGradient" x1="5" y1="2" x2="19" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#8B7CFF" />
                <stop offset="1" stopColor="#36CFC9" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center tracking-tight">
          <span className={`font-black ${textSize} text-white font-sans tracking-tight`}>
            Find<span className="text-transparent bg-clip-text bg-gradient-to-r from-findit-primary to-findit-secondary">It</span>
          </span>
          <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-findit-primary/15 text-findit-primary border border-findit-primary/30 uppercase tracking-widest hidden sm:inline-block">
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
