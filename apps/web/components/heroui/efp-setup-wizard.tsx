'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Card } from '@heroui/react';
import {
  CheckCircle,
  Circle,
  Loader,
  AlertTriangle,
  ExternalLink,
  ArrowRight,
  Wallet,
  List,
  Star,
} from 'lucide-react';
import { useEfpListStatus, useEfpMintList, useEfpSetPrimary } from '@/lib/hooks';
import { EFP_EXPLORER_URL } from '@/lib/efp/contracts';

const STEPS = [
  {
    id: 'intro',
    title: 'Welcome to EFP',
    description: 'Set up your Ethereum Follow Protocol list to follow agents',
  },
  {
    id: 'mint',
    title: 'Mint EFP List NFT',
    description: 'Create your free EFP List (just pay gas on Ethereum mainnet)',
  },
  {
    id: 'primary',
    title: 'Set as Primary List',
    description: 'Make this your primary list so follows count',
  },
  {
    id: 'done',
    title: 'All Set!',
    description: 'You can now follow agents across the marketplace',
  },
];

interface EfpSetupWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export function EfpSetupWizard({ onComplete, onCancel }: EfpSetupWizardProps) {
  const { address } = useAccount();
  const [currentStep, setCurrentStep] = useState(0);

  const { hasList, hasPrimaryList, isLoading: isCheckingList } = useEfpListStatus(address);
  const {
    mintList,
    isPending: isMinting,
    isConfirming: isMintConfirming,
    isConfirmed: isMintConfirmed,
    hash: mintHash,
    error: mintError,
  } = useEfpMintList(address);

  const {
    setPrimaryList,
    isPending: isSettingPrimary,
    isConfirming: isPrimaryConfirming,
    isConfirmed: isPrimaryConfirmed,
    hash: primaryHash,
    error: primaryError,
  } = useEfpSetPrimary(address);

  const handleMint = async () => {
    try {
      await mintList();
      setCurrentStep(2);
    } catch {
      // error handled by hook
    }
  };

  const handleSetPrimary = async () => {
    try {
      await setPrimaryList(BigInt(1));
      setCurrentStep(3);
    } catch {
      // error handled by hook
    }
  };

  const isStepActive = (index: number) => currentStep === index;
  const isStepDone = (index: number) => currentStep > index;

  if (!address) {
    return (
      <Card className="bg-content2 border-divider p-8 text-center">
        <Wallet className="size-122 text-default-400 mx-auto mb-4" />
        <p className="text-default-500">Connect your wallet to set up EFP</p>
      </Card>
    );
  }

  if (isCheckingList) {
    return (
      <Card className="bg-content2 border-divider p-8 text-center">
        <Loader className="size-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-default-500">Checking your EFP setupâ¦</p>
      </Card>
    );
  }

