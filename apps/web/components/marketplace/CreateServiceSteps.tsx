'use client';

import { Card, Button } from '@heroui/react';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import NextLink from 'next/link';

interface CreateServiceStepsProps {
  step: 'done' | 'checking' | 'no-agents';
  agentsError?: Error | null;
  isDebugMode?: boolean;
  onNavigate: (path: string) => void;
}

export function CreateServiceSteps({
  step,
  agentsError,
  isDebugMode,
  onNavigate,
}: CreateServiceStepsProps) {
  if (step === 'done') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto border border-divider p-8 text-center">
          <CheckCircle2 className="size-16 text-success mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Service Created!</h2>
          <p className="text-default-500 mb-6">
            Your service has been successfully created and is now visible in the marketplace.
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              onPress={() => onNavigate('/marketplace')}
              className="bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white font-semibold"
            >
              View Marketplace
            </Button>
            <Button variant="ghost" onPress={() => onNavigate('/dashboard')}>
              Go to Dashboard
            </Button>
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
            <NextLink href="/identity/register">
              <Button>Register Agent</Button>
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
