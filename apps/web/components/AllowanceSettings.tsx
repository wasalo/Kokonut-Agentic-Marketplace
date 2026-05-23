'use client';

import { useState } from 'react';
import { Card, CardHeader } from '@heroui/react';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAllowance } from '@/lib/hooks/useAllowance';
import { useTransactionLifecycle } from '@/lib/hooks/useTransactionLifecycle';
import { simulateUnlimitedUsdcApprove } from '@/lib/simulation';
import { getContractAddress } from '@/lib/contracts/config';

interface AllowanceSettingsProps {
  token: `0x${string}`;
}

export function AllowanceSettings({ token }: AllowanceSettingsProps) {
  const [mode, setMode] = useState<'per-transaction' | 'unlimited'>('per-transaction');
  const AGENTIC_COMMERCE = getContractAddress('AGENTIC_COMMERCE');
  const { allowance, isUnlimited, approveUnlimited } = useAllowance(
    token,
    AGENTIC_COMMERCE
  );
  const { execute } = useTransactionLifecycle();

  const handleApproveUnlimited = async () => {
    await execute({
      type: 'usdc-approve',
      description: 'Approve unlimited USDC for marketplace',
      targetContract: token,
      writeFn: () => approveUnlimited(),
      simulation: () => simulateUnlimitedUsdcApprove({ spender: AGENTIC_COMMERCE }),
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Token Allowance</h3>
        </div>
      </CardHeader>
      <div className="p-4 space-y-4">
        <p className="text-sm text-default-500">
          Control how much USDC the marketplace contract can spend on your behalf.
        </p>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Approval mode</p>
            <p className="text-sm text-default-500">
              {mode === 'unlimited'
                ? 'Approve once, transact freely (convenient)'
                : 'Approve per-transaction (safer)'}
            </p>
          </div>
          <button
            onClick={() => setMode(mode === 'unlimited' ? 'per-transaction' : 'unlimited')}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              mode === 'unlimited' ? 'bg-primary' : 'bg-default-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                mode === 'unlimited' ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="h-px bg-divider" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isUnlimited ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            )}
            <div>
              <p className="font-medium">Current allowance</p>
              <p className="text-sm text-default-500">
                {isUnlimited
                  ? 'Unlimited'
                  : allowance
                    ? `${allowance.toString()} units`
                    : 'None'}
              </p>
            </div>
          </div>
          {!isUnlimited && mode === 'unlimited' && (
            <button
              onClick={handleApproveUnlimited}
              className="px-3 py-1.5 text-sm bg-primary hover:bg-primary-600 text-white rounded-lg transition-colors"
            >
              Approve Unlimited
            </button>
          )}
        </div>

        {isUnlimited && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
              <p className="text-sm text-amber-300">
                Unlimited approval is convenient but carries risk if the contract is compromised.
                You can revoke this anytime.
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
