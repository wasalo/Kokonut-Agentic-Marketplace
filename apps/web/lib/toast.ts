'use client';

import { toast } from 'sonner';

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
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // User action errors
    if (message.includes('user rejected') || message.includes('user denied')) {
      return 'Transaction was rejected by user';
    }

    // Fund errors
    if (message.includes('insufficient funds')) {
      return 'Insufficient funds to complete transaction';
    }
    if (message.includes('eth balance')) {
      return 'Insufficient ETH balance for gas fees';
    }

    // Transaction errors
    if (message.includes('nonce')) {
      return 'Transaction nonce mismatch. Please try again.';
    }
    if (message.includes('gas') && message.includes('estimat')) {
      return 'Gas estimation failed. The transaction may fail.';
    }
    if (message.includes('underpriced') || message.includes('fee too low')) {
      return 'Transaction fee too low. Please increase gas price.';
    }

    // Contract validation errors - Kokonut specific
    if (message.includes('name required') || message.includes('empty name')) {
      return 'Name is required';
    }
    if (message.includes('price') && message.includes('greater than 0')) {
      return 'Price must be greater than 0';
    }
    if (message.includes('invalid payment token') || message.includes('zero payment token')) {
      return 'Invalid payment token address';
    }
    if (message.includes('invalid agent')) {
      return 'Invalid agent. Please register first.';
    }
    if (message.includes('not owner') || message.includes('not provider')) {
      return 'You are not authorized to perform this action';
    }
    if (message.includes('service inactive')) {
      return 'Service is no longer active';
    }
    if (message.includes('max evaluators')) {
      return 'Maximum number of evaluators reached for this proposal';
    }
    if (message.includes('max jobs')) {
      return 'Maximum number of jobs reached. Complete existing jobs first.';
    }
    if (message.includes('deadline')) {
      return 'Invalid deadline. Must be in the future and within allowed range.';
    }
    if (message.includes('expired')) {
      return 'The deadline has expired';
    }
    if (message.includes('description too long')) {
      return 'Description is too long (max 1000 characters)';
    }
    if (message.includes('not client')) {
      return 'Only the job client can perform this action';
    }
    if (message.includes('not provider')) {
      return 'Only the service provider can perform this action';
    }
    if (message.includes('not evaluator')) {
      return 'Only the designated evaluator can perform this action';
    }
    if (message.includes('wrong status')) {
      return 'This action cannot be performed in the current job status';
    }
    if (message.includes('already exists')) {
      return 'Item already exists';
    }
    if (message.includes('not found') || message.includes('invalid')) {
      return 'Item not found or invalid';
    }

    // Network errors
    if (
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('timeout')
    ) {
      return 'Network error. Please check your connection and try again.';
    }
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return 'Rate limit exceeded. Please wait a moment and try again.';
    }

    // Contract execution errors
    if (message.includes('revert')) {
      // Generic revert - sanitize to avoid showing technical details
      return 'Transaction failed. Please check your inputs and try again.';
    }
    if (message.includes('execution reverted')) {
      return 'Transaction execution failed. Please verify all requirements are met.';
    }
    if (message.includes('out of gas')) {
      return 'Transaction ran out of gas. Please increase gas limit.';
    }

    // Return sanitized message for unknown errors
    return sanitizeErrorMessage(error.message);
  }
  return 'Transaction failed';
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
