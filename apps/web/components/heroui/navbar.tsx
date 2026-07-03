'use client';

import { Menu, X, Wallet, Sun, Moon } from 'lucide-react';
import React, { useState, useCallback, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import NextLink from 'next/link';
import { useAccount } from 'wagmi';
import { useUSDCBalance } from '@/lib/hooks/useUSDC';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { UnifiedDrawer } from '@/components/UnifiedDrawer';
import { HeaderBell } from '@/components/ActionQueuePanel';

function USDCBalance() {
  const { address } = useAccount();
  const { formattedBalance, isLoading } = useUSDCBalance(address);

  if (!address || isLoading || !formattedBalance) return null;

  return (
    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-success/10 text-success rounded-full text-sm font-medium">
      <Wallet className="size-3.5" />
      {Number(formattedBalance).toFixed(2)} USDC
    </div>
  );
}

const primaryNavLinks = [
  { name: 'Marketplace Hub', href: '/marketplace', description: 'Services, jobs, bidding' },
];

export const NavbarComponent = React.memo(function NavbarComponent(): JSX.Element {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  // Always render all links to prevent hydration mismatch
  // Dashboard only shown when connected via CSS

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-divider">
      <nav className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <NextLink href="/" className="flex items-center gap-2 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg">
            <div className="size-9 rounded-lg bg-gradient-to-br from-[#009F4D] to-[#FFCD00] flex items-center justify-center">
              <span className="text-white font-bold text-sm">KK</span>
            </div>
            <span className="font-bold text-lg hidden sm:block">Kokonut</span>
          </NextLink>

          <div className="hidden md:flex items-center gap-1">
            {primaryNavLinks.map((link: { name: string; href: string }) => (
              <NextLink
                key={link.name}
                href={link.href}
                className="px-3 py-2 text-sm text-foreground hover:bg-content2 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {link.name}
              </NextLink>
            ))}
            {mounted && isConnected && (
              <NextLink
                href="/dashboard"
                className="px-3 py-2 text-sm text-foreground hover:bg-content2 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Dashboard
              </NextLink>
            )}
          </div>

          <div className="flex items-center gap-2">
            <USDCBalance />
            <HeaderBell />
            <UnifiedDrawer />
            {mounted && (
              <button type="button"
                onClick={toggleTheme}
                className="p-2 text-foreground hover:bg-content2 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
              </button>
            )}
            <div className="hidden sm:block">
              <ConnectButton />
            </div>

            <button type="button"
              className="md:hidden p-2 text-foreground hover:bg-content2 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={toggleMenu}
              aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden border-t border-divider py-4 space-y-1">
            <div className="px-4 py-2 text-xs font-semibold text-default-500 uppercase tracking-wider">
              Discover
            </div>
            {primaryNavLinks.map(link => (
              <NextLink
                key={link.name}
                href={link.href}
                className="block px-4 py-2 text-sm text-foreground hover:bg-content2 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={closeMenu}
              >
                {link.name}
              </NextLink>
            ))}
            {mounted && isConnected && (
              <NextLink
                href="/dashboard"
                className="block px-4 py-2 text-sm text-foreground hover:bg-content2 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={closeMenu}
              >
                Dashboard
              </NextLink>
            )}
            <NextLink
              href="/onboarding"
              className="block px-4 py-2 text-sm text-default-500 hover:bg-content2 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={closeMenu}
            >
              Get Started
            </NextLink>
            <div className="sm:hidden px-4 pt-2">
              <ConnectButton />
            </div>
          </div>
        )}
      </nav>
    </header>
  );
});
