'use client';

import { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { Card, Button, Input } from '@heroui/react';
import { Users, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import NextLink from 'next/link';
import { formatUnits } from 'viem';
import { CONTRACTS } from '@/lib/wagmi';
import { AGENTIC_COMMERCE_ABI } from '@/lib/contracts/abis';
import { DS } from '@/lib/design-system';
import { toast } from 'sonner';

const AGENTIC_COMMERCE_ADDRESS = CONTRACTS[11155111].agenticCommerce as `0x${string}`;

interface EvaluatorRow {
  address: `0x${string}`;
  stake: bigint;
  registeredAt: bigint;
}

export default function EvaluatorPoolAdminPage(): JSX.Element {
  useEffect(() => { document.title = 'Evaluator Pool | Admin | Kokonut'; }, []);
  const { isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const { data: poolSize, refetch: refetchSize } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'getEvaluatorPoolSize',
  });
  const { data: minStake, refetch: refetchMinStake } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'minEvaluatorStake',
  });

  const [evaluators, setEvaluators] = useState<EvaluatorRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newMinStake, setNewMinStake] = useState('');

  const loadEvaluators = async () => {
    setIsLoading(true);
    setEvaluators([]); // In production: query subgraph Evaluator entity
    setIsLoading(false);
  };

  useEffect(() => { void loadEvaluators(); }, []);

  const handleCleanup = async () => {
    try {
      const hash = await writeContractAsync({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'cleanupStaleEvaluators',
        args: [100n],
      } as any);
      toast.success(`Cleanup tx: ${hash}`);
      await refetchSize();
    } catch {
      toast.error('Cleanup failed');
    }
  };

  const handleSetMinStake = async () => {
    if (!newMinStake) return;
    try {
      const hash = await writeContractAsync({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'setMinEvaluatorStake',
        args: [BigInt(newMinStake)],
      } as any);
      toast.success(`Min stake updated: ${hash}`);
      setNewMinStake('');
      await refetchMinStake();
    } catch {
      toast.error('Update failed');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Evaluator Pool</h1>
            <p className="text-default-500">Manage registered evaluators and stake minimums</p>
          </div>
        </div>
        <NextLink href="/admin" className="text-sm text-default-500 hover:text-default-700">← Back to Admin</NextLink>
      </div>

      {!isConnected && (
        <Card className="border border-divider p-6 mb-6 bg-warning/5">
          <AlertCircle className="size-6 text-warning inline-block mr-2" />
          <span className="text-sm">Connect the owner wallet to manage the pool.</span>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border border-divider p-4">
          <p className="text-xs text-default-500">Pool Size</p>
          <p className="text-2xl font-bold">{poolSize?.toString() ?? '—'}</p>
        </Card>
        <Card className="border border-divider p-4">
          <p className="text-xs text-default-500">Min Evaluator Stake</p>
          <p className="text-lg font-mono">{minStake ? formatUnits(minStake, 18) + ' ETH' : '—'}</p>
        </Card>
        <Card className="border border-divider p-4 flex flex-col justify-center gap-2">
          <button onClick={handleCleanup} disabled={!isConnected} className={DS.buttons.secondary}>
            <Trash2 className="size-4 mr-1 inline" /> Cleanup stale (100)
          </button>
        </Card>
      </div>

      <Card className="border border-divider p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">Set minimum evaluator stake</h2>
        <p className="text-sm text-default-500 mb-3">In wei. Owner only.</p>
        <div className="flex gap-2">
          <Input
            value={newMinStake}
            onChange={e => setNewMinStake(e.target.value)}
            placeholder="10000000000000000 (0.01 ETH)"
            className="font-mono"
          />
        <Button onClick={handleSetMinStake} isDisabled={!isConnected || !newMinStake} className={DS.buttons.primary}>
          Update
        </Button>
        </div>
      </Card>

      <div className="flex items-center gap-3 mb-4">
        <Button onClick={loadEvaluators} isDisabled={isLoading} className={DS.buttons.secondary}>
          <RefreshCw className="size-4 mr-1 inline" /> Refresh
        </Button>
        <span className="text-sm text-default-500 ml-auto">{evaluators.length} evaluators</span>
      </div>

      <Card className="border border-divider">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-content2">
              <tr>
                <th className="text-left p-3">Address</th>
                <th className="text-left p-3">Stake</th>
                <th className="text-left p-3">Registered</th>
              </tr>
            </thead>
            <tbody>
              {evaluators.length === 0 ? (
                <tr><td colSpan={3} className="p-6 text-center text-default-500">
                  {isLoading ? 'Loading…' : 'No evaluators found'}
                </td></tr>
              ) : (
                evaluators.map(e => (
                  <tr key={e.address} className="border-t border-divider">
                    <td className="p-3 font-mono text-xs">{e.address}</td>
                    <td className="p-3">{formatUnits(e.stake, 18)} ETH</td>
                    <td className="p-3">{e.registeredAt > 0n ? new Date(Number(e.registeredAt) * 1000).toLocaleString() : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
