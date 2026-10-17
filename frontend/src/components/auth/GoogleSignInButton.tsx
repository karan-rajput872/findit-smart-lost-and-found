import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface GoogleSignInButtonProps {
  onSuccess: (idToken: string) => Promise<void>;
  onError?: (errorMessage: string) => void;
  buttonText?: string;
  disabled?: boolean;
  className?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number | string;
              locale?: string;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  buttonText = 'Continue with Google',
  disabled = false,
  className = '',
}) => {
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [gisLoaded, setGisLoaded] = useState(false);

  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

  const reportError = useCallback(
    (msg: string) => {
      if (onError) {
        onError(msg);
      } else {
        setLocalError(msg);
      }
    },
    [onError]
  );

  const handleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      if (!response.credential) {
        reportError('No credential received from Google.');
        return;
      }

      setIsProcessing(true);
      setLocalError(null);
      try {
        await onSuccess(response.credential);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Google authentication failed. Please try again.';
        reportError(msg);
      } finally {
        setIsProcessing(false);
      }
    },
    [onSuccess, reportError]
  );

  // Initialize GIS and render official button when available
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const initGis = () => {
      if (window.google?.accounts?.id && clientId) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          if (buttonContainerRef.current) {
            buttonContainerRef.current.innerHTML = '';
            window.google.accounts.id.renderButton(buttonContainerRef.current, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text: 'continue_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: buttonContainerRef.current.offsetWidth || 380,
            });
          }
          setGisLoaded(true);
          return true;
        } catch (e) {
          console.warn('GIS initialization error:', e);
          return false;
        }
      }
      return false;
    };

    if (!initGis()) {
      interval = setInterval(() => {
        if (initGis() && interval) {
          clearInterval(interval);
        }
      }, 300);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [clientId, handleCredentialResponse]);

  const handleFallbackClick = () => {
    if (disabled || isProcessing) return;

    if (!clientId) {
      reportError(
        'Google Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID in your environment.'
      );
      return;
    }

    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt();
      } catch (err) {
        console.warn('Google prompt error:', err);
      }
    } else {
      reportError('Google Identity Services is loading. Please wait a moment.');
    }
  };

  return (
    <div className={`w-full space-y-2 ${className}`}>
      {/* Official GIS Button Container */}
      <div
        ref={buttonContainerRef}
        className={`w-full flex justify-center min-h-[44px] ${
          !gisLoaded || isProcessing ? 'hidden' : 'block'
        }`}
      />

      {/* Styled Branded Button (shown while loading GIS, processing, or as fallback) */}
      {(!gisLoaded || isProcessing) && (
        <button
          type="button"
          onClick={handleFallbackClick}
          disabled={disabled || isProcessing}
          aria-label={buttonText}
          className="w-full relative flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-semibold text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-[#3c4043] hover:bg-gray-50 dark:hover:bg-[#28292a] shadow-sm hover:shadow transition-all disabled:opacity-60 disabled:cursor-not-allowed group focus:outline-none focus:ring-2 focus:ring-findit-primary/40"
        >
          {isProcessing ? (
            <RefreshCw className="w-5 h-5 animate-spin text-findit-primary" />
          ) : (
            <svg
              className="w-5 h-5 shrink-0"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>{isProcessing ? 'Verifying with Google...' : buttonText}</span>
        </button>
      )}

      {/* Local Error Feedback */}
      {localError && (
        <div className="p-3 rounded-xl bg-findit-danger/10 border border-findit-danger/30 text-xs text-findit-danger flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{localError}</span>
        </div>
      )}
    </div>
  );
};
