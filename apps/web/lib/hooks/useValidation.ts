import { useState, useCallback, useMemo } from 'react';
import { isValidAddress } from '../utils/typeGuards';

/**
 * Validation error type
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validation state for a field
 */
export interface FieldValidation {
  isValid: boolean;
  error: string | null;
  touched: boolean;
}

/**
 * Validation rules configuration
 */
export interface ValidationRules {
  [field: string]: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    isAddress?: boolean;
    isAmount?: boolean;
    isURL?: boolean;
    minAmount?: bigint;
    maxAmount?: bigint;
    minDate?: Date;
    maxDate?: Date;
    custom?: (value: unknown) => string | null;
  };
}

/**
 * useValidation hook for real-time form validation
 *
 * Usage:
 * ```typescript
 * const { validate, errors, isValid, validateField } = useValidation({
 *   provider: { required: true, isAddress: true },
 *   amount: { required: true, isAmount: true, minAmount: BigInt(1) },
 * });
 * ```
 */
export function useValidation<T extends Record<string, unknown>>(rules: ValidationRules) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  /**
   * Validate a single field value against its rules
   */
  const validateField = useCallback(
    (field: keyof T, value: unknown): string | null => {
      const fieldRules = rules[field as string];
      if (!fieldRules) return null;

      // Required check
      if (fieldRules.required) {
        if (value === undefined || value === null || value === '') {
          return `${String(field)} is required`;
        }
      }

      // Skip other checks if value is empty and not required
      if (!value || (typeof value === 'string' && value === '')) {
        return null;
      }

      // String validations
      if (typeof value === 'string') {
        // Min length
        if (fieldRules.minLength !== undefined && value.length < fieldRules.minLength) {
          return `${String(field)} must be at least ${fieldRules.minLength} characters`;
        }

        // Max length
        if (fieldRules.maxLength !== undefined && value.length > fieldRules.maxLength) {
          return `${String(field)} must be at most ${fieldRules.maxLength} characters`;
        }

        // Address validation
        if (fieldRules.isAddress && !isValidAddress(value)) {
          return `${String(field)} must be a valid Ethereum address (0x...)`;
        }

        // URL validation
        if (fieldRules.isURL) {
          try {
            new URL(value);
          } catch {
            return `${String(field)} must be a valid URL`;
          }
        }

        // Amount validation (for string amounts)
        if (fieldRules.isAmount) {
          try {
            const num = BigInt(value);
            if (fieldRules.minAmount !== undefined && num < fieldRules.minAmount) {
              return `${String(field)} must be at least ${fieldRules.minAmount.toString()}`;
            }
            if (fieldRules.maxAmount !== undefined && num > fieldRules.maxAmount) {
              return `${String(field)} must be at most ${fieldRules.maxAmount.toString()}`;
            }
          } catch {
            return `${String(field)} must be a valid number`;
          }
        }
      }

      // Number/bigint validations
      if (typeof value === 'bigint' || typeof value === 'number') {
        const bigValue = typeof value === 'bigint' ? value : BigInt(Math.floor(value));

        if (fieldRules.isAmount) {
          if (fieldRules.minAmount !== undefined && bigValue < fieldRules.minAmount) {
            return `${String(field)} must be at least ${fieldRules.minAmount.toString()}`;
          }
          if (fieldRules.maxAmount !== undefined && bigValue > fieldRules.maxAmount) {
            return `${String(field)} must be at most ${fieldRules.maxAmount.toString()}`;
          }
        }
      }

      // Date validation
      if (value instanceof Date) {
        if (fieldRules.minDate && value < fieldRules.minDate) {
          return `${String(field)} must be after ${fieldRules.minDate.toLocaleDateString()}`;
        }
        if (fieldRules.maxDate && value > fieldRules.maxDate) {
          return `${String(field)} must be before ${fieldRules.maxDate.toLocaleDateString()}`;
        }
      }

      // Custom validation
      if (fieldRules.custom) {
        const customError = fieldRules.custom(value);
        if (customError) return customError;
      }

      return null;
    },
    [rules]
  );

  /**
   * Validate all fields
   */
  const validate = useCallback(
    (data: T): boolean => {
      const newErrors: Record<string, string | null> = {};
      let isValid = true;

      Object.keys(rules).forEach(field => {
        const error = validateField(field as keyof T, data[field]);
        newErrors[field] = error;
        if (error) isValid = false;
      });

      setFieldErrors(newErrors);
      // Mark all fields as touched during full validation
      const allTouched = Object.keys(rules).reduce(
        (acc, key) => {
          acc[key] = true;
          return acc;
        },
        {} as Record<string, boolean>
      );
      setTouched(allTouched);

      return isValid;
    },
    [rules, validateField]
  );

  /**
   * Validate a single field and update state
   */
  const validateAndSetField = useCallback(
    (field: keyof T, value: unknown): boolean => {
      const error = validateField(field, value);
      setFieldErrors(prev => ({ ...prev, [field]: error }));
      setTouched(prev => ({ ...prev, [field]: true }));
      return !error;
    },
    [validateField]
  );

  /**
   * Clear validation for a field
   */
  const clearField = useCallback((field: keyof T) => {
    setFieldErrors(prev => ({ ...prev, [field]: null }));
    setTouched(prev => ({ ...prev, [field]: false }));
  }, []);

  /**
   * Clear all validation
   */
  const clearAll = useCallback(() => {
    setFieldErrors({});
    setTouched({});
  }, []);

  /**
   * Check if all fields are valid
   */
  const isFormValid = useMemo(() => {
    return Object.values(fieldErrors).every(error => error === null);
  }, [fieldErrors]);

  /**
   * Get field validation state
   */
  const getFieldState = useCallback(
    (field: keyof T): FieldValidation => {
      return {
        isValid: !fieldErrors[field as string],
        error: fieldErrors[field as string] || null,
        touched: !!touched[field as string],
      };
    },
    [fieldErrors, touched]
  );

  return {
    errors: fieldErrors,
    touched,
    isValid: isFormValid,
    validate,
    validateField: validateAndSetField,
    getFieldState,
    clearField,
    clearAll,
  };
}

