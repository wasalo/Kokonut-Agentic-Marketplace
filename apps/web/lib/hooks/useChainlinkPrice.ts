import { useReadContract } from 'wagmi';
import { CHAINLINK_AGGREGATOR_ABI } from '@/lib/contracts/abis';

const CHAINLINK_ETH_USD_FEED = '0x694AA1769357215DE4FAC081bf1f309aDC325306' as const;

export interface ChainlinkPriceData {
  price: bigint;
  decimals: number;
  updatedAt: number;
  priceInUsd: number;
}

export function useChainlinkEthUsdPrice() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: CHAINLINK_ETH_USD_FEED,
    abi: CHAINLINK_AGGREGATOR_ABI,
    functionName: 'latestRoundData',
    query: {
      retry: 3,
      staleTime: 60 * 1000, // 1 minute
    },
  });

  const priceData: ChainlinkPriceData | null = data
    ? {
        price: data[1],
        decimals: 8,
        updatedAt: Number(data[3]),
        priceInUsd: Number(data[1]) / 1e8,
      }
    : null;

  return {
    price: priceData?.price,
    priceInUsd: priceData?.priceInUsd,
    updatedAt: priceData?.updatedAt,
    isStale: priceData?.updatedAt
      ? Date.now() / 1000 - priceData.updatedAt > 3600 // > 1 hour
      : undefined,
    isLoading,
    error,
    refetch,
  };
}

export { CHAINLINK_ETH_USD_FEED };
