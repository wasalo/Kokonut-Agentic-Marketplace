import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAddress(address: string, chars = 4, ensName?: string): string {
  if (ensName) {
    return ensName;
  }
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

export function formatEther(wei: bigint): string {
  return (Number(wei) / 1e18).toFixed(4)
}

export function formatUsdc(usdc: bigint): string {
  return (Number(usdc) / 1e6).toFixed(2)
}

export function isValidEnsName(value: string): boolean {
  return value.endsWith('.eth') && value.length > 4;
}

export function isValidAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

import { decodeEventLog } from 'viem';
import { AGENTIC_COMMERCE_EVENTS } from '@/lib/contracts/abis';

type ReceiptLog = {
  data: `0x${string}`;
  topics: readonly `0x${string}`[];
};

export function getJobIdFromReceiptLogs(logs: readonly ReceiptLog[]): bigint | null {
  for (const log of logs) {
    try {
      const decoded = decodeEventLog({
        abi: AGENTIC_COMMERCE_EVENTS,
        data: log.data,
        topics: [...log.topics] as [`0x${string}`, ...`0x${string}`[]],
      });

      if (decoded.eventName === 'JobCreated') {
        const args = decoded.args as { jobId?: bigint };
        return args.jobId ?? null;
      }
    } catch {
      // Ignore logs from other contracts in the same transaction.
    }
  }

  return null;
}

export function extractJobIdFromReceipt(receipt: { logs: readonly ReceiptLog[] }): bigint | null {
  return getJobIdFromReceiptLogs(receipt.logs);
}
