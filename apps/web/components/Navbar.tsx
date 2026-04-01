'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { ChevronDown, Activity, TrendingUp } from 'lucide-react';

const navigation = [
  { name: 'Agents', href: '/identity' },
  { name: 'Marketplace', href: '/marketplace' },
  { name: 'Jobs', href: '/jobs' },
  { name: 'Review', href: '/review' },
  { name: 'Dashboard', href: '/dashboard' },
];

const moreNavigation = [
  { name: 'Activity', href: '/activity', icon: Activity },
  { name: 'Analytics', href: '/analytics', icon: TrendingUp },
];

export function Navbar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl">
              <Image src="/kkn_icon.png" alt="Kokonut" width={32} height={32} className="h-8 w-8" />
              <span>Kokonut</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              {navigation.map(item => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'text-sm font-medium transition-colors hover:text-primary',
                    pathname === item.href || pathname.startsWith(item.href + '/')
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  )}
                >
                  {item.name}
                </Link>
              ))}

              {/* More Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowMore(!showMore)}
                  onBlur={() => setTimeout(() => setShowMore(false), 200)}
                  className={cn(
                    'flex items-center gap-1 text-sm font-medium transition-colors hover:text-primary',
                    moreNavigation.some(
                      item => pathname === item.href || pathname.startsWith(item.href + '/')
                    )
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  )}
                >
                  More
                  <ChevronDown
                    className={cn('w-4 h-4 transition-transform', showMore && 'rotate-180')}
                  />
                </button>

                {showMore && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-background border rounded-lg shadow-lg overflow-hidden">
                    {moreNavigation.map(item => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-accent',
                            pathname === item.href || pathname.startsWith(item.href + '/')
                              ? 'text-primary bg-accent'
                              : 'text-foreground'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </nav>
          </div>
          {mounted ? (
            <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
          ) : (
            <div className="h-9 w-[120px] bg-muted animate-pulse rounded-md" />
          )}
        </div>
      </div>
    </header>
  );
}
