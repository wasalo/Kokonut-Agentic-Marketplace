'use client';

// Phase 44b (F-11): This file is now a thin re-export of the unified `TokenPicker`.
// Existing imports of `PaymentTokenSelector`, `PaymentTokenBadge`, `SUPPORTED_TOKENS`,
// `Token`, `ETH_TOKEN`, and `USDC_TOKEN` continue to work unchanged.

import {
  TokenPicker,
  TokenPickerBadge as PaymentTokenBadge,
  ETH_TOKEN,
  USDC_TOKEN,
  ALL_TOKENS,
  type TokenMeta,
} from '@/components/TokenPicker';

export { PaymentTokenBadge };
export type { TokenMeta as Token } from '@/components/TokenPicker';
export { ETH_TOKEN, USDC_TOKEN };
export const SUPPORTED_TOKENS: TokenMeta[] = Object.values(ALL_TOKENS);

interface LegacyPaymentTokenSelectorProps {
  selectedToken: TokenMeta;
  onSelectToken: (token: TokenMeta) => void;
  disabled?: boolean;
  className?: string;
}

export function PaymentTokenSelector({
  selectedToken,
  onSelectToken,
  disabled = false,
  className = '',
}: LegacyPaymentTokenSelectorProps): JSX.Element {
  return (
    <TokenPicker
      variant="dropdown"
      selectedToken={selectedToken}
      onSelectToken={onSelectToken}
      disabled={disabled}
      className={className}
      tokens={SUPPORTED_TOKENS}
      ariaLabel="Select payment token"
    />
  );
}

export default PaymentTokenSelector;
