'use client';

import { useAccount, useSwitchChain } from 'wagmi';
import { useChainId } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export function NetworkGuard() {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const isCorrectChain = chainId === sepolia.id;

  if (!isConnected) return null;
  if (isCorrectChain) {
    return (
      <div className="bg-green-500/10 border-b border-green-500/20 px-4 py-1 text-xs text-green-400 flex items-center justify-center gap-2">
        <CheckCircle className="size-3" />
        Connected to Sepolia Testnet
      </div>
    );
  }

  return (
    <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 flex items-center justify-center gap-3">
      <AlertTriangle className="size-4 text-red-400" />
      <span className="text-sm text-red-300">
        Wrong network: switch to Sepolia to use Kokonut
      </span>
      <button type="button"
        onClick={() => switchChain?.({ chainId: sepolia.id })}
        className="px-3 py-1.5 text-sm bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
      >
        Switch Network
      </button>
    </div>
  );
}
