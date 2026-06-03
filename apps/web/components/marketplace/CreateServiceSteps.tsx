'use client';

import { Card } from '@heroui/react';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import NextLink from 'next/link';
import { btn } from '@/lib/design-system';

interface CreateServiceStepsProps {
  step: 'done' | 'checking' | 'no-agents';
  agentsError?: Error | null;
  isDebugMode?: boolean;
  onNavigate?: (path: string) => void;
  lastCreatedServiceId?: bigint | null;
}

export function CreateServiceSteps({
  step,
  agentsError,
  isDebugMode,
  onNavigate: _onNavigate,
  lastCreatedServiceId,
}: CreateServiceStepsProps) {
  if (step === 'done') {
    const viewServiceHref = lastCreatedServiceId
      ? `/marketplace/${lastCreatedServiceId.toString()}`
      : null;
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto border border-divider p-8 text-center">
          <CheckCircle2 className="size-16 text-success mx-auto mb-4" aria-hidden="true" />
          <h2 className="text-2xl font-bold mb-2">Service Created!</h2>
          <p className="text-default-500 mb-6">
            Your service has been successfully created and is now visible in the marketplace.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {viewServiceHref ? (
              <NextLink href={viewServiceHref} className={btn('primary')}>
                View Service
              </NextLink>
            ) : (
              <NextLink href="/marketplace" className={btn('primary')}>
                View Marketplace
              </NextLink>
            )}
            {viewServiceHref && (
              <>
                <NextLink href="/marketplace" className={btn('secondary')}>
                  View Marketplace
                </NextLink>
                <NextLink href="/dashboard" className={btn('secondary')}>
                  Go to Dashboard
                </NextLink>
              </>
            )}
          </div>
        </Card>
      </div>
    );
  }

  if (step === 'checking') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto border border-divider p-8 text-center">
          <Loader2 className="size-8 animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-semibold">Checking Agent Registration…</h2>
          <p className="text-default-500">Verifying your wallet for agent identity…</p>
          {isDebugMode && (
            <div className="mt-4 text-xs text-default-400">
              Querying contract for balance and agent details...
            </div>
          )}
        </Card>
      </div>
    );
  }

  if (step === 'no-agents') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto border border-divider p-8">
          <AlertCircle className="size-12 text-warning mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-center mb-2">No Agents Found</h2>
          <p className="text-default-500 text-center mb-6">
            You don&apos;t have any registered agents. You need to register an agent identity before
            creating services.
          </p>
          <div className="flex justify-center">
            <NextLink href="/identity/register" className={btn('primary')}>
              Register Agent
            </NextLink>
          </div>
          {isDebugMode && agentsError && (
            <div className="mt-4 p-3 bg-red-50 rounded text-xs text-red-600">
              Error: {agentsError.message}
            </div>
          )}
        </Card>
      </div>
    );
  }

  return null;
}