  const btnBase = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="space-y-6">
      {/* Step progress indicator */}
      <div className="flex items-center gap-2 md:gap-4 mb-6 overflow-x-auto pb-2">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-2">
              {isStepDone(i) ? (
                <CheckCircle className="size-5 text-success" />
              ) : isStepActive(i) ? (
                <div className="size-5 rounded-full bg-primary flex items-center justify-center">
                  <div className="size-2 rounded-full bg-white" />
                </div>
              ) : (
                <Circle className="size-5 text-default-300" />
              )}
              <span
                className={`text-xs font-medium ${
                  isStepActive(i) ? 'text-foreground' : 'text-default-400'
                }`}
              >
                {step.title}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <ArrowRight className="size-4 text-default-300" />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card className="bg-content2 border-divider">
        <div className="p-6">
          {currentStep === 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Welcome to the Social Graph</h2>
              <p className="text-default-500">
                The Ethereum Follow Protocol (EFP) powers the social layer of the Kokonut Agent
                Economy. By setting up an EFP List, you&apos;ll be able to:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle className="size-4 text-success shrink-0 mt-0.5" />
                  <span>Follow agents and see their on-chain activity</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle className="size-4 text-success shrink-0 mt-0.5" />
                  <span>Build your agent network and discover new talent</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle className="size-4 text-success shrink-0 mt-0.5" />
                  <span>Show your followers count on your agent profile</span>
                </li>
              </ul>
              {hasList && (
                <div className="flex items-center gap-2 p-3 bg-success-50 text-success-700 rounded-lg text-sm">
                  <CheckCircle className="size-4 shrink-0" />
                  You already have an EFP List! {hasPrimaryList ? 'It is set as primary.' : 'Set it as primary below.'}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                {!hasList && (
                  <button type="button" className={`${btnBase} bg-primary text-white hover:bg-primary/90`} onClick={() => setCurrentStep(1)}>
                    Get Started
                  </button>
                )}
                {hasList && !hasPrimaryList && (
                  <button type="button" className={`${btnBase} bg-primary text-white hover:bg-primary/90`} onClick={() => setCurrentStep(2)}>
                    Set Primary List
                  </button>
                )}
                {hasList && hasPrimaryList && (
                  <button type="button" className={`${btnBase} bg-success text-white hover:bg-success/90`} onClick={onComplete}>
                    You&apos;re All Set â Continue
                  </button>
                )}
                {onCancel && (
                  <button type="button" className={`${btnBase} bg-default-100 text-default-700 hover:bg-default-200`} onClick={onCancel}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <List className="size-5 text-primary" />
                Mint Your EFP List
              </h2>
              <p className="text-default-500 text-sm">
                Minting an EFP List NFT is free (just pay gas). You&apos;ll need a small amount of ETH
                on Ethereum mainnet for the transaction.
              </p>

              <div className="p-3 bg-warning-50 text-warning-700 rounded-lg text-sm flex items-start gap-2">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <span>
                  This transaction requires Ethereum mainnet. Your wallet will be prompted to switch
                  chains if needed.
                </span>
              </div>

              {mintError && (
                <div className="p-3 bg-danger-50 text-danger-700 rounded-lg text-sm flex items-start gap-2">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <span>Error: {mintError.message}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button"
                  className={`${btnBase} bg-primary text-white hover:bg-primary/90`}
                  onClick={handleMint}
                  disabled={isMinting || isMintConfirming || isMintConfirmed}
                >
                  {(isMinting || isMintConfirming) && <Loader className="size-4 animate-spin" />}
                  {isMintConfirming ? 'Confirming…' : isMinting ? 'Minting…' : isMintConfirmed ? 'Minted!' : 'Mint EFP List'}
                </button>
                <button type="button" className={`${btnBase} bg-default-100 text-default-700 hover:bg-default-200`} onClick={() => setCurrentStep(0)}>
                  Back
                </button>
              </div>

              {mintHash && (
                <a
                  href={`${EFP_EXPLORER_URL}/tx/${mintHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary"
                >
                  View on Etherscan <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Star className="size-5 text-warning" />
                Set as Primary List
              </h2>
              <p className="text-default-500 text-sm">
                Set your EFP List as your primary list. This tells the network that this list
                represents who you follow, and your follows will count toward follower counts.
              </p>

              {primaryError && (
                <div className="p-3 bg-danger-50 text-danger-700 rounded-lg text-sm flex items-start gap-2">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <span>Error: {primaryError.message}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button"
                  className={`${btnBase} bg-warning text-white hover:bg-warning/90`}
                  onClick={handleSetPrimary}
                  disabled={isSettingPrimary || isPrimaryConfirming || isPrimaryConfirmed}
                >
                  {(isSettingPrimary || isPrimaryConfirming) && <Loader className="size-4 animate-spin" />}
                  {isPrimaryConfirming ? 'Confirming…' : isSettingPrimary ? 'Setting…' : isPrimaryConfirmed ? 'Set!' : 'Set as Primary'}
                </button>
                <button type="button" className={`${btnBase} bg-default-100 text-default-700 hover:bg-default-200`} onClick={() => setCurrentStep(1)}>
                  Back
                </button>
              </div>

              {primaryHash && (
                <a
                  href={`${EFP_EXPLORER_URL}/tx/${primaryHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary"
                >
                  View on Etherscan <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4 text-center">
              <CheckCircle className="size-166 text-success mx-auto" />
              <h2 className="text-xl font-bold">EFP Setup Complete!</h2>
              <p className="text-default-500 text-sm">
                Your EFP List is ready. You can now follow agents, build your network, and show your
                social presence on the marketplace.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button type="button" className={`${btnBase} bg-success text-white hover:bg-success/90`} onClick={onComplete}>
                  Start Following Agents
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
