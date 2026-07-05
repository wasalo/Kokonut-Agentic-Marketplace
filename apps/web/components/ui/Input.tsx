'use client';

import { DS } from '@/lib/design-system';
import { AlertCircle } from 'lucide-react';
import type { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';

interface BaseFieldProps {
  /** Field label */
  label?: string;
  /** Helper text below input */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Icon displayed inside input on left side */
  icon?: ReactNode;
  /**
   * Visual variant. `default` uses bg-content2 (matches most form fields).
   * `subtle` uses bg-content1 (slightly darker; used by bidding forms on
   * a darker hero background to maintain contrast).
   */
  variant?: 'default' | 'subtle';
}

/** Standardized text input */
interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    BaseFieldProps {}

export function Input({
  label,
  helperText,
  error,
  icon,
  variant = 'default',
  className = '',
  ...props
}: InputProps) {
  const variantClass = variant === 'subtle' ? 'bg-content1' : 'bg-content2';
  return (
    <div className={DS.spacing.formField}>
      {label && <label className={DS.labels.base}>{label}</label>}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-default-400">
            {icon}
          </div>
        )}
        <input
          className={`${DS.inputs.base} ${variantClass} ${icon ? 'pl-10' : ''} ${
            error ? 'border-danger focus:ring-danger' : ''
          } ${className}`}
          {...props}
        />
      </div>
      {helperText && !error && (
        <p className="text-xs text-default-500">{helperText}</p>
      )}
      {error && (
        <p className="text-xs text-danger flex items-center gap-1">
          <AlertCircle className="size-3" />
          {error}
        </p>
      )}
    </div>
  );
}

/** Standardized textarea */
interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>,
    BaseFieldProps {}

export function Textarea({
  label,
  helperText,
  error,
  variant = 'default',
  className = '',
  ...props
}: TextareaProps) {
  const variantClass = variant === 'subtle' ? 'bg-content1' : 'bg-content2';
  return (
    <div className={DS.spacing.formField}>
      {label && <label className={DS.labels.base}>{label}</label>}
      <textarea
        className={`${DS.inputs.base} ${DS.inputs.textarea} ${variantClass} ${
          error ? 'border-danger focus:ring-danger' : ''
        } ${className}`}
        {...props}
      />
      {helperText && !error && (
        <p className="text-xs text-default-500">{helperText}</p>
      )}
      {error && (
        <p className="text-xs text-danger flex items-center gap-1">
          <AlertCircle className="size-3" />
          {error}
        </p>
      )}
    </div>
  );
}

/** Standardized select dropdown */
interface SelectProps extends BaseFieldProps {
  children: ReactNode;
  className?: string;
}

export function Select({
  label,
  helperText,
  error,
  children,
  variant = 'default',
  className = '',
  ...props
}: SelectProps & Omit<InputHTMLAttributes<HTMLSelectElement>, 'children'>) {
  const variantClass = variant === 'subtle' ? 'bg-content1' : 'bg-content2';
  return (
    <div className={DS.spacing.formField}>
      {label && <label className={DS.labels.base}>{label}</label>}
      <select
        className={`${DS.inputs.select} ${variantClass} ${
          error ? 'border-danger focus:ring-danger' : ''
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {helperText && !error && (
        <p className="text-xs text-default-500">{helperText}</p>
      )}
      {error && (
        <p className="text-xs text-danger flex items-center gap-1">
          <AlertCircle className="size-3" />
          {error}
        </p>
      )}
    </div>
  );
}
