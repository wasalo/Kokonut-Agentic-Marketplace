'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
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
  const lastBlockRef = useRef(DEFAULT_FROM_BLOCK);
  const onNewEventRef = useRef(onNewEvent);
  onNewEventRef.current = onNewEvent;
  const [recentEvents, setRecentEvents] = useState<ServiceEvent[]>([]);

  const pushEvent = useCallback((event: ServiceEvent) => {
    setRecentEvents(prev => [event, ...prev].slice(0, 50));
  }, []);

  const pollEvents = useCallback(async () => {
    if (!publicClient) return;

    try {
      const currentBlock = await publicClient.getBlockNumber();
      if (currentBlock <= lastBlockRef.current) return;
      const fromBlock = lastBlockRef.current + 1n;
      const toBlock = currentBlock;

      // ServiceCreated
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
        pushEvent({
          kind: 'created',
          serviceId,
          blockNumber: log.blockNumber ?? 0n,
          transactionHash: log.transactionHash ?? '0x',
          logIndex: Number(log.logIndex ?? 0),
          provider,
        });
      }

      // ServiceBondWithdrawn (Phase 45d: ServiceRegistryV2)
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
        pushEvent({
          kind: 'bondWithdrawn',
          serviceId,
          blockNumber: log.blockNumber ?? 0n,
          transactionHash: log.transactionHash ?? '0x',
          logIndex: Number(log.logIndex ?? 0),
          provider,
          amount,
        });
      }

      // PaymentAddressSet (Phase 45d: ServiceRegistryV2)
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
        pushEvent({
          kind: 'paymentAddressSet',
          serviceId,
          blockNumber: log.blockNumber ?? 0n,
          transactionHash: log.transactionHash ?? '0x',
          logIndex: Number(log.logIndex ?? 0),
          provider,
          recipient: paymentAddress,
        });
      }

      // ServiceReactivated (Phase 45d: ServiceRegistryV2)
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
        pushEvent({
          kind: 'reactivated',
          serviceId,
          blockNumber: log.blockNumber ?? 0n,
          transactionHash: log.transactionHash ?? '0x',
          logIndex: Number(log.logIndex ?? 0),
          provider,
        });
      }

      lastBlockRef.current = toBlock;
      if (createdLogs.length + bondLogs.length + paymentLogs.length + reactLogs.length > 0 && onNewEventRef.current) {
        onNewEventRef.current();
      }
    } catch {
      // Silently fail — polling will retry on next interval
    }
  }, [publicClient, pushEvent]);

  useEffect(() => {
    if (!publicClient) return;
    const interval = setInterval(pollEvents, POLL_INTERVAL);
    void pollEvents();
    return () => clearInterval(interval);
  }, [publicClient, pollEvents]);

  return { recentEvents, clearEvents: () => setRecentEvents([]) };
}
