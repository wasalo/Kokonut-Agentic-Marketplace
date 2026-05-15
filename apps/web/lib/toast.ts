'use client';

import { toast } from 'sonner';

export interface ErrorResolution {
  code: string;
  message: string;
  resolution: string;
  actionLabel?: string;
}

export const ERROR_CODES: Record<string, ErrorResolution> = {
  // User Action Errors
  USER_REJECTED: {
    code: 'USER_REJECTED',
    message: 'Transaction was rejected by user',
    resolution: 'Please approve the transaction in your wallet to continue.',
    actionLabel: 'Try Again',
  },

  // Network Errors
  WRONG_CHAIN: {
    code: 'WRONG_CHAIN',
    message: 'Wrong network detected',
    resolution: 'Please switch your wallet to Sepolia testnet. Most Kokonut features only work on Sepolia.',
    actionLabel: 'Switch Network',
  },

  // Fund Errors
  INSUFFICIENT_FUNDS: {
    code: 'INSUFFICIENT_FUNDS',
    message: 'Insufficient funds to complete transaction',
    resolution: 'Add more USDC to your wallet for the transaction amount plus gas fees.',
  },
  INSUFFICIENT_ETH: {
    code: 'INSUFFICIENT_ETH',
    message: 'Insufficient ETH balance for gas fees',
    resolution: 'Add ETH to your wallet for gas. You need at least 0.005 ETH for most transactions.',
    actionLabel: 'Get ETH',
  },

  // Transaction Errors
  NONCE_MISMATCH: {
    code: 'NONCE_MISMATCH',
    message: 'Transaction nonce mismatch',
    resolution: 'Your wallet nonce is out of sync. Wait a moment and try again.',
    actionLabel: 'Retry',
  },
  GAS_ESTIMATE_FAILED: {
    code: 'GAS_ESTIMATE_FAILED',
    message: 'Gas estimation failed',
    resolution: 'The transaction may fail. Try increasing the gas limit manually.',
  },
  GAS_TOO_LOW: {
    code: 'GAS_TOO_LOW',
    message: 'Transaction fee too low',
    resolution: 'Increase the gas price to speed up your transaction.',
  },

  // Contract Validation Errors
  NAME_REQUIRED: {
    code: 'NAME_REQUIRED',
    message: 'Name is required',
    resolution: 'Please enter a name for your agent or service.',
  },
  PRICE_TOO_LOW: {
    code: 'PRICE_TOO_LOW',
    message: 'Price must be greater than 0',
    resolution: 'Set a price above 0 for your service.',
  },
  INVALID_PAYMENT_TOKEN: {
    code: 'INVALID_PAYMENT_TOKEN',
    message: 'Invalid payment token address',
    resolution: 'Use a valid ERC-20 token address (USDC or ETH).',
  },
  INVALID_AGENT: {
    code: 'INVALID_AGENT',
    message: 'Invalid agent',
    resolution: 'Register your agent first before creating services or jobs.',
    actionLabel: 'Register Agent',
  },
  NOT_AUTHORIZED: {
    code: 'NOT_AUTHORIZED',
    message: 'You are not authorized to perform this action',
    resolution: 'Only the owner or authorized wallet can perform this action.',
  },
  SERVICE_INACTIVE: {
    code: 'SERVICE_INACTIVE',
    message: 'Service is no longer active',
    resolution: 'Reactivate the service or create a new one.',
    actionLabel: 'View Services',
  },
  MAX_EVALUATORS: {
    code: 'MAX_EVALUATORS',
    message: 'Maximum evaluators reached',
    resolution: 'This proposal has reached the maximum evaluator limit (5).',
  },
  MAX_JOBS: {
    code: 'MAX_JOBS',
    message: 'Maximum jobs reached',
    resolution: 'Complete or cancel existing jobs before creating new ones.',
    actionLabel: 'View Jobs',
  },
  INVALID_DEADLINE: {
    code: 'INVALID_DEADLINE',
    message: 'Invalid deadline',
    resolution: 'Deadline must be at least 5 minutes in the future and within 1 year.',
  },
  DEADLINE_EXPIRED: {
    code: 'DEADLINE_EXPIRED',
    message: 'The deadline has expired',
    resolution: 'Create a new job with a future deadline.',
    actionLabel: 'Create Job',
  },
  DESCRIPTION_TOO_LONG: {
    code: 'DESCRIPTION_TOO_LONG',
    message: 'Description is too long',
    resolution: 'Keep descriptions under 1000 characters.',
  },
  NOT_CLIENT: {
    code: 'NOT_CLIENT',
    message: 'Only the job client can perform this action',
    resolution: 'Connect with the client wallet that created this job.',
  },
  NOT_PROVIDER: {
    code: 'NOT_PROVIDER',
    message: 'Only the service provider can perform this action',
    resolution: 'Connect with the provider wallet assigned to this job.',
  },
  NOT_EVALUATOR: {
    code: 'NOT_EVALUATOR',
    message: 'Only the designated evaluator can perform this action',
    resolution: 'Only the assigned evaluator can complete this action.',
  },
  WRONG_STATUS: {
    code: 'WRONG_STATUS',
    message: 'Action not available in current status',
    resolution: 'This action cannot be performed in the current job/proposal state.',
  },
  ALREADY_EXISTS: {
    code: 'ALREADY_EXISTS',
    message: 'Item already exists',
    resolution: 'Use a different name or address that is not already registered.',
  },
  NOT_FOUND: {
    code: 'NOT_FOUND',
    message: 'Item not found',
    resolution: 'The requested item does not exist or has been removed.',
  },

  // Network Errors
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    message: 'Network error',
    resolution: 'Check your internet connection and try again.',
    actionLabel: 'Retry',
  },
  RATE_LIMIT: {
    code: 'RATE_LIMIT',
    message: 'Rate limit exceeded',
    resolution: 'Wait 30 seconds and try again.',
    actionLabel: 'Wait & Retry',
  },

  // Contract Execution Errors
  TRANSACTION_FAILED: {
    code: 'TRANSACTION_FAILED',
    message: 'Transaction failed',
    resolution: 'Check your inputs and ensure all requirements are met.',
    actionLabel: 'Try Again',
  },
  EXECUTION_REVERTED: {
    code: 'EXECUTION_REVERTED',
    message: 'Transaction execution failed',
    resolution: 'Verify all requirements are met before retrying.',
  },
  OUT_OF_GAS: {
    code: 'OUT_OF_GAS',
    message: 'Transaction ran out of gas',
    resolution: 'Increase the gas limit for this transaction.',
  },

  // Contract-specific Errors
  JOB_EXPIRED: {
    code: 'JOB_EXPIRED',
    message: 'Job has expired',
    resolution: 'Create a new job or request a refund.',
    actionLabel: 'View Jobs',
  },
  JOB_NOT_FUNDED: {
    code: 'JOB_NOT_FUNDED',
    message: 'Job is not funded',
    resolution: 'Fund the job with USDC before proceeding.',
    actionLabel: 'Fund Job',
  },
  JOB_NOT_SUBMITTED: {
    code: 'JOB_NOT_SUBMITTED',
    message: 'Work not submitted',
    resolution: 'Provider must submit work before completion.',
  },
  EVALUATOR_ALREADY_SUBMITTED: {
    code: 'EVALUATOR_ALREADY_SUBMITTED',
    message: 'Evaluation already submitted',
    resolution: 'You have already submitted an evaluation for this proposal.',
  },
  ALREADY_VOTED: {
    code: 'ALREADY_VOTED',
    message: 'Already voted on this proposal',
    resolution: 'You have already attested to this decision.',
  },
  GRACE_PERIOD_NOT_ENDED: {
    code: 'GRACE_PERIOD_NOT_ENDED',
    message: 'Grace period not ended',
    resolution: 'Wait for the 7-day grace period to end before finalizing.',
  },
  GRACE_PERIOD_ENDED: {
    code: 'GRACE_PERIOD_ENDED',
    message: 'Grace period already ended',
    resolution: 'The decision can now be finalized.',
  },
  NO_EVALUATIONS: {
    code: 'NO_EVALUATIONS',
    message: 'No evaluations submitted',
    resolution: 'At least one evaluator must submit an evaluation.',
  },
  STAKING_REQUIRED: {
    code: 'STAKING_REQUIRED',
    message: 'ETH stake required',
    resolution: 'Attach ETH equal to the reward amount when submitting an evaluation.',
  },
};

