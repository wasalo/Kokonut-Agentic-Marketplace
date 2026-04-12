'use client';

import { useEffect, useCallback, useRef } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { parseAbiItem } from 'viem';
import { getContractAddress, debugLog, DEFAULT_FROM_BLOCK } from '@/lib/contracts/config';
import { useNotifications } from '@/lib/hooks/useNotifications';

const BIDDING_SYSTEM_ADDRESS = getContractAddress('BIDDING_SYSTEM');

const BIDDING_EVENTS = {
  biddingSessionCreated: parseAbiItem(
    'event BiddingSessionCreated(uint256 indexed sessionId, address indexed creator, address indexed evaluator, uint256 maxBudget, uint256 deadline)'
  ),
  bidCommitted: parseAbiItem(
    'event BidCommitted(uint256 indexed sessionId, address indexed bidder, uint256 stakeAmount, bytes32 commitHash)'
  ),
  bidRevealed: parseAbiItem(
    'event BidRevealed(uint256 indexed sessionId, address indexed bidder, uint256 proposedAmount, string message)'
  ),
  bidAccepted: parseAbiItem(
    'event BidAccepted(uint256 indexed sessionId, address indexed bidder, uint256 indexed bidId, uint256 acceptedAmount)'
  ),
  bidRejected: parseAbiItem(
    'event BidRejected(uint256 indexed sessionId, address indexed bidder, uint256 indexed bidId, string reason)'
  ),
  stakeClaimed: parseAbiItem(
    'event StakeClaimed(uint256 indexed sessionId, address indexed bidder, uint256 amount)'
  ),
  stakeWithdrawn: parseAbiItem(
    'event StakeWithdrawn(uint256 indexed sessionId, address indexed bidder, uint256 amount)'
  ),
  jobCreatedFromSession: parseAbiItem(
    'event JobCreatedFromSession(uint256 indexed sessionId, uint256 indexed jobId, address indexed provider)'
  ),
  sessionCancelled: parseAbiItem(
    'event SessionCancelled(uint256 indexed sessionId, address indexed creator)'
  ),
  revealWindowExtended: parseAbiItem(
    'event RevealWindowExtended(uint256 indexed sessionId, uint256 newRevealWindowEnd)'
  ),
} as const;

const STORAGE_KEY = 'kokonut_last_bidding_block';

function getLastProcessedBlock(): bigint {
  if (typeof window === 'undefined') return DEFAULT_FROM_BLOCK;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? BigInt(stored) : DEFAULT_FROM_BLOCK;
}

function setLastProcessedBlock(block: bigint) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, block.toString());
}

