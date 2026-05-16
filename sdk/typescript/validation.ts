/**
 * Kokonut Agent SDK - Validation & Error Handling
 * Runtime validation for SDK parameters and contract error mapping
 */

import { BaseError, isHex } from 'viem';
import { SDKError, ContractError, TransactionError } from './types';

// ============================================================================
// Validation Schemas (manual implementation without zod to avoid dependency)
// ============================================================================

export interface ValidationResult {
  success: boolean;
  errors: string[];
}

function validateAddress(value: unknown, fieldName: string): string | null {
  if (typeof value !== 'string' || !isHex(value) || value.length !== 42) {
    return `${fieldName} must be a valid Ethereum address`;
  }
  return null;
}

function validateBigInt(value: unknown, fieldName: string, min?: bigint): string | null {
  if (typeof value !== 'bigint') {
    return `${fieldName} must be a valid bigint`;
  }
  if (min !== undefined && value < min) {
    return `${fieldName} must be >= ${min}`;
  }
  return null;
}

function validateString(value: unknown, fieldName: string, minLength = 1, maxLength = 10000): string | null {
  if (typeof value !== 'string') {
    return `${fieldName} must be a string`;
  }
  if (value.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`;
  }
  if (value.length > maxLength) {
    return `${fieldName} must be at most ${maxLength} characters`;
  }
  return null;
}

// ============================================================================
// Parameter Validators
// ============================================================================

export function validateAgentRegistration(params: unknown): ValidationResult {
  const errors: string[] = [];
  if (!params || typeof params !== 'object') {
    return { success: false, errors: ['Params must be an object'] };
  }
  const p = params as Record<string, unknown>;
  const nameErr = validateString(p.name, 'name', 1, 100);
  if (nameErr) errors.push(nameErr);
  if (p.capabilities !== undefined) {
    if (!Array.isArray(p.capabilities)) {
      errors.push('capabilities must be an array');
    } else {
      p.capabilities.forEach((cap, i) => {
        const capErr = validateString(cap, `capabilities[${i}]`, 1, 50);
        if (capErr) errors.push(capErr);
      });
    }
  }
  return { success: errors.length === 0, errors };
}

export function validateServiceParams(params: unknown): ValidationResult {
  const errors: string[] = [];
  if (!params || typeof params !== 'object') {
    return { success: false, errors: ['Params must be an object'] };
  }
  const p = params as Record<string, unknown>;
  const agentErr = validateBigInt(p.agentId, 'agentId', 0n);
  if (agentErr) errors.push(agentErr);
  const nameErr = validateString(p.name, 'name', 1, 100);
  if (nameErr) errors.push(nameErr);
  const descErr = validateString(p.description, 'description', 1, 1000);
  if (descErr) errors.push(descErr);
  const priceErr = validateBigInt(p.price, 'price', 0n);
  if (priceErr) errors.push(priceErr);
  if (p.paymentToken !== undefined) {
    const tokenErr = validateAddress(p.paymentToken, 'paymentToken');
    if (tokenErr) errors.push(tokenErr);
  }
  return { success: errors.length === 0, errors };
}

export function validateJobParams(params: unknown): ValidationResult {
  const errors: string[] = [];
  if (!params || typeof params !== 'object') {
    return { success: false, errors: ['Params must be an object'] };
  }
  const p = params as Record<string, unknown>;
  const providerErr = validateAddress(p.provider, 'provider');
  if (providerErr) errors.push(providerErr);
  if (p.budget !== undefined) {
    const budgetErr = validateBigInt(p.budget, 'budget', 0n);
    if (budgetErr) errors.push(budgetErr);
  }
  if (p.paymentToken !== undefined && p.paymentToken !== '0x0000000000000000000000000000000000000000') {
    const tokenErr = validateAddress(p.paymentToken, 'paymentToken');
    if (tokenErr) errors.push(tokenErr);
  }
  const descErr = validateString(p.description, 'description', 1, 1000);
  if (descErr) errors.push(descErr);
  if (p.expiredAt !== undefined) {
    const expiryErr = validateBigInt(p.expiredAt, 'expiredAt', BigInt(Math.floor(Date.now() / 1000) + 300));
    if (expiryErr) errors.push(expiryErr);
  }
  return { success: errors.length === 0, errors };
}

export function validateProposalParams(params: unknown): ValidationResult {
  const errors: string[] = [];
  if (!params || typeof params !== 'object') {
    return { success: false, errors: ['Params must be an object'] };
  }
  const p = params as Record<string, unknown>;
  const titleErr = validateString(p.title, 'title', 1, 200);
  if (titleErr) errors.push(titleErr);
  const descErr = validateString(p.description, 'description', 1, 5000);
  if (descErr) errors.push(descErr);
  const rewardErr = validateBigInt(p.reward, 'reward', 0n);
  if (rewardErr) errors.push(rewardErr);
  if (p.deadline !== undefined) {
    const deadlineErr = validateBigInt(p.deadline, 'deadline', BigInt(Math.floor(Date.now() / 1000) + 300));
    if (deadlineErr) errors.push(deadlineErr);
  }
  return { success: errors.length === 0, errors };
}

export function validateFeedbackParams(params: unknown): ValidationResult {
  const errors: string[] = [];
  if (!params || typeof params !== 'object') {
    return { success: false, errors: ['Params must be an object'] };
  }
  const p = params as Record<string, unknown>;
  const agentErr = validateAddress(p.agent, 'agent');
  if (agentErr) errors.push(agentErr);
  const ratingErr = validateBigInt(p.rating as bigint, 'rating');
  if (ratingErr) errors.push(ratingErr);
  return { success: errors.length === 0, errors };
}

// ============================================================================
// Contract Error Mapping
// ============================================================================

const CUSTOM_ERROR_SIGNATURES: Record<string, string> = {
  '0x8baa579f': 'InvalidJob',
  '0x2a75e519': 'WrongStatus',
  '0x81582a6f': 'Unauthorized',
  '0xd92e233d': 'ZeroAddress',
  '0x3e3755e9': 'ExpiryTooShort',
  '0x32e1e8c4': 'ExpiryTooLong',
  '0x67e186ce': 'ZeroBudget',
  '0x5876421c': 'BudgetTooLow',
  '0x9a15e77c': 'BudgetTooHigh',
  '0x9e87fac': 'ProviderNotSet',
  '0x8b8e3e4c': 'InvalidHook',
  '0x6b9ce0e3': 'MaxJobsPerClient',
  '0x3e5648c4': 'TokenNotAllowed',
  '0x7e5648c4': 'TokenNotConfigured',
  '0x4e5648c4': 'ClientNotApproved',
  '0x5e5648c4': 'InsufficientPayment',
  '0x6e5648c4': 'RolesMustBeDistinct',
  '0x7e5648c5': 'InvalidPrice',
  '0x8e5648c5': 'EvaluatorAlreadyRegistered',
  '0x9e5648c5': 'EvaluatorNotRegistered',
  '0xae5648c5': 'NoEvaluatorsAvailable',
  '0xbe5648c5': 'InsufficientEvaluatorStake',
  '0xce5648c5': 'EvaluatorNotRevealed',
  '0xde5648c5': 'RevealTooEarly',
  '0xee5648c5': 'NoCommitFound',
  '0xfe5648c5': 'InvalidCommit',
  '0x1e5648c5': 'BlockhashUnavailable',
  '0x2e5648c5': 'NoActiveEvaluators',
  '0x3e5648c5': 'ClientBlacklisted',
  '0x4e5648c5': 'ProviderBlacklisted',
  '0x5e5648c5': 'EvaluatorBlacklisted',
  '0x6e5648c5': 'JobNotExpired',
  '0x7e5648c6': 'DisputeWindowTooShort',
  '0x8e5648c6': 'DisputeWindowTooLong',
  '0x9e5648c6': 'SlashBPTooHigh',
  '0xae5648c6': 'DecimalsQueryFailed',
  '0xbe5648c6': 'InvalidDecimals',
  '0xce5648c6': 'EthTransferFailed',
  '0xde5648c6': 'RefundFailed',
  '0xee5648c6': 'StakeRefundFailed',
  '0xfe5648c6': 'StakeTransferFailed',
};

export function mapContractError(error: unknown, method?: string): ContractError {
  if (error instanceof ContractError) return error;
  if (error instanceof BaseError) {
    const shortMessage = error.shortMessage || error.message;
    for (const [sig, name] of Object.entries(CUSTOM_ERROR_SIGNATURES)) {
      if (shortMessage.includes(sig) || error.message.includes(sig)) {
        return new ContractError(`ContractError: ${name}`, method);
      }
    }
    return new ContractError(shortMessage, method);
  }
  if (error instanceof Error) {
    return new ContractError(error.message, method);
  }
  return new ContractError(String(error), method);
}

export function mapTransactionError(error: unknown, hash?: string): TransactionError {
  if (error instanceof TransactionError) return error;
  const contractError = mapContractError(error);
  return new TransactionError(contractError.message, hash);
}

// ============================================================================
// Safe Contract Call Wrapper
// ============================================================================

export async function safeContractCall<T>(
  fn: () => Promise<T>,
  method?: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw mapContractError(error, method);
  }
}

export async function safeTransactionCall<T>(
  fn: () => Promise<T>,
  method?: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw mapTransactionError(error);
  }
}
