'use client';

import { useAccount, useReadContract } from 'wagmi';
import { Settings, AlertCircle, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';
import { Card } from '@heroui/react';
import { CONTRACTS } from '@/lib/wagmi';
import { AGENTIC_COMMERCE_ABI } from '@/lib/contracts/abis';

const AGENTIC_COMMERCE_ADDRESS = CONTRACTS[11155111].agenticCommerce as `0x${string}`;

export default function AdminPage(): JSX.Element {
  const { isConnected } = useAccount();

  const { data: feeDenominator, isLoading: feeLoading } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'FEE_DENOMINATOR',
  });

  const { data: evaluatorFeeBp, isLoading: evaluatorFeeLoading } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'EVALUATOR_FEE_BP',
  });

  const jobCounter = 0; // Placeholder - count not available in public ABI

  const platformFeePercent = evaluatorFeeBp ? Number(evaluatorFeeBp) / 100 : 1;

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
                <p className="text-sm text-default-400 mb-1">Total Proposals Created</p>
                <p className="text-2xl font-bold">{jobCounter?.toString() || '0'}</p>
              </div>
              <div className="p-4 bg-content2 rounded-lg">
                <p className="text-sm text-default-400 mb-1">Evaluator Fee (basis points)</p>
                <p className="text-2xl font-bold text-success">{evaluatorFeeBp?.toString() || '0'}</p>
              </div>
              <div className="p-4 bg-content2 rounded-lg">
                <p className="text-sm text-default-400 mb-1">Platform Fee (basis points)</p>
                <p className="text-2xl font-bold text-success">{feeDenominator?.toString() || '0'}</p>
              </div>
            </div>
          </Card>

          {/* Platform Fee Settings */}
          <Card className="border border-divider p-6">
            <h2 className="text-lg font-semibold mb-4">Platform Fee Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-default-500 mb-2 block">
                  Current Evaluator Fee
                </label>
                <div className="p-4 bg-content2 rounded-lg">
                  <p className="text-2xl font-bold text-success">{platformFeePercent}%</p>
                  <p className="text-xs text-default-400 mt-1">
                    Fee is charged on job payments (in basis points)
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-default-500 mb-2 block">
                  Current Platform Fee Denominator
                </label>
                <div className="p-4 bg-content2 rounded-lg">
                  <p className="text-2xl font-bold text-success">{feeDenominator}%</p>
                  <p className="text-xs text-default-400 mt-1">
                    Denominator for platform fee calculation
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Contract Links */}
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
                <p className="font-medium text-warning">Write Access Not Available</p>
                <p className="text-sm text-default-500 mt-1">
                  Write functions (setTreasury, setFeeDenominator, etc.) are available in the full contract but require direct contract interaction or a separate admin interface.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}