/**
 * Standalone validation utilities
 */

/**
 * Validate Ethereum address
 */
export function validateAddress(addr: string | undefined | null): string | null {
  if (!addr || addr === '') {
    return 'Address is required';
  }
  if (!isValidAddress(addr)) {
    return 'Must be a valid Ethereum address (0x...) starting with 0x followed by 40 hex characters';
  }
  return null;
}

/**
 * Validate amount (bigint or string)
 */
export function validateAmount(
  value: string | bigint | undefined | null,
  min?: bigint,
  max?: bigint
): string | null {
  if (value === undefined || value === null || value === '') {
    return 'Amount is required';
  }

  let bigValue: bigint;
  try {
    bigValue = typeof value === 'bigint' ? value : BigInt(value);
  } catch {
    return 'Must be a valid number';
  }

  if (min !== undefined && bigValue < min) {
    return `Must be at least ${min.toString()}`;
  }
  if (max !== undefined && bigValue > max) {
    return `Must be at most ${max.toString()}`;
  }

  return null;
}

/**
 * Validate deadline (must be in the future)
 */
export function validateDeadline(
  deadline: string | number | Date | undefined | null,
  minDuration: number = 300000 // 5 minutes in ms
): string | null {
  if (!deadline) {
    return 'Deadline is required';
  }

  const deadlineDate = deadline instanceof Date ? deadline : new Date(deadline);

  if (isNaN(deadlineDate.getTime())) {
    return 'Must be a valid date';
  }

  const minDeadline = Date.now() + minDuration;
  if (deadlineDate.getTime() < minDeadline) {
    const minutes = Math.ceil(minDuration / 60000);
    return `Must be at least ${minutes} minutes in the future`;
  }

  // Max 1 year in the future
  const maxDeadline = Date.now() + 365 * 24 * 60 * 60 * 1000;
  if (deadlineDate.getTime() > maxDeadline) {
    return 'Must be within 1 year';
  }

  return null;
}

/**
 * Validate string length
 */
