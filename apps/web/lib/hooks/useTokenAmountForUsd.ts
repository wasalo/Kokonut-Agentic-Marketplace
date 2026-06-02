'use client';

import { useQuery } from '@tanstack/react-query';
import { createPublicClient, http, type Address } from 'viem';
import { sepolia } from 'viem/chains';
import { CONTRACTS } from '@/lib/wagmi';
import { PRICE_ORACLE_ABI } from '@/lib/contracts/abis';
import { assertValidAddress } from '@/lib/utils/typeGuards';

const PRICE_ORACLE_ADDRESS = assertValidAddress(
  CONTRACTS[11155111].priceOracle,
  'PRICE_ORACLE_ADDRESS'
);

const oracleClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com'),
});

/// @notice Convert a USD amount into a token amount using the on-chain PriceOracle.
/// @param usdAmount Amount in USD (e.g. 25.50). Will be scaled to 6 decimals for the
///        oracle's getTokenAmountForUsd() call.
/// @param token Token address to receive amount for. Pass undefined to disable.
/// @returns Token amount in raw token units (respects the token's decimals).
export function useTokenAmountForUsd(
  usdAmount: number | undefined,
  token: Address | undefined
) {
  return useQuery<bigint | undefined>({
    queryKey: ['token-amount-for-usd', usdAmount, token],
    queryFn: async () => {
      if (!usdAmount || !token) return undefined;
      // Oracle's getTokenAmountForUsd expects usdAmount in 1e6 scaling (USDC units).
      const usdScaled = BigInt(Math.round(usdAmount * 1e6));
      const result = await oracleClient.readContract({
        address: PRICE_ORACLE_ADDRESS,
        abi: PRICE_ORACLE_ABI,
        functionName: 'getTokenAmountForUsd',
        args: [usdScaled, token],
      });
      return result as bigint;
    },
    enabled: Boolean(usdAmount && token),
    staleTime: 30 * 1000,
  });
}
