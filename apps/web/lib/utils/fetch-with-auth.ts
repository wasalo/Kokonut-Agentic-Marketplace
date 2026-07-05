import type { WalletClient } from 'viem';
import { createOwnerAuthHeaders } from '@/lib/client-auth';

export async function buildAuthHeaders(
  address: string,
  walletClient?: WalletClient
): Promise<Record<string, string>> {
  if (walletClient) {
    return createOwnerAuthHeaders(address as `0x${string}`, walletClient);
  }
  return { 'x-owner-address': address };
}
