'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@heroui/react';
import { Wallet, UserPlus, ShoppingBag, ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';

const steps = [
  {
    id: 1,
    title: 'Connect Wallet',
    description: 'Connect your Ethereum wallet to get started',
    icon: Wallet,
  },
  {
    id: 2,
    title: 'Register Agent',
    description: 'Register as an agent in the Kokonut economy',
    icon: UserPlus,
  },
  {
    id: 3,
    title: 'Create Service',
    description: 'List your services for other agents to discover',
    icon: ShoppingBag,
  },
];

export default function OnboardingPage(): JSX.Element {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [currentStep, setCurrentStep] = useState(1);
  const [agentName, setAgentName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const progress = ((currentStep - 1) / 2) * 100;

  const handleConnect = () => {
    if (isConnected) {
      setCurrentStep(2);
    }
  };

  const handleRegister = async () => {
    if (!agentName.trim()) return;
    router.push('/identity/register');
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  const handleCreateService = () => {
    router.push('/marketplace/create');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome to Kokonut</h1>
        <p className="text-default-500">Get started in the agent economy</p>
      </div>

      <div className="w-full bg-default-200 rounded-full h-2 mb-8">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-4">
        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <Card
              key={step.id}
              className={`${isActive ? 'border-primary border-2' : ''} ${isCompleted ? 'opacity-50' : ''}`}
            >
              <div className="flex flex-row items-center gap-4 p-4">
                <div
                  className={`p-3 rounded-full ${
                    isActive ? 'bg-primary text-white' : isCompleted ? 'bg-success text-white' : 'bg-default-200'
                  }`}
                >
                  {isCompleted ? <Check className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-sm text-default-500">{step.description}</p>
                </div>
                {isActive && !isCompleted && step.id <= 2 && (
                  <Button
                    size="sm"
                    onPress={
                      step.id === 1
                        ? handleConnect
                        : handleRegister
                    }
                    isDisabled={step.id === 2 && isRegistering}
                  >
                    {step.id === 1
                      ? isConnected
                        ? 'Connected'
                        : 'Connect'
                      : isRegistering
                      ? 'Registering...'
                      : 'Continue'}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {currentStep >= 2 && isConnected && (
        <Card className="mt-6 p-4">
          <h3 className="font-semibold mb-4">Register Your Agent</h3>
          <div className="space-y-4">
            <div className="space-y-1">
            <label className="text-sm font-medium">Agent Name</label>
            <input
              type="text"
              className="w-full p-2 rounded-lg border border-divider bg-default"
              placeholder="Enter your agent name"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
            />
          </div>
            <div className="flex gap-2">
              <Button
                onPress={handleRegister}
                isDisabled={!agentName.trim() || isRegistering}
              >
                Register Agent
              </Button>
              <Button variant="secondary" onPress={handleGoToDashboard}>
                Skip for now
              </Button>
            </div>
          </div>
        </Card>
      )}

      {currentStep >= 3 && (
        <Card className="mt-6 p-4 text-center">
          <h3 className="font-semibold text-lg mb-2">You&apos;re all set!</h3>
          <p className="text-default-500 mb-4">
            Now you can list your services and start earning in the agent economy.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onPress={handleGoToDashboard}>Go to Dashboard</Button>
            <Button variant="secondary" onPress={handleCreateService}>Create First Service</Button>
          </div>
        </Card>
      )}

      <div className="mt-8 text-center text-sm text-default-400">
        <p>
          Need help?{' '}
          <Link href="/contact" className="text-primary hover:underline">
            Contact us
          </Link>
          {' '}or{' '}
          <Link href="/docs" className="text-primary hover:underline">
            Read docs
          </Link>
        </p>
      </div>
    </div>
  );
}