'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import NextLink from 'next/link';
import { Card } from '@heroui/react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ERC8004_ABI } from '@/lib/8004contracts';
import { generateAgentMetadata, type AgentMetadata8004 } from '@/lib/metadata';
import { useWalletAgentsFromSubgraph } from '@/lib/hooks';
import { CONTRACT_ADDRESSES, getContractAddress } from '@/lib/contracts/config';
import { TransactionError } from '@/components/TransactionError';
import { showToast } from '@/lib/toast';
import { PortfolioForm, type PortfolioItem } from '@/components/PortfolioForm';
import { useFormSubmit, formatTimeRemaining } from '@/lib/hooks/useDebounce';
import { validateStringLength } from '@/lib/hooks/useValidation';

const ERC8004_ADDRESS = getContractAddress(
  process.env.NEXT_PUBLIC_8004_REGISTRY_ADDRESS,
  CONTRACT_ADDRESSES.sepolia.erc8004Registry
);

interface FormData {
  name: string;
  description: string;
  version: string;
  endpoint: string;
  email: string;
  capabilities: string;
  portfolio: PortfolioItem[];
}

interface FormErrors {
  name: string | null;
  endpoint: string | null;
  email: string | null;
}

const initialFormData: FormData = {
  name: '',
  description: '',
  version: '1.0.0',
  endpoint: '',
  email: '',
  capabilities: '',
  portfolio: [],
};

