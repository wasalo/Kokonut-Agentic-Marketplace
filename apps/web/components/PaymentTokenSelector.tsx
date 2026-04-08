'use client';

import React, { useState } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { ChevronDown, DollarSign, CircleDot } from 'lucide-react';
import { CONTRACTS } from '@/lib/wagmi';

export interface Token {
  symbol: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
  icon: React.ComponentType<{ className?: string }>;
}

export const USDC_TOKEN: Token = {
  symbol: 'USDC',
  name: 'USD Coin',
  address: CONTRACTS[11155111].usdc as `0x${string}`,
  decimals: 6,
  icon: DollarSign,
};

export const ETH_TOKEN: Token = {
  symbol: 'ETH',
  name: 'Ethereum',
  address: '0x0000000000000000000000000000000000000000',
  decimals: 18,
  icon: CircleDot,
};

export const SUPPORTED_TOKENS: Token[] = [USDC_TOKEN, ETH_TOKEN];

export interface PaymentTokenSelectorProps {
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
  const Icon = selectedTokenObj.icon;

  const handleSelect = (token: Token) => {
    onSelectToken(token);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 border rounded-lg bg-content2 text-foreground focus:outline-none focus:ring-2 focus:ring-success transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-success/50 cursor-pointer'
        } ${isOpen ? 'border-success ring-2 ring-success/20' : 'border-divider'}`}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-success" />
          </div>
          <span className="font-medium">{selectedTokenObj.symbol}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-default-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 w-full mt-1 bg-content2 border border-divider rounded-lg shadow-lg overflow-hidden">
            {SUPPORTED_TOKENS.map(token => {
              const TokenIcon = token.icon;
              const isSelected = token.address === selectedToken.address;

              return (
                <button
                  key={token.address}
                  type="button"
                  onClick={() => handleSelect(token)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-content3 transition-colors ${
                    isSelected ? 'bg-success/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center">
                      <TokenIcon className="w-3.5 h-3.5 text-success" />
                    </div>
                    <div className="text-left">
                      <span className="font-medium text-sm">{token.symbol}</span>
                      <p className="text-xs text-default-400">{token.name}</p>
                    </div>
                  </div>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-success" />}
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
  const Icon = tokenObj.icon;

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-medium">
      <Icon className="w-3 h-3" />
      {tokenObj.symbol}
    </span>
  );
}

export function useTokenBalance(token: Token | undefined, address: `0x${string}` | undefined) {
  const isETH = token?.symbol === 'ETH';

  const { data: ethBalance, isLoading: isEthLoading } = useBalance({
    address: isETH ? address : undefined,
  });

  // Format ETH balance manually since 'formatted' property may not be in type
  const formattedEthBalance = ethBalance
    ? formatUnits(ethBalance.value, ethBalance.decimals)
    : undefined;

  // For USDC and other ERC20 tokens, we'd need to use useReadContract
  // For now, return formatted ETH balance
  return {
    balance: isETH ? ethBalance?.value : undefined,
    formattedBalance: isETH ? formattedEthBalance : undefined,
    symbol: isETH ? 'ETH' : token?.symbol,
    isLoading: isEthLoading,
  };
}

export default PaymentTokenSelector;
