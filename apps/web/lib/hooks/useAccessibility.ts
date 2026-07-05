'use client';

import { useEffect, useCallback } from 'react';

interface FocusTrapOptions {
  enabled?: boolean;
  initialFocus?: string;
  restoreFocus?: boolean;
}

export function useFocusTrap({ enabled = true, initialFocus, restoreFocus = true }: FocusTrapOptions = {}) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled || e.key !== 'Tab') return;

    const focusableSelectors = [
      'a[href]', 'button:not([disabled])', 'input:not([disabled])',
      'select:not([disabled])', 'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const container = document.querySelector('[data-focus-trap]') || document.body;
    const focusable = Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
    if (focusable.length === 0) return;

    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);

    if (initialFocus) {
      const el = document.querySelector(initialFocus) as HTMLElement;
      el?.focus();
    }

    const previouslyFocused = restoreFocus ? document.activeElement as HTMLElement : null;

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (restoreFocus && previouslyFocused) {
        previouslyFocused.focus();
      }
    };
  }, [enabled, handleKeyDown, initialFocus, restoreFocus]);
}

export function useSkipLink(target = '#main-content') {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && !e.shiftKey) {
        const skipLink = document.querySelector('[data-skip-link]');
        if (skipLink && document.activeElement === skipLink) {
          e.preventDefault();
          const targetEl = document.querySelector(target) as HTMLElement;
          targetEl?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [target]);
}

export function useAnnounce(message: string) {
  useEffect(() => {
    const el = document.getElementById('aria-live-region');
    if (el) {
      el.textContent = message;
      const timer = setTimeout(() => { el.textContent = ''; }, 1000);
      return () => clearTimeout(timer);
    }
  }, [message]);
}
