'use client';

import { useState, useCallback } from 'react';
import { useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { Card } from '@heroui/react';
import { Shield, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { parseEther } from 'viem';
import {
  useIsSigner,
  useSigners,
  useRequiredConfirmations,
  useCreateSlashProposal,
  useConfirmSlashProposal,
  useExecuteSlashProposal,
  useExecutionDelay,
  useMaxSlashAmount,
  useSlashManagerOwner,
} from '@/lib/hooks/useSlashManager';

export default function GovernancePage() {
  const { isConnected, address } = useAccount();
  const [txStep, setTxStep] = useState<string | null>(null);

  // Slash Manager hooks
  const { isSigner: isUserSigner } = useIsSigner(address);
  const { signers } = useSigners();
  const { required } = useRequiredConfirmations();
  const { delayInHours } = useExecutionDelay();
  const { maxAmountInEth } = useMaxSlashAmount();
  const { owner: contractOwner } = useSlashManagerOwner();

  const {
    createProposal,
    hash: createHash,
    isPending: isCreatePending,
    error: createError,
  } = useCreateSlashProposal();

  const {
    confirm: confirmProposal,
    hash: confirmHash,
    isPending: isConfirmPending,
  } = useConfirmSlashProposal();

  const {
    execute: executeProposal,
    hash: executeHash,
    isPending: isExecutePending,
  } = useExecuteSlashProposal();

  // Create proposal form
  const [evaluator, setEvaluator] = useState('');
  const [targetProposalId, setTargetProposalId] = useState('');
  const [slashAmount, setSlashAmount] = useState('0.1');
  const [slashReason, setSlashReason] = useState('');
  const [confirmProposalId, setConfirmProposalId] = useState('');
  const [executeProposalId, setExecuteProposalId] = useState('');

  // Watch transaction status
  const txHash = createHash || confirmHash || executeHash;
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  if (isSuccess && txStep) {
    setTxStep(null);
  }

  const handleCreateProposal = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setTxStep('Creating slash proposal');

      createProposal(
        evaluator as `0x${string}`,
        BigInt(targetProposalId),
        parseEther(slashAmount),
        slashReason
      );
    },
    [evaluator, targetProposalId, slashAmount, slashReason, createProposal]
  );

  const handleConfirmProposal = useCallback(() => {
    if (!confirmProposalId) return;
    setTxStep('Confirming slash proposal');
    confirmProposal(confirmProposalId as `0x${string}`);
  }, [confirmProposalId, confirmProposal]);

  const handleExecuteProposal = useCallback(() => {
    if (!executeProposalId) return;
    setTxStep('Executing slash proposal');
    executeProposal(executeProposalId as `0x${string}`);
  }, [executeProposalId, executeProposal]);

  const isOwner = address && contractOwner && address.toLowerCase() === contractOwner.toLowerCase();
  const anyPending = isCreatePending || isConfirmPending || isExecutePending;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            Governance
          </h1>
          <p className="text-default-500 mt-1">
            {required?.toString() || '3'}-of-{signers?.length || '5'} multisig governance for
            evaluator slashing decisions.
          </p>
        </div>

        {/* Signer Status */}
        {isConnected && (
          <Card className="border border-divider mb-6 p-4">
            <div className="flex items-center gap-3">
              {isUserSigner ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <div>
                    <p className="text-sm font-medium">You are a signer</p>
                    <p className="text-xs text-default-400">You can confirm proposals</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  <div>
                    <p className="text-sm font-medium">Not a signer</p>
                    <p className="text-xs text-default-400">View-only access to governance</p>
                  </div>
                </>
              )}
            </div>
          </Card>
        )}

        {/* Create Slash Proposal (owner only) */}
        {isOwner && (
          <Card className="border border-danger/30 p-6 mb-6">
            <h2 className="text-base font-semibold mb-4 text-danger flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Create Slash Proposal
            </h2>
            <form onSubmit={handleCreateProposal} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Evaluator Address</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={evaluator}
                  onChange={e => setEvaluator(e.target.value)}
                  required
                  className="w-full mt-1 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-danger"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="text-sm font-medium">Target Proposal ID</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={targetProposalId}
                    onChange={e => setTargetProposalId(e.target.value)}
                    required
                    className="w-full mt-1 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-danger"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Slash Amount (ETH)</label>
                  <input
                    type="number"
                    step="0.01"
                    max={maxAmountInEth || 100}
                    value={slashAmount}
                    onChange={e => setSlashAmount(e.target.value)}
                    required
                    className="w-full mt-1 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-danger"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Reason</label>
                <textarea
                  placeholder="Why this evaluator should be slashed..."
                  value={slashReason}
                  onChange={e => setSlashReason(e.target.value)}
                  rows={2}
                  required
                  className="w-full mt-1 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-danger resize-none"
                />
              </div>
              {createError && (
                <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger text-sm">
                  {createError.message}
                </div>
              )}
              <button
                type="submit"
                disabled={isCreatePending || anyPending}
                className="w-full px-6 py-3 bg-danger text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
              >
                {isCreatePending ? 'Creating...' : 'Create Slash Proposal'}
              </button>
            </form>
          </Card>
        )}

        {/* Confirm Proposal (signers only) */}
        {isUserSigner && (
          <Card className="border border-primary/30 p-6 mb-6">
            <h2 className="text-base font-semibold mb-4 text-primary flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Confirm Proposal
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Proposal ID</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={confirmProposalId}
                  onChange={e => setConfirmProposalId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button
                onClick={handleConfirmProposal}
                disabled={!confirmProposalId || isConfirmPending || anyPending}
                className="w-full px-6 py-3 bg-primary text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
              >
                {isConfirmPending ? 'Confirming...' : 'Confirm Proposal'}
              </button>
            </div>
          </Card>
        )}

        {/* Execute Proposal (anyone after timelock) */}
        <Card className="border border-success/30 p-6 mb-6">
          <h2 className="text-base font-semibold mb-4 text-success flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Execute Proposal
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Proposal ID</label>
              <input
                type="text"
                placeholder="0x..."
                value={executeProposalId}
                onChange={e => setExecuteProposalId(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-success"
              />
            </div>
            <button
              onClick={handleExecuteProposal}
              disabled={!executeProposalId || isExecutePending || anyPending}
              className="w-full px-6 py-3 bg-success text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
            >
              {isExecutePending ? 'Executing...' : 'Execute Proposal'}
            </button>
          </div>
        </Card>

        {/* Transaction Status */}
        {txStep && (
          <Card className="border border-primary/20 p-4 mb-6">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <p className="text-sm font-medium text-primary">{txStep}...</p>
            </div>
          </Card>
        )}

        {/* Info */}
        <Card className="border border-divider p-6">
          <h2 className="text-base font-semibold mb-4">How Slashing Works</h2>
          <div className="space-y-3 text-sm text-default-600">
            <div className="flex items-start gap-2">
              <span className="font-bold text-primary">1.</span>
              <p>The owner creates a slash proposal identifying a dishonest evaluator.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-primary">2.</span>
              <p>
                {required?.toString() || '3'} out of {signers?.length || '5'} signers must confirm
                the proposal.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-primary">3.</span>
              <p>
                After {required?.toString() || '3'} confirmations, a {delayInHours || '1'}-hour
                timelock begins.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-primary">4.</span>
              <p>After the timelock, anyone can execute the proposal.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-primary">5.</span>
              <p>Max slash amount: {maxAmountInEth || '100'} ETH. Prevents catastrophic loss.</p>
            </div>
          </div>

          {/* Signers List */}
          {signers && signers.length > 0 && (
            <div className="mt-4 pt-4 border-t border-divider">
              <p className="text-sm font-medium mb-2">Current Signers:</p>
              <div className="space-y-1">
                {signers.map((signer, idx) => (
                  <p key={signer} className="text-xs text-default-400 font-mono">
                    {idx + 1}. {signer.slice(0, 10)}...{signer.slice(-6)}
                  </p>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
