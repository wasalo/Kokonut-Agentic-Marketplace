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

// ============== Cross-device recovery (Phase 45d) ==============

/// @notice Encode a signed envelope as a portable base64url string for QR codes
///        or copy-paste. Use decodeEnvelope() to recover the envelope on another device.
export function exportEnvelope(envelope: SignedBidEnvelope): string {
  if (typeof window === 'undefined') return '';
  const json = JSON.stringify(envelope);
  // base64url encoding (btoa + url-safe substitutions)
  const b64 = btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return b64;
}

/// @notice Decode a base64url string back into a SignedBidEnvelope. Validates
///        the address/sessionId match before returning.
export function decodeEnvelope(
  encoded: string,
  expected?: { sessionId?: string; address?: string }
): SignedBidEnvelope | null {
  if (typeof window === 'undefined' || !encoded) return null;
  try {
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (padded.length % 4)) % 4;
    const b64 = padded + '='.repeat(padLen);
    const json = atob(b64);
    const parsed = JSON.parse(json) as SignedBidEnvelope;
    if (expected?.sessionId && parsed.sessionId !== expected.sessionId) return null;
    if (expected?.address && parsed.address.toLowerCase() !== expected.address.toLowerCase()) return null;
    return parsed;
  } catch {
    return null;
  }
}

/// @notice Build a mailto: URI for email-based recovery. The envelope is
///        embedded in the subject (short envelopes only — long ones should
///        use a QR code or a storage service). Recipients click the link and
///        are guided to the recovery panel.
export function buildEmailRecoveryLink(
  envelope: SignedBidEnvelope,
  options: { recipient?: string; appOrigin?: string } = {}
): string {
  const encoded = exportEnvelope(envelope);
  const origin = options.appOrigin || (typeof window !== 'undefined' ? window.location.origin : 'https://kokonut.network');
  const recoveryUrl = `${origin}/bidding/${envelope.sessionId}/recover?envelope=${encoded}`;
  const subject = encodeURIComponent(`Kokonut Bid Recovery: Session #${envelope.sessionId}`);
  const body = encodeURIComponent(
    `Open this link on a device where you want to recover your bid:\n\n${recoveryUrl}\n\n` +
    `Or paste the envelope into the recovery panel:\n\n${encoded}`
  );
  const to = options.recipient ? `&to=${encodeURIComponent(options.recipient)}` : '';
  return `mailto:?subject=${subject}&body=${body}${to}`;
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
  return (
    buildBidCommitHash(
      BigInt(envelope.sessionId),
      envelope.address as `0x${string}`,
      envelope.amount,
      envelope.message,
      envelope.salt as `0x${string}`,
      decimals
    ) === commitHash
  );
}
