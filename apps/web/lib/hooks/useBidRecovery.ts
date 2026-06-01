'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSignMessage } from 'wagmi';
import { keccak256, stringToHex } from 'viem';
import { buildBidCommitHash } from '@/lib/hooks/useBiddingSalt';

export type BidRecoveryStatus = 'missing' | 'local' | 'signed' | 'migrated';

export interface SignedBidEnvelope {
  sessionId: string;
  address: string;
  salt: string;
  amount: string;
  message: string;
  signature: string;
  signedAt: number;
}

export interface BidRecovery {
  salt: string;
  amount: string;
  message: string;
  status: BidRecoveryStatus;
  signedEnvelope: SignedBidEnvelope | null;
  sign: () => Promise<SignedBidEnvelope | null>;
  isSigning: boolean;
  signError: Error | null;
  verify: (input: { salt: string; amount: string; message: string }) => boolean;
}

const SALT_KEY = (sessionId: string) => `kokonut:bidding:${sessionId}:salt`;
const AMOUNT_KEY = (sessionId: string) => `kokonut:bidding:${sessionId}:amount`;
const MESSAGE_KEY = (sessionId: string) => `kokonut:bidding:${sessionId}:message`;
const SIGNED_KEY = (sessionId: string, address: string) =>
  `kokonut:bid:signed:${sessionId}:${address.toLowerCase()}`;

function readLocalFields(sessionId: string): { salt: string; amount: string; message: string } {
  if (typeof window === 'undefined') return { salt: '', amount: '', message: '' };
  return {
    salt: localStorage.getItem(SALT_KEY(sessionId)) || '',
    amount: localStorage.getItem(AMOUNT_KEY(sessionId)) || '',
    message: localStorage.getItem(MESSAGE_KEY(sessionId)) || '',
  };
}

function readSignedEnvelope(sessionId: string, address?: string): SignedBidEnvelope | null {
  if (typeof window === 'undefined' || !address) return null;
  try {
    const raw = localStorage.getItem(SIGNED_KEY(sessionId, address));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SignedBidEnvelope;
    if (parsed.address.toLowerCase() !== address.toLowerCase()) return null;
    if (parsed.sessionId !== sessionId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persistSignedEnvelope(envelope: SignedBidEnvelope): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SIGNED_KEY(envelope.sessionId, envelope.address), JSON.stringify(envelope));
}

export function useBidRecovery(
  sessionId: string | bigint | undefined,
  address: `0x${string}` | undefined
): BidRecovery {
  const sessionKey = sessionId?.toString();
  const [snapshot, setSnapshot] = useState<{
    salt: string;
    amount: string;
    message: string;
  }>({ salt: '', amount: '', message: '' });
  const [signedEnvelope, setSignedEnvelope] = useState<SignedBidEnvelope | null>(null);
  const { signMessageAsync, isPending: isSigning, error: signError } = useSignMessage();

  useEffect(() => {
    if (!sessionKey) {
      setSnapshot({ salt: '', amount: '', message: '' });
      setSignedEnvelope(null);
      return;
    }
    setSnapshot(readLocalFields(sessionKey));
    setSignedEnvelope(readSignedEnvelope(sessionKey, address));
  }, [sessionKey, address]);

  const sign = useCallback(async (): Promise<SignedBidEnvelope | null> => {
    if (!sessionKey || !address) return null;
    const fields = readLocalFields(sessionKey);
    if (!fields.salt) return null;

    const humanReadable = `Kokonut Bidding\nSession: ${sessionKey}\nAddress: ${address}\nSalt: ${fields.salt}`;

    try {
      const signature = await signMessageAsync({
        account: address,
        message: humanReadable,
      });
      const envelope: SignedBidEnvelope = {
        sessionId: sessionKey,
        address: address.toLowerCase(),
        salt: fields.salt,
        amount: fields.amount,
        message: fields.message,
        signature,
        signedAt: Date.now(),
      };
      persistSignedEnvelope(envelope);
      setSignedEnvelope(envelope);
      return envelope;
    } catch (err) {
      return null;
    }
  }, [sessionKey, address, signMessageAsync]);

  const verify = useCallback(
    (input: { salt: string; amount: string; message: string }): boolean => {
      if (!signedEnvelope) return false;
      return (
        signedEnvelope.salt === input.salt &&
        signedEnvelope.amount === input.amount &&
        signedEnvelope.message === input.message
      );
    },
    [signedEnvelope]
  );

  const status: BidRecoveryStatus = !snapshot.salt
    ? 'missing'
    : signedEnvelope
      ? signedEnvelope.salt === snapshot.salt
        ? 'migrated'
        : 'signed'
      : 'local';

  return {
    salt: snapshot.salt,
    amount: snapshot.amount,
    message: snapshot.message,
    status,
    signedEnvelope,
    sign,
    isSigning,
    signError: signError as Error | null,
    verify,
  };
}

export function importBidFromEnvelope(envelope: SignedBidEnvelope): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SALT_KEY(envelope.sessionId), envelope.salt);
  if (envelope.amount) localStorage.setItem(AMOUNT_KEY(envelope.sessionId), envelope.amount);
  if (envelope.message) localStorage.setItem(MESSAGE_KEY(envelope.sessionId), envelope.message);
  persistSignedEnvelope(envelope);
}

export function buildEnvelopeFingerprint(envelope: SignedBidEnvelope): `0x${string}` {
  return keccak256(
    stringToHex(
      JSON.stringify({
        sessionId: envelope.sessionId,
        address: envelope.address,
        salt: envelope.salt,
        amount: envelope.amount,
        message: envelope.message,
      })
    )
  );
}

export function isCommitHashMatch(
  envelope: SignedBidEnvelope,
  commitHash: `0x${string}`,
  decimals = 18
): boolean {
  return buildBidCommitHash(envelope.amount, envelope.message, envelope.salt as `0x${string}`, decimals) === commitHash;
}
