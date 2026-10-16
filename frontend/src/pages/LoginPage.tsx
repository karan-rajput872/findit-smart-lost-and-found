import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { FormInput } from '../components/common/FormInput';
import { BrandLogo } from '../components/common/BrandLogo';
import { useApp } from '../context/AppContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useApp();

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
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <BrandLogo size="lg" className="justify-center" />
          <h2 className="text-2xl font-bold tracking-tight text-white pt-2">
            Sign in to FindIt
          </h2>
          <p className="text-xs text-findit-muted">
            Access your campus reports, tracked claims, and match alerts
          </p>
        </div>

        {/* Demo Account Helper Callout */}
        <div className="p-3.5 rounded-xl bg-findit-primary/10 border border-findit-primary/25 text-xs text-findit-primary-light space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold">Demo Accounts Available:</span>
            <span className="text-[10px] text-findit-muted uppercase tracking-wider">Fast Fill</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fillDemoCredentials('alex.morgan@campus.edu', 'CampusPass123!')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-findit-primary/20 hover:bg-findit-primary/30 text-white transition-colors"
            >
              Student (Alex Morgan)
            </button>
            <button
              type="button"
              onClick={() => fillDemoCredentials('library-help@campus.edu', 'StaffPass123!')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-findit-primary/20 hover:bg-findit-primary/30 text-white transition-colors"
            >
              Library Staff
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-findit-danger/10 border border-findit-danger/30 text-xs text-findit-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-7 rounded-2xl bg-findit-card border border-findit-border shadow-xl">
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
                  className="rounded border-findit-border bg-findit-bg text-findit-primary focus:ring-0"
                />
                <span>Remember me</span>
              </label>

              <span className="text-findit-subtle text-[11px]">
                KIIT Campus Authentication
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-findit-primary hover:bg-findit-primary-hover disabled:opacity-50 shadow-glow-primary transition-all duration-150"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Dashboard</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-findit-border/60 text-center text-xs text-findit-muted">
            Don't have a FindIt account yet?{' '}
            <Link to="/register" className="font-semibold text-findit-secondary hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
