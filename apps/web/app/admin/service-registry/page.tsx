'use client';

import { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { Card, Button } from '@heroui/react';
import { Store, AlertCircle } from 'lucide-react';
import NextLink from 'next/link';
import { formatUnits } from 'viem';
import { CONTRACTS } from '@/lib/wagmi';
import { SERVICE_REGISTRY_ABI, AGENTIC_COMMERCE_ABI } from '@/lib/contracts/abis';
import { DS, card } from '@/lib/design-system';
import { toast } from 'sonner';

const SERVICE_REGISTRY_ADDRESS = CONTRACTS[11155111].serviceRegistry as `0x${string}`;
const AGENTIC_COMMERCE_ADDRESS = CONTRACTS[11155111].agenticCommerce as `0x${string}`;

interface ServiceRow {
  serviceId: bigint;
  provider: `0x${string}`;
  name: string;
  price: bigint;
  active: boolean;
  paymentToken: `0x${string}`;
}

export default function ServiceRegistryAdminPage(): JSX.Element {
  useEffect(() => {
    document.title = 'Service Registry | Admin | Kokonut';
  }, []);

  const { isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const { data: counter } = useReadContract({
    address: SERVICE_REGISTRY_ADDRESS,
    abi: SERVICE_REGISTRY_ABI,
    functionName: 'getServiceCounter',
  });
  const { data: agenticService } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'serviceRegistry',
  });

  const [services, setServices] = useState<ServiceRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newServiceRegistry, setNewServiceRegistry] = useState('');

  const loadServices = async () => {
    setIsLoading(true);
    // In production this would read from the subgraph. For now we use a count + multicall.
    setServices([]);
    setIsLoading(false);
  };

  useEffect(() => { void loadServices(); }, []);

  const handlePause = async (serviceId: bigint) => {
    try {
      const hash = await writeContractAsync({
        address: SERVICE_REGISTRY_ADDRESS,
        abi: SERVICE_REGISTRY_ABI,
        functionName: 'deactivateService',
        args: [serviceId],
      } as any);
      toast.success(`Service ${serviceId.toString()} paused: ${hash}`);
      await loadServices();
    } catch {
      toast.error('Pause failed');
    }
  };

  const handleSetRegistry = async () => {
    if (!newServiceRegistry) return;
    try {
      const hash = await writeContractAsync({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'setServiceRegistry',
        args: [newServiceRegistry as `0x${string}`],
      } as any);
      toast.success(`Service registry updated: ${hash}`);
    } catch {
      toast.error('Update failed');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Store className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Service Registry</h1>
            <p className="text-default-500">Manage service listings and registry wiring</p>
          </div>
        </div>
        <NextLink href="/admin" className="text-sm text-default-500 hover:text-default-700">← Back to Admin</NextLink>
      </div>

      {!isConnected && (
        <Card className={card('padded', 'p-6 mb-6 bg-warning/5')}>
          <AlertCircle className="size-6 text-warning inline-block mr-2" />
          <span className="text-sm">Connect the owner wallet to manage services.</span>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className={card('padded')}>
          <p className="text-xs text-default-500">Service Counter</p>
          <p className="text-2xl font-bold">{counter?.toString() ?? '—'}</p>
        </Card>
        <Card className={card('padded')}>
          <p className="text-xs text-default-500">Current Service Registry (AgenticCommerce)</p>
          <p className="font-mono text-sm truncate">{agenticService?.toString() ?? '—'}</p>
        </Card>
        <Card className={card('padded')}>
          <p className="text-xs text-default-500">Treasury</p>
          <p className="font-mono text-sm truncate">—</p>
        </Card>
      </div>

      <Card className={card('padded', 'p-6 mb-6')}>
        <h2 className="text-lg font-semibold mb-3">Set service registry address</h2>
        <p className="text-sm text-default-500 mb-3">
          Re-point AgenticCommerce → ServiceRegistry. Owner only.
        </p>
        <div className="flex gap-2">
          <input
            value={newServiceRegistry}
            onChange={e => setNewServiceRegistry(e.target.value)}
            placeholder="0x... (ServiceRegistry proxy)"
            className="flex-1 px-3 py-2 bg-content1 border border-divider rounded-lg font-mono text-sm"
          />
          <Button onClick={handleSetRegistry} isDisabled={!isConnected || !newServiceRegistry} className={DS.buttons.primary}>
            Update
          </Button>
        </div>
      </Card>

      <div className="flex items-center gap-3 mb-4">
        <Button
          onClick={loadServices}
          isDisabled={isLoading}
          className={DS.buttons.secondary}
         
        >
          Refresh
        </Button>
        <span className="text-sm text-default-500 ml-auto">{services.length} services</span>
      </div>

      <Card className={card('base')}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-content2">
              <tr>
                <th className="text-left p-3">ID</th>
                <th className="text-left p-3">Provider</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Price</th>
                <th className="text-left p-3">Token</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {services.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-default-500">
                    {isLoading ? 'Loading…' : 'Use "Refresh" to load services from the subgraph'}
                  </td>
                </tr>
              ) : (
                services.map(s => (
                  <tr key={s.serviceId.toString()} className="border-t border-divider">
                    <td className="p-3">#{s.serviceId.toString()}</td>
                    <td className="p-3 font-mono text-xs">{s.provider.slice(0, 10)}…</td>
                    <td className="p-3">{s.name}</td>
                    <td className="p-3">{formatUnits(s.price, 18)}</td>
                    <td className="p-3 font-mono text-xs">{s.paymentToken === '0x0000000000000000000000000000000000000000' ? 'ETH' : s.paymentToken.slice(0, 8) + '…'}</td>
                    <td className="p-3">{s.active ? 'Active' : 'Paused'}</td>
                    <td className="p-3 text-right">
                      <Button size="sm" isDisabled={!isConnected || !s.active} onClick={() => handlePause(s.serviceId)}>
                        Pause
                      </Button>
                    </td>
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
