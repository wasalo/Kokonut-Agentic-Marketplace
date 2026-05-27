'use client';

import { usePathname } from 'next/navigation';
import NextLink from 'next/link';
import { Search, Briefcase, Activity, User } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useTransactionRegistry } from '@/lib/stores/transactionRegistry';

const navItems = [
  { href: '/marketplace', label: 'Discover', icon: Search },
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/activity', label: 'Activity', icon: Activity },
  { href: '/dashboard/agents', label: 'Profile', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const pendingCount = useTransactionRegistry().getPending().length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-divider md:hidden">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;

          // Don't show profile tab if not connected
          if (item.href === '/dashboard/agents' && !isConnected) {
            return null;
          }

          return (
            <NextLink
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors ${
                isActive
                  ? 'text-[#009F4D]'
                  : 'text-default-400 hover:text-foreground'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.label === 'Activity' && pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 bg-warning text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute -bottom-0 w-8 h-0.5 bg-[#009F4D] rounded-full" />
              )}
            </NextLink>
          );
        })}
      </div>
    </nav>
  );
}
