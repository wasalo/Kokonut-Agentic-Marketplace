import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBiddingSalt, buildBidCommitHash } from '../useBiddingSalt';
import { encodeAbiParameters, keccak256, parseUnits } from 'viem';

describe('useBiddingSalt', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('buildBidCommitHash produces a keccak256 of (PROTOCOL_VERSION=2, sessionId, bidder, amount, message, salt)', () => {
    const salt = ('0x' + '1'.repeat(64)) as `0x${string}`;
    const bidder = '0x000000000000000000000000000000000000beef' as `0x${string}`;
    const expected = keccak256(
      encodeAbiParameters(
        [
          { type: 'uint256' },
          { type: 'uint256' },
          { type: 'address' },
          { type: 'uint256' },
          { type: 'string' },
          { type: 'bytes32' },
        ],
        [2n, 7n, bidder, parseUnits('1.5', 18), 'hello', salt]
      )
    );
    expect(buildBidCommitHash(7n, bidder, '1.5', 'hello', salt, 18)).toBe(expected);
  });

  it('initializes commitSalt from localStorage if present', () => {
    const salt = ('0x' + 'a'.repeat(64)) as `0x${string}`;
    window.localStorage.setItem('kokonut:bidding:7:salt', salt);
    const { result } = renderHook(() => useBiddingSalt(7n, false));
    expect(result.current.commitSalt).toBe(salt);
  });

  it('persists commitSalt to localStorage when changed', async () => {
    const { result } = renderHook(() => useBiddingSalt(7n, false));
    const newSalt = ('0x' + 'b'.repeat(64)) as `0x${string}`;
    act(() => {
      result.current.setCommitSalt(newSalt);
    });
    await waitFor(() => {
      expect(window.localStorage.getItem('kokonut:bidding:7:salt')).toBe(newSalt);
    });
  });

  it('persists commit amount and message to localStorage', async () => {
    const { result } = renderHook(() => useBiddingSalt(7n, false));
    act(() => {
      result.current.setCommitAmount('1.5');
      result.current.setCommitMessage('pitch text');
    });
    await waitFor(() => {
      expect(window.localStorage.getItem('kokonut:bidding:7:amount')).toBe('1.5');
      expect(window.localStorage.getItem('kokonut:bidding:7:message')).toBe('pitch text');
    });
  });

  it('regenerateSalt replaces the salt with a new value', () => {
    const { result } = renderHook(() => useBiddingSalt(7n, false));
    const original = result.current.commitSalt;
    act(() => {
      result.current.regenerateSalt();
    });
    expect(result.current.commitSalt).not.toBe(original);
    expect(result.current.commitSalt).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('clears localStorage keys when bidRevealed becomes true', async () => {
    window.localStorage.setItem('kokonut:bidding:7:salt', '0xsalt');
    window.localStorage.setItem('kokonut:bidding:7:amount', '1');
    window.localStorage.setItem('kokonut:bidding:7:message', 'msg');
    const { rerender } = renderHook(
      ({ revealed }: { revealed: boolean }) => useBiddingSalt(7n, true, revealed),
      { initialProps: { revealed: false } }
    );
    rerender({ revealed: true });
    await waitFor(() => {
      expect(window.localStorage.getItem('kokonut:bidding:7:salt')).toBeNull();
      expect(window.localStorage.getItem('kokonut:bidding:7:amount')).toBeNull();
      expect(window.localStorage.getItem('kokonut:bidding:7:message')).toBeNull();
    });
  });

  it('persistCommitForReveal moves commit values into reveal slots', () => {
    const { result } = renderHook(() => useBiddingSalt(7n, false));
    act(() => {
      result.current.setCommitAmount('2.0');
      result.current.setCommitMessage('final pitch');
    });
    act(() => {
      result.current.persistCommitForReveal();
    });
    expect(result.current.revealAmount).toBe('2.0');
    expect(result.current.revealMessage).toBe('final pitch');
  });
});
