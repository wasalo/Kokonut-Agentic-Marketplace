import { useMemo } from 'react';
import { useChainlinkEthUsdPrice } from './useChainlinkPrice';
import { CONTRACT_ADDRESSES } from '@/lib/contracts/config';

export interface Token {
  symbol: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
}

export const USDC_TOKEN: Token = {
  symbol: 'USDC',
  name: 'USD Coin',
  address: CONTRACT_ADDRESSES.sepolia.usdc,
  decimals: 6,
};

export const ETH_TOKEN: Token = {
  symbol: 'ETH',
  name: 'Ether',
  address: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  decimals: 18,
};

export const SUPPORTED_PAYMENT_TOKENS: Token[] = [USDC_TOKEN, ETH_TOKEN];

export function useTokenPriceConversion() {
  const {
    priceInUsd: ethPriceInUsd,
    isLoading: isEthLoading,
    isStale,
    updatedAt,
  } = useChainlinkEthUsdPrice();

  const isLoading = isEthLoading;

  const convertToUsdc = useMemo(() => {
    return (amount: bigint, fromToken: Token): bigint => {
      if (fromToken.symbol === 'USDC') {
        return amount;
      }

      if (fromToken.symbol === 'ETH' && ethPriceInUsd && ethPriceInUsd > 0) {
        const ethInUsd = Number(amount) / 1e18;
        const usdValue = ethInUsd * ethPriceInUsd;
        return BigInt(Math.floor(usdValue * 1e6));
      }

      return BigInt(0);
    };
  }, [ethPriceInUsd]);

  const convertFromUsdc = useMemo(() => {
    return (amount: bigint, toToken: Token): bigint => {
      if (toToken.symbol === 'USDC') {
        return amount;
      }

      if (toToken.symbol === 'ETH' && ethPriceInUsd && ethPriceInUsd > 0) {
        const usdValue = Number(amount) / 1e6;
        const ethValue = usdValue / ethPriceInUsd;
        return BigInt(Math.floor(ethValue * 1e18));
      }

      return BigInt(0);
    };
  }, [ethPriceInUsd]);

  const getUsdValue = useMemo(() => {
    return (amount: bigint, token: Token): number => {
      if (token.symbol === 'USDC') {
        return Number(amount) / 1e6;
      }

      if (token.symbol === 'ETH' && ethPriceInUsd && ethPriceInUsd > 0) {
        const ethAmount = Number(amount) / 1e18;
        return ethAmount * ethPriceInUsd;
      }

      return 0;
    };
  }, [ethPriceInUsd]);

  const formatAmount = useMemo(() => {
    return (amount: bigint, token: Token): string => {
      const decimals = token.decimals;
      const divisor = 10 ** decimals;
      const value = Number(amount) / divisor;

      if (value === 0) return `0 ${token.symbol}`;
      if (value < 0.0001) return `<0.0001 ${token.symbol}`;
      if (value < 1) return value.toFixed(6);
      if (value < 1000) return value.toFixed(2);
      return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
    };
  }, []);

  const formatUsdValue = useMemo(() => {
    return (amount: bigint, token: Token): string => {
      const usdValue = getUsdValue(amount, token);
      if (usdValue === 0) return '$0.00';
      return `$${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };
  }, [getUsdValue]);

  const ethToUsdcRate = ethPriceInUsd ?? null;

  return {
    isLoading,
    ethPriceInUsd,
    ethToUsdcRate,
    isStale,
    updatedAt,
    convertToUsdc,
    convertFromUsdc,
    getUsdValue,
    formatAmount,
    formatUsdValue,
  };
}

export function useJobBudgetConversion(paymentToken: Token, budget: bigint) {
  const conversion = useTokenPriceConversion();

  const budgetFormatted = useMemo(() => {
    return conversion.formatAmount(budget, paymentToken);
  }, [conversion, budget, paymentToken]);

  const budgetInUsd = useMemo(() => {
    return conversion.formatUsdValue(budget, paymentToken);
  }, [conversion, budget, paymentToken]);

  return {
    budgetFormatted,
    budgetInUsd,
    isLoading: conversion.isLoading,
  };
}
