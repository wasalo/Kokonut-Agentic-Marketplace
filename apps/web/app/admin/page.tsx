'use client';

import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Settings, AlertCircle, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';
import { Card } from '@heroui/react';
import { CONTRACTS } from '@/lib/wagmi';
import { AGENTIC_COMMERCE_ABI } from '@/lib/contracts/abis';

const AGENTIC_COMMERCE_ADDRESS = CONTRACTS[11155111].agenticCommerce as `0x${string}`;

export default function AdminPage(): JSX.Element {
  const { address, isConnected } = useAccount();
  const [newTreasury, setNewTreasury] = useState('');
  const [treasuryInput, setTreasuryInput] = useState('');

  const { data: treasury, isLoading: treasuryLoading } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'platformTreasury',
  });

  const { data: platformFeeBp } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'platformFeeBP',
  });

  const { data: jobCounter } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'jobCounter',
  });

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const platformFeePercent = platformFeeBp ? Number(platformFeeBp) / 100 : 1;

  const handleUpdateTreasury = () => {
    if (!treasuryInput || !treasuryInput.match(/^0x[a-fA-F0-9]{40}$/)) {
      return;
    }
    writeContract({
      address: AGENTIC_COMMERCE_ADDRESS,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'setPlatformTreasury',
      args: [treasuryInput as `0x${string}`],
    });
    setTreasuryInput('');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Settings className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-default-500">Manage AgenticCommerce contract settings</p>
        </div>
      </div>

      {!isConnected ? (
        <Card className="border border-divider p-8 text-center">
          <AlertCircle className="w-12 h-12 text-default-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Wallet Not Connected</h2>
          <p className="text-default-500">Connect your wallet to access the admin dashboard.</p>
        </Card>
      ) : (
        <div className="space-y-6 max-w-3xl">
          {/* Contract Info */}
          <Card className="border border-divider p-6">
            <h2 className="text-lg font-semibold mb-4">Contract Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-content2 rounded-lg">
                <p className="text-sm text-default-400 mb-1">Contract Address</p>
                <p className="font-mono text-sm break-all">{AGENTIC_COMMERCE_ADDRESS}</p>
              </div>
              <div className="p-4 bg-content2 rounded-lg">
                <p className="text-sm text-default-400 mb-1">Total Jobs Created</p>
                <p className="text-2xl font-bold">{jobCounter ? jobCounter.toString() : '0'}</p>
              </div>
              <div className="p-4 bg-content2 rounded-lg">
                <p className="text-sm text-default-400 mb-1">Platform Fee</p>
                <p className="text-2xl font-bold text-success">{platformFeePercent}%</p>
              </div>
            </div>
          </Card>

          {/* Treasury Settings */}
          <Card className="border border-divider p-6">
            <h2 className="text-lg font-semibold mb-4">Treasury Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-default-500 mb-2 block">
                  Current Treasury Address
                </label>
                <div className="flex items-center gap-2 p-4 bg-content2 rounded-lg">
                  {treasuryLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-default-400" />
                  ) : (
                    <>
                      <p className="font-mono text-sm flex-1">
                        {treasury ? treasury.toString() : 'Loading...'}
                      </p>
                      {treasury && (
                        <a
                          href={`https://sepolia.etherscan.io/address/${treasury}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 text-sm"
                        >
                          View on Etherscan
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-default-500 mb-2 block">
                  Update Treasury Address
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="0x..."
                    value={treasuryInput}
                    onChange={e => setTreasuryInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  />
                  <button
                    onClick={handleUpdateTreasury}
                    disabled={
                      isPending || !treasuryInput || !treasuryInput.match(/^0x[a-fA-F0-9]{40}$/)
                    }
                    className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isPending || isConfirming ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {isConfirming ? 'Confirming...' : 'Waiting...'}
                      </>
                    ) : (
                      'Update'
                    )}
                  </button>
                </div>
                {treasuryInput && !treasuryInput.match(/^0x[a-fA-F0-9]{40}$/) && (
                  <p className="text-xs text-danger mt-1">Invalid Ethereum address format</p>
                )}
              </div>

              {isSuccess && (
                <div className="flex items-center gap-2 p-3 bg-success/10 rounded-lg text-success text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Treasury updated successfully!
                </div>
              )}

              {writeError && (
                <div className="flex items-start gap-2 p-3 bg-danger/10 rounded-lg text-danger text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Transaction failed: {writeError.message}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Links */}
          <Card className="border border-divider p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href={`https://sepolia.etherscan.io/address/${AGENTIC_COMMERCE_ADDRESS}#readContract`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 bg-content2 rounded-lg hover:bg-content3 transition-colors"
              >
                <p className="font-medium text-primary">Read Contract</p>
                <p className="text-sm text-default-400 mt-1">View contract state on Etherscan</p>
              </a>
              <a
                href={`https://sepolia.etherscan.io/address/${AGENTIC_COMMERCE_ADDRESS}#writeContract`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 bg-content2 rounded-lg hover:bg-content3 transition-colors"
              >
                <p className="font-medium text-primary">Write Contract</p>
                <p className="text-sm text-default-400 mt-1">Interact with contract on Etherscan</p>
              </a>
            </div>
          </Card>

          {/* Warning */}
          <Card className="border border-warning/30 bg-warning/5 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-warning">Admin Access Required</p>
                <p className="text-sm text-default-500 mt-1">
                  Only the contract owner can modify treasury settings. Owner-only functions will
                  fail if called from a non-owner address.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
