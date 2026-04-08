'use client';

import { AlertCircle } from 'lucide-react';
import { getTransactionError } from '@/lib/toast';

interface ErrorDisplayProps {
  error: unknown;
  title?: string;
  className?: string;
}

export function ErrorDisplay({ error, title = 'Error', className = '' }: ErrorDisplayProps) {
  if (!error) return null;

  const errorMessage = getTransactionError(error);

  return (
    <div
      className={`p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          {title && <p className="font-medium">{title}</p>}
          <p className="text-sm">{errorMessage}</p>
        </div>
      </div>
    </div>
  );
}

export default ErrorDisplay;