export function useBiddingNotifications() {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const { addNotification } = useNotifications();
  const lastBlockRef = useRef<bigint>(getLastProcessedBlock());

  const notify = useCallback(
    async (notification: Parameters<typeof addNotification>[0]) => {
      addNotification(notification);
    },
    [addNotification]
  );

  const processBiddingEvents = useCallback(
    async (fromBlock: bigint, toBlock: bigint) => {
      if (!publicClient) return toBlock;

      try {
        const logs = await publicClient.getLogs({
          address: BIDDING_SYSTEM_ADDRESS,
          events: Object.values(BIDDING_EVENTS),
          fromBlock,
          toBlock,
        });

        for (const log of logs) {
          const event = log.eventName;

          if (event === 'BiddingSessionCreated' && log.args.sessionId && log.args.creator && log.args.maxBudget !== undefined) {
            if (address && log.args.creator.toLowerCase() === address.toLowerCase()) {
              const budget = Number(log.args.maxBudget) / 1e6;
              await notify({
                type: 'job',
                action: 'bidding.session_created',
                title: 'Bidding Session Created',
                message: `Your bidding session #${log.args.sessionId} with ${budget.toFixed(2)} USDC max budget is now open`,
                link: `/jobs?session=${log.args.sessionId}`,
                metadata: {
                  sessionId: log.args.sessionId.toString(),
                  maxBudget: log.args.maxBudget.toString(),
                },
              });
            }
          }

          if (event === 'BidCommitted' && log.args.sessionId && log.args.bidder && log.args.stakeAmount !== undefined) {
            if (address && log.args.bidder.toLowerCase() === address.toLowerCase()) {
              const stake = Number(log.args.stakeAmount) / 1e18;
              await notify({
                type: 'job',
                action: 'bidding.bid_committed',
                title: 'Bid Committed',
                message: `Your bid for session #${log.args.sessionId} committed with ${stake.toFixed(4)} ETH stake`,
                link: `/jobs?session=${log.args.sessionId}`,
                metadata: {
                  sessionId: log.args.sessionId.toString(),
                  stakeAmount: log.args.stakeAmount.toString(),
                },
              });
            }
          }

          if (event === 'BidAccepted' && log.args.sessionId && log.args.bidder && log.args.acceptedAmount !== undefined) {
            if (address && log.args.bidder.toLowerCase() === address.toLowerCase()) {
              const amount = Number(log.args.acceptedAmount) / 1e6;
              await notify({
                type: 'job',
                action: 'bidding.bid_accepted',
                title: 'Bid Accepted!',
                message: `Your bid for session #${log.args.sessionId} accepted at ${amount.toFixed(2)} USDC`,
                link: `/jobs?session=${log.args.sessionId}`,
                metadata: {
                  sessionId: log.args.sessionId.toString(),
                  bidId: log.args.bidId?.toString(),
                  acceptedAmount: log.args.acceptedAmount.toString(),
                },
              });
            }
          }

          if (event === 'BidRejected' && log.args.sessionId && log.args.bidder) {
            if (address && log.args.bidder.toLowerCase() === address.toLowerCase()) {
              await notify({
                type: 'job',
                action: 'bidding.bid_rejected',
                title: 'Bid Rejected',
                message: `Your bid for session #${log.args.sessionId} was rejected${log.args.reason ? `: ${log.args.reason}` : ''}`,
                link: `/jobs?session=${log.args.sessionId}`,
                metadata: {
                  sessionId: log.args.sessionId.toString(),
                  bidId: log.args.bidId?.toString(),
                  reason: log.args.reason || 'No reason provided',
                },
              });
            }
          }

          if (event === 'StakeClaimed' && log.args.sessionId && log.args.bidder && log.args.amount !== undefined) {
            if (address && log.args.bidder.toLowerCase() === address.toLowerCase()) {
              const amount = Number(log.args.amount) / 1e18;
              await notify({
                type: 'payment',
                action: 'bidding.stake_claimed',
                title: 'Stake Claimed',
                message: `You claimed ${amount.toFixed(4)} ETH stake from session #${log.args.sessionId}`,
                link: `/jobs?session=${log.args.sessionId}`,
                metadata: {
                  sessionId: log.args.sessionId.toString(),
                  amount: log.args.amount.toString(),
                },
              });
            }
          }

          if (event === 'StakeWithdrawn' && log.args.sessionId && log.args.bidder && log.args.amount !== undefined) {
            if (address && log.args.bidder.toLowerCase() === address.toLowerCase()) {
              const amount = Number(log.args.amount) / 1e18;
              await notify({
                type: 'payment',
                action: 'bidding.stake_withdrawn',
                title: 'Stake Withdrawn',
                message: `You withdrew ${amount.toFixed(4)} ETH stake from session #${log.args.sessionId}`,
                link: `/jobs?session=${log.args.sessionId}`,
                metadata: {
                  sessionId: log.args.sessionId.toString(),
                  amount: log.args.amount.toString(),
                },
              });
            }
          }

          if (event === 'JobCreatedFromSession' && log.args.sessionId && log.args.jobId && log.args.provider) {
            if (address && log.args.provider.toLowerCase() === address.toLowerCase()) {
              await notify({
                type: 'job',
                action: 'bidding.job_created',
                title: 'Job Created from Bid',
                message: `Job #${log.args.jobId} created from your accepted bid in session #${log.args.sessionId}`,
                link: `/jobs/${log.args.jobId}`,
                metadata: {
                  sessionId: log.args.sessionId.toString(),
                  jobId: log.args.jobId.toString(),
                },
              });
            }
          }

          if (event === 'SessionCancelled' && log.args.sessionId && log.args.creator) {
            if (address && log.args.creator.toLowerCase() === address.toLowerCase()) {
              await notify({
                type: 'job',
                action: 'bidding.session_cancelled',
                title: 'Session Cancelled',
                message: `Your bidding session #${log.args.sessionId} has been cancelled`,
                link: `/jobs?session=${log.args.sessionId}`,
                metadata: {
                  sessionId: log.args.sessionId.toString(),
                },
              });
            }
          }
        }
      } catch (error) {
        debugLog('errors', `Error processing BiddingSystem events: ${error}`);
      }

      return toBlock;
    },
    [publicClient, address, notify]
  );

  useEffect(() => {
    if (!publicClient) return;

    let pollingInterval: ReturnType<typeof setInterval>;

    const processAllEvents = async () => {
      try {
        const currentBlock = await publicClient.getBlockNumber();
        let fromBlock = lastBlockRef.current;

        if (currentBlock <= fromBlock) return;

        const safeFromBlock = fromBlock + BigInt(1);
        const toBlock = currentBlock;

        const newBlock = await processBiddingEvents(safeFromBlock, toBlock);
        lastBlockRef.current = newBlock;
        setLastProcessedBlock(newBlock);
      } catch (error) {
        debugLog('errors', `Error in bidding notification polling: ${error}`);
      }
    };

    processAllEvents();
    pollingInterval = setInterval(processAllEvents, 15000);

    return () => {
      clearInterval(pollingInterval);
    };
  }, [publicClient, processBiddingEvents]);
}