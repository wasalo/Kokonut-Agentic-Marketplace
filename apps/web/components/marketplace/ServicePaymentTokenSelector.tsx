'use client';

// Phase 44b (F-11): re-export of the unified `TokenPicker` for service listings.

import {
  TokenPicker,
  SERVICE_LISTING_TOKENS,
  type TokenMeta,
} from '@/components/TokenPicker';

export type { TokenMeta as Token } from '@/components/TokenPicker';

interface ServicePaymentTokenSelectorProps {
  selectedToken: TokenMeta;
  onSelect: (token: TokenMeta) => void;
  disabled?: boolean;
}

export function ServicePaymentTokenSelector({
  selectedToken,
  onSelect,
  disabled,
}: ServicePaymentTokenSelectorProps): JSX.Element {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Payment Token</label>
      <TokenPicker
        variant="grid"
        tokens={SERVICE_LISTING_TOKENS}
        selectedToken={selectedToken}
        onSelectToken={onSelect}
        disabled={disabled}
        ariaLabel="Select service listing payment token"
      />
      <p className="text-xs text-default-500">
        Buyers pay this token into escrow when they purchase your service.
      </p>
    </div>
  );
}
