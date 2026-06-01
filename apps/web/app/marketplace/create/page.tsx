'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useBalance, useWaitForTransactionReceipt } from 'wagmi';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import NextLink from 'next/link';
import { Card } from '@heroui/react';
import { useCreateService, useTotalServiceCount } from '@/lib/hooks/useServices';
import { useWalletAgentsFromSubgraph } from '@/lib/hooks';
import { useDebug } from '@/contexts/DebugContext';
import { validateStringLength, validateMetadataURI } from '@/lib/hooks/useValidation';
import { useFormSubmit } from '@/lib/hooks/useDebounce';
import { showToast } from '@/lib/toast';
import {
  SERVICE_LISTING_PAYMENT_TOKENS,
  ETH_TOKEN,
  USDC_TOKEN,
  Token,
  useTokenPriceConversion,
} from '@/lib/hooks/useTokenConversion';
import { useMaxBudgetUsd, useMinBudget } from '@/lib/hooks/useMinBudget';
import { formatAmount, parseAmount, tokenAmountToUsd } from '@/lib/tokenUtils';
import { CreateServiceSteps } from '@/components/marketplace/CreateServiceSteps';
import { ServiceFormFields } from '@/components/marketplace/ServiceFormFields';
import { parseEther } from 'viem';

const MAX_SERVICE_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_METADATA_URI_LENGTH = 2000;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
const SERVICE_BOND_AMOUNT = parseEther('0.01');

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

type Step = 'checking' | 'no-agents' | 'ready' | 'creating' | 'done';

function hasValidDecimalFormat(value: string): boolean {
  return /^\d+(\.\d+)?$/.test(value.trim().replace(/,/g, ''));
}

function getDecimalPlaces(value: string): number {
  const [, decimals = ''] = value.trim().replace(/,/g, '').split('.');
  return decimals.length;
}