export const showToast = {
  success: (message: string, description?: string) => {
    toast.success(message, {
      description,
      duration: 4000,
    });
  },

  error: (message: string, description?: string) => {
    toast.error(message, {
      description,
      duration: 5000,
    });
  },

  warning: (message: string, description?: string) => {
    toast.warning(message, {
      description,
      duration: 4000,
    });
  },

  info: (message: string, description?: string) => {
    toast.info(message, {
      description,
      duration: 3000,
    });
  },

  loading: (message: string) => {
    return toast.loading(message);
  },

  dismiss: (id?: string | number) => {
    toast.dismiss(id);
  },

  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ) => {
    return toast.promise(promise, messages);
  },
};

export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

export function getTransactionError(error: unknown): string {
  return getErrorResolution(error).message;
}

export function getErrorResolution(error: unknown): ErrorResolution {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // wagmi v3 structured error codes
    const err = error as { code?: number; shortMessage?: string };
    const code = (err as any)?.code;
    const shortMessage = (err as any)?.shortMessage?.toLowerCase() || '';

    // Check error code first for wagmi v3 structured errors
    if (code === 4001 || code === 'ACTION_REJECTED' || shortMessage.includes('user rejected')) {
      return ERROR_CODES.USER_REJECTED;
    }
    if (code === -32000 || shortMessage.includes('insufficient funds') || shortMessage.includes('gas required exceeds')) {
      return ERROR_CODES.INSUFFICIENT_FUNDS;
    }

    // Network errors (before user action to catch chain-switch rejections)
    if (code === 4902 || message.includes('chain mismatch') || message.includes('chain not configured') || message.includes('wallet_switch') || message.includes('wrong chain') || message.includes('unrecognized chain')) {
      return ERROR_CODES.WRONG_CHAIN;
    }

    // User action errors (string fallback)
    if (message.includes('user rejected') || message.includes('user denied')) {
      return ERROR_CODES.USER_REJECTED;
    }

    // Fund errors (string fallback)
    if (message.includes('insufficient funds')) {
      return ERROR_CODES.INSUFFICIENT_FUNDS;
    }
    if (message.includes('eth balance') || message.includes('gas required')) {
      return ERROR_CODES.INSUFFICIENT_ETH;
    }

    // Transaction errors
    if (code === -32003 || message.includes('nonce')) {
      return ERROR_CODES.NONCE_MISMATCH;
    }
    if (code === -32015 || (message.includes('gas') && message.includes('estimat'))) {
      return ERROR_CODES.GAS_ESTIMATE_FAILED;
    }
    if (message.includes('underpriced') || message.includes('fee too low')) {
      return ERROR_CODES.GAS_TOO_LOW;
    }

    // Contract validation errors - Kokonut specific
    if (message.includes('name required') || message.includes('empty name')) {
      return ERROR_CODES.NAME_REQUIRED;
    }
    if (message.includes('price') && message.includes('greater than 0')) {
      return ERROR_CODES.PRICE_TOO_LOW;
    }
    if (message.includes('invalid payment token') || message.includes('zero payment token')) {
      return ERROR_CODES.INVALID_PAYMENT_TOKEN;
    }
    if (message.includes('invalid agent')) {
      return ERROR_CODES.INVALID_AGENT;
    }
    if (message.includes('not owner') || message.includes('not provider')) {
      return ERROR_CODES.NOT_AUTHORIZED;
    }
    if (message.includes('service inactive')) {
      return ERROR_CODES.SERVICE_INACTIVE;
    }
    if (message.includes('max evaluators')) {
      return ERROR_CODES.MAX_EVALUATORS;
    }
    if (message.includes('max jobs')) {
      return ERROR_CODES.MAX_JOBS;
    }
    if (message.includes('deadline')) {
      return ERROR_CODES.INVALID_DEADLINE;
    }
    if (message.includes('expired') && message.includes('job')) {
      return ERROR_CODES.JOB_EXPIRED;
    }
    if (message.includes('expired')) {
      return ERROR_CODES.DEADLINE_EXPIRED;
    }
    if (message.includes('description too long')) {
      return ERROR_CODES.DESCRIPTION_TOO_LONG;
    }
    if (message.includes('not client')) {
      return ERROR_CODES.NOT_CLIENT;
    }
    if (message.includes('not provider')) {
      return ERROR_CODES.NOT_PROVIDER;
    }
    if (message.includes('not evaluator')) {
      return ERROR_CODES.NOT_EVALUATOR;
    }
    if (message.includes('wrong status')) {
      return ERROR_CODES.WRONG_STATUS;
    }
    if (message.includes('already exists')) {
      return ERROR_CODES.ALREADY_EXISTS;
    }
    if (message.includes('not found') || message.includes('invalid')) {
      return ERROR_CODES.NOT_FOUND;
    }

    // Network errors
    if (
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('timeout')
    ) {
      return ERROR_CODES.NETWORK_ERROR;
    }
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return ERROR_CODES.RATE_LIMIT;
    }

    // Contract execution errors
    if (message.includes('revert')) {
      return ERROR_CODES.TRANSACTION_FAILED;
    }
    if (message.includes('execution reverted')) {
      return ERROR_CODES.EXECUTION_REVERTED;
    }
    if (message.includes('out of gas')) {
      return ERROR_CODES.OUT_OF_GAS;
    }

    // Return sanitized message for unknown errors
    return {
      code: 'UNKNOWN',
      message: sanitizeErrorMessage(error.message),
      resolution: 'An unexpected error occurred. Please try again.',
    };
  }
  return ERROR_CODES.TRANSACTION_FAILED;
}

