'use client';

import { AlertTriangle, Loader2, ShieldCheck, Wallet } from 'lucide-react';
import { TransactionError } from '@/components/TransactionError';
import { ServicePaymentTokenSelector } from './ServicePaymentTokenSelector';
import { Token } from '@/lib/hooks/useTokenConversion';
import { formatTimeRemaining } from '@/lib/hooks/useDebounce';
import { btn } from '@/lib/design-system';

const MAX_SERVICE_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_METADATA_URI_LENGTH = 2000;
interface FormData {
  name: string;
  description: string;
  metadataURI: string;
  price: string;
  paymentToken: Token;
  paymentAddress: string;
}

interface FormErrors {
  name: string | null;
  description: string | null;
  metadataURI: string | null;
  price: string | null;
  paymentAddress: string | null;
}

interface ServiceFormFieldsProps {
  formData: FormData;
  formErrors: FormErrors;
  handleInputChange: (field: keyof FormData, value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isServicePending: boolean;
  isServiceConfirming: boolean;
  isSubmitting: boolean;
  timeUntilNextSubmit: number;
  canSubmit: boolean;
  isConnected: boolean;
  serviceError: Error | null;
  address?: string;
  agents: Array<{ id: number; metadata?: { name?: string } | null }>;
  selectedAgentId: number | null;
  onAgentSelect: (id: number) => void;
  minPriceLabel: string;
  isMinBudgetLoading: boolean;
  maxBudgetUsd: number;
  ethBalanceLabel: string;
  hasEnoughBondBalance: boolean;
}

export function ServiceFormFields({
  formData,
  formErrors,
  handleInputChange,
  handleSubmit,
  isServicePending,
  isServiceConfirming,
  isSubmitting,
  timeUntilNextSubmit,
  canSubmit,
  isConnected,
  serviceError,
  address,
  agents,
  selectedAgentId,
  onAgentSelect,
  minPriceLabel,
  isMinBudgetLoading,
  maxBudgetUsd,
  ethBalanceLabel,
  hasEnoughBondBalance,
}: ServiceFormFieldsProps) {
  const agent = selectedAgentId
    ? agents.find(a => a.id === selectedAgentId) || agents[0]
    : agents[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="size-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-warning-900 dark:text-warning-100">
              0.01 ETH Service Bond Required
            </p>
            <p className="text-sm text-default-600 dark:text-default-400 mt-1">
              The listing bond stays locked while your service is active and can be withdrawn
              after deactivation plus the 7-day cooldown. Your service price can be paid in
              {` ${formData.paymentToken.symbol}`}, but the listing bond is always paid in ETH.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-content2 px-2 py-1 text-default-600">
                <ShieldCheck className="size-3" /> Bond: 0.01 ETH
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${hasEnoughBondBalance ? 'bg-content2 text-default-600' : 'bg-danger/10 text-danger'}`}>
                <Wallet className="size-3" /> Balance: {ethBalanceLabel}
              </span>
            </div>
            {!hasEnoughBondBalance && (
              <p className="text-xs text-danger mt-2">
                Add ETH before creating this service. You need at least 0.01 ETH plus gas.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Agent Selector */}
      {agents.length > 1 && (
        <div>
          <label htmlFor="agent-select" className="block text-sm font-medium mb-2">
            Select Agent *
          </label>
          <select
            id="agent-select"
            value={selectedAgentId || agent?.id || ''}
            onChange={e => onAgentSelect(Number(e.target.value))}
            className="w-full px-3 py-2 border border-divider rounded-lg bg-content2"
          >
            {agents.map(a => (
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
      <ServicePaymentTokenSelector
        selectedToken={formData.paymentToken}
        onSelect={token => handleInputChange('paymentToken', token.symbol)}
        disabled={isServicePending || isServiceConfirming}
      />

      {/* Service Name */}
      <div>
        <label htmlFor="service-name" className="block text-sm font-medium mb-2">
          Service Name <span className="text-danger">*</span>
        </label>
        <input
          id="service-name"
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
        <label htmlFor="service-description" className="block text-sm font-medium mb-2">
          Description <span className="text-danger">*</span>
        </label>
        <textarea
          id="service-description"
          value={formData.description}
          onChange={e => handleInputChange('description', e.target.value)}
          onBlur={() => handleInputChange('description', formData.description)}
          className={`w-full px-3 py-2 border rounded-lg bg-content2 h-24 ${
            formErrors.description ? 'border-danger' : 'border-divider'
          }`}
          placeholder="Describe your service…"
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
        <label htmlFor="service-price" className="block text-sm font-medium mb-2">
          Price ({formData.paymentToken.symbol}) <span className="text-danger">*</span>
        </label>
        <div className="relative">
          <input
            id="service-price"
            type="number"
            value={formData.price}
            onChange={e => handleInputChange('price', e.target.value)}
            onBlur={() => handleInputChange('price', formData.price)}
            className={`w-full px-3 py-2 border rounded-lg bg-content2 ${
              formErrors.price ? 'border-danger' : 'border-divider'
            }`}
            placeholder="100"
            min="0"
            step={formData.paymentToken.symbol === 'USDC' ? '0.01' : '0.000001'}
          />
        </div>
        {formErrors.price ? (
          <p className="text-xs text-danger mt-1">{formErrors.price}</p>
        ) : (
          <p className="text-xs text-default-400 mt-1">
            {isMinBudgetLoading ? 'Loading minimum price...' : `Minimum ${minPriceLabel}`}, maximum ${maxBudgetUsd.toLocaleString()} USD equivalent
          </p>
        )}
      </div>

      {/* Metadata URI (optional) */}
      <div>
        <label htmlFor="service-metadata" className="block text-sm font-medium mb-2">
          Metadata URI (Optional)
        </label>
        <input
          id="service-metadata"
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
        <label htmlFor="service-payment-address" className="block text-sm font-medium mb-2">
          Payment Address (Optional)
          <span className="text-default-400 ml-2">- Defaults to your wallet</span>
        </label>
        <input
          id="service-payment-address"
          type="text"
          value={formData.paymentAddress}
          onChange={e => handleInputChange('paymentAddress', e.target.value)}
          onBlur={() => handleInputChange('paymentAddress', formData.paymentAddress)}
          className={`w-full px-3 py-2 border rounded-lg bg-content2 ${
            formErrors.paymentAddress ? 'border-danger' : 'border-divider'
          }`}
          placeholder={address || '0x…'}
        />
        {formErrors.paymentAddress ? (
          <p className="text-xs text-danger mt-1">{formErrors.paymentAddress}</p>
        ) : (
          <p className="text-xs text-default-400 mt-1">
            Custom address to receive payments (leave empty for your wallet)
          </p>
        )}
      </div>

      <div className="rounded-xl border border-divider bg-content2/50 p-4">
        <p className="text-sm font-semibold mb-3">Review Listing</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-default-400">Agent</p>
            <p className="font-medium">
              Agent #{agent?.id} {agent?.metadata?.name ? `- ${agent.metadata.name}` : ''}
            </p>
          </div>
          <div>
            <p className="text-xs text-default-400">Service Price</p>
            <p className="font-medium">
              {formData.price || '0'} {formData.paymentToken.symbol}
            </p>
          </div>
          <div>
            <p className="text-xs text-default-400">Listing Bond</p>
            <p className="font-medium">0.01 ETH</p>
          </div>
          <div>
            <p className="text-xs text-default-400">Payment Address</p>
            <p className="font-mono text-xs break-all">
              {formData.paymentAddress.trim() || address || 'Connect wallet'}
            </p>
          </div>
        </div>
      </div>

      <TransactionError error={serviceError} />

      <button
        type="submit"
        className={btn('secondary', 'w-full font-semibold')}
        disabled={!isConnected || isServicePending || isServiceConfirming || !canSubmit || !hasEnoughBondBalance}
      >
        {isServicePending || isServiceConfirming
          ? <><Loader2 className="size-4 mr-2 animate-spin" />Creating…</>
          : isSubmitting
            ? <><Loader2 className="size-4 mr-2 animate-spin" />Wait {formatTimeRemaining(timeUntilNextSubmit)}…</>
            : 'Create Service'
        }
      </button>
    </form>
  );
}
