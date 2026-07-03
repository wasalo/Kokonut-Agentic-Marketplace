'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import NextLink from 'next/link';
import { Bell, X, Briefcase, Gavel, Inbox } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useActionQueue, type ActionItem } from '@/lib/hooks/useActionQueue';


const URGENCY_DOT: Record<ActionItem['urgency'], string> = {
  high: 'bg-danger',
  medium: 'bg-warning',
  low: 'bg-default-400',
};

export function HeaderBell(): JSX.Element | null {
  const { isConnected } = useAccount();
  const { items, jobCount, biddingCount, totalCount } = useActionQueue();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        close();
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, close]);

  if (!mounted || !isConnected) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="relative p-2 text-foreground hover:bg-content2 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`Action queue (${totalCount} pending)`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Bell className="size-5" />
        {totalCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold leading-none"
          >
            {totalCount > 99 ? '99+' : totalCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Action queue"
          className="absolute right-0 mt-2 w-[min(360px,calc(100vw-1.5rem))] max-h-[70vh] overflow-y-auto rounded-xl border border-divider bg-background/95 backdrop-blur-xl shadow-xl z-50"
        >
          <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-divider bg-background/95">
            <div>
              <h2 className="text-sm font-semibold">Action queue</h2>
              <p className="text-xs text-default-500">
                {totalCount === 0
                  ? 'No pending actions'
                  : `${jobCount} job${jobCount === 1 ? '' : 's'} · ${biddingCount} bidding`}
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              className="p-1 text-default-500 hover:text-foreground rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Close action queue"
            >
              <X className="size-4" />
            </button>
          </div>

          {totalCount === 0 ? (
            <div className="px-4 py-10 text-center text-default-500">
              <Inbox className="size-10 mx-auto mb-2 text-default-300" />
              <p className="text-sm font-medium">All caught up</p>
              <p className="text-xs mt-1">New jobs, bidding deadlines, and review actions will appear here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-divider">
              {items.map(item => (
                <li key={item.id}>
                  <NextLink
                    href={item.href}
                    onClick={close}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-content2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 size-2 rounded-full shrink-0 ${URGENCY_DOT[item.urgency]}`}
                    />
                    {item.kind === 'job' ? (
                      <Briefcase className="size-4 mt-0.5 text-default-500 shrink-0" />
                    ) : (
                      <Gavel className="size-4 mt-0.5 text-default-500 shrink-0" />
                    )}
                    <span className="min-w-0">
                      <span className="block text-sm font-medium truncate">{item.title}</span>
                      <span className="block text-xs text-default-500">{item.reason}</span>
                    </span>
                  </NextLink>
                </li>
              ))}
            </ul>
          )}

          {(jobCount > 0 || biddingCount > 0) && (
            <div className="sticky bottom-0 px-4 py-2 border-t border-divider bg-background/95">
              <NextLink
                href="/marketplace?tab=my-work"
                onClick={close}
                className="text-xs text-primary hover:underline"
              >
                Open My Work →
              </NextLink>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
