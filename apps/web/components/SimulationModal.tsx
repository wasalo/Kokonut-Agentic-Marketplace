'use client';

import { useState } from 'react';
import { AlertTriangle, ArrowRight, XCircle, X } from 'lucide-react';
import type { SimulationResult } from '@/lib/simulation';
import type { GuardBlocker } from '@/lib/hooks/usePreTransactionGuard';

interface SimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  simulation: SimulationResult;
  blockers: GuardBlocker[];
  isConfirming: boolean;
  txHash?: `0x${string}`;
}

export function SimulationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  simulation,
  blockers,
  isConfirming,
  txHash,
}: SimulationModalProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'details'>('summary');
  const hasBlockers = blockers.length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background border border-divider rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-divider">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 text-default-400 hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-divider">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              activeTab === 'summary'
                ? 'text-foreground border-b-2 border-primary'
                : 'text-default-500 hover:text-foreground'
            }`}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              activeTab === 'details'
                ? 'text-foreground border-b-2 border-primary'
                : 'text-default-500 hover:text-foreground'
            }`}
          >
            Details
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {activeTab === 'summary' && (
            <>
              {/* Token Changes */}
              {simulation.tokenBalanceChanges.map((change, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-content2 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">{change.reason}</p>
                    <p className="text-xs text-default-500">{change.symbol}</p>
                  </div>
                  <span
                    className={`font-mono font-bold text-sm ${
                      change.change < 0 ? 'text-red-400' : 'text-green-400'
                    }`}
                  >
                    {change.change > 0 ? '+' : ''}
                    {change.change.toFixed(4)}
                  </span>
                </div>
              ))}

              {/* ETH for gas */}
              <div className="flex items-center justify-between p-3 bg-content2 rounded-lg">
                <div>
                  <p className="font-medium text-sm">Network fee (gas)</p>
                  <p className="text-xs text-default-500">ETH</p>
                </div>
                <span className="font-mono font-bold text-sm text-default-400">
                  ~{simulation.ethBalanceChange.toFixed(6)}
                </span>
              </div>

              {/* State Changes */}
              <div className="space-y-2">
                {simulation.stateChanges.map((change, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="text-default-500">{change.entity}</span>
                    <ArrowRight className="w-3 h-3 text-default-400" />
                    <span className="text-default-300">{change.from}</span>
                    <ArrowRight className="w-3 h-3 text-default-400" />
                    <span className="font-medium text-green-400">{change.to}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'details' && (
            <div className="font-mono text-xs space-y-2">
              <p>Gas estimate: {simulation.gasEstimate?.toString() || '—'} wei</p>
              {txHash && (
                <p className="flex items-center gap-1">
                  Transaction:{' '}
                  <a
                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  </a>
                </p>
              )}
            </div>
          )}

          {/* Warnings */}
          {simulation.warnings.map((warning, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg flex items-center gap-2 ${
                warning.severity === 'high'
                  ? 'bg-red-500/10 text-red-400'
                  : 'bg-amber-500/10 text-amber-400'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">{warning.message}</span>
            </div>
          ))}

          {/* Blockers */}
          {hasBlockers && (
            <div className="mt-4 space-y-2">
              {blockers.map((blocker, i) => (
                <div
                  key={i}
                  className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3"
                >
                  <XCircle className="w-5 h-5 text-red-400" />
                  <div className="flex-1">
                    <p className="text-sm text-red-300">{blocker.message}</p>
                  </div>
                  {blocker.action && (
                    <button
                      onClick={blocker.action.onClick}
                      className="px-3 py-1.5 text-sm bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                      {blocker.action.label}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end p-4 border-t border-divider">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-divider hover:bg-content2 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={hasBlockers || isConfirming}
            className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
              hasBlockers
                ? 'bg-default-500/20 text-default-400 cursor-not-allowed'
                : 'bg-primary hover:bg-primary-600 text-white'
            }`}
          >
            {isConfirming ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : hasBlockers ? (
              'Fix issues above'
            ) : (
              'Confirm in Wallet'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
