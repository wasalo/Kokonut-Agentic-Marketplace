'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, ShieldCheck, AlertCircle, CheckCircle2, Tag } from 'lucide-react';
import NextLink from 'next/link';
import { Card, Button } from '@heroui/react';
import { parseUnits } from 'viem';
import { useCreateService } from '@/lib/hooks/useServices';
import { useWalletAgentsWithDetails } from '@/lib/hooks/useWalletAgentsWithDetails';
import { useAddKokonutTag } from '@/lib/hooks/useAddKokonutTag';
import { useDebug } from '@/contexts/DebugContext';
import {
  validateAmount,
  validateStringLength,
  validateURL,
  validateMetadataURI,
} from '@/lib/hooks/useValidation';
import { useFormSubmit, formatTimeRemaining } from '@/lib/hooks/useDebounce';
import { getTransactionError } from '@/lib/toast';

const USDC_DECIMALS = 6;
const MAX_SERVICE_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_METADATA_URI_LENGTH = 2000;

interface FormData {
  name: string;
  description: string;
  metadataURI: string;
  price: string;
}

const initialFormData: FormData = {
  name: '',
  description: '',
  metadataURI: '',
  price: '',
};

interface FormErrors {
  name: string | null;
  description: string | null;
  metadataURI: string | null;
  price: string | null;
}

const initialFormErrors: FormErrors = {
  name: null,
  description: null,
  metadataURI: null,
  price: null,
};

type Step = 'checking' | 'no-agents' | 'untagged' | 'ready' | 'creating' | 'done';

