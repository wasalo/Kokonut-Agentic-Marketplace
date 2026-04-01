'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * Hook to debounce a callback function
 * Prevents rapid repeated calls within the specified delay
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 1000
): [T, boolean] {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isPending, setIsPending] = useState(false);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      // If there's a pending timeout, clear it
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set pending state
      setIsPending(true);

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        setIsPending(false);
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  return [debouncedCallback, isPending];
}

/**
 * Hook to throttle a callback function
 * Ensures callback is called at most once per specified period
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 1000
): [T, boolean] {
  const lastCallRef = useRef<number>(0);
  const [isThrottled, setIsThrottled] = useState(false);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallRef.current;

      if (timeSinceLastCall >= delay) {
        lastCallRef.current = now;
        setIsThrottled(false);
        callback(...args);
      } else {
        setIsThrottled(true);
      }
    },
    [callback, delay]
  ) as T;

  return [throttledCallback, isThrottled];
}

/**
 * Hook to prevent rapid form submissions
 * Combines debouncing with state tracking for better UX
 */
export function useFormSubmit<T extends (e: React.FormEvent) => void>(
  onSubmit: T,
  cooldownMs: number = 2000
): {
  handleSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  timeUntilNextSubmit: number;
} {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeUntilNextSubmit, setTimeUntilNextSubmit] = useState(0);
  const lastSubmitRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const now = Date.now();
      const timeSinceLastSubmit = now - lastSubmitRef.current;

      if (timeSinceLastSubmit < cooldownMs) {
        // Still in cooldown
        const remaining = cooldownMs - timeSinceLastSubmit;
        setTimeUntilNextSubmit(remaining);

        // Start countdown
        if (!intervalRef.current) {
          intervalRef.current = setInterval(() => {
            const updatedRemaining = cooldownMs - (Date.now() - lastSubmitRef.current);
            if (updatedRemaining <= 0) {
              setTimeUntilNextSubmit(0);
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
            } else {
              setTimeUntilNextSubmit(updatedRemaining);
            }
          }, 100);
        }

        return;
      }

      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Update refs and state
      lastSubmitRef.current = now;
      setIsSubmitting(true);
      setTimeUntilNextSubmit(cooldownMs);

      // Start countdown
      intervalRef.current = setInterval(() => {
        const remaining = cooldownMs - (Date.now() - lastSubmitRef.current);
        if (remaining <= 0) {
          setTimeUntilNextSubmit(0);
          setIsSubmitting(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        } else {
          setTimeUntilNextSubmit(remaining);
        }
      }, 100);

      // Call the actual submit handler
      onSubmit(e);
    },
    [onSubmit, cooldownMs]
  );

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Attach cleanup to window unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanup);
  }

  return {
    handleSubmit,
    isSubmitting,
    timeUntilNextSubmit,
  };
}

/**
 * Simple client-side rate limiter using localStorage
 * Limits actions per user per time window
 */
export function checkRateLimit(
  action: string,
  maxRequests: number = 5,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  if (typeof window === 'undefined') {
    return { allowed: true, remaining: maxRequests, resetTime: Date.now() + windowMs };
  }

  const key = `kokonut_rate_limit_${action}`;
  const now = Date.now();

  try {
    const stored = localStorage.getItem(key);
    let history: number[] = [];

    if (stored) {
      history = JSON.parse(stored);
      // Filter out old entries outside the window
      history = history.filter((timestamp: number) => now - timestamp < windowMs);
    }

    const remaining = Math.max(0, maxRequests - history.length);
    const allowed = remaining > 0;
    const resetTime = history.length > 0 ? history[0] + windowMs : now + windowMs;

    if (allowed) {
      history.push(now);
      localStorage.setItem(key, JSON.stringify(history));
    }

    return { allowed, remaining, resetTime };
  } catch {
    // If localStorage fails, allow the action
    return { allowed: true, remaining: maxRequests, resetTime: now + windowMs };
  }
}

/**
 * Format time remaining in milliseconds to human-readable string
 */
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '0s';

  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export default useDebounce;
