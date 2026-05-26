import type { WalletClient } from 'viem';
import { buildKokonutAuthMessage } from './auth-message';

export async function createOwnerAuthHeaders(
  address: `0x${string}`,
  walletClient: WalletClient
): Promise<Record<string, string>> {
  const timestamp = Date.now().toString();
  const message = buildKokonutAuthMessage(address, timestamp);
  const signature = await walletClient.signMessage({ account: address, message });

  return {
    'x-owner-address': address,
    'x-kokonut-auth-timestamp': timestamp,
    'x-kokonut-auth-signature': signature,
  };
}
