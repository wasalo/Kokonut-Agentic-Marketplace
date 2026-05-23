import { useMemo } from 'react';
import { useChainlinkEthUsdPrice } from './useChainlinkPrice';
import {
  amountToNumber,
  ETH_TOKEN,
  formatAmount as formatTokenAmount,
  formatTokenUsdValue,
  SUPPORTED_PAYMENT_TOKENS,
  tokenAmountToUsd,
  USDC_TOKEN,
  type Token,
} from '@/lib/tokenUtils';

export {
  ETH_TOKEN,
  SERVICE_LISTING_PAYMENT_TOKENS,
  SUPPORTED_PAYMENT_TOKENS,
  USDC_TOKEN,
  type Token,
} from '@/lib/tokenUtils';

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
        const ethInUsd = amountToNumber(amount, fromToken);
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
        const usdValue = amountToNumber(amount, USDC_TOKEN);
        const ethValue = usdValue / ethPriceInUsd;
        return BigInt(Math.floor(ethValue * 1e18));
      }

      return BigInt(0);
    };
  }, [ethPriceInUsd]);

  const getUsdValue = useMemo(() => {
    return (amount: bigint, token: Token): number => {
      return tokenAmountToUsd(amount, token, ethPriceInUsd);
    };
  }, [ethPriceInUsd]);

  const formatAmount = useMemo(() => {
    return (amount: bigint, token: Token): string => {
      return formatTokenAmount(amount, token, { includeSymbol: true });
    };
  }, []);

  const formatUsdValue = useMemo(() => {
    return (amount: bigint, token: Token): string => {
      return formatTokenUsdValue(amount, token, ethPriceInUsd);
    };
  }, [ethPriceInUsd]);

  const ethToUsdcRate = ethPriceInUsd ?? null;

  return useMemo(() => ({
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
  }), [
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
  ]);
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
