'use client';

import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, Check, Globe } from 'lucide-react';
import { SUPPORTED_CHAINS, getChainById, getDefaultChain } from '@/lib/chains';
import { isChainDeployed } from '@/lib/contracts/config';
import { cn } from '@/lib/utils';

export function NetworkSelector({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentChainId = parseInt(searchParams.get('chainId') || '11155111', 10);
  const currentChain = getChainById(currentChainId) || getDefaultChain();

  const handleSelect = useCallback(
    (chainId: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('chainId', String(chainId));
      router.push(`${pathname}?${params.toString()}`);
      setIsOpen(false);
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const deployedChains = useMemo(() => SUPPORTED_CHAINS.filter(c => isChainDeployed(c.id)), []);

  const upcomingChains = useMemo(
    () => SUPPORTED_CHAINS.filter(c => c.id !== currentChainId && !isChainDeployed(c.id)),
    [currentChainId]
  );

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-divider hover:bg-content2 transition-colors min-w-[140px] justify-between"
      >
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentChain.color }} />
          <span className="text-sm font-medium">{currentChain.name}</span>
        </div>
        <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 right-0 w-56 bg-content1 border border-divider rounded-lg shadow-lg z-50 overflow-hidden">
          {/* Currently selected */}
          <div className="px-3 py-2 border-b border-divider">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: currentChain.color }}
              />
              <span className="text-sm font-medium">{currentChain.name}</span>
              {currentChain.isTestnet && <span className="text-xs text-default-400">Testnet</span>}
            </div>
          </div>

          {/* Deployed chains */}
          {deployedChains.length > 0 && (
            <div className="p-1">
              <div className="px-2 py-1 text-xs text-default-400 font-medium">Deployed</div>
              {deployedChains.map(chain => (
                <button
                  key={chain.id}
                  onClick={() => handleSelect(chain.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left hover:bg-content2 transition-colors',
                    chain.id === currentChainId && 'bg-content2'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: chain.color }}
                    />
                    <span className="text-sm">{chain.name}</span>
                  </div>
                  {isChainDeployed(chain.id) && <Check className="w-3 h-3 text-success" />}
                </button>
              ))}
            </div>
          )}

          {/* Upcoming chains */}
          {upcomingChains.length > 0 && (
            <div className="p-1 border-t border-divider">
              <div className="px-2 py-1 text-xs text-default-400 font-medium">Coming Soon</div>
              {upcomingChains.slice(0, 5).map(chain => (
                <button
                  key={chain.id}
                  onClick={() => handleSelect(chain.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-content2 transition-colors opacity-60"
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chain.color }} />
                  <span className="text-sm">{chain.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Simple network badge
export function NetworkBadge({
  chainId,
  showStatus = false,
  className,
}: {
  chainId: number;
  showStatus?: boolean;
  className?: string;
}) {
  const chain = getChainById(chainId);
  const isDeployed = isChainDeployed(chainId);

  if (!chain) return null;

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: chain.color }} />
      <span className="text-sm font-medium">{chain.name}</span>
      {showStatus &&
        (isDeployed ? (
          <Check className="w-3 h-3 text-success" />
        ) : (
          <span className="text-xs text-default-400">(soon)</span>
        ))}
    </div>
  );
}

export default NetworkSelector;
