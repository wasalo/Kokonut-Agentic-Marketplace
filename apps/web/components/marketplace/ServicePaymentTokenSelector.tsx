'use client';

import { Coins } from 'lucide-react';
import {
  SERVICE_LISTING_PAYMENT_TOKENS,
  Token,
  useTokenPriceConversion,
} from '@/lib/hooks/useTokenConversion';

interface PaymentTokenSelectorProps {
  selectedToken: Token;
  onSelect: (token: Token) => void;
  disabled?: boolean;
}

export function ServicePaymentTokenSelector({
  selectedToken,
  onSelect,
  disabled,
}: PaymentTokenSelectorProps) {
  const { ethToUsdcRate, isLoading: isRateLoading } = useTokenPriceConversion();

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Payment Token</label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SERVICE_LISTING_PAYMENT_TOKENS.map(token => (
          <button
            type="button"
            key={token.symbol}
            onClick={() => onSelect(token)}
            disabled={disabled}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedToken.symbol === token.symbol
                ? 'border-success bg-success/5'
                : 'border-divider hover:border-default-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`size-10 rounded-full flex items-center justify-center ${
                  token.symbol === 'USDC' ? 'bg-[#2775CA]' : 'bg-[#627EEA]'
                }`}
              >
                <Coins className="size-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-medium">{token.symbol}</p>
                <p className="text-xs text-default-500">{token.name}</p>
              </div>
            </div>
            {isRateLoading && token.symbol === 'ETH' && (
              <p className="text-xs text-default-400 mt-2 text-left">Loading rate...</p>
            )}
            {ethToUsdcRate && token.symbol === 'ETH' && (
              <p className="text-xs text-default-400 mt-2 text-left">
                1 ETH ~= ${ethToUsdcRate.toFixed(2)}
              </p>
            )}
          </button>
        ))}
      </div>
      <p className="text-xs text-default-500">
        Buyers pay this token into escrow when they purchase your service.
      </p>
    </div>
  );
}
