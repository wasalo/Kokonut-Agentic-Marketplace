'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '@heroui/react';
import { OWSWalletSelector, OWSWalletInfo } from '@/components/ows/wallet-selector';
import { useOWSWallet } from '@/lib/hooks/useOWSWallet';
import { useSignTransaction } from '@/lib/hooks/useSignTransaction';
import { OWSChain } from '@/lib/ows/types';
import { formatUnits } from 'viem';
import { CONTRACT_ADDRESSES } from '@/lib/contracts/config';

interface OWSFundJobButtonProps {
  jobId: bigint;
  budget: bigint;
  paymentToken: `0x${string}`;
  onSuccess?: () => void;
}

export function OWSFundJobButton({
  jobId,
  budget,
  paymentToken,
  onSuccess,
}: OWSFundJobButtonProps) {
  const { wallets, loadWallets, activeWallet } = useOWSWallet();
  const { sign, isSigning, error: signError } = useSignTransaction();

  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [isOWSMode, setIsOWSMode] = useState(false);
  const [status, setStatus] = useState<'idle' | 'signing' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  useEffect(() => {
    if (activeWallet && !selectedWalletId) {
      setSelectedWalletId(activeWallet.id);
    }
  }, [activeWallet, selectedWalletId]);

  const sepoliaWallets = wallets.filter(w => w.chain === 'sepolia');

  const handleFundWithOWS = async () => {
    if (!selectedWalletId) return;

    setStatus('signing');

    try {
      const agenticCommerceAddress = CONTRACT_ADDRESSES.sepolia.agenticCommerce as `0x${string}`;

      const result = await sign({
        walletId: selectedWalletId,
        to: agenticCommerceAddress,
        value: paymentToken === '0x0000000000000000000000000000000000000000' ? budget : undefined,
        data: paymentToken !== '0x0000000000000000000000000000000000000000' ? undefined : undefined,
        chain: 'sepolia',
        metadata: { jobId: jobId.toString(), action: 'fundJob' },
      });

      if (result.success) {
        setStatus('success');
        onSuccess?.();
      } else {
        setStatus('error');
      }
    } catch (err) {
      setStatus('error');
    }
  };

  const selectedWallet = wallets.find(w => w.id === selectedWalletId);

  return (
    <Card className="p-4 border border-primary/30 bg-primary/5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Fund with OWS Wallet</h3>
          <p className="text-xs text-default-500">Use policy-controlled agent wallet</p>
        </div>
        <button
          onClick={() => setIsOWSMode(!isOWSMode)}
          className="text-xs text-primary hover:underline"
        >
          {isOWSMode ? 'Use Regular Wallet' : 'Use OWS Wallet'}
        </button>
      </div>

      {isOWSMode && (
        <div className="space-y-4">
          <OWSWalletSelector
            selectedWalletId={selectedWalletId}
            onSelect={setSelectedWalletId}
            filterByChain="sepolia"
          />

          {selectedWallet && selectedWalletId && (
            <OWSWalletInfo walletId={selectedWalletId} showBalance />
          )}

          {selectedWallet && (
            <button
              onClick={handleFundWithOWS}
              disabled={status === 'signing'}
              className="w-full flex items-center gap-3 p-4 border border-success/30 rounded-lg hover:bg-success/5 transition-colors disabled:opacity-50"
            >
              {status === 'signing' ? (
                <Loader2 className="w-5 h-5 animate-spin text-success" />
              ) : status === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-success" />
              ) : status === 'error' ? (
                <AlertCircle className="w-5 h-5 text-danger" />
              ) : (
                <span className="text-lg">💼</span>
              )}
              <div className="text-left">
                <p className="font-medium">Sign & Fund Job</p>
                <p className="text-xs text-default-500">
                  {Number(formatUnits(budget, 6))} USDC via OWS policy
                </p>
              </div>
            </button>
          )}

          {signError && <p className="text-danger text-sm">{signError}</p>}

          {sepoliaWallets.length === 0 && (
            <p className="text-warning text-sm">
              No Sepolia OWS wallets found. Create one at /dashboard/wallets
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
