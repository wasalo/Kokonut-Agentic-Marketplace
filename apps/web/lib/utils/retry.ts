'use client';

export type RetryableErrorPattern = string | RegExp | ((error: Error) => boolean);

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
  retryableErrors?: RetryableErrorPattern[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  onRetry: () => {},
  retryableErrors: [
    /ECONNREFUSED/i,
    /ETIMEDOUT/i,
    /timeout/i,
    /network/i,
    /failed to fetch/i,
    /json-rpc/i,
  ] as RetryableErrorPattern[],
};

function isRetryableError(error: Error, retryableErrors: RetryOptions['retryableErrors']): boolean {
  if (!retryableErrors || retryableErrors.length === 0) return true;

  const errorMessage = error.message.toLowerCase();
  for (const pattern of retryableErrors) {
    if (typeof pattern === 'string') {
      if (errorMessage.includes(pattern.toLowerCase())) return true;
    } else if (pattern instanceof RegExp) {
      if (pattern.test(errorMessage)) return true;
    } else if (typeof pattern === 'function') {
      if (pattern(error)) return true;
    }
  }
  return false;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === opts.maxRetries) {
        break;
      }

      if (!isRetryableError(lastError, opts.retryableErrors)) {
        throw lastError;
      }

      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt),
        opts.maxDelay
      );

      opts.onRetry(attempt + 1, lastError);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

export function createRetryableFunction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: RetryOptions
): T {
  return ((...args: Parameters<T>) => withRetry(() => fn(...args), options)) as T;
}

export default withRetry;
