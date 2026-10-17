import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Building, UserPlus, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { FormInput } from '../components/common/FormInput';
import { BrandLogo } from '../components/common/BrandLogo';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { CAMPUSES } from '../data/mockData';
import { useApp } from '../context/AppContext';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, loginWithGoogle, isAuthenticated } = useApp();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [campus, setCampus] = useState(CAMPUSES[0]);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const validate = () => {
    const errs: Record<string, string> = {};

    if (!fullName.trim()) {
      errs.fullName = 'Full name is required.';
    }
    if (!email.trim() || !email.includes('@')) {
      errs.email = 'Valid institutional email is required.';
    }
    if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters.';
    } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      errs.password = 'Password must contain at least one letter and one number.';
    }
    if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }
    if (!acceptTerms) {
      errs.terms = 'You must accept the community terms and lost & found policy.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
        campus,
        role: 'student',
      });

      setSuccessNotice(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 900);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please check your information.';
      setApiError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-10 sm:py-14">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <BrandLogo size="lg" className="justify-center" />
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-findit-text pt-2">
            Create your Account
          </h2>
          <p className="text-xs sm:text-sm text-findit-muted">
            Join your campus community to report and recover lost belongings
          </p>
        </div>

        {apiError && (
          <div className="p-3.5 rounded-xl bg-findit-danger-bg border border-findit-border text-xs text-findit-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        {successNotice && (
          <div className="p-4 rounded-xl bg-findit-found-bg border border-[#CEE0D0] text-xs text-[#2D593A] flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-[#4E7A5A]" />
            <div>
              <p className="font-bold">Account created successfully!</p>
              <p className="text-[#3E6B4A]">Opening your dashboard...</p>
            </div>
          </div>
        )}

        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-findit-border shadow-card space-y-6">
          {/* Prominent Google Sign-Up */}
          <div className="space-y-4">
            <GoogleSignInButton
              buttonText="Continue with Google"
              onSuccess={async (idToken) => {
                setApiError(null);
                await loginWithGoogle(idToken);
                navigate('/dashboard', { replace: true });
              }}
              onError={(err) => setApiError(err)}
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
              label="Full Name *"
              icon={User}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Jordan Lee"
              error={errors.fullName}
              required
            />

            <FormInput
              label="Campus Email Address *"
              type="email"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. j.lee@campus.edu"
              error={errors.email}
              required
            />

            {/* Campus Selection */}
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-findit-muted">
                Campus or Institution *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-findit-muted">
                  <Building className="w-4 h-4" />
                </div>
                <select
                  value={campus}
                  onChange={(e) => setCampus(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-findit-border text-sm text-findit-text focus:border-findit-primary focus:ring-1 focus:ring-findit-primary outline-none min-h-[42px]"
                >
                  {CAMPUSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput
                label="Password *"
                isPassword
                icon={Lock}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 chars (1 letter, 1 digit)"
                error={errors.password}
                required
              />

              <FormInput
                label="Confirm Password *"
                isPassword
                icon={Lock}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                error={errors.confirmPassword}
                required
              />
            </div>

            {/* Terms checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-findit-muted">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 rounded border-findit-border text-findit-primary focus:ring-0"
                />
                <span>
                  I agree to the <span className="text-findit-text underline font-semibold">Community Guidelines</span> and consent to verify ownership before claiming items.
                </span>
              </label>
              {errors.terms && (
                <p className="text-xs text-findit-danger mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.terms}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-findit-primary hover:bg-findit-primary-hover disabled:opacity-50 shadow-subtle transition-all duration-150 min-h-[44px]"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-findit-border text-center text-xs text-findit-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-findit-primary hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