/**
 * Sanitize error messages to remove sensitive information
 * Removes addresses, transaction hashes, and excessive technical details
 */
export function sanitizeErrorMessage(message: string): string {
  // Remove Ethereum addresses (0x followed by 40 hex characters)
  let sanitized = message.replace(/0x[a-fA-F0-9]{40}/g, '[ADDRESS]');

  // Remove transaction hashes (0x followed by 64 hex characters)
  sanitized = sanitized.replace(/0x[a-fA-F0-9]{64}/g, '[TX_HASH]');

  // Remove large numbers that might be amounts
  sanitized = sanitized.replace(/\b\d{10,}\b/g, '[LARGE_NUMBER]');

  // Remove stack traces and code references
  sanitized = sanitized.replace(/at\s+\w+\s+\([^)]*\)/g, '');
  sanitized = sanitized.replace(/\{[^}]*\}/g, '[DETAILS]');

  // Remove revert reason prefixes
  sanitized = sanitized.replace(/execution reverted:?/i, '');
  sanitized = sanitized.replace(/reverted:?/i, '');

  // Trim and limit length
  sanitized = sanitized.trim();
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200) + '...';
  }

  // If after sanitization it's empty or just brackets, return generic message
  if (!sanitized || sanitized.match(/^\[.*\]$/) || sanitized.length < 10) {
    return 'Transaction failed. Please try again.';
  }

  return sanitized;
}
