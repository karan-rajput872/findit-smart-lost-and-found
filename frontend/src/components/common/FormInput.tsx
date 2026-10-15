import React, { useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  icon?: LucideIcon;
  isPassword?: boolean;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  error,
  helperText,
  icon: Icon,
  isPassword,
  type = 'text',
  id,
  className = '',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || `input_${label.toLowerCase().replace(/\s+/g, '_')}`;

  const currentType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="w-full space-y-1.5 text-left">
      <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-findit-muted">
        {label}
      </label>
      
      <div className="relative rounded-xl shadow-sm">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-findit-muted">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          id={inputId}
          type={currentType}
          className={`w-full rounded-xl bg-findit-card border transition-all duration-150 text-sm text-findit-text placeholder-findit-subtle
            ${Icon ? 'pl-10' : 'pl-4'}
            ${isPassword ? 'pr-11' : 'pr-4'}
            py-2.5 outline-none
            ${
              error
                ? 'border-findit-danger focus:border-findit-danger focus:ring-1 focus:ring-findit-danger'
                : 'border-findit-border focus:border-findit-primary focus:ring-1 focus:ring-findit-primary'
            }
            ${className}`}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-findit-muted hover:text-findit-text transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>

      {error ? (
        <p className="text-xs text-findit-danger flex items-center gap-1 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-findit-subtle">{helperText}</p>
      ) : null}
    </div>
  );
};
