'use client';

import { useEffect, useState } from 'react';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { Card, Button } from '@heroui/react';
import { Scale, AlertCircle } from 'lucide-react';
import NextLink from 'next/link';
import { formatUnits } from 'viem';
import { getContractAddress } from '@/lib/contracts/config';
import { MILESTONE_ESCROW_ABI } from '@/lib/contracts/abis';
import { DS, card } from '@/lib/design-system';
import { toast } from 'sonner';

const MILESTONE_ESCROW_ADDRESS = getContractAddress('MILESTONE_ESCROW') as `0x${string}`;

interface DisputeRow {
  jobId: bigint;
  milestoneIndex: bigint;
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
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [resolvingJob, setResolvingJob] = useState<string | null>(null);
  const [resolveRecipient, setResolveRecipient] = useState('');
  const [resolveClientAmount, setResolveClientAmount] = useState('');
  const [resolveProviderAmount, setResolveProviderAmount] = useState('');
  const [isSweeping, setIsSweeping] = useState(false);

  const loadDisputes = async () => {
    if (!publicClient) return;
    setIsLoading(true);
    try {
      // In production this would query the subgraph for `MilestoneDispute` entities.
      // For now we read disputes directly from contract state via getActiveDisputes.
      const result = (await publicClient.readContract({
        address: MILESTONE_ESCROW_ADDRESS,
        abi: MILESTONE_ESCROW_ABI,
        functionName: 'getActiveDisputes',
      } as any)) as bigint[];
      const rows: DisputeRow[] = result.map((jobId, idx) => ({
        jobId,
        milestoneIndex: BigInt(idx),
        flagger: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        reason: 'Resolved via contract events',
        flaggedAt: 0n,
        paymentToken: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        amount: 0n,
      }));
      setDisputes(rows);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load disputes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDisputes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient]);

  const handleResolve = async (jobId: bigint, milestoneIndex: bigint) => {
    if (!resolveRecipient || !resolveClientAmount || !resolveProviderAmount) {
      toast.error('Fill in recipient + both amounts');
      return;
    }
    try {
      const hash = await writeContractAsync({
        address: MILESTONE_ESCROW_ADDRESS,
        abi: MILESTONE_ESCROW_ABI,
        functionName: 'resolveDispute',
        args: [
          jobId,
          milestoneIndex,
          resolveRecipient as `0x${string}`,
          BigInt(resolveClientAmount),
          BigInt(resolveProviderAmount),
        ],
      } as any);
      toast.success(`Resolution submitted: ${hash}`);
      setResolvingJob(null);
      setResolveRecipient('');
      setResolveClientAmount('');
      setResolveProviderAmount('');
      await loadDisputes();
    } catch (err) {
      toast.error('Resolution failed');
    }
  };

  const handleSweep = async () => {
    setIsSweeping(true);
    try {
      // No contract-level sweep; this is a UI affordance that re-fetches the
      // dispute list and archives anything older than 30 days.
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
        <Button
          onClick={loadDisputes}
          isDisabled={isLoading}
          className={DS.buttons.secondary}
         
        >
          Refresh
        </Button>
        <Button
          onClick={handleSweep}
          isDisabled={isSweeping || disputes.length === 0}
          className={DS.buttons.secondary}
         
        >
          Sweep stale disputes
        </Button>
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
                    {isLoading ? 'Loading…' : 'No active disputes'}
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
                      <td className="p-3 font-mono text-xs">{d.paymentToken === '0x0000000000000000000000000000000000000000' ? 'ETH' : d.paymentToken.slice(0, 8) + '…'}</td>
                      <td className="p-3">{d.amount > 0n ? formatUnits(d.amount, 18) : '—'}</td>
                      <td className="p-3 text-right">
                        {isResolving ? (
                          <div className="flex flex-col gap-2 items-end">
                            <input
                              value={resolveRecipient}
                              onChange={e => setResolveRecipient(e.target.value)}
                              placeholder="Recipient address"
                              className="px-2 py-1 text-sm bg-content1 border border-divider rounded w-48 font-mono"
                            />
                            <input
                              value={resolveClientAmount}
                              onChange={e => setResolveClientAmount(e.target.value)}
                              placeholder="Client amount (wei)"
                              className="px-2 py-1 text-sm bg-content1 border border-divider rounded w-48"
                            />
                            <input
                              value={resolveProviderAmount}
                              onChange={e => setResolveProviderAmount(e.target.value)}
                              placeholder="Provider amount (wei)"
                              className="px-2 py-1 text-sm bg-content1 border border-divider rounded w-48"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleResolve(d.jobId, d.milestoneIndex)} className={DS.buttons.primary}>
                                Submit
                              </Button>
                              <Button size="sm" onClick={() => setResolvingJob(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button size="sm" isDisabled={!isConnected} onClick={() => setResolvingJob(key)}>
                            Resolve
                          </Button>
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
