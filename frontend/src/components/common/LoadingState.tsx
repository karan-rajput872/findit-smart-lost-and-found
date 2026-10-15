import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data...',
  className = 'py-16',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      <div className="relative mb-3">
        <Loader2 className="w-8 h-8 text-findit-primary animate-spin" />
        <div className="absolute inset-0 blur-md bg-findit-primary/30 rounded-full animate-pulse" />
      </div>
      <p className="text-sm font-medium text-findit-muted">{message}</p>
    </div>
  );
};
