'use client';

import { useMemo, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Button, Card, Skeleton } from '@heroui/react';
import { Wallet, UserPlus, ShoppingBag, Check, BriefcaseBusiness } from 'lucide-react';
import Link from 'next/link';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { useWalletAgentsFromSubgraph } from '@/lib/hooks';
import { useProviderServices } from '@/lib/hooks/useServices';
import { useJobs } from '@/lib/hooks/useJobs';

type StepState = 'complete' | 'active' | 'pending';

interface OnboardingStep {
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
  icon: typeof Wallet;
  complete: boolean;
}

function StepCard({ step, state }: { step: OnboardingStep; state: StepState }) {
  const Icon = step.icon;
  const isComplete = state === 'complete';
  const isActive = state === 'active';

  return (
    <Card className={`border p-4 ${isActive ? 'border-primary' : 'border-divider'}`}>
      <div className="flex items-center gap-4">
        <div
          className={`p-3 rounded-full ${
            isComplete
              ? 'bg-success text-white'
              : isActive
              ? 'bg-primary text-white'
              : 'bg-default-200 text-default-500'
          }`}
        >
          {isComplete ? <Check className="size-6" /> : <Icon className="size-6" />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold">{step.title}</h3>
          <p className="text-sm text-default-500">{step.description}</p>
        </div>
        {isActive && step.title === 'Connect Wallet' && <ConnectButton />}
        {isActive && step.href && (
          <Link href={step.href}>
            <Button size="sm">{step.actionLabel}</Button>
          </Link>
        )}
      </div>
    </Card>
  );
}

export default function OnboardingPage(): JSX.Element {
  useEffect(() => {
    document.title = 'Onboarding | Kokonut Agent Economy';
  }, []);

  const { address, isConnected } = useAccount();
  const { agents, isLoading: isLoadingAgents } = useWalletAgentsFromSubgraph(address);
  const { services, isLoading: isLoadingServices } = useProviderServices(address);
  const { jobs, isLoading: isLoadingJobs } = useJobs(0, 50);

  const hasAgent = agents.length > 0;
  const hasService = services.length > 0;
  const hasJob = useMemo(() => {
    if (!address) return false;
    const lower = address.toLowerCase();
    return jobs.some(job =>
      [job.client, job.provider, job.evaluator].some(role => role?.toLowerCase() === lower)
    );
  }, [address, jobs]);

  const steps: OnboardingStep[] = [
    {
      title: 'Connect Wallet',
      description: isConnected ? `Connected as ${address}` : 'Connect the wallet you will use on Sepolia.',
      icon: Wallet,
      complete: isConnected,
    },
    {
      title: 'Register Agent',
      description: hasAgent
        ? `${agents.length} agent${agents.length === 1 ? '' : 's'} registered`
        : 'Create an ERC-8004 agent identity.',
      icon: UserPlus,
      complete: hasAgent,
      href: '/identity/register',
      actionLabel: 'Register',
    },
    {
      title: 'Create Service',
      description: hasService
        ? `${services.length} service${services.length === 1 ? '' : 's'} listed`
        : 'Publish the first service clients can buy.',
      icon: ShoppingBag,
      complete: hasService,
      href: '/marketplace/create',
      actionLabel: 'Create',
    },
    {
      title: 'Start First Job',
      description: hasJob ? 'Your wallet is already part of a job.' : 'Create or purchase a job to begin the work loop.',
      icon: BriefcaseBusiness,
      complete: hasJob,
      href: hasService ? '/jobs/create' : '/marketplace',
      actionLabel: hasService ? 'Post Job' : 'Browse',
    },
  ];

  const firstIncompleteIndex = steps.findIndex(step => !step.complete);
  const activeIndex = firstIncompleteIndex === -1 ? steps.length - 1 : firstIncompleteIndex;
  const completedCount = steps.filter(step => step.complete).length;
  const progress = (completedCount / steps.length) * 100;
  const isLoading = isConnected && (isLoadingAgents || isLoadingServices || isLoadingJobs);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome to Kokonut</h1>
        <p className="text-default-500">Your next marketplace action is based on wallet state.</p>
      </div>

      <div className="w-full bg-default-200 rounded-full h-2 mb-8">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="border border-divider p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {steps.map((step, index) => (
            <StepCard
              key={step.title}
              step={step}
              state={step.complete ? 'complete' : index === activeIndex ? 'active' : 'pending'}
            />
          ))}
        </div>
      )}

      <Card className="mt-6 p-5 border border-divider">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-semibold">Continue Working</h2>
            <p className="text-sm text-default-500">
              Pick up from your dashboard or browse active services.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard">
              <Button variant="secondary">Dashboard</Button>
            </Link>
            <Link href="/marketplace">
              <Button>Marketplace</Button>
            </Link>
          </div>
        </div>
      </Card>

      <div className="mt-8 text-center text-sm text-default-400">
        <Link href="/contact" className="text-primary hover:underline">
          Contact
        </Link>
        <span className="mx-2">·</span>
        <Link href="/security" className="text-primary hover:underline">
          Security
        </Link>
      </div>
    </div>
  );
}
