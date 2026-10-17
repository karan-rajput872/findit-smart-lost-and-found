import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { FormInput } from '../components/common/FormInput';
import { BrandLogo } from '../components/common/BrandLogo';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { useApp } from '../context/AppContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, isAuthenticated } = useApp();

  const state = location.state as {
    email?: string;
    message?: string;
    error?: string;
    reason?: string;
    from?: { pathname?: string };
  } | null;

  const redirectTarget = state?.from?.pathname || '/dashboard';

  const [identifier, setIdentifier] = useState<string>(() => {
    return state?.email || localStorage.getItem('findit_remembered_identifier') || '';
  });
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('findit_remember_me') !== 'false';
  });
  const [error, setError] = useState<string>(() => {
    return state?.error || state?.reason || '';
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(() => {
    return state?.message || null;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect already authenticated users away from login to target or dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTarget, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTarget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage(null);

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
      setError('Please provide your registered campus email or username.');
      return;
    }
    if (!password) {
      setError('Please enter your account password.');
      return;
    }

    if (rememberMe) {
      try {
        localStorage.setItem('findit_remembered_identifier', trimmedIdentifier);
        localStorage.setItem('findit_remember_me', 'true');
      } catch {
        // ignore storage quota issues
      }
    } else {
      try {
        localStorage.removeItem('findit_remembered_identifier');
        localStorage.setItem('findit_remember_me', 'false');
      } catch {
        // ignore
      }
    }

    setIsSubmitting(true);
    try {
      await login({ email: trimmedIdentifier, password });
      navigate(redirectTarget, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials. Please verify your email and password.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoCredentials = (emailVal: string, passVal: string) => {
    setIdentifier(emailVal);
    setPassword(passVal);
    setError('');
    setSuccessMessage(null);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-10 sm:py-14">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <BrandLogo size="lg" className="justify-center" />
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-findit-text pt-2">
            Sign in to FindIt
          </h2>
          <p className="text-xs sm:text-sm text-findit-muted">
            Access your campus reports, tracked claims, and match alerts
          </p>
        </div>

        {/* Demo Account Helper Callout */}
        <div className="p-3.5 rounded-2xl bg-white border border-findit-border text-xs text-findit-text space-y-2 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="font-bold text-findit-primary">Demo Accounts:</span>
            <span className="text-[10px] text-findit-muted uppercase tracking-wider font-semibold">One-Click Fill</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fillDemoCredentials('alex.morgan@campus.edu', 'CampusPass123!')}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-findit-bg hover:bg-findit-secondary_bg border border-findit-border text-findit-text transition-colors min-h-[32px]"
            >
              Student (Alex)
            </button>
            <button
              type="button"
              onClick={() => fillDemoCredentials('library-help@campus.edu', 'StaffPass123!')}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-findit-bg hover:bg-findit-secondary_bg border border-findit-border text-findit-text transition-colors min-h-[32px]"
            >
              Library Staff
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-findit-found-bg border border-[#CEE0D0] text-xs text-[#2D593A] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#4E7A5A]" />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-findit-danger-bg border border-findit-border text-xs text-findit-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-findit-border shadow-card space-y-6">
          {/* Prominent Google Sign-In */}
          <div className="space-y-4">
            <GoogleSignInButton
              buttonText="Continue with Google"
              onSuccess={async (idToken) => {
                setError('');
                await loginWithGoogle(idToken);
                navigate(redirectTarget, { replace: true });
              }}
              onError={(err) => setError(err)}
            />

            {/* Visual Separator */}
            <div className="relative flex items-center justify-center py-1">
              <div className="w-full border-t border-findit-border" />
              <span className="absolute px-3 text-[11px] font-bold uppercase tracking-wider bg-white text-findit-muted">
                OR
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput
              id="login_identifier"
              name="identifier"
              label="Campus Email or Username"
              type="text"
              icon={Mail}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. alex.morgan@campus.edu or alex.morgan"
              required
              autoComplete="username"
            />

            <FormInput
              id="login_password"
              name="password"
              label="Password"
              isPassword
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-findit-muted hover:text-findit-text">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-findit-border text-findit-primary focus:ring-0"
                />
                <span>Remember me</span>
              </label>

              <span className="text-findit-subtle text-[11px]">
                Campus Authentication
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-findit-primary hover:bg-findit-primary-hover disabled:opacity-50 shadow-subtle transition-all duration-150 min-h-[44px]"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-findit-border text-center text-xs text-findit-muted">
            Don't have a FindIt account yet?{' '}
            <Link to="/register" className="font-bold text-findit-primary hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
