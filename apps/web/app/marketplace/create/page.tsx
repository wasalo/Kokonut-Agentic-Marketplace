'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Tag,
  Coins,
} from 'lucide-react';
import NextLink from 'next/link';
import { Card, Button } from '@heroui/react';
import { parseUnits } from 'viem';
import { useCreateService } from '@/lib/hooks/useServices';
import { useWalletAgentsWithDetails } from '@/lib/hooks/useWalletAgentsWithDetails';
import { useAddKokonutTag } from '@/lib/hooks/useAddKokonutTag';
import { useDebug } from '@/contexts/DebugContext';
import { validateStringLength, validateMetadataURI } from '@/lib/hooks/useValidation';
import { useFormSubmit, formatTimeRemaining } from '@/lib/hooks/useDebounce';
import { TransactionError } from '@/components/TransactionError';
import {
  useTokenPriceConversion,
  USDC_TOKEN,
  SUPPORTED_PAYMENT_TOKENS,
  Token,
} from '@/lib/hooks/useTokenConversion';

const MAX_SERVICE_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_METADATA_URI_LENGTH = 2000;
const MIN_PRICE_USD = 0.01;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

interface FormData {
  name: string;
  description: string;
  metadataURI: string;
  price: string;
  paymentToken: Token;
  paymentAddress: string;
}

const initialFormData: FormData = {
  name: '',
  description: '',
  metadataURI: '',
  price: '',
  paymentToken: USDC_TOKEN,
  paymentAddress: '',
};

interface FormErrors {
  name: string | null;
  description: string | null;
  metadataURI: string | null;
  price: string | null;
  paymentAddress: string | null;
}

const initialFormErrors: FormErrors = {
  name: null,
  description: null,
  metadataURI: null,
  price: null,
  paymentAddress: null,
};

type Step = 'checking' | 'no-agents' | 'untagged' | 'ready' | 'creating' | 'done';

