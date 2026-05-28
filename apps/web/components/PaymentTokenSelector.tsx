'use client';

import React, { useState } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { ChevronDown, DollarSign, CircleDot } from 'lucide-react';
import {
  ETH_TOKEN,
  SUPPORTED_PAYMENT_TOKENS,
  USDC_TOKEN,
  type Token,
} from '@/lib/tokenUtils';

export type { Token };
export { ETH_TOKEN, USDC_TOKEN };
export const SUPPORTED_TOKENS: Token[] = SUPPORTED_PAYMENT_TOKENS;

function getTokenIcon(symbol: Token['symbol']): React.ComponentType<{ className?: string }> {
  return symbol === 'ETH' ? CircleDot : DollarSign;
}

interface PaymentTokenSelectorProps {
  selectedToken: Token;
  onSelectToken: (token: Token) => void;
  disabled?: boolean;
  className?: string;
}

export function PaymentTokenSelector({
  selectedToken,
  onSelectToken,
  disabled = false,
  className = '',
}: PaymentTokenSelectorProps): JSX.Element {
  const { address } = useAccount();
  const [isOpen, setIsOpen] = useState(false);

  // Get balance for selected token
  useBalance({
    address: selectedToken.symbol === 'ETH' ? address : undefined,
  });

  const selectedTokenObj =
    SUPPORTED_TOKENS.find(t => t.address === selectedToken.address) || SUPPORTED_TOKENS[0];
  const Icon = getTokenIcon(selectedTokenObj.symbol);

  const handleSelect = (token: Token) => {
    onSelectToken(token);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 border rounded-lg bg-content2 text-foreground focus:outline-none focus:ring-2 focus:ring-success transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-success/50 cursor-pointer'
        } ${isOpen ? 'border-success ring-2 ring-success/20' : 'border-divider'}`}
      >
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-full bg-success/10 flex items-center justify-center">
            <Icon className="size-3.5 text-success" />
          </div>
          <span className="font-medium">{selectedTokenObj.symbol}</span>
        </div>
        <ChevronDown
          className={`size-4 text-default-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 w-full mt-1 bg-content2 border border-divider rounded-lg shadow-lg overflow-hidden">
            {SUPPORTED_TOKENS.map(token => {
              const TokenIcon = getTokenIcon(token.symbol);
              const isSelected = token.address === selectedToken.address;

              return (
                <button type="button"
                  key={token.address}
                  onClick={() => handleSelect(token)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-content3 transition-colors ${
                    isSelected ? 'bg-success/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-full bg-success/10 flex items-center justify-center">
                      <TokenIcon className="size-3.5 text-success" />
                    </div>
                    <div className="text-left">
                      <span className="font-medium text-sm">{token.symbol}</span>
                      <p className="text-xs text-default-400">{token.name}</p>
                    </div>
                  </div>
                  {isSelected && <div className="size-2 rounded-full bg-success" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function PaymentTokenBadge({ token }: { token: Token }): JSX.Element {
  const tokenObj = SUPPORTED_TOKENS.find(t => t.address === token.address) || token;
  const Icon = getTokenIcon(tokenObj.symbol);

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-medium">
      <Icon className="size-3" />
      {tokenObj.symbol}
    </span>
  );
}

export default PaymentTokenSelector;
