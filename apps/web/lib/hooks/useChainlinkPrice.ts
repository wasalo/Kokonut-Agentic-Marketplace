import { useReadContract } from 'wagmi';
import { CHAINLINK_AGGREGATOR_ABI } from '@/lib/contracts/abis';
import { CHAINLINK_PRICE_FEEDS } from '@/lib/contracts/config';

const CHAINLINK_ETH_USD_FEED = CHAINLINK_PRICE_FEEDS.sepolia.ethUsd;

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