export function validateStringLength(
  value: string | undefined | null,
  minLength?: number,
  maxLength?: number,
  fieldName: string = 'Field'
): string | null {
  if (!value || value === '') {
    return `${fieldName} is required`;
  }

  if (minLength !== undefined && value.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`;
  }
  if (maxLength !== undefined && value.length > maxLength) {
    return `${fieldName} must be at most ${maxLength} characters (current: ${value.length})`;
  }

  return null;
}

/**
 * Validate URL
 */
export function validateURL(url: string | undefined | null): string | null {
  if (!url || url === '') {
    return 'URL is required';
  }

  try {
    new URL(url);
    return null;
  } catch {
    return 'Must be a valid URL (e.g., https://example.com)';
  }
}

/**
 * Validate metadata URI with strict scheme validation
 * Only allows data:, ipfs:, and https: schemes
 * Validates content for data: URIs to ensure valid base64/JSON
 */
export function validateMetadataURI(
  uri: string | undefined | null,
  maxLength: number = 2000
): string | null {
  // Allow empty (optional field)
  if (!uri || uri === '') {
    return null;
  }

  // Check length
  if (uri.length > maxLength) {
    return `URI must be at most ${maxLength} characters (current: ${uri.length})`;
  }

  // Validate scheme
  const allowedSchemes = ['data:', 'ipfs:', 'https:'];
  const schemeMatch = uri.match(/^([a-z][a-z0-9+.-]*):/i);

  if (!schemeMatch) {
    return 'URI must have a valid scheme (e.g., https://, ipfs://, data:)';
  }

  const scheme = schemeMatch[1].toLowerCase();

  if (!allowedSchemes.includes(scheme + ':')) {
    return `URI scheme must be one of: ${allowedSchemes.join(', ')}`;
  }

  // Validate based on scheme
  if (scheme === 'data') {
    // Validate data URI format: data:[<mediatype>][;base64],<data>
    const dataUriPattern =
      /^data:([a-zA-Z0-9!#$%&'*+\-.^_`|~]+\/[-a-zA-Z0-9!#$%&'*+\-.^_`|~]+(?:;[-a-zA-Z0-9!#$%&'*+\-.^_`|~]+)*)?(;base64)?,([a-zA-Z0-9+/]*=?=?)$/i;

    if (!dataUriPattern.test(uri)) {
      return 'Invalid data URI format. Expected: data:[mimetype][;base64],<base64data>';
    }

    // If it's a base64 data URI, validate the base64 content
    if (uri.includes(';base64,')) {
      const base64Match = uri.match(/^data:.*?;base64,([a-zA-Z0-9+/]*=?=?)$/i);
      if (base64Match) {
        const base64Data = base64Match[1];

        // Check for valid base64 characters
        if (!/^[a-zA-Z0-9+/]*=?=?$/.test(base64Data)) {
          return 'Invalid base64 characters in data URI';
        }

        // Try to decode if it's JSON
        if (uri.includes('application/json')) {
          try {
            const decoded = atob(base64Data);
            JSON.parse(decoded); // Validate it's valid JSON
          } catch {
            return 'Data URI contains invalid base64 or malformed JSON';
          }
        }
      }
    }
  } else if (scheme === 'ipfs') {
    // Validate IPFS CID format (basic validation)
    // IPFS CIDs can be in various formats (v0: Qm..., v1: bafy...)
    const ipfsPath = uri.slice(7); // Remove 'ipfs://'
    if (!ipfsPath) {
      return 'IPFS URI must contain a CID';
    }

    // Basic CID validation (must be at least 32 chars for valid CID)
    if (ipfsPath.length < 32) {
      return 'Invalid IPFS CID format';
    }

    // Check for potentially malicious paths
    if (ipfsPath.includes('..') || ipfsPath.includes('//')) {
      return 'Invalid IPFS path';
    }
  } else if (scheme === 'https') {
    // Validate HTTPS URL
    try {
      const url = new URL(uri);
      if (url.protocol !== 'https:') {
        return 'Only HTTPS URLs are allowed (not HTTP)';
      }

      // Check for localhost/private IPs (security concern)
      const hostname = url.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.')
      ) {
        return 'Localhost and private IP addresses are not allowed';
      }
    } catch {
      return 'Invalid HTTPS URL';
    }
  }

  // Check for potentially dangerous characters that could be used for XSS
  const dangerousChars = /[<>'"]|javascript:|vbscript:|data:text\/html/i;
  if (dangerousChars.test(uri)) {
    return 'URI contains potentially dangerous characters';
  }

  return null;
}

export default useValidation;
