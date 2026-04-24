import { useCallback, useEffect, useRef, useState } from 'react';

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
    async (...args: Parameters<T>) => {
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
 * Hook to handle form submission with debouncing
 * Prevents rapid repeated submissions within the specified cooldown
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
  const submittedRef = useRef(false);

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
              submittedRef.current = false;
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
      submittedRef.current = true;

      // Start countdown
      intervalRef.current = setInterval(() => {
        const remaining = cooldownMs - (Date.now() - lastSubmitRef.current);
        if (remaining <= 0) {
          setTimeUntilNextSubmit(0);
          setIsSubmitting(false);
          submittedRef.current = false;
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
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return {
    handleSubmit,
    isSubmitting,
    timeUntilNextSubmit,
  };
}

/**
 * Format time remaining for display (MM:SS)
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return '00:00';
  
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
