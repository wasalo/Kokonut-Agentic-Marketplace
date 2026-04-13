'use client';

import { useState, useEffect } from 'react';
import { Card } from '@heroui/react';
import { Wallet, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { OWSChain } from '@/lib/ows/types';
import { useOWSWallet } from '@/lib/hooks/useOWSWallet';
import { useOWSBalance } from '@/lib/hooks/useSignTransaction';

interface OWSWalletSelectorProps {
  selectedWalletId: string | null;
  onSelect: (walletId: string) => void;
  filterByChain?: OWSChain;
  filterByPolicy?: string;
}

export function OWSWalletSelector({
  selectedWalletId,
  onSelect,
  filterByChain,
  filterByPolicy,
}: OWSWalletSelectorProps) {
  const { wallets, loadWallets } = useOWSWallet();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  const filteredWallets = wallets.filter(w => {
    if (filterByChain && w.chain !== filterByChain) return false;
    if (filterByPolicy && w.policyId !== filterByPolicy) return false;
    return true;
  });

  const selectedWallet = wallets.find(w => w.id === selectedWalletId);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Select Wallet</label>
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full p-3 border border-divider rounded-lg text-left flex items-center justify-between hover:bg-content2"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">💼</span>
            <div>
              <p className="font-medium">
                {selectedWallet ? selectedWallet.name : 'Select OWS Wallet'}
              </p>
              {selectedWallet && (
                <p className="text-xs text-default-500 font-mono">
                  {selectedWallet.address.slice(0, 6)}...{selectedWallet.address.slice(-4)}
                </p>
              )}
            </div>
          </div>
          <span>{expanded ? '▲' : '▼'}</span>
        </button>

        {expanded && (
          <div className="border border-divider rounded-lg max-h-64 overflow-y-auto">
            {filteredWallets.length === 0 ? (
              <div className="p-4 text-center text-default-500">No OWS wallets available</div>
            ) : (
              filteredWallets.map(wallet => (
                <button
                  key={wallet.id}
                  type="button"
                  onClick={() => {
                    onSelect(wallet.id);
                    setExpanded(false);
                  }}
                  className={`w-full p-3 text-left flex items-center justify-between hover:bg-content2 ${
                    selectedWalletId === wallet.id ? 'bg-primary/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">💼</span>
                    <div>
                      <p className="font-medium">{wallet.name}</p>
                      <p className="text-xs text-default-500 font-mono">
                        {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                      </p>
                      <div className="flex gap-1 mt-1">
                        <span className="text-xs px-1.5 py-0.5 bg-default-100 rounded">
                          {wallet.chain}
                        </span>
                        {wallet.policyId && (
                          <span className="text-xs px-1.5 py-0.5 bg-secondary/20 text-secondary rounded">
                            🛡️
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {selectedWalletId === wallet.id && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))
            )}
          </div>
        )}

        {selectedWalletId && (
          <div className="text-xs text-default-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            OWS wallets use policy-based signing
          </div>
        )}
      </div>
    </div>
  );
}

interface OWSWalletInfoProps {
  walletId: string;
  showBalance?: boolean;
}

export function OWSWalletInfo({ walletId, showBalance = true }: OWSWalletInfoProps) {
  const { wallets, getPolicy } = useOWSWallet();
  const { balance, isLoading: isBalanceLoading } = useOWSBalance(walletId);

  const wallet = wallets.find(w => w.id === walletId);
  const policy = wallet?.policyId ? getPolicy(wallet.policyId) : undefined;

  if (!wallet) return null;

  return (
    <Card className="p-4 border border-divider">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">{wallet.name}</h3>
            <a
              href={`https://sepolia.etherscan.io/address/${wallet.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-default-500 hover:text-primary flex items-center gap-1"
            >
              {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {policy && (
          <div className="text-right">
            <span className="text-xs px-2 py-1 bg-secondary/20 text-secondary rounded">
              🛡️ {policy.name}
            </span>
          </div>
        )}
      </div>

      {showBalance && (
        <div className="mt-3 pt-3 border-t border-divider">
          {isBalanceLoading ? (
            <p className="text-xs text-default-500">Loading balance...</p>
          ) : (
            <div className="flex justify-between text-sm">
              <span className="text-default-500">Balance</span>
              <span className="font-medium">{Number(balance.native) / 1e18} ETH</span>
            </div>
          )}
        </div>
      )}

      <div className="mt-2 text-xs text-default-400">
        Chain: {wallet.chain} • Type: {wallet.type}
      </div>
    </Card>
  );
}
