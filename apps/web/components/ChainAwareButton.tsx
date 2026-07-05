'use client';

import { useAccount, useChainId } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import type { ButtonHTMLAttributes } from 'react';

interface ChainAwareButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  requiredChainId?: number;
  children: React.ReactNode;
}

export function ChainAwareButton({
  requiredChainId = sepolia.id,
  children,
  ...buttonProps
}: ChainAwareButtonProps) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const isWrongChain = isConnected && chainId !== requiredChainId;

  if (isWrongChain) {
    return (
      <span className="inline-block" title="Switch to Sepolia to continue">
        <button type="button"
          {...buttonProps}
          disabled
          className={`opacity-50 cursor-not-allowed ${buttonProps.className || ''}`}
        >
          {children}
        </button>
      </span>
    );
  }

  return <button type="button" {...buttonProps}>{children}</button>;
}
