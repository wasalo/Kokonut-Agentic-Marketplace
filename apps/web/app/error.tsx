'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold text-red-600 mb-2">Something went wrong!</h2>
        <p className="text-muted-foreground mb-6">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
