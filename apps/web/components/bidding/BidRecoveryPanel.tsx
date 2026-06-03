'use client';

import { useState } from 'react';
import { CheckCircle, Copy, Loader2, ShieldCheck, X } from 'lucide-react';
import { useAccount } from 'wagmi';
import {
  useBidRecovery,
  buildEnvelopeFingerprint,
  type BidRecoveryStatus,
} from '@/lib/hooks/useBidRecovery';
import { showToast } from '@/lib/toast';

interface BidRecoveryPanelProps {
  sessionId: string;
}

const STATUS_COPY: Record<
  BidRecoveryStatus,
  { title: string; body: string; tone: 'warning' | 'info' | 'success' }
> = {
  missing: {
    title: 'No saved bid in this browser',
    body: 'Commit a bid first. Your salt is generated locally and never sent onchain until reveal.',
    tone: 'info',
  },
  local: {
    title: 'Bid saved locally',
    body: 'Sign a backup message to durably link this bid to your wallet. Recommended before closing the tab.',
    tone: 'warning',
  },
  signed: {
    title: 'Bid signed to your wallet',
    body: 'This signature is bound to your wallet and bid fields. Keep this fingerprint for audit.',
    tone: 'success',
  },
  migrated: {
    title: 'Bid signed and verified',
    body: 'The signed envelope matches your current local salt. Reveal will use the same value.',
    tone: 'success',
  },
};

export function BidRecoveryPanel({ sessionId }: BidRecoveryPanelProps) {
  const { address, isConnected } = useAccount();
  const recovery = useBidRecovery(sessionId, address);
  const [fingerprintCopied, setFingerprintCopied] = useState(false);

  if (recovery.status === 'missing') return null;

  const copy = recovery.signedEnvelope ? buildEnvelopeFingerprint(recovery.signedEnvelope) : '';
  const copyLabel = fingerprintCopied ? 'Copied!' : 'Copy fingerprint';

  const toneClass =
    STATUS_COPY[recovery.status].tone === 'success'
      ? 'border-success/30 bg-success/5'
      : STATUS_COPY[recovery.status].tone === 'warning'
        ? 'border-warning/30 bg-warning/5'
        : 'border-divider bg-content2';

  return (
    <div className={`p-3 rounded-lg border ${toneClass}`}>
      <div className="flex items-start gap-2 mb-1">
        <ShieldCheck className="size-4 mt-0.5 shrink-0" />
        <p className="text-sm font-medium">{STATUS_COPY[recovery.status].title}</p>
      </div>
      <p className="text-xs text-default-500 mb-3">{STATUS_COPY[recovery.status].body}</p>

      {recovery.signedEnvelope ? (
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-default-400">Salt</p>
              <p className="font-mono break-all">{recovery.signedEnvelope.salt}</p>
            </div>
            <div>
              <p className="text-default-400">Amount</p>
              <p className="font-mono break-all">{recovery.signedEnvelope.amount || '0'}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-default-400">Fingerprint</p>
            <p className="font-mono text-xs break-all">{copy}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                if (typeof navigator === 'undefined' || !navigator.clipboard) return;
                navigator.clipboard.writeText(copy).then(() => {
                  setFingerprintCopied(true);
                  setTimeout(() => setFingerprintCopied(false), 2000);
                });
              }}
              className="inline-flex items-center gap-1 text-xs text-[#009F4D] hover:underline"
            >
              {fingerprintCopied ? (
                <CheckCircle className="size-3" />
              ) : (
                <Copy className="size-3" />
              )}
              {copyLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof navigator === 'undefined' || !navigator.clipboard) return;
                navigator.clipboard.writeText(
                  JSON.stringify(recovery.signedEnvelope, null, 2)
                );
                showToast.success('Recovery envelope copied');
              }}
              className="inline-flex items-center gap-1 text-xs text-default-500 hover:text-foreground"
            >
              <Copy className="size-3" />
              Copy full envelope
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={async () => {
              const envelope = await recovery.sign();
              if (envelope) {
                showToast.success('Bid signed', 'Your bid is now bound to your wallet signature.');
              } else if (recovery.signError) {
                showToast.error('Signature failed', recovery.signError.message);
              }
            }}
            disabled={!isConnected || recovery.isSigning}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-[#009F4D] text-white rounded-lg hover:bg-[#007a3d] disabled:opacity-50"
          >
            {recovery.isSigning ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <ShieldCheck className="size-3" />
            )}
            Sign bid backup
          </button>
          {!isConnected && (
            <span className="text-xs text-default-500 inline-flex items-center gap-1">
              <X className="size-3" />
              Connect wallet to sign
            </span>
          )}
        </div>
      )}
    </div>
  );
}
