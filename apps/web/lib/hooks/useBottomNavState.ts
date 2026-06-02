'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useAccount, useConnect } from 'wagmi';
import { useActionQueue } from '@/lib/hooks/useActionQueue';
import { useTransactionRegistry } from '@/lib/stores/transactionRegistry';
import { useAgenticCommerceOwner } from '@/lib/hooks/useAgenticCommerceAdmin';

export type BottomNavTab = 'market' | 'work' | 'activity' | 'notifications' | 'profile';

export interface BottomNavState {
  activeTab: BottomNavTab | null;
  isConnected: boolean;
  pendingTxCount: number;
  unreadCount: number;
  isAdmin: boolean;
  shortAddress: string | null;
  connect: (() => void) | null;
}

const PREFIX_MAP: Array<{ tab: BottomNavTab; prefixes: string[]; queryTab?: string }> = [
  { tab: 'market', prefixes: ['/marketplace'] },
  { tab: 'work', prefixes: ['/marketplace'], queryTab: 'my-work' },
  { tab: 'activity', prefixes: ['/activity'] },
  { tab: 'notifications', prefixes: ['/notifications'] },
  { tab: 'profile', prefixes: ['/dashboard/agents', '/identity'] },
];

function matchActiveTab(pathname: string | null, queryTab: string | null): BottomNavTab | null {
  if (!pathname) return null;
  for (const { tab, prefixes, queryTab: requiredTab } of PREFIX_MAP) {
    if (!prefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))) continue;
    if (requiredTab) {
      if (pathname === '/marketplace' && queryTab === requiredTab) return tab;
      continue;
    }
    if (pathname === '/marketplace' && queryTab === 'my-work') continue;
    return tab;
  }
  return null;
}

function shortAddress(addr: string | undefined): string | null {
  if (!addr) return null;
  return addr.slice(2, 5).toUpperCase();
}

export function useBottomNavState(): BottomNavState {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isConnected, address } = useAccount();
  const { connect: wagmiConnect, connectors } = useConnect();
  const { totalCount: unreadCount } = useActionQueue();
  const transactions = useTransactionRegistry((s) => s.transactions);
  const { owner } = useAgenticCommerceOwner();

  const queryTab = searchParams?.get('tab') ?? null;
  const activeTab = matchActiveTab(pathname, queryTab);
  const pendingTxCount = transactions.filter(
    (tx) => tx.status === 'pending' || tx.status === 'confirming' || tx.status === 'awaiting-signature'
  ).length;

  const isAdmin = Boolean(
    owner && address && owner.toLowerCase() === address.toLowerCase()
  );

  const connect =
    !isConnected && connectors.length > 0
      ? () => {
          const injected = connectors.find((c) => c.id === 'injected' || c.id === 'metaMask');
          const target = injected ?? connectors[0];
          wagmiConnect({ connector: target });
        }
      : null;

  return {
    activeTab,
    isConnected,
    pendingTxCount,
    unreadCount,
    isAdmin,
    shortAddress: shortAddress(address),
    connect,
  };
}
