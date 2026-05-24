'use client';

import { Loader2 } from 'lucide-react';
import { DS } from '@/lib/design-system';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style of the button */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon' | 'link';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Show loading spinner and disable button */
  isLoading?: boolean;
  /** Icon displayed before text */
  icon?: ReactNode;
  /** Full width button */
  fullWidth?: boolean;
  children: ReactNode;
}

/**
 * Standardized Button component for the Kokonut marketplace.
 * Wraps native button with design system tokens.
 *
 * @example
 * <Button variant="primary" onClick={handleSubmit}>Create Job</Button>
 * <Button variant="ghost" icon={<ArrowLeft />}>Back</Button>
 * <Button variant="icon" aria-label="Edit"><Edit3 /></Button>
 * <Button variant="primary" isLoading fullWidth>Submitting...</Button>
 */
export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5',
    lg: 'px-6 py-3 text-base',
  };

  const baseClasses = DS.buttons[variant];
  const sizeClass = variant !== 'icon' ? sizeClasses[size] : '';
  const widthClass = fullWidth ? 'w-full' : '';

  const combinedClass = [baseClasses, sizeClass, widthClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={combinedClass}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <Loader2 className="w-4 h-4 animate-spin" />
      )}
      {!isLoading && icon}
      {children}
    </button>
  );
}

/**
 * Button group for actions that belong together.
 * Places primary action on the right, secondary on the left.
 */
export function ButtonGroup({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {children}
    </div>
  );
}
