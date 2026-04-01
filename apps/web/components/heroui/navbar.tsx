'use client';

import { Menu, X, ChevronDown, Wallet } from 'lucide-react';
import { useState, useCallback, Component, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import NextLink from 'next/link';
import { useAccount } from 'wagmi';
import { useUSDCBalance } from '@/lib/hooks/useUSDC';

// Error boundary for wallet components
class WalletErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <button
          disabled
          className="px-4 py-2 text-sm font-medium text-default-500 bg-content2 rounded-lg opacity-50 cursor-not-allowed"
        >
          Wallet Unavailable
        </button>
      );
    }

    return this.props.children;
  }
}

const ConnectButton = dynamic(
  () => import('@rainbow-me/rainbowkit').then(mod => mod.ConnectButton),
  { ssr: false }
);

function USDCBalance() {
  const { address } = useAccount();
  const { formattedBalance, isLoading } = useUSDCBalance(address);

  if (!address || isLoading || !formattedBalance) return null;

  return (
    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-success/10 text-success rounded-full text-sm font-medium">
      <Wallet className="w-3.5 h-3.5" />
      {Number(formattedBalance).toFixed(2)} USDC
    </div>
  );
}

const publicNavLinks = [
  { name: 'Identity', href: '/identity' },
  { name: 'Marketplace', href: '/marketplace' },
  { name: 'Jobs', href: '/jobs' },
];

const privateNavLinks = [{ name: 'Dashboard', href: '/dashboard' }];

const moreLinks = [
  { name: 'Review', href: '/review' },
  { name: 'Skills', href: '/skills' },
  { name: 'About', href: '/about' },
];

export function NavbarComponent(): JSX.Element {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isConnected } = useAccount();

  const toggleMenu = useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  // Combine public links with private links only when connected
  const navLinks = isConnected ? [...publicNavLinks, ...privateNavLinks] : publicNavLinks;

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-divider">
      <nav className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <NextLink href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#009F4D] to-[#FFCD00] flex items-center justify-center">
              <span className="text-white font-bold text-sm">KK</span>
            </div>
            <span className="font-bold text-lg hidden sm:block">Kokonut</span>
          </NextLink>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link: { name: string; href: string }) => (
              <NextLink
                key={link.name}
                href={link.href}
                className="px-3 py-2 text-sm text-foreground hover:bg-content2 rounded-lg transition-colors"
              >
                {link.name}
              </NextLink>
            ))}
            <div className="relative group">
              <button className="flex items-center gap-1 px-3 py-2 text-sm text-foreground hover:bg-content2 rounded-lg transition-colors">
                More
                <ChevronDown className="w-3 h-3" />
              </button>
              <div className="absolute top-full left-0 pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <div className="bg-content2 border border-divider rounded-lg shadow-lg py-1 min-w-[140px]">
                  {moreLinks.map(link => (
                    <NextLink
                      key={link.name}
                      href={link.href}
                      className="block px-4 py-2 text-sm text-foreground hover:bg-content3 transition-colors"
                    >
                      {link.name}
                    </NextLink>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <USDCBalance />
            <div className="hidden sm:block">
              <WalletErrorBoundary>
                <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
              </WalletErrorBoundary>
            </div>

            <button
              className="md:hidden p-2 text-foreground hover:bg-content2 rounded-lg transition-colors"
              onClick={toggleMenu}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden border-t border-divider py-4 space-y-1">
            {navLinks.map((link: { name: string; href: string }) => (
              <NextLink
                key={link.name}
                href={link.href}
                className="block px-4 py-2 text-foreground hover:bg-content2 rounded-lg transition-colors"
                onClick={closeMenu}
              >
                {link.name}
              </NextLink>
            ))}
            {moreLinks.map(link => (
              <NextLink
                key={link.name}
                href={link.href}
                className="block px-4 py-2 text-foreground hover:bg-content2 rounded-lg transition-colors"
                onClick={closeMenu}
              >
                {link.name}
              </NextLink>
            ))}
            <div className="pt-4 px-4">
              <WalletErrorBoundary>
                <ConnectButton />
              </WalletErrorBoundary>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
