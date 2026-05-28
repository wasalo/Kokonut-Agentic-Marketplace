'use client';

import { Card } from '@heroui/react';
import { Loader2 } from 'lucide-react';
import { PaymentTokenSelector, type Token } from '@/components/PaymentTokenSelector';
import { type Job } from '@/lib/hooks/useJobs';

interface PaymentTokenSetupModalProps {
  job: Job;
  selectedPaymentToken: Token;
  setSelectedPaymentToken: (token: Token) => void;
  onSetup: () => void;
  isPending: boolean;
  onClose: () => void;
}

export function PaymentTokenSetupModal({
  job: _job,
  selectedPaymentToken,
  setSelectedPaymentToken,
  onSetup,
  isPending,
  onClose,
}: PaymentTokenSetupModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6">
        <h2 className="text-lg font-semibold mb-4">Set Payment Token</h2>
        <p className="text-sm text-default-500 mb-4">
          Choose a payment token for this job.
        </p>
        <PaymentTokenSelector
          selectedToken={selectedPaymentToken}
          onSelectToken={setSelectedPaymentToken}
        />
        <div className="flex gap-3 mt-6">
          <button type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-divider rounded-lg text-sm font-medium hover:bg-content2"
          >
            Cancel
          </button>
          <button type="button"
            onClick={onSetup}
            disabled={isPending}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="size-4 animate-spin mx-auto" /> : 'Set Token & Fund'}
          </button>
        </div>
      </Card>
    </div>
  );
}
