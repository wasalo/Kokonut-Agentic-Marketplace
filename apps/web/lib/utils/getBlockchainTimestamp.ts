'use client';

import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://ethereum-sepolia.publicnode.com';

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
});

export async function getBlockchainTimestamp(): Promise<bigint> {
  try {
    const block = await publicClient.getBlock();
    return block.timestamp;
  } catch (error) {
    console.error('[getBlockchainTimestamp] Error fetching block timestamp:', error);
    return BigInt(Math.floor(Date.now() / 1000));
  }
}

export function calculateDeadlineFromBlockchain(blockTimestamp: bigint, durationSeconds: number): bigint {
  return blockTimestamp + BigInt(durationSeconds);
}

export async function createDeadline(durationSeconds: number = 60): Promise<bigint> {
  const blockTimestamp = await getBlockchainTimestamp();
  return calculateDeadlineFromBlockchain(blockTimestamp, durationSeconds);
}