export default function CreateServicePage() {
  useEffect(() => {
    document.title = 'Create Service | Kokonut Agent Economy';
  }, []);

  const router = useRouter();
  const { isConnected, address } = useAccount();
  const { data: ethBalance } = useBalance({ address });
  const { addLog, isDebugMode } = useDebug();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<FormErrors>(initialFormErrors);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);

  const {
    agents,
    isLoading: isCheckingAgents,
    error: agentsError,
  } = useWalletAgentsFromSubgraph(address);

  const [step, setStep] = useState<Step>('checking');
  const [lastCreatedServiceId, setLastCreatedServiceId] = useState<bigint | null>(null);
  const { refetch: refetchServiceCount } = useTotalServiceCount();

  const {
    minBudgetRaw,
    isLoading: isMinBudgetLoading,
  } = useMinBudget(formData.paymentToken.address, formData.paymentToken.decimals);
  const { maxBudgetUsd } = useMaxBudgetUsd();
  const { ethToUsdcRate } = useTokenPriceConversion();

  useEffect(() => {
    if (step === 'creating' || step === 'done') return;

    if (isCheckingAgents) {
      setStep('checking');
    } else if (agents.length === 0) {
      setStep('no-agents');
    } else if (agents.length > 0) {
      setStep('ready');
    }
  }, [isCheckingAgents, agents, step]);

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
      if (!hasValidDecimalFormat(value)) return 'Price must be a valid decimal amount';
      if (getDecimalPlaces(value) > formData.paymentToken.decimals) {
        return `${formData.paymentToken.symbol} supports up to ${formData.paymentToken.decimals} decimals`;
      }

      const priceNum = parseFloat(value);
      if (isNaN(priceNum) || priceNum <= 0) return 'Price must be greater than 0';

      const rawAmount = parseAmount(value, formData.paymentToken);
      if (!minBudgetRaw || isMinBudgetLoading) return 'Minimum price is still loading';
      if (rawAmount < minBudgetRaw) {
        return `Minimum price is ${formatAmount(minBudgetRaw, formData.paymentToken, { includeSymbol: true })}`;
      }

      const usdValue = tokenAmountToUsd(rawAmount, formData.paymentToken, ethToUsdcRate);
      if (usdValue > maxBudgetUsd) {
        return `Price must be less than ${maxBudgetUsd.toLocaleString()} USD equivalent`;
      }
      return null;
    } catch {
      return 'Price must be a valid number';
    }
  }, [ethToUsdcRate, formData.paymentToken, isMinBudgetLoading, maxBudgetUsd, minBudgetRaw]);

  const validatePaymentAddress = useCallback((value: string): string | null => {
    if (!value || value === '') return null;
    if (!/^0x[a-fA-F0-9]{40}$/.test(value)) return 'Invalid Ethereum address';
    return null;
  }, []);

  const handleInputChange = useCallback(
    (field: keyof FormData, value: string) => {
      if (field === 'paymentToken') {
        const token = SERVICE_LISTING_PAYMENT_TOKENS.find(t => t.symbol === value) || USDC_TOKEN;
        setFormData(prev => ({ ...prev, paymentToken: token }));
        setFormErrors(prev => ({ ...prev, price: null }));
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
        case 'paymentAddress':
          error = validatePaymentAddress(value);
          break;
      }
      setFormErrors(prev => ({ ...prev, [field]: error }));
    },
    [validateName, validateDescription, validateMetadataURIField, validatePrice, validatePaymentAddress]
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
      refetchServiceCount().then(({ data }) => {
        const newCount = typeof data === 'bigint' ? data : BigInt(data ?? 0);
        if (newCount > 0n) {
          setLastCreatedServiceId(newCount - 1n);
        }
      }).catch(() => {
        /* best-effort; CTA falls back to View Marketplace if id is unavailable */
      });
    }
  }, [isServiceConfirmed, step, refetchServiceCount]);

  useEffect(() => {
    if (serviceError) {
      showToast.error('Service creation failed', serviceError.message || 'Please try again.');
    }
  }, [serviceError]);

  useEffect(() => {
    if (!formData.price) return;
    setFormErrors(prev => ({ ...prev, price: validatePrice(formData.price) }));
  }, [formData.paymentToken, formData.price, validatePrice]);

  const performSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!isConnected || agents.length === 0) return;

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

      const agent = selectedAgentId
        ? agents.find(a => a.id === selectedAgentId) || agents[0]
        : agents[0];
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
      agents,
      selectedAgentId,
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
  const hasEnoughBondBalance = ethBalance ? ethBalance.value >= SERVICE_BOND_AMOUNT : true;
  const ethBalanceLabel = ethBalance
    ? formatAmount(ethBalance.value, ETH_TOKEN, {
        includeSymbol: true,
        maxFractionDigits: 4,
      })
    : 'Loading...';
  const minPriceLabel = minBudgetRaw
    ? formatAmount(minBudgetRaw, formData.paymentToken, {
        includeSymbol: true,
        minFractionDigits: formData.paymentToken.symbol === 'USDC' ? 2 : 0,
        maxFractionDigits: formData.paymentToken.symbol === 'USDC' ? 2 : 6,
      })
    : `$5 USD equivalent`;
  const canSubmit =
    formData.name.trim().length > 0 &&
    formData.description.trim().length > 0 &&
    !isNaN(formPrice) &&
    formPrice > 0 &&
    !formErrors.price;

  // Handle step-based views
  if (step === 'done' || step === 'checking' || step === 'no-agents') {
    return (
      <CreateServiceSteps
        step={step}
        agentsError={agentsError}
        isDebugMode={isDebugMode}
        onNavigate={(path) => router.push(path)}
        lastCreatedServiceId={lastCreatedServiceId}
      />
    );
  }

  // Ready state - show form
  if (step === 'ready' && agents.length > 0) {
    const agent = selectedAgentId
      ? agents.find(a => a.id === selectedAgentId) || agents[0]
      : agents[0];

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
              agents={agents}
              selectedAgentId={selectedAgentId}
              onAgentSelect={setSelectedAgentId}
              minPriceLabel={minPriceLabel}
              isMinBudgetLoading={isMinBudgetLoading}
              maxBudgetUsd={maxBudgetUsd}
              ethBalanceLabel={ethBalanceLabel}
              hasEnoughBondBalance={hasEnoughBondBalance}
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
