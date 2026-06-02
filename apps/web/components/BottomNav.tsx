'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import NextLink from 'next/link';
import {
  Search,
  Briefcase,
  Activity,
  Bell,
  User,
  type LucideIcon,
} from 'lucide-react';
import {
  useBottomNavState,
  type BottomNavTab,
} from '@/lib/hooks/useBottomNavState';
import { cn } from '@/lib/utils';

type TabDef = {
  id: BottomNavTab;
  label: string;
  href: string;
  icon: LucideIcon;
  ariaLabel: string;
};

const TABS: TabDef[] = [
  {
    id: 'market',
    label: 'Market',
    href: '/marketplace',
    icon: Search,
    ariaLabel: 'Browse marketplace',
  },
  {
    id: 'work',
    label: 'Work',
    href: '/marketplace?tab=my-work',
    icon: Briefcase,
    ariaLabel: 'My work',
  },
  {
    id: 'activity',
    label: 'Activity',
    href: '/activity',
    icon: Activity,
    ariaLabel: 'Activity and transactions',
  },
  {
    id: 'notifications',
    label: 'Alerts',
    href: '/notifications',
    icon: Bell,
    ariaLabel: 'Notifications and attention items',
  },
  {
    id: 'profile',
    label: 'Profile',
    href: '/dashboard/agents',
    icon: User,
    ariaLabel: 'Profile and agents',
  },
];

function hapticTap() {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(10);
    } catch {
      // Vibration API can throw in restricted contexts; ignore.
    }
  }
}

function ProfileAvatar({ shortAddress }: { shortAddress: string | null }) {
  if (!shortAddress) {
    return <User className="size-5" aria-hidden="true" />;
  }
  return (
    <span
      aria-hidden="true"
      className="size-7 rounded-full bg-gradient-to-br from-[#009F4D] to-[#FFCD00] text-white text-[10px] font-bold flex items-center justify-center tracking-wider"
    >
      {shortAddress}
    </span>
  );
}

export function BottomNav(): JSX.Element | null {
  const pathname = usePathname();
  const { activeTab, isConnected, pendingTxCount, unreadCount, shortAddress, connect } =
    useBottomNavState();
  const [mounted, setMounted] = useState(false);
  const [hideForPath, setHideForPath] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (pathname) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [pathname]);

  useEffect(() => {
    if (!pathname) {
      setHideForPath(false);
      return;
    }
    const hiddenRoutes = ['/onboarding'];
    setHideForPath(hiddenRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`)));
  }, [pathname]);

  const handleProfileClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
      if (!isConnected && connect) {
        event.preventDefault();
        hapticTap();
        connect();
        return;
      }
      hapticTap();
    },
    [isConnected, connect]
  );

  const handleLinkClick = useCallback(() => {
    hapticTap();
  }, []);

  if (!mounted || hideForPath) return null;

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background/95 backdrop-blur-xl border-t border-divider safe-area-bottom"
    >
      <ul role="list" className="grid grid-cols-5 max-w-2xl mx-auto">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const showPendingBadge = tab.id === 'activity' && pendingTxCount > 0;
          const showUnreadBadge = tab.id === 'notifications' && unreadCount > 0;
          const isProfile = tab.id === 'profile';
          const showConnectCta = isProfile && !isConnected;
          const Icon = tab.icon;

          const baseClass = cn(
            'relative flex flex-col items-center justify-center gap-1 min-h-[56px] py-2 px-1 transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#009F4D] focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            isActive
              ? 'text-[#009F4D]'
              : 'text-default-500 hover:text-foreground active:text-foreground'
          );

          const inner = (
            <>
              <span className="relative inline-flex items-center justify-center">
                {isProfile ? (
                  <ProfileAvatar shortAddress={shortAddress} />
                ) : (
                  <Icon className="size-5" aria-hidden="true" />
                )}
                {showPendingBadge && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 bg-warning text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                  >
                    {pendingTxCount > 99 ? '99+' : pendingTxCount}
                  </span>
                )}
                {showUnreadBadge && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 bg-[#009F4D] text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium tracking-wide">
                {showConnectCta ? 'Connect' : tab.label}
              </span>
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#009F4D]"
                />
              )}
            </>
          );

          if (showConnectCta) {
            return (
              <li key={tab.id} className="flex">
                <button
                  type="button"
                  onClick={handleProfileClick}
                  className={cn(baseClass, 'w-full')}
                  aria-label="Connect wallet"
                >
                  {inner}
                </button>
              </li>
            );
          }

          return (
            <li key={tab.id} className="flex">
              <NextLink
                href={tab.href}
                onClick={(event) => {
                  handleLinkClick();
                  if (isProfile) handleProfileClick(event);
                }}
                aria-current={isActive ? 'page' : undefined}
                aria-label={tab.ariaLabel}
                className={cn(baseClass, 'w-full')}
                prefetch={false}
              >
                {inner}
              </NextLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
