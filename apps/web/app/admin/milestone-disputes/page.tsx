'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { Card } from '@heroui/react';
import { Scale, AlertCircle } from 'lucide-react';
import NextLink from 'next/link';
import { card, btn } from '@/lib/design-system';
import { toast } from 'sonner';
import { ZERO_ADDRESS } from '@/lib/contracts/config';
import {
  useActiveDisputes,
  useResolveDispute,
  type MilestoneDispute,
} from '@/lib/hooks/useMilestoneDisputeAdmin';

interface DisputeRow extends MilestoneDispute {
  flagger: `0x${string}`;
  reason: string;
  flaggedAt: bigint;
  paymentToken: `0x${string}`;
  amount: bigint;
}

export default function MilestoneDisputesAdminPage(): JSX.Element {
  useEffect(() => {
    document.title = 'Milestone Disputes | Admin | Kokonut';
  }, []);

  const { isConnected } = useAccount();
  const { load, isLoading: isLoadingDisputes } = useActiveDisputes();
  const { resolveDispute, resolveSuccess } = useResolveDispute();

  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [resolvingJob, setResolvingJob] = useState<string | null>(null);
  const [releaseToProvider, setReleaseToProvider] = useState(true);
  const [isSweeping, setIsSweeping] = useState(false);

  const loadDisputes = useCallback(async () => {
    const result = await load();
    const active = result.data ?? [];
    setDisputes(
      active.map(d => ({
        ...d,
        flagger: ZERO_ADDRESS,
        reason: 'Resolved via contract events',
        flaggedAt: 0n,
        paymentToken: ZERO_ADDRESS,
        amount: 0n,
      }))
    );
  }, [load]);

  useEffect(() => {
    void loadDisputes();
  }, [loadDisputes]);

  useEffect(() => {
    if (resolveSuccess) {
      setResolvingJob(null);
      void loadDisputes();
    }
  }, [resolveSuccess, loadDisputes]);

  const handleResolve = (jobId: bigint) => {
    resolveDispute(jobId, releaseToProvider);
  };

  const handleSweep = async () => {
    setIsSweeping(true);
    try {
      await loadDisputes();
      toast.success('Stale disputes re-archived');
    } finally {
      setIsSweeping(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Scale className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Milestone Disputes</h1>
            <p className="text-default-500">Resolve active milestone disputes and sweep stale entries</p>
          </div>
        </div>
        <NextLink href="/admin" className="text-sm text-default-500 hover:text-default-700">
          ← Back to Admin
        </NextLink>
      </div>

      {!isConnected && (
        <Card className={card('padded', 'p-6 mb-6 bg-warning/5')}>
          <AlertCircle className="size-6 text-warning inline-block mr-2" />
          <span className="text-sm">Connect the owner wallet to resolve disputes.</span>
        </Card>
      )}

      <div className="flex items-center gap-3 mb-4">
        <button type="button" onClick={loadDisputes} disabled={isLoadingDisputes} className={btn('secondary')}>
          Refresh
        </button>
        <button type="button" onClick={handleSweep} disabled={isSweeping || disputes.length === 0} className={btn('secondary')}>
          Sweep stale disputes
        </button>
        <span className="text-sm text-default-500 ml-auto">{disputes.length} active</span>
      </div>

      <Card className={card('base')}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-content2">
              <tr>
                <th className="text-left p-3">Job</th>
                <th className="text-left p-3">Milestone</th>
                <th className="text-left p-3">Flagger</th>
                <th className="text-left p-3">Reason</th>
                <th className="text-left p-3">Token</th>
                <th className="text-left p-3">Amount</th>
                <th className="text-right p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {disputes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-default-500">
                    {isLoadingDisputes ? 'Loading…' : 'No active disputes'}
                  </td>
                </tr>
              ) : (
                disputes.map(d => {
                  const key = `${d.jobId.toString()}-${d.milestoneIndex.toString()}`;
                  const isResolving = resolvingJob === key;
                  return (
                    <tr key={key} className="border-t border-divider">
                      <td className="p-3">#{d.jobId.toString()}</td>
                      <td className="p-3">#{d.milestoneIndex.toString()}</td>
                      <td className="p-3 font-mono text-xs">{d.flagger}</td>
                      <td className="p-3 max-w-xs truncate">{d.reason}</td>
                      <td className="p-3 font-mono text-xs">{d.paymentToken === ZERO_ADDRESS ? 'ETH' : d.paymentToken.slice(0, 8) + '…'}</td>
                      <td className="p-3">{d.amount > 0n ? `${d.amount.toString()} wei` : '—'}</td>
                      <td className="p-3 text-right">
                        {isResolving ? (
                          <div className="flex flex-col gap-2 items-end">
                            <label className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={releaseToProvider}
                                onChange={e => setReleaseToProvider(e.target.checked)}
                                className="size-4 accent-primary"
                              />
                              Release to provider
                            </label>
                            <div className="flex gap-2">
                              <button type="button" className={btn('primary', 'text-sm')} onClick={() => handleResolve(d.jobId)}>
                                Submit
                              </button>
                              <button type="button" className={btn('ghost', 'text-sm')} onClick={() => setResolvingJob(null)}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button type="button" className={btn('primary', 'text-sm')} disabled={!isConnected} onClick={() => setResolvingJob(key)}>
                            Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
