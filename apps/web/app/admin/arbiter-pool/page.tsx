'use client';

import { useEffect, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Card } from '@heroui/react';
import { Scale, AlertCircle, RefreshCw } from 'lucide-react';
import NextLink from 'next/link';
import { formatUnits } from 'viem';
import { getContractAddress } from '@/lib/contracts/config';
import { MILESTONE_ESCROW_ABI } from '@/lib/contracts/abis';
import { useArbiterCount } from '@/lib/hooks/useMilestoneEscrow';
import { DS, card } from '@/lib/design-system';

const MILESTONE_ESCROW_ADDRESS = getContractAddress('MILESTONE_ESCROW') as `0x${string}`;

interface ArbiterRow {
  address: `0x${string}`;
  token: `0x${string}`;
  stake: bigint;
}

export default function ArbiterPoolAdminPage(): JSX.Element {
  useEffect(() => { document.title = 'Arbiter Pool | Admin | Kokonut'; }, []);
  const { isConnected } = useAccount();

  const { data: arbitersData } = useReadContract({
    address: MILESTONE_ESCROW_ADDRESS,
    abi: MILESTONE_ESCROW_ABI,
    functionName: 'getArbiters',
  });

  const { count: arbiterCount } = useArbiterCount();

  const [arbiters, setArbiters] = useState<ArbiterRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setArbiters([]);
    setIsLoading(false);
  };

  useEffect(() => { void load(); }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Scale className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Arbiter Pool</h1>
            <p className="text-default-500">Registered arbiters and their stakes</p>
          </div>
        </div>
        <NextLink href="/admin" className="text-sm text-default-500 hover:text-default-700">← Back to Admin</NextLink>
      </div>

      {!isConnected && (
        <Card className={card('padded', 'p-6 mb-6 bg-warning/5')}>
          <AlertCircle className="size-6 text-warning inline-block mr-2" />
          <span className="text-sm">Connect the owner wallet to view the arbiter pool.</span>
        </Card>
      )}

      <Card className={card('padded', 'mb-6')}>
        <p className="text-xs text-default-500">Arbiter count</p>
        <p className="text-2xl font-bold">{arbiterCount}</p>
      </Card>

      <div className="flex items-center gap-3 mb-4">
        <button onClick={load} disabled={isLoading} className={DS.buttons.secondary}>
          <RefreshCw className="size-4 mr-1 inline" /> Refresh
        </button>
        <span className="text-sm text-default-500 ml-auto">{arbiters.length} arbiters</span>
      </div>

      <Card className={card('base')}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-content2">
              <tr>
                <th className="text-left p-3">Address</th>
                <th className="text-left p-3">Token</th>
                <th className="text-left p-3">Stake</th>
              </tr>
            </thead>
            <tbody>
              {arbiters.length === 0 ? (
                <tr><td colSpan={3} className="p-6 text-center text-default-500">
                  {isLoading ? 'Loading…' : (Array.isArray(arbitersData) ? `Pool reports ${arbitersData.length} registered arbiters; click Refresh to inspect per-token stakes` : 'No arbiters')}
                </td></tr>
              ) : (
                arbiters.map(a => (
                  <tr key={a.address + a.token} className="border-t border-divider">
                    <td className="p-3 font-mono text-xs">{a.address}</td>
                    <td className="p-3 font-mono text-xs">{a.token === '0x0000000000000000000000000000000000000000' ? 'ETH' : a.token.slice(0, 10) + '…'}</td>
                    <td className="p-3">{formatUnits(a.stake, 18)}</td>
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
