'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { parseAbiItem } from 'viem';
import { getContractAddress, DEFAULT_FROM_BLOCK } from '@/lib/contracts/config';

const SERVICE_REGISTRY_ADDRESS = getContractAddress('SERVICE_REGISTRY');
const POLL_INTERVAL = 30000;

export function useServiceEvents(onNewEvent?: () => void) {
  const publicClient = usePublicClient();
  const lastBlockRef = useRef(DEFAULT_FROM_BLOCK);
  const onNewEventRef = useRef(onNewEvent);
  onNewEventRef.current = onNewEvent;

  const pollEvents = useCallback(async () => {
    if (!publicClient) return;

    try {
      const currentBlock = await publicClient.getBlockNumber();
      if (currentBlock <= lastBlockRef.current) return;

      const logs = await publicClient.getLogs({
        address: SERVICE_REGISTRY_ADDRESS,
        event: parseAbiItem(
          'event ServiceCreated(uint256 indexed serviceId, address indexed provider, uint256 indexed agentId, string name, uint256 price)'
        ),
        fromBlock: lastBlockRef.current + 1n,
        toBlock: currentBlock,
      });

      lastBlockRef.current = currentBlock;

      if (logs.length > 0 && onNewEventRef.current) {
        onNewEventRef.current();
      }
    } catch {
      // Silently fail — polling will retry on next interval
    }
  }, [publicClient]);

  useEffect(() => {
    if (!publicClient) return;

    const interval = setInterval(pollEvents, POLL_INTERVAL);
    void pollEvents();

    return () => clearInterval(interval);
  }, [publicClient, pollEvents]);
}