export default function CreateServicePage() {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const { addLog, isDebugMode } = useDebug();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<FormErrors>(initialFormErrors);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);

  // Step 1: Check wallet agents with full details
  const {
    agents,
    taggedAgents,
    untaggedAgents,
    isLoading: isCheckingAgents,
    error: agentsError,
    refetch,
  } = useWalletAgentsWithDetails(address);

  // Step 2: Add Kokonut tag hook
  const {
    addTag,
    isLoading: isAddingTag,
    isSuccess: tagAdded,
    error: tagError,
    txHash: tagTxHash,
  } = useAddKokonutTag();

  // Determine current step
  const [step, setStep] = useState<Step>('checking');

  useEffect(() => {
    if (isCheckingAgents) {
      setStep('checking');
    } else if (agents.length === 0) {
      setStep('no-agents');
    } else if (taggedAgents.length === 0 && untaggedAgents.length > 0) {
      setStep('untagged');
    } else if (taggedAgents.length > 0) {
      setStep('ready');
    }
  }, [isCheckingAgents, agents, taggedAgents, untaggedAgents]);

  // Handle tag added success
  useEffect(() => {
    if (tagAdded) {
      addLog('info', 'Tag added successfully, refetching agents...');
      refetch();
    }
  }, [tagAdded, refetch, addLog]);

  // Real-time validation functions
  const validateName = useCallback((value: string): string | null => {
    return validateStringLength(value, 1, MAX_SERVICE_NAME_LENGTH, 'Service name');
  }, []);

  const validateDescription = useCallback((value: string): string | null => {
    return validateStringLength(value, 1, MAX_DESCRIPTION_LENGTH, 'Description');
  }, []);

  const validateMetadataURIField = useCallback((value: string): string | null => {
    return validateMetadataURI(value, MAX_METADATA_URI_LENGTH);
  }, []);

  const validatePrice = useCallback((value: string): string | null => {
    if (!value || value === '') {
      return 'Price is required';
    }
    try {
      const priceNum = parseFloat(value);
      if (isNaN(priceNum) || priceNum <= 0) {
        return 'Price must be greater than 0';
      }
      // Max 1 million USDC (reasonable upper limit)
      if (priceNum > 1000000) {
        return 'Price must be less than 1,000,000 USDC';
      }
      return null;
    } catch {
      return 'Price must be a valid number';
    }
  }, []);

  const handleInputChange = useCallback(
    (field: keyof FormData, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }));

      // Real-time validation
      let error: string | null = null;
      switch (field) {
        case 'name':
          error = validateName(value);
          break;
        case 'description':
          error = validateDescription(value);
          break;
        case 'metadataURI':
          error = validateMetadataURIField(value);
          break;
        case 'price':
          error = validatePrice(value);
          break;
      }
      setFormErrors(prev => ({ ...prev, [field]: error }));
    },
    [validateName, validateDescription, validateMetadataURI, validatePrice]
  );

  // Service creation
  const {
    createService,
    hash: serviceTxHash,
    isPending: isServicePending,
    error: serviceError,
  } = useCreateService();

  const { isLoading: isServiceConfirming, isSuccess: isServiceConfirmed } =
    useWaitForTransactionReceipt({ hash: serviceTxHash });

  useEffect(() => {
    if (isServiceConfirmed && step === 'creating') {
      setStep('done');
    }
  }, [isServiceConfirmed, step]);

  const handleAddTag = useCallback(
    async (agentId: number) => {
      addLog('info', `User clicked Add Tag for agent ${agentId}`);
      await addTag(agentId);
    },
    [addTag, addLog]
  );

  const performSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!isConnected || taggedAgents.length === 0) return;

      // Validate all fields
      const errors: FormErrors = {
        name: validateName(formData.name),
        description: validateDescription(formData.description),
        metadataURI: validateMetadataURIField(formData.metadataURI),
        price: validatePrice(formData.price),
      };

      setFormErrors(errors);

      // Check if any errors exist
      if (Object.values(errors).some(error => error !== null)) {
        addLog('info', 'Form validation failed', errors);
        return;
      }

      const agent = taggedAgents[0];
      addLog('info', 'Submitting service creation', { agentId: agent.id, formData });

      setStep('creating');
      const priceInUsdc = parseUnits(formData.price || '0', USDC_DECIMALS);

      createService(
        BigInt(agent.id),
        formData.name,
        formData.description,
        formData.metadataURI || '',
        priceInUsdc,
        process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`
      );
    },
    [
      isConnected,
      taggedAgents,
      formData,
      createService,
      addLog,
      validateName,
      validateDescription,
      validateMetadataURIField,
      validatePrice,
    ]
  );

  // Apply form submission debouncing (2 second cooldown)
  const { handleSubmit, isSubmitting, timeUntilNextSubmit } = useFormSubmit(performSubmit, 2000);

  // Check if form is valid
  const isFormValid =
    Object.values(formErrors).every(error => error === null) &&
    formData.name &&
    formData.description &&
    formData.price;

  // Debug panel component
  const DebugPanel = () => {
    if (!isDebugMode) return null;

    return (
      <div className="fixed bottom-4 right-4 w-96 max-h-96 bg-black/90 text-green-400 p-4 rounded-lg overflow-auto font-mono text-xs z-50">
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold">Debug Console</span>
          <button onClick={() => refetch()} className="text-xs bg-green-800 px-2 py-1 rounded">
            Refresh
          </button>
        </div>
        <div className="space-y-1">
          <div>Step: {step}</div>
          <div>Address: {address?.slice(0, 10)}...</div>
          <div>Total Agents: {agents.length}</div>
          <div>Tagged: {taggedAgents.length}</div>
          <div>Untagged: {untaggedAgents.length}</div>
          <div>Loading: {isCheckingAgents ? 'Yes' : 'No'}</div>
          {agentsError && <div className="text-red-400">Error: {agentsError.message}</div>}
        </div>
      </div>
    );
  };

  // Done state
  if (step === 'done') {
    return (
      <div className="container mx-auto px-4 py-8">
        <DebugPanel />
        <Card className="max-w-2xl mx-auto border border-divider p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Service Created!</h2>
          <p className="text-default-500 mb-6">
            Your service has been successfully created and is now visible in the marketplace.
          </p>
          <div className="flex gap-4 justify-center">
            <Button onPress={() => router.push('/marketplace')}>View Marketplace</Button>
            <Button variant="ghost" onPress={() => router.push('/dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Checking state
  if (step === 'checking') {
    return (
      <div className="container mx-auto px-4 py-8">
        <DebugPanel />
        <Card className="max-w-2xl mx-auto border border-divider p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-semibold">Checking Agent Registration...</h2>
          <p className="text-default-500">Verifying your wallet for agent identity...</p>
          {isDebugMode && (
            <div className="mt-4 text-xs text-default-400">
              Querying contract for balance and agent details...
            </div>
          )}
        </Card>
      </div>
    );
  }

  // No agents state
  if (step === 'no-agents') {
    return (
      <div className="container mx-auto px-4 py-8">
        <DebugPanel />
        <Card className="max-w-2xl mx-auto border border-divider p-8">
          <AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" />
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

  // Untagged agents state - Show option to add Kokonut tag
  if (step === 'untagged' && untaggedAgents.length > 0) {
    const agent = untaggedAgents[0];

    return (
      <div className="container mx-auto px-4 py-8">
        <DebugPanel />
        <Card className="max-w-2xl mx-auto border border-divider p-8">
          <Tag className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-center mb-2">Add Kokonut Tag</h2>
          <p className="text-default-500 text-center mb-6">
            You have an agent (ID: {agent.id}) but it needs the Kokonut Marketplace tag to create
            services.
          </p>

          <div className="bg-content2 p-4 rounded-lg mb-6">
            <h3 className="font-medium mb-2">What this does:</h3>
            <ul className="text-sm text-default-500 space-y-1 list-disc list-inside">
              <li>Adds &quot;source: kokonut-marketplace&quot; to your agent metadata</li>
              <li>Updates your agent&apos;s tokenURI on the blockchain</li>
              <li>Enables service creation and marketplace participation</li>
            </ul>
          </div>

          {tagError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">Error: {tagError.message}</p>
            </div>
          )}

          {tagAdded ? (
            <div className="text-center">
              <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
              <p className="text-success mb-4">Tag added successfully!</p>
              <Button onPress={() => refetch()}>Continue</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Button
                onPress={() => handleAddTag(agent.id)}
                isDisabled={isAddingTag}
                className="w-full"
              >
                {isAddingTag ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding Tag...
                  </>
                ) : (
                  'Add Kokonut Tag'
                )}
              </Button>

              {tagTxHash && (
                <p className="text-xs text-center text-default-500">
                  Transaction: {tagTxHash.slice(0, 20)}...
                </p>
              )}

              <NextLink href="/identity">
                <Button variant="ghost" className="w-full">
                  View My Agents
                </Button>
              </NextLink>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // Ready state - show form
  if (step === 'ready' && taggedAgents.length > 0) {
    // Use selected agent or default to first one
    const agent = selectedAgentId
      ? taggedAgents.find(a => a.id === selectedAgentId) || taggedAgents[0]
      : taggedAgents[0];

    return (
      <div className="container mx-auto px-4 py-8">
        <DebugPanel />
        <NextLink href="/marketplace" className="flex items-center text-sm text-default-500 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Marketplace
        </NextLink>

        <Card className="max-w-2xl mx-auto border border-divider">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <ShieldCheck className="w-8 h-8 text-success" />
              <div>
                <h1 className="text-2xl font-bold">Create Service</h1>
                <p className="text-default-500 text-sm">
                  Creating as Agent #{agent.id} {agent.metadata?.name && `- ${agent.metadata.name}`}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Agent Selector */}
              {taggedAgents.length > 1 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Select Agent *</label>
                  <select
                    value={selectedAgentId || agent.id}
                    onChange={e => setSelectedAgentId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-divider rounded-lg bg-content2"
                  >
                    {taggedAgents.map(a => (
                      <option key={a.id} value={a.id}>
                        Agent #{a.id} {a.metadata?.name ? `- ${a.metadata.name}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-default-500 mt-1">
                    Choose which agent will provide this service
                  </p>
                </div>
              )}

              {/* Service Name */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Service Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => handleInputChange('name', e.target.value)}
                  onBlur={() => handleInputChange('name', formData.name)}
                  className={`w-full px-3 py-2 border rounded-lg bg-content2 ${
                    formErrors.name ? 'border-danger' : 'border-divider'
                  }`}
                  placeholder="e.g., Web Development"
                  maxLength={MAX_SERVICE_NAME_LENGTH}
                />
                <div className="flex justify-between mt-1">
                  {formErrors.name ? (
                    <p className="text-xs text-danger">{formErrors.name}</p>
                  ) : (
                    <p className="text-xs text-default-400">
                      A clear, concise name for your service
                    </p>
                  )}
                  <p className="text-xs text-default-400">
                    {formData.name.length}/{MAX_SERVICE_NAME_LENGTH}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Description <span className="text-danger">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => handleInputChange('description', e.target.value)}
                  onBlur={() => handleInputChange('description', formData.description)}
                  className={`w-full px-3 py-2 border rounded-lg bg-content2 h-24 ${
                    formErrors.description ? 'border-danger' : 'border-divider'
                  }`}
                  placeholder="Describe your service..."
                  maxLength={MAX_DESCRIPTION_LENGTH}
                />
                <div className="flex justify-between mt-1">
                  {formErrors.description ? (
                    <p className="text-xs text-danger">{formErrors.description}</p>
                  ) : (
                    <p className="text-xs text-default-400">
                      What clients can expect from your service
                    </p>
                  )}
                  <p className="text-xs text-default-400">
                    {formData.description.length}/{MAX_DESCRIPTION_LENGTH}
                  </p>
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Price (USDC) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={e => handleInputChange('price', e.target.value)}
                  onBlur={() => handleInputChange('price', formData.price)}
                  className={`w-full px-3 py-2 border rounded-lg bg-content2 ${
                    formErrors.price ? 'border-danger' : 'border-divider'
                  }`}
                  placeholder="100"
                  min="0.01"
                  step="0.01"
                />
                {formErrors.price ? (
                  <p className="text-xs text-danger mt-1">{formErrors.price}</p>
                ) : (
                  <p className="text-xs text-default-400 mt-1">
                    Price in USDC (minimum 0.01, maximum 1,000,000)
                  </p>
                )}
              </div>

              {/* Metadata URI (optional) */}
              <div>
                <label className="block text-sm font-medium mb-2">Metadata URI (Optional)</label>
                <input
                  type="text"
                  value={formData.metadataURI}
                  onChange={e => handleInputChange('metadataURI', e.target.value)}
                  onBlur={() => handleInputChange('metadataURI', formData.metadataURI)}
                  className={`w-full px-3 py-2 border rounded-lg bg-content2 ${
                    formErrors.metadataURI ? 'border-danger' : 'border-divider'
                  }`}
                  placeholder="https://example.com/metadata.json"
                  maxLength={MAX_METADATA_URI_LENGTH}
                />
                {formErrors.metadataURI ? (
                  <p className="text-xs text-danger mt-1">{formErrors.metadataURI}</p>
                ) : (
                  <p className="text-xs text-default-400 mt-1">
                    Link to additional service metadata (optional)
                  </p>
                )}
              </div>

              {serviceError && (
                <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg">
                  <p className="text-danger text-sm">{getTransactionError(serviceError)}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                isDisabled={isServicePending || isServiceConfirming || !isFormValid || isSubmitting}
              >
                {isServicePending || isServiceConfirming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Wait {formatTimeRemaining(timeUntilNextSubmit)}...
                  </>
                ) : (
                  'Create Service'
                )}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    );
  }

  // Fallback
  return (
    <div className="container mx-auto px-4 py-8">
      <DebugPanel />
      <Card className="max-w-2xl mx-auto border border-divider p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
        <p className="text-default-500">Initializing...</p>
      </Card>
    </div>
  );
}
