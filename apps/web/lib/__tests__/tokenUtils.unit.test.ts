import { describe, it, expect } from 'vitest';
import {
  ETH_TOKEN,
  USDC_TOKEN,
  formatAmount,
  formatInputAmount,
  formatUsd,
  getTokenByAddress,
  parseAmount,
} from '../tokenUtils';

describe('tokenUtils', () => {
  it('parses and formats USDC amounts', () => {
    const raw = parseAmount('123.45', USDC_TOKEN);
    expect(raw).toBe(123450000n);
    expect(formatInputAmount(raw, USDC_TOKEN)).toBe('123.45');
    expect(formatAmount(raw, USDC_TOKEN, { includeSymbol: true, minFractionDigits: 2 })).toBe(
      '123.45 USDC'
    );
    expect(formatUsd(raw, { decimals: USDC_TOKEN.decimals })).toBe('$123.45');
  });

  it('parses and formats ETH amounts', () => {
    const raw = parseAmount('0.0123456789', ETH_TOKEN);
    expect(raw).toBe(12345678900000000n);
    expect(formatInputAmount(raw, ETH_TOKEN)).toBe('0.0123456789');
    expect(formatAmount(raw, ETH_TOKEN, { includeSymbol: true, maxFractionDigits: 6 })).toBe(
      '0.012346 ETH'
    );
  });

  it('maps empty legacy payment-token values to USDC', () => {
    expect(getTokenByAddress(undefined).symbol).toBe('USDC');
    expect(getTokenByAddress('0x').symbol).toBe('USDC');
  });

  it('round-trips amounts through parseAmount/formatInputAmount for USDC', () => {
    const inputs = ['0', '0.01', '1', '1.5', '1000', '999999.999999'];
    for (const input of inputs) {
      const raw = parseAmount(input, USDC_TOKEN);
      expect(formatInputAmount(raw, USDC_TOKEN)).toBe(input);
    }
  });

  it('round-trips amounts through parseAmount/formatInputAmount for ETH', () => {
    const inputs = ['0', '0.001', '0.5', '1', '100'];
    for (const input of inputs) {
      const raw = parseAmount(input, ETH_TOKEN);
      expect(formatInputAmount(raw, ETH_TOKEN)).toBe(input);
    }
  });

  it('formatUsd rounds to 2 fraction digits by default', () => {
    expect(formatUsd(1234500000n, { decimals: 6 })).toBe('$1,234.50');
    expect(formatUsd(0n, { decimals: 6 })).toBe('$0.00');
  });
});
