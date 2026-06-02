'use client';

import { useCallback, useEffect, useState } from 'react';
import { encodeAbiParameters, keccak256, parseUnits } from 'viem';
import { copyTextToClipboard, generateSalt } from '@/lib/crypto';

/// @notice Phase 45b O-1: hash now binds to (sessionId, bidder, amount, message, salt).
///         This is the form the contract computes in revealBid — it must match exactly
///         or the reveal reverts with BiddingSystem__Invalid_commitment.
export function buildBidCommitHash(
  sessionId: bigint,
  bidder: `0x${string}`,
  amount: string,
  message: string,
  salt: `0x${string}`,
  decimals = 18
): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [
        { type: 'uint256' },
        { type: 'address' },
        { type: 'uint256' },
        { type: 'string' },
        { type: 'bytes32' },
      ],
      [sessionId, bidder, parseUnits(amount, decimals), message, salt]
    )
  );
}

export function useBiddingSalt(sessionId: bigint, hasUnrevealedBid: boolean, bidRevealed?: boolean) {
  const saltStorageKey = `kokonut:bidding:${sessionId.toString()}:salt`;
  const amountStorageKey = `kokonut:bidding:${sessionId.toString()}:amount`;
  const messageStorageKey = `kokonut:bidding:${sessionId.toString()}:message`;

  const [commitAmount, setCommitAmount] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [commitSalt, setCommitSalt] = useState(() => {
    if (typeof window === 'undefined') return generateSalt();
    return window.localStorage.getItem(saltStorageKey) || (hasUnrevealedBid ? '' : generateSalt());
  });
  const [revealAmount, setRevealAmount] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(amountStorageKey) || '';
  });
  const [revealMessage, setRevealMessage] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(messageStorageKey) || '';
  });
  const [saltCopied, setSaltCopied] = useState(false);

  useEffect(() => {
    if (!commitSalt) return;
    window.localStorage.setItem(saltStorageKey, commitSalt);
  }, [saltStorageKey, commitSalt]);

  useEffect(() => {
    if (typeof window === 'undefined' || !hasUnrevealedBid) return;
    const storedSalt = window.localStorage.getItem(saltStorageKey);
    setCommitSalt(storedSalt || '');
  }, [hasUnrevealedBid, saltStorageKey]);

  useEffect(() => {
    if (!commitAmount) return;
    window.localStorage.setItem(amountStorageKey, commitAmount);
  }, [amountStorageKey, commitAmount]);

  useEffect(() => {
    window.localStorage.setItem(messageStorageKey, commitMessage);
  }, [messageStorageKey, commitMessage]);

  useEffect(() => {
    if (!bidRevealed) return;
    window.localStorage.removeItem(saltStorageKey);
    window.localStorage.removeItem(amountStorageKey);
    window.localStorage.removeItem(messageStorageKey);
  }, [bidRevealed, saltStorageKey, amountStorageKey, messageStorageKey]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (hasUnrevealedBid && commitSalt) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnrevealedBid, commitSalt]);

  const copySalt = useCallback(() => {
    if (!commitSalt) return;
    copyTextToClipboard(commitSalt);
    setSaltCopied(true);
    setTimeout(() => setSaltCopied(false), 2000);
  }, [commitSalt]);

  const regenerateSalt = useCallback(() => {
    const newSalt = generateSalt();
    setCommitSalt(newSalt);
    setSaltCopied(false);
  }, []);

  const persistCommitForReveal = useCallback(() => {
    window.localStorage.setItem(amountStorageKey, commitAmount);
    window.localStorage.setItem(messageStorageKey, commitMessage);
    setRevealAmount(commitAmount);
    setRevealMessage(commitMessage);
  }, [amountStorageKey, messageStorageKey, commitAmount, commitMessage]);

  return {
    commitAmount,
    commitMessage,
    commitSalt,
    revealAmount,
    revealMessage,
    saltCopied,
    setCommitAmount,
    setCommitMessage,
    setCommitSalt,
    regenerateSalt,
    setRevealAmount,
    setRevealMessage,
    copySalt,
    persistCommitForReveal,
  };
}
