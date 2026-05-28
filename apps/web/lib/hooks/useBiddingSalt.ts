'use client';

import { useCallback, useEffect, useState } from 'react';
import { encodeAbiParameters, keccak256, parseEther } from 'viem';
import { copyTextToClipboard, generateSalt } from '@/lib/crypto';

export function buildBidCommitHash(
  amountEth: string,
  message: string,
  salt: `0x${string}`
): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [{ type: 'uint256' }, { type: 'string' }, { type: 'bytes32' }],
      [parseEther(amountEth), message, salt]
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
    return window.localStorage.getItem(saltStorageKey) || generateSalt();
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
    window.localStorage.setItem(saltStorageKey, commitSalt);
  }, [saltStorageKey, commitSalt]);

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
    copyTextToClipboard(commitSalt);
    setSaltCopied(true);
    setTimeout(() => setSaltCopied(false), 2000);
  }, [commitSalt]);

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
    setRevealAmount,
    setRevealMessage,
    copySalt,
    persistCommitForReveal,
  };
}
