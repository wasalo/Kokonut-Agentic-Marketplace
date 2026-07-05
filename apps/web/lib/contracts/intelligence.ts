/**
 * Kokonut Intelligence configuration
 *
 * Env vars:
 *   NEXT_PUBLIC_INTELLIGENCE_API_URL  — Directus base URL (default: http://localhost:8055)
 *   INTELLIGENCE_API_TOKEN           — Scoped Directus static token (read-only)
 */

import { createPublicClient, http } from 'viem';
import { celo } from 'viem/chains';

export const INTELLIGENCE_API_URL =
  process.env.NEXT_PUBLIC_INTELLIGENCE_API_URL ?? 'http://localhost:8055';

export const INTELLIGENCE_API_TOKEN =
  process.env.INTELLIGENCE_API_TOKEN ?? undefined;

// EAS on Celo contracts (from Kokonut Intelligence docs)
export const CELO_EAS_CONTRACTS = {
  eas: '0x72E1d8ccf5299fb36fEfD8CC4394B8ef7e98Af92',
  schemaRegistry: '0x5ece93bE4BDCF293Ed61FA78698B594F2135AF34',
  kokonutResolver: '0x6E1502c7a14b45aba5FC420dC92C1E3b38BD79Ad',
  kokonutMultisig: '0x03779B674CbCBfc0B801c4cAc9DFaC8aACbbD5c5',
} as const;

export const CELO_CHAIN_ID = 42220 as const;
export const CELO_RPC_URL = 'https://forno.celo.org';

// Standalone viem client for cross-chain EAS reads on Celo
export const celoClient = createPublicClient({
  chain: celo,
  transport: http(CELO_RPC_URL),
});
