'use client';

import { useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import { parseAbiItem } from 'viem';
import { getContractAddress, DEFAULT_FROM_BLOCK } from '@/lib/contracts/config';

const SERVICE_REGISTRY_ADDRESS = getContractAddress('SERVICE_REGISTRY');
const POLL_INTERVAL = 30000;

export type ServiceEventKind = 'created' | 'bondWithdrawn' | 'paymentAddressSet' | 'reactivated';

export interface ServiceEvent {
  kind: ServiceEventKind;
  serviceId: bigint;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
  provider?: `0x${string}`;
  recipient?: `0x${string}`;
  amount?: bigint;
}

/**
 * @notice Subscribes to ServiceRegistry events. Phase 45d expansion adds
 *         BondWithdrawn, PaymentAddressSet, and ServiceReactivated alongside
 *         the original ServiceCreated.
 */
export function useServiceEvents(onNewEvent?: () => void) {
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const lastBlockRef = useRef(DEFAULT_FROM_BLOCK);
  const onNewEventRef = useRef(onNewEvent);
  onNewEventRef.current = onNewEvent;

  const query = useQuery<ServiceEvent[]>({
    queryKey: ['service-events'],
    queryFn: async () => {
      if (!publicClient) return [];

      const prev = queryClient.getQueryData<ServiceEvent[]>(['service-events']) ?? [];
      const events: ServiceEvent[] = [];
      const currentBlock = await publicClient.getBlockNumber();
      if (currentBlock <= lastBlockRef.current) return prev;
      const fromBlock = lastBlockRef.current + 1n;
      const toBlock = currentBlock;

      const createdLogs = await publicClient.getLogs({
        address: SERVICE_REGISTRY_ADDRESS,
        event: parseAbiItem(
          'event ServiceCreated(uint256 indexed serviceId, address indexed provider, uint256 indexed agentId, string name, uint256 price)'
        ),
        fromBlock,
        toBlock,
      });
      for (const log of createdLogs) {
        const { serviceId, provider } = log.args as { serviceId: bigint; provider: `0x${string}` };
        events.push({
          kind: 'created',
          serviceId,
          blockNumber: log.blockNumber ?? 0n,
          transactionHash: log.transactionHash ?? '0x',
          logIndex: Number(log.logIndex ?? 0),
          provider,
        });
      }

      const bondLogs = await publicClient.getLogs({
        address: SERVICE_REGISTRY_ADDRESS,
        event: parseAbiItem(
          'event ServiceBondWithdrawn(uint256 indexed serviceId, address indexed provider, uint256 amount)'
        ),
        fromBlock,
        toBlock,
      });
      for (const log of bondLogs) {
        const { serviceId, provider, amount } = log.args as {
          serviceId: bigint;
          provider: `0x${string}`;
          amount: bigint;
        };
        events.push({
          kind: 'bondWithdrawn',
          serviceId,
          blockNumber: log.blockNumber ?? 0n,
          transactionHash: log.transactionHash ?? '0x',
          logIndex: Number(log.logIndex ?? 0),
          provider,
          amount,
        });
      }

      const paymentLogs = await publicClient.getLogs({
        address: SERVICE_REGISTRY_ADDRESS,
        event: parseAbiItem(
          'event PaymentAddressSet(uint256 indexed serviceId, address indexed provider, address paymentAddress)'
        ),
        fromBlock,
        toBlock,
      });
      for (const log of paymentLogs) {
        const { serviceId, provider, paymentAddress } = log.args as {
          serviceId: bigint;
          provider: `0x${string}`;
          paymentAddress: `0x${string}`;
        };
        events.push({
          kind: 'paymentAddressSet',
          serviceId,
          blockNumber: log.blockNumber ?? 0n,
          transactionHash: log.transactionHash ?? '0x',
          logIndex: Number(log.logIndex ?? 0),
          provider,
          recipient: paymentAddress,
        });
      }

      const reactLogs = await publicClient.getLogs({
        address: SERVICE_REGISTRY_ADDRESS,
        event: parseAbiItem(
          'event ServiceReactivated(uint256 indexed serviceId, address indexed provider)'
        ),
        fromBlock,
        toBlock,
      });
      for (const log of reactLogs) {
        const { serviceId, provider } = log.args as { serviceId: bigint; provider: `0x${string}` };
        events.push({
          kind: 'reactivated',
          serviceId,
          blockNumber: log.blockNumber ?? 0n,
          transactionHash: log.transactionHash ?? '0x',
          logIndex: Number(log.logIndex ?? 0),
          provider,
        });
      }

      lastBlockRef.current = toBlock;
      if (events.length > 0 && onNewEventRef.current) {
        onNewEventRef.current();
      }

      return [...events, ...prev].slice(0, 50);
    },
    refetchInterval: POLL_INTERVAL,
    enabled: !!publicClient,
    staleTime: 0,
    gcTime: 0,
  });

  const recentEvents = (query.data ?? []).slice(0, 50);
  const clearEvents = useCallback(
    () => queryClient.setQueryData<ServiceEvent[]>(['service-events'], []),
    [queryClient],
  );

  return { recentEvents, clearEvents };
}