function PaymentTokenSelector({
  selectedToken,
  onSelect,
  disabled,
}: {
  selectedToken: Token;
  onSelect: (token: Token) => void;
  disabled?: boolean;
}) {
  const { ethToUsdcRate, isLoading: isRateLoading } = useTokenPriceConversion();

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Payment Token</label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SUPPORTED_PAYMENT_TOKENS.map(token => (
          <button
            key={token.symbol}
            type="button"
            onClick={() => onSelect(token)}
            disabled={disabled}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedToken.symbol === token.symbol
                ? 'border-success bg-success/5'
                : 'border-divider hover:border-default-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  token.symbol === 'USDC' ? 'bg-[#2775CA]' : 'bg-[#627EEA]'
                }`}
              >
                <Coins className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-medium">{token.symbol}</p>
                <p className="text-xs text-default-500">{token.name}</p>
              </div>
            </div>
            {isRateLoading && token.symbol === 'ETH' && (
              <p className="text-xs text-default-400 mt-2">Loading rate...</p>
            )}
            {ethToUsdcRate && token.symbol === 'ETH' && (
              <p className="text-xs text-default-400 mt-2">
                1 ETH ≈ ${ethToUsdcRate.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function PriceConversionDisplay({ price }: { price: string }) {
  const { ethToUsdcRate, isLoading } = useTokenPriceConversion();

  if (!price || parseFloat(price) <= 0) {
    return <p className="text-xs text-default-400 mt-1">Enter ETH amount to see USD value</p>;
  }

  if (isLoading) {
    return <p className="text-xs text-default-400 mt-1">Loading USD value...</p>;
  }

  if (!ethToUsdcRate) {
    return <p className="text-xs text-warning mt-1">Price feed unavailable</p>;
  }

  const ethAmount = parseFloat(price);
  const usdValue = ethAmount * ethToUsdcRate;

  return (
    <p className="text-xs text-default-400 mt-1">
      ≈ ${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
      USD
    </p>
  );
}

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
      // Min price check (in USD equivalent)
      if (priceNum < MIN_PRICE_USD) {
        return `Minimum price is $${MIN_PRICE_USD} USD`;
      }
      // Max price check (in USD equivalent) - 1 million USD
      if (priceNum > 1000000) {
        return 'Price must be less than 1,000,000 USD';
      }
      return null;
    } catch {
      return 'Price must be a valid number';
    }
  }, []);

  const validatePaymentAddress = useCallback((value: string): string | null => {
    // Optional field - empty is OK
    if (!value || value === '') {
      return null;
    }
    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
      return 'Invalid Ethereum address';
    }
    return null;
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
    [validateName, validateDescription, validateMetadataURIField, validatePrice]
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
      console.log('[CreateService] Button clicked, isConnected:', !!isConnected, 'taggedAgents:', taggedAgents.length);
      
      if (!isConnected || taggedAgents.length === 0) {
        console.log('[CreateService] Early return - not connected or no agents');
        return;
      }

      // Validate all fields
      const errors: FormErrors = {
        name: validateName(formData.name),
        description: validateDescription(formData.description),
        metadataURI: validateMetadataURIField(formData.metadataURI),
        price: validatePrice(formData.price),
        paymentAddress: validatePaymentAddress(formData.paymentAddress),
      };

      setFormErrors(errors);

      console.log('[CreateService] Validation errors:', errors);

      // Check if any errors exist
      if (Object.values(errors).some(error => error !== null)) {
        addLog('info', 'Form validation failed', errors);
        console.log('[CreateService] Validation failed, returning early');
        return;
      }

      const agent = taggedAgents[0];
      console.log('[CreateService] Proceeding with agent:', agent.id, 'formData:', formData);
      addLog('info', 'Submitting service creation', { agentId: agent.id, formData });

      setStep('creating');

      // Convert price to proper decimals based on token
      const priceInToken = parseUnits(formData.price || '0', formData.paymentToken.decimals);

      // For ETH, we also store the USD equivalent for display (8 decimals for Chainlink)
      // The contract stores the raw token amount, and we convert for display in UI

      // Payment address: use custom if provided, otherwise use user's wallet
      const paymentAddress = (formData.paymentAddress.trim() || address || ZERO_ADDRESS) as `0x${string}`;
      console.log('[CreateService] paymentAddress:', paymentAddress);

      createService({
        agentId: BigInt(agent.id),
        name: formData.name,
        description: formData.description,
        metadataURI: formData.metadataURI || '',
        price: priceInToken,
        paymentToken: formData.paymentToken.address === ZERO_ADDRESS
          ? ZERO_ADDRESS
          : formData.paymentToken.address,
        paymentAddress: paymentAddress
      });
      console.log('[CreateService] createService called with args');
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
      validatePaymentAddress,
      address,
    ]
  );

  // Apply form submission debouncing (500ms cooldown for better UX)
  const { handleSubmit, isSubmitting, timeUntilNextSubmit } = useFormSubmit(performSubmit, 500);

  // Simple validity check for button enabled state (Option A: allow clicking if fields have content)
  const formPrice = parseFloat(formData.price);
  const canSubmit =
    formData.name.trim().length > 0 &&
    formData.description.trim().length > 0 &&
    !isNaN(formPrice) &&
    formPrice > 0;

  // Debug panel component
  const DebugPanel = () => {
    if (!isDebugMode) return null;

    return (
      <div className="fixed bottom-4 right-4 w-96 max-h-96 bg-content text-foreground p-4 rounded-lg overflow-auto font-mono text-xs z-50 border border-divider shadow-lg">
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
              <Button 
                onPress={() => router.push('/marketplace')}
                className="bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white font-semibold"
              >View Marketplace</Button>
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
              <Button 
                onPress={() => refetch()}
                className="bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white font-semibold"
              >Continue</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Button
                onPress={() => handleAddTag(agent.id)}
                isDisabled={isAddingTag}
                className="w-full bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white font-semibold hover:opacity-90"
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
              {/* ETH Bond Warning - Phase 14 */}
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-warning-900 dark:text-warning-100">
                      0.01 ETH Service Bond Required
                    </p>
                    <p className="text-sm text-default-600 dark:text-default-400 mt-1">
                      Creating a service requires depositing a 0.01 ETH bond. This bond is
                      refundable when you deactivate your service. Make sure you have enough ETH in
                      your wallet to cover this deposit.
                    </p>
                  </div>
                </div>
              </div>

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

              {/* Payment Token Selector */}
              <PaymentTokenSelector
                selectedToken={formData.paymentToken}
                onSelect={token => setFormData(prev => ({ ...prev, paymentToken: token }))}
                disabled={isServicePending || isServiceConfirming}
              />

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
                  Price ({formData.paymentToken.symbol}) <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.price}
                    onChange={e => handleInputChange('price', e.target.value)}
                    onBlur={() => handleInputChange('price', formData.price)}
                    className={`w-full px-3 py-2 border rounded-lg bg-content2 ${
                      formErrors.price ? 'border-danger' : 'border-divider'
                    }`}
                    placeholder={formData.paymentToken.symbol === 'ETH' ? '0.05' : '100'}
                    min={formData.paymentToken.symbol === 'ETH' ? '0.0001' : '0.01'}
                    step={formData.paymentToken.symbol === 'ETH' ? '0.001' : '0.01'}
                  />
                </div>
                {formErrors.price ? (
                  <p className="text-xs text-danger mt-1">{formErrors.price}</p>
                ) : formData.paymentToken.symbol === 'ETH' ? (
                  <PriceConversionDisplay price={formData.price} />
                ) : (
                  <p className="text-xs text-default-400 mt-1">
                    Minimum ${MIN_PRICE_USD}, maximum $1,000,000
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

              {/* Payment Address (optional) */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Payment Address (Optional)
                  <span className="text-default-400 ml-2">- Defaults to your wallet</span>
                </label>
                <input
                  type="text"
                  value={formData.paymentAddress}
                  onChange={e => handleInputChange('paymentAddress', e.target.value)}
                  onBlur={() => handleInputChange('paymentAddress', formData.paymentAddress)}
                  className={`w-full px-3 py-2 border rounded-lg bg-content2 ${
                    formErrors.paymentAddress ? 'border-danger' : 'border-divider'
                  }`}
                  placeholder={address || '0x...'}
                />
                {formErrors.paymentAddress ? (
                  <p className="text-xs text-danger mt-1">{formErrors.paymentAddress}</p>
                ) : (
                  <p className="text-xs text-default-400 mt-1">
                    Custom address to receive payments (leave empty for your wallet)
                  </p>
                )}
              </div>

              <TransactionError error={serviceError} />

              <Button
                type="submit"
                className="w-full border-2 border-[#009F4D] text-[#009F4D] hover:bg-[#009F4D]/5 font-semibold"
                isDisabled={!isConnected || isServicePending || isServiceConfirming || !canSubmit}
              >
                {isServicePending || isServiceConfirming 
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> 
                  : isSubmitting 
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Wait {formatTimeRemaining(timeUntilNextSubmit)}...</>
                    : 'Create Service'
                }
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
