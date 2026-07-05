'use client';

// Phase 44b (F-11): re-export of the unified `TokenPicker` for direct job funding.

import {
  TokenPicker,
  JOB_FUNDING_TOKENS,
  type TokenMeta,
} from '@/components/TokenPicker';

export type { TokenMeta as Token } from '@/components/TokenPicker';

interface JobPaymentTokenSelectorProps {
  selectedToken: TokenMeta;
  onSelect: (token: TokenMeta) => void;
  disabled?: boolean;
}

export function JobPaymentTokenSelector({
  selectedToken,
  onSelect,
  disabled,
}: JobPaymentTokenSelectorProps): JSX.Element {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Payment Token</label>
      <TokenPicker
        variant="grid"
        tokens={JOB_FUNDING_TOKENS}
        selectedToken={selectedToken}
        onSelectToken={onSelect}
        disabled={disabled}
        ariaLabel="Select job payment token"
      />
    </div>
  );
}
