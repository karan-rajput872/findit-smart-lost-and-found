import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertCircle, RefreshCw } from 'lucide-react';
import { FormInput } from '../components/common/FormInput';
import { BrandLogo } from '../components/common/BrandLogo';
import { useApp } from '../context/AppContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useApp();

  const [email, setEmail] = useState('alex.morgan@campus.edu');
  const [password, setPassword] = useState('CampusPass123!');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotPasswordNotice, setForgotPasswordNotice] = useState(false);

  // Redirect already authenticated users away from login
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials. Please verify your email and password.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
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

        {/* Prototype Hint Callout */}
        <div className="p-3.5 rounded-xl bg-findit-primary/10 border border-findit-primary/25 text-xs text-findit-primary-light flex items-start gap-2.5">
          <span className="font-bold shrink-0">Demo Account:</span>
          <span>
            Pre-filled with student credentials (<code>CampusPass123!</code>). Click <strong>Sign In</strong> to authenticate via FastAPI JWT.
          </span>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-findit-danger/10 border border-findit-danger/30 text-xs text-findit-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {forgotPasswordNotice && (
          <div className="p-3.5 rounded-xl bg-findit-card border border-findit-border text-xs text-findit-muted space-y-1">
            <p className="font-semibold text-findit-text">Password Reset (Prototype Notice)</p>
            <p>Campus password recovery service will email instructions to your verified .edu address.</p>
          </div>
        )}

        <div className="p-7 rounded-2xl bg-findit-card border border-findit-border shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput
              label="Campus Email"
              type="email"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@campus.edu"
              required
            />

            <FormInput
              label="Password"
              isPassword
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
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

              <button
                type="button"
                onClick={() => setForgotPasswordNotice(true)}
                className="text-findit-primary hover:text-findit-primary-light font-medium transition-colors"
              >
                Forgot password?
              </button>
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
