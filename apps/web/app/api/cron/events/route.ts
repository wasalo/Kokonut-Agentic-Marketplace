import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { AGENTIC_COMMERCE_ABI } from '@/lib/contracts/abis';
import { getContractAddress } from '@/lib/contracts/config';
import {
  getLastProcessedBlock,
  updateLastProcessedBlock,
  logEvent,
  hasEventBeenProcessed,
  acquireCronLock,
  releaseCronLock,
} from '@/lib/db/events';
import { triggerWebhooks } from '@/lib/webhooks/trigger';
import { requireCronBearer } from '@/lib/api-auth';

const CHAIN_ID = 11155111;
const AGENTIC_COMMERCE_ADDRESS = getContractAddress('AGENTIC_COMMERCE');

const client = createPublicClient({
  chain: sepolia,
  transport: http(
    process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com'
  ),
});

const CONTRACT_EVENTS = [
  'JobCreated',
  'JobFunded',
  'JobSubmitted',
  'JobCompleted',
  'JobRejected',
  'JobExpired',
  'PaymentReleased',
] as const;

type ContractEvent = (typeof CONTRACT_EVENTS)[number];

const EVENT_TO_WEBHOOK: Record<ContractEvent, string> = {
  JobCreated: 'job.created',
  JobFunded: 'job.funded',
  JobSubmitted: 'job.submitted',
  JobCompleted: 'job.completed',
  JobRejected: 'job.rejected',
  JobExpired: 'job.expired',
  PaymentReleased: 'payment.received',
};

export async function GET(request: NextRequest) {
  const authError = requireCronBearer(request);
  if (authError) return authError;

  const lockAcquired = await acquireCronLock('event-watcher', 5 * 60 * 1000);
  if (!lockAcquired) {
    return NextResponse.json({ message: 'Already running, skipping' });
  }

  try {
    const lastBlock = await getLastProcessedBlock();
    const currentBlock = await client.getBlockNumber();

    if (currentBlock <= lastBlock) {
      return NextResponse.json({ message: 'No new blocks', lastBlock: lastBlock.toString() });
    }

    const fromBlock = lastBlock + 1n;
    const toBlock = currentBlock > lastBlock + 100n ? lastBlock + 100n : currentBlock;

    const logs: any[] = await client.getContractEvents({
      address: AGENTIC_COMMERCE_ADDRESS as `0x${string}`,
      abi: AGENTIC_COMMERCE_ABI,
      fromBlock,
      toBlock,
    });

    let processedCount = 0;
    let webhookTriggered = 0;

    for (const log of logs) {
      const eventName = log.eventName as ContractEvent;

      if (!CONTRACT_EVENTS.includes(eventName as ContractEvent)) {
        continue;
      }

      const txHash = log.transactionHash || '';
      const blockNum = log.blockNumber;

      if (!txHash || blockNum === null) {
        continue;
      }

      if (await hasEventBeenProcessed(txHash)) {
        continue;
      }

      await logEvent({
        eventType: eventName,
        txHash,
        blockNumber: Number(blockNum),
        blockHash: log.blockHash || '',
        data: (log.args || {}) as Record<string, unknown>,
      });

      processedCount++;

      const webhookEvent = EVENT_TO_WEBHOOK[eventName];
      if (webhookEvent) {
        const result = await triggerWebhooks({
          event: webhookEvent as any,
          data: {
            txHash,
            blockNumber: String(blockNum),
            ...((log.args || {}) as Record<string, unknown>),
          },
          chainId: CHAIN_ID,
        });

        if (result.success) {
          webhookTriggered++;
        }
      }
    }

    await updateLastProcessedBlock(toBlock);

    return NextResponse.json({
      success: true,
      fromBlock: fromBlock.toString(),
      toBlock: toBlock.toString(),
      eventsProcessed: processedCount,
      webhooksTriggered: webhookTriggered,
    });
  } catch (error) {
    console.error('Event watcher error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await releaseCronLock('event-watcher');
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
