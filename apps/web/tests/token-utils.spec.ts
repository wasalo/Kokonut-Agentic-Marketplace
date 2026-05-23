import { test, expect } from '@playwright/test';
import {
  ETH_TOKEN,
  USDC_TOKEN,
  formatAmount,
  formatInputAmount,
  formatUsd,
  getTokenByAddress,
  parseAmount,
} from '../lib/tokenUtils';

test.describe('tokenUtils', () => {
  test('parses and formats USDC amounts', () => {
    const raw = parseAmount('123.45', USDC_TOKEN);

    expect(raw).toBe(123450000n);
    expect(formatInputAmount(raw, USDC_TOKEN)).toBe('123.45');
    expect(formatAmount(raw, USDC_TOKEN, { includeSymbol: true, minFractionDigits: 2 })).toBe(
      '123.45 USDC'
    );
    expect(formatUsd(raw, { decimals: USDC_TOKEN.decimals })).toBe('$123.45');
  });

  test('parses and formats ETH amounts', () => {
    const raw = parseAmount('0.0123456789', ETH_TOKEN);

    expect(raw).toBe(12345678900000000n);
    expect(formatInputAmount(raw, ETH_TOKEN)).toBe('0.0123456789');
    expect(formatAmount(raw, ETH_TOKEN, { includeSymbol: true, maxFractionDigits: 6 })).toBe(
      '0.012346 ETH'
    );
  });

  test('maps empty legacy payment-token values to USDC', () => {
    expect(getTokenByAddress(undefined).symbol).toBe('USDC');
    expect(getTokenByAddress('0x').symbol).toBe('USDC');
  });
});
