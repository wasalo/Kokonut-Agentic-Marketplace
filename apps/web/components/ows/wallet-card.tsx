'use client';

import { useState } from 'react';
import { OWSWallet, OWSPolicy } from '@/lib/ows/types';
import { useOWSWallet } from '@/lib/hooks/useOWSWallet';

interface WalletCardProps {
  wallet: OWSWallet;
  policy?: OWSPolicy;
  isActive?: boolean;
  onSetActive?: () => void;
  onDelete?: () => void;
}

export function WalletCard({
  wallet,
  policy,
  isActive = false,
  onSetActive,
  onDelete,
}: WalletCardProps) {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getChainColor = (chain: string): string => {
    const colors: Record<string, string> = {
      sepolia: 'bg-warning/20 text-warning',
      ethereum: 'bg-default-100 text-default-600',
      polygon: 'bg-secondary/20 text-secondary',
      arbitrum: 'bg-danger/20 text-danger',
      optimism: 'bg-success/20 text-success',
      bsc: 'bg-warning/20 text-warning',
      avalanche: 'bg-danger/20 text-danger',
    };
    return colors[chain] || 'bg-default-100 text-default-600';
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className={`p-4 border rounded-lg ${isActive ? 'border-primary' : 'border-divider'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${isActive ? 'bg-primary/20' : 'bg-default-100'}`}>
            <span className="text-lg">💼</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{wallet.name}</h3>
              {isActive && (
                <span className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
                  Active
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-sm text-default-500 font-mono">
                {formatAddress(wallet.address)}
              </code>
              <button onClick={handleCopy} className="p-1 hover:bg-content2 rounded">
                {copied ? (
                  <span className="text-xs text-success">✓</span>
                ) : (
                  <span className="text-sm">📋</span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-1 text-xs rounded ${getChainColor(wallet.chain)}`}>
            {wallet.chain}
          </span>
          <span
            className={`px-2 py-1 text-xs rounded ${wallet.type === 'generated' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}
          >
            🔑 {wallet.type}
          </span>
          {policy && (
            <span className="px-2 py-1 text-xs rounded bg-secondary/20 text-secondary">
              🛡️ {policy.name}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-divider">
        <div className="text-xs text-default-400">
          Created: {new Date(wallet.createdAt).toLocaleDateString()}
          {wallet.lastUsedAt !== wallet.createdAt && (
            <span className="ml-2">
              • Last used: {new Date(wallet.lastUsedAt).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isActive && onSetActive && (
            <button
              onClick={onSetActive}
              className="px-3 py-1 text-sm border border-divider rounded hover:bg-content2"
            >
              Set Active
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-content2 rounded"
            >
              ⋮
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-content2 border border-divider rounded-lg shadow-lg py-1 min-w-[120px] z-10">
                <button
                  onClick={() => {
                    onDelete?.();
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-danger hover:bg-content3 flex items-center gap-2"
                >
                  🗑️ Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface WalletListProps {
  onCreateWallet?: () => void;
  onImportWallet?: () => void;
}

export function WalletList({ onCreateWallet, onImportWallet }: WalletListProps) {
  const { wallets, activeWallet, setActiveWallet, deleteWallet, getPolicy } = useOWSWallet();

  if (wallets.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="text-4xl block mb-4">💼</span>
        <h3 className="text-lg font-medium text-default-600 mb-2">No wallets yet</h3>
        <p className="text-default-400 mb-4">Create a wallet to get started with OWS</p>
        <div className="flex justify-center gap-2">
          {onCreateWallet && (
            <button
              onClick={onCreateWallet}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600"
            >
              Create Wallet
            </button>
          )}
          {onImportWallet && (
            <button
              onClick={onImportWallet}
              className="px-4 py-2 border border-divider rounded-lg hover:bg-content2"
            >
              Import Wallet
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {wallets.map(wallet => {
        const policy = wallet.policyId ? getPolicy(wallet.policyId) : undefined;
        return (
          <WalletCard
            key={wallet.id}
            wallet={wallet}
            policy={policy}
            isActive={activeWallet?.id === wallet.id}
            onSetActive={() => setActiveWallet(wallet.id)}
            onDelete={() => deleteWallet(wallet.id)}
          />
        );
      })}
    </div>
  );
}