export default function RegisterAgentPage(): JSX.Element {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<FormErrors>({ name: null, endpoint: null, email: null });

  const validateName = useCallback((value: string) => {
    const error = validateStringLength(value, 2, 100, 'Agent name');
    setFormErrors(prev => ({ ...prev, name: error }));
    return !error;
  }, []);

  const validateEndpoint = useCallback((value: string) => {
    if (!value) { setFormErrors(prev => ({ ...prev, endpoint: null })); return true; }
    const urlError = !value.startsWith('https://') && !value.startsWith('http://')
      ? 'Endpoint must be a valid URL (https://...)'
      : null;
    setFormErrors(prev => ({ ...prev, endpoint: urlError }));
    return !urlError;
  }, []);

  const validateEmail = useCallback((value: string) => {
    if (!value) { setFormErrors(prev => ({ ...prev, email: null })); return true; }
    const emailError = !value.includes('@') || !value.includes('.')
      ? 'Please enter a valid email address'
      : null;
    setFormErrors(prev => ({ ...prev, email: emailError }));
    return !emailError;
  }, []);

  const { taggedAgents } = useWalletAgentsFromSubgraph(address);
  const isRegistered = taggedAgents.length > 0;
  const agent = taggedAgents[0];

  const handleFieldChange = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handlePortfolioChange = useCallback((portfolio: PortfolioItem[]) => {
    setFormData(prev => ({ ...prev, portfolio }));
  }, []);

  const { writeContract, data: txHash, isPending, error: txError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const performSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!isConnected || !address) return;

      const metadata: AgentMetadata8004 = {
        name: formData.name,
        description: formData.description,
        version: formData.version,
        capabilities: formData.capabilities
          .split(',')
          .map(c => c.trim())
          .filter(Boolean),
        endpoints: formData.endpoint ? { https: formData.endpoint } : undefined,
        channels: formData.email ? { email: formData.email } : undefined,
        source: 'kokonut-marketplace',
        portfolio: formData.portfolio.length > 0 ? formData.portfolio : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const agentURI = generateAgentMetadata(metadata);

      // Use simple register function with source tag in metadata JSON
      writeContract({
        address: ERC8004_ADDRESS,
        abi: ERC8004_ABI,
        functionName: 'register',
        args: [agentURI],
      });
    },
    [isConnected, address, formData, writeContract]
  );

  // Apply form submission debouncing (2 second cooldown)
  const { handleSubmit, isSubmitting, timeUntilNextSubmit } = useFormSubmit(performSubmit, 2000);

  const isLoading = isPending || isConfirming;

  useEffect(() => {
    if (isConfirmed) {
      showToast.success('Agent registered!', 'Your agent is now on-chain.');
    }
  }, [isConfirmed]);

  useEffect(() => {
    if (txError) {
      showToast.error('Registration failed', txError.message || 'Please try again.');
    }
  }, [txError]);

  if (isConfirmed) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto text-center p-6 border border-divider">
          <div className="mb-4">
            <h2 className="text-xl font-semibold flex items-center justify-center gap-2 text-success">
              <CheckCircle2 className="w-6 h-6" />
              Agent Registered!
            </h2>
            <p className="text-sm text-default-500 mt-2">
              Your agent is now registered on the ERC-8004 registry and tagged as a Kokonut
              Marketplace agent.
            </p>
          </div>
          <p className="text-xs text-default-400 font-mono break-all mb-4">TX: {txHash}</p>
          <NextLink
            href="/leaderboard"
            className="inline-flex items-center justify-center w-full px-6 py-3 text-base font-semibold bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            View Agents
          </NextLink>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <NextLink
        href="/identity"
        className="flex items-center text-sm text-default-500 hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Identity
      </NextLink>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Register Agent</h1>
        <p className="text-default-500 mb-8">
          Create an onchain identity on the official ERC-8004 registry. Agents registered through
          Kokonut are automatically tagged for marketplace discovery.
        </p>

        {isRegistered && agent && (
          <Card className="border border-success/30 mb-6">
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <h2 className="text-base font-semibold text-success">Already Registered</h2>
              </div>
              <p className="text-sm text-default-500">
                Your wallet already has an identity on the ERC-8004 registry.
              </p>
              <p className="text-sm font-medium mt-1">
                {agent.metadata?.name ?? `Agent #${agent.id}`}
              </p>
              <NextLink
                href={`/identity/${agent.id}`}
                className="inline-flex items-center gap-1 mt-3 text-sm text-primary hover:underline"
              >
                View your agent
              </NextLink>
            </div>
          </Card>
        )}

        <Card className="border border-divider">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-1">Agent Details</h2>
            <p className="text-sm text-default-500 mb-6">
              Define your agent's identity and capabilities. This registration includes acceptance
              of Kokonut Marketplace Terms & Conditions.
            </p>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Agent Name
                </label>
                <input
                  type="text"
                  id="name"
                  placeholder="e.g., Wasabi Agent"
                  value={formData.name}
                  onChange={e => { handleFieldChange('name', e.target.value); validateName(e.target.value); }}
                  onBlur={() => validateName(formData.name)}
                  required
                  className={`w-full px-3 py-2 bg-content2 border rounded-lg text-default-700 placeholder:text-default-400 focus:outline-none focus:ring-2 focus:ring-success focus:border-transparent transition-all ${formErrors.name ? 'border-danger' : 'border-divider'}`}
                />
                {formErrors.name && <p className="text-xs text-danger mt-1">{formErrors.name}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description
                </label>
                <textarea
                  id="description"
                  placeholder="Describe what your agent does..."
                  value={formData.description}
                  onChange={e => handleFieldChange('description', e.target.value)}
                  className="flex min-h-[80px] w-full px-3 py-2 bg-content2 border border-divider rounded-lg text-default-700 placeholder:text-default-400 focus:outline-none focus:ring-2 focus:ring-success focus:border-transparent transition-all resize-none"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="version" className="text-sm font-medium">
                    Version
                  </label>
                  <input
                    type="text"
                    id="version"
                    placeholder="1.0.0"
                    value={formData.version}
                    onChange={e => handleFieldChange('version', e.target.value)}
                    className="w-full px-3 py-2 bg-content2 border border-divider rounded-lg text-default-700 placeholder:text-default-400 focus:outline-none focus:ring-2 focus:ring-success focus:border-transparent transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="endpoint" className="text-sm font-medium">
                    HTTPS Endpoint
                  </label>
                  <input
                    type="text"
                    id="endpoint"
                    placeholder="https://api.example.com"
                    value={formData.endpoint}
                    onChange={e => { handleFieldChange('endpoint', e.target.value); validateEndpoint(e.target.value); }}
                    onBlur={() => validateEndpoint(formData.endpoint)}
                    className={`w-full px-3 py-2 bg-content2 border rounded-lg text-default-700 placeholder:text-default-400 focus:outline-none focus:ring-2 focus:ring-success focus:border-transparent transition-all ${formErrors.endpoint ? 'border-danger' : 'border-divider'}`}
                  />
                  {formErrors.endpoint && <p className="text-xs text-danger mt-1">{formErrors.endpoint}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email (Optional)
                </label>
                  <input
                    type="email"
                    id="email"
                    placeholder="agent@example.com"
                    value={formData.email}
                    onChange={e => { handleFieldChange('email', e.target.value); validateEmail(e.target.value); }}
                    onBlur={() => validateEmail(formData.email)}
                    className={`w-full px-3 py-2 bg-content2 border rounded-lg text-default-700 placeholder:text-default-400 focus:outline-none focus:ring-2 focus:ring-success focus:border-transparent transition-all ${formErrors.email ? 'border-danger' : 'border-divider'}`}
                  />
                  {formErrors.email && <p className="text-xs text-danger mt-1">{formErrors.email}</p>}
                <p className="text-xs text-default-400">Used for notifications and contact</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="capabilities" className="text-sm font-medium">
                  Capabilities (comma-separated)
                </label>
                <input
                  type="text"
                  id="capabilities"
                  placeholder="trading, swaps, yield farming"
                  value={formData.capabilities}
                  onChange={e => handleFieldChange('capabilities', e.target.value)}
                  className="w-full px-3 py-2 bg-content2 border border-divider rounded-lg text-default-700 placeholder:text-default-400 focus:outline-none focus:ring-2 focus:ring-success focus:border-transparent transition-all"
                />
              </div>

              <PortfolioForm
                portfolio={formData.portfolio}
                onChange={handlePortfolioChange}
              />

              <div className="p-4 bg-content2 rounded-lg">
                <p className="text-xs text-default-400 mb-1">Your Address</p>
                <p className="text-sm font-mono">{address || 'Connect your wallet'}</p>
              </div>

              <TransactionError error={txError} />

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={!isConnected || isLoading || !formData.name || isSubmitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Registering...
                    </>
                  ) : isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Wait {formatTimeRemaining(timeUntilNextSubmit)}...
                    </>
                  ) : (
                    'Register Agent'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-3 text-base font-medium border border-divider text-default-600 rounded-lg hover:bg-content2 transition-colors"
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
