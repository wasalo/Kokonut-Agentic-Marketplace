'use client';

import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import NextLink from 'next/link';
import { Card } from '@heroui/react';
import { useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { useCreateProposal } from '@/lib/hooks/useProposals';
import { useChainlinkEthUsdPrice } from '@/lib/hooks/useChainlinkPrice';
import { TransactionError } from '@/components/TransactionError';
import { showToast } from '@/lib/toast';

export default function CreateProposalPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    criteriaURI: '',
    reward: '',
    decisionDeadline: '7',
    isPublicEvaluators: true, // Toggle for public/private evaluators
  });

  const { createProposal, hash: txHash, isPending, error } = useCreateProposal();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const { priceInUsd: ethPriceInUsd } = useChainlinkEthUsdPrice();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!isConnected) return;

      // Validate minimum reward
      const rewardAmount = parseFloat(formData.reward || '0');
      if (rewardAmount < 0.01) {
        showToast.warning('Minimum reward is 0.01 ETH', 'Please enter a valid reward amount');
        return;
      }

      // Calculate deadline timestamp (days from now)
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + parseInt(formData.decisionDeadline));
      const deadlineTimestamp = BigInt(Math.floor(deadlineDate.getTime() / 1000));

      await createProposal(
        formData.title,
        formData.description,
        formData.criteriaURI || `ipfs://placeholder`,
        parseEther(formData.reward),
        deadlineTimestamp
      );
    },
    [isConnected, createProposal, formData]
  );

  const updateFormField = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const togglePublicEvaluators = useCallback((isPublic: boolean) => {
    setFormData(prev => ({ ...prev, isPublicEvaluators: isPublic }));
  }, []);

  if (isConfirmed) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto text-center border border-divider cursor-default">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-success mb-2">Proposal Created!</h2>
            <p className="text-default-500 text-sm mb-4">
              Your proposal has been submitted successfully.
            </p>
            <p className="text-tiny text-default-400 mb-4 break-all">Transaction: {txHash}</p>
            <NextLink
              href="/review"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-success text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              View Proposals
            </NextLink>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <NextLink
        href="/review"
        className="flex items-center text-sm text-default-500 hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Review
      </NextLink>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Create Proposal</h1>
        <p className="text-default-500 mb-8">
          Submit a proposal for A/B evaluation with staked confidence.
        </p>

        <Card className="border border-divider cursor-default">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-2">Proposal Details</h2>
            <p className="text-default-500 text-sm mb-6">
              Define your proposal and evaluation criteria.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">
                  Title
                </label>
                <input
                  id="title"
                  type="text"
                  placeholder="e.g., Vendor Selection for Project X"
                  value={formData.title}
                  onChange={e => updateFormField('title', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description
                </label>
                <textarea
                  id="description"
                  placeholder="Describe your proposal and what you need evaluated..."
                  rows={4}
                  value={formData.description}
                  onChange={e => updateFormField('description', e.target.value)}
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="criteriaURI" className="text-sm font-medium">
                  Evaluation Criteria (IPFS URI)
                </label>
                <input
                  id="criteriaURI"
                  type="text"
                  placeholder="ipfs://..."
                  value={formData.criteriaURI}
                  onChange={e => updateFormField('criteriaURI', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="text-tiny text-default-400">
                  Link to detailed evaluation criteria stored on IPFS (optional)
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-2">
                  <label htmlFor="reward" className="text-sm font-medium">
                    Reward (ETH) <span className="text-danger">*</span>
                  </label>
                  <input
                    id="reward"
                    type="number"
                    step="0.001"
                    min="0.01"
                    placeholder="0.015"
                    value={formData.reward}
                    onChange={e => updateFormField('reward', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <p className="text-tiny text-default-400">
                    Minimum 0.01 ETH. This rewards the winning evaluator.
                  </p>
                  {formData.reward && ethPriceInUsd && ethPriceInUsd > 0 && (
                    <p className="text-xs text-default-400">
                      ≈ ${(parseFloat(formData.reward) * ethPriceInUsd).toFixed(2)} USD
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="deadline" className="text-sm font-medium">
                    Decision Deadline (days)
                  </label>
                  <input
                    id="deadline"
                    type="number"
                    min="1"
                    max="30"
                    placeholder="7"
                    value={formData.decisionDeadline}
                    onChange={e => updateFormField('decisionDeadline', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Evaluator Visibility</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="evaluatorVisibility"
                      checked={formData.isPublicEvaluators}
                      onChange={() => togglePublicEvaluators(true)}
                      className="w-4 h-4 text-success"
                    />
                    <div>
                      <span className="text-sm font-medium">Public</span>
                      <p className="text-tiny text-default-400">
                        All evaluators and their stakes are visible
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="evaluatorVisibility"
                      checked={!formData.isPublicEvaluators}
                      onChange={() => togglePublicEvaluators(false)}
                      className="w-4 h-4 text-success"
                    />
                    <div>
                      <span className="text-sm font-medium">Private</span>
                      <p className="text-tiny text-default-400">
                        Evaluators remain anonymous until decision
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <TransactionError error={error} />

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={!isConnected || isPending || isConfirming}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-[#009F4D] text-[#009F4D] font-semibold rounded-lg hover:bg-[#009F4D]/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending || isConfirming ? 'Creating...' : 'Create Proposal'}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-divider text-foreground font-medium rounded-lg hover:bg-content2 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
