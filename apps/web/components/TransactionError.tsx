'use client';

import { X } from 'lucide-react';
import { getTransactionError } from '@/lib/toast';

interface TransactionErrorProps {
  error: unknown;
  title?: string;
  onDismiss?: () => void;
  className?: string;
}

export function TransactionError({
  error,
  title = 'Transaction Failed',
  onDismiss,
  className = '',
}: TransactionErrorProps) {
  if (!error) return null;

  const errorMessage = getTransactionError(error);

  return (
    <div
      className={`p-4 bg-danger-50 border border-danger-200 rounded-lg ${className}`}
      role="alert"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {title && <p className="font-medium text-danger text-sm mb-1">{title}</p>}
          <p className="text-danger text-sm">{errorMessage}</p>
        </div>
        {onDismiss && (
          <button type="button"
            onClick={onDismiss}
            className="text-danger/60 hover:text-danger transition-colors p-1"
            aria-label="Dismiss error"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

interface FormFieldErrorProps {
  error: string | null;
  className?: string;
}

export function FormFieldError({ error, className = '' }: FormFieldErrorProps) {
  if (!error) return null;

  return (
    <p className={`text-danger text-xs mt-1 ${className}`} role="alert">
      {error}
    </p>
  );
}
