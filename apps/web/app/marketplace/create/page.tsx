'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import NextLink from 'next/link';
import { Card } from '@heroui/react';
import { useCreateService } from '@/lib/hooks/useServices';
import { useWalletAgentsFromSubgraph } from '@/lib/hooks';
import { useAddKokonutTag } from '@/lib/hooks/useAddKokonutTag';
import { useDebug } from '@/contexts/DebugContext';
import { validateStringLength, validateMetadataURI } from '@/lib/hooks/useValidation';
import { useFormSubmit } from '@/lib/hooks/useDebounce';
import { showToast } from '@/lib/toast';
import { USDC_TOKEN, Token } from '@/lib/hooks/useTokenConversion';
import { parseAmount } from '@/lib/tokenUtils';
import { CreateServiceSteps } from '@/components/marketplace/CreateServiceSteps';
import { AgentTagSetup } from '@/components/marketplace/AgentTagSetup';
import { ServiceFormFields } from '@/components/marketplace/ServiceFormFields';

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

export default function CreateServicePage() {
  useEffect(() => {
    document.title = 'Create Service | Kokonut Agent Economy';
  }, []);

  const router = useRouter();
  const { isConnected, address } = useAccount();
  const { addLog, isDebugMode } = useDebug();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<FormErrors>(initialFormErrors);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);

  const {
    agents,
    taggedAgents,
    untaggedAgents,
    isLoading: isCheckingAgents,
    error: agentsError,
    refetch,
  } = useWalletAgentsFromSubgraph(address);

  const {
    addTag,
    isLoading: isAddingTag,
    isSuccess: tagAdded,
    error: tagError,
    txHash: tagTxHash,
  } = useAddKokonutTag();

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

  useEffect(() => {
    if (tagAdded) {
      addLog('info', 'Tag added successfully, refetching agents…');
      refetch();
    }
  }, [tagAdded, refetch, addLog]);

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
    if (!value || value === '') return 'Price is required';
    try {
      const priceNum = parseFloat(value);
      if (isNaN(priceNum) || priceNum <= 0) return 'Price must be greater than 0';
      if (priceNum < MIN_PRICE_USD) return `Minimum price is $${MIN_PRICE_USD} USD`;
      if (priceNum > 1000000) return 'Price must be less than 1,000,000 USD';
      return null;
    } catch {
      return 'Price must be a valid number';
    }
  }, []);

  const validatePaymentAddress = useCallback((value: string): string | null => {
    if (!value || value === '') return null;
    if (!/^0x[a-fA-F0-9]{40}$/.test(value)) return 'Invalid Ethereum address';
    return null;
  }, []);

  const handleInputChange = useCallback(
    (field: keyof FormData, value: string) => {
      if (field === 'paymentToken') {
        const token = [USDC_TOKEN].find(t => t.symbol === value) || USDC_TOKEN;
        setFormData(prev => ({ ...prev, paymentToken: token }));
        return;
      }

      setFormData(prev => ({ ...prev, [field]: value }));

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
      showToast.success('Service created!', 'Your service is now live on the marketplace.');
    }
  }, [isServiceConfirmed, step]);

  useEffect(() => {
    if (serviceError) {
      showToast.error('Service creation failed', serviceError.message || 'Please try again.');
    }
  }, [serviceError]);

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

      const errors: FormErrors = {
        name: validateName(formData.name),
        description: validateDescription(formData.description),
        metadataURI: validateMetadataURIField(formData.metadataURI),
        price: validatePrice(formData.price),
        paymentAddress: validatePaymentAddress(formData.paymentAddress),
      };

      setFormErrors(errors);

      if (Object.values(errors).some(error => error !== null)) {
        addLog('info', 'Form validation failed', errors);
        return;
      }

      const agent = taggedAgents[0];
      addLog('info', 'Submitting service creation', { agentId: agent.id, formData });

      setStep('creating');

      const priceInToken = parseAmount(formData.price || '0', formData.paymentToken);
      const paymentAddress = (formData.paymentAddress.trim() || address || ZERO_ADDRESS) as `0x${string}`;

      createService({
        agentId: BigInt(agent.id),
        name: formData.name,
        description: formData.description,
        metadataURI: formData.metadataURI || '',
        price: priceInToken,
        paymentToken: formData.paymentToken.address,
        paymentAddress,
      });
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

  const { handleSubmit, isSubmitting, timeUntilNextSubmit } = useFormSubmit(performSubmit, 500);

  const formPrice = parseFloat(formData.price);
  const canSubmit =
    formData.name.trim().length > 0 &&
    formData.description.trim().length > 0 &&
    !isNaN(formPrice) &&
    formPrice > 0;

  // Handle step-based views
  if (step === 'done' || step === 'checking' || step === 'no-agents') {
    return (
      <CreateServiceSteps
        step={step}
        agentsError={agentsError}
        isDebugMode={isDebugMode}
        onNavigate={(path) => router.push(path)}
      />
    );
  }

  // Untagged agents state
  if (step === 'untagged' && untaggedAgents.length > 0) {
    return (
      <AgentTagSetup
        untaggedAgents={untaggedAgents}
        isAddingTag={isAddingTag}
        tagAdded={tagAdded}
        tagError={tagError}
        tagTxHash={tagTxHash}
        onAddTag={handleAddTag}
        onRefetch={refetch}
      />
    );
  }

  // Ready state - show form
  if (step === 'ready' && taggedAgents.length > 0) {
    const agent = selectedAgentId
      ? taggedAgents.find(a => a.id === selectedAgentId) || taggedAgents[0]
      : taggedAgents[0];

    return (
      <div className="container mx-auto px-4 py-8">
        <NextLink href="/marketplace" className="flex items-center text-sm text-default-500 mb-6">
          <ArrowLeft className="size-4 mr-2" />
          Back to Marketplace
        </NextLink>

        <Card className="max-w-2xl mx-auto border border-divider">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <ShieldCheck className="size-8 text-success" />
              <div>
                <h1 className="text-2xl font-bold">Create Service</h1>
                <p className="text-default-500 text-sm">
                  Creating as Agent #{agent.id} {agent.metadata?.name && `- ${agent.metadata.name}`}
                </p>
              </div>
            </div>

            <ServiceFormFields
              formData={formData}
              formErrors={formErrors}
              handleInputChange={handleInputChange}
              handleSubmit={handleSubmit}
              isServicePending={isServicePending}
              isServiceConfirming={isServiceConfirming}
              isSubmitting={isSubmitting}
              timeUntilNextSubmit={timeUntilNextSubmit}
              canSubmit={canSubmit}
              isConnected={isConnected}
              serviceError={serviceError}
              address={address}
              taggedAgents={taggedAgents}
              selectedAgentId={selectedAgentId}
              onAgentSelect={setSelectedAgentId}
            />
          </div>
        </Card>
      </div>
    );
  }

  // Fallback
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto border border-divider p-8 text-center">
        <div className="size-8 animate-spin border-2 border-success border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-default-500">Initializing…</p>
      </Card>
    </div>
  );
}
