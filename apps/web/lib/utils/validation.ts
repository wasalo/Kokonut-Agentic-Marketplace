'use client';

import { debugLog, debugError } from '@/lib/debug';

export interface ValidationRule<T> {
  field: string;
  validate: (value: unknown) => boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateObject<T extends Record<string, unknown>>(
  data: unknown,
  rules: ValidationRule<T>[]
): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      errors: ['Data must be an object'],
    };
  }

  const obj = data as Record<string, unknown>;

  for (const rule of rules) {
    const value = obj[rule.field as string];

    try {
      if (!rule.validate(value)) {
        errors.push(rule.message);
      }
    } catch (error) {
      debugError('validation', `Validation error for field ${rule.field}:`, error);
      errors.push(rule.message);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export const commonRules = {
  isAddress: (value: unknown): boolean => {
    if (typeof value !== 'string') return false;
    return /^0x[a-fA-F0-9]{40}$/.test(value);
  },
  isBigInt: (value: unknown): boolean => {
    return typeof value === 'bigint' || (typeof value === 'string' && /^-?\d+$/.test(value));
  },
  isString: (value: unknown): boolean => {
    return typeof value === 'string';
  },
  isNumber: (value: unknown): boolean => {
    return typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)));
  },
  isBoolean: (value: unknown): boolean => {
    return typeof value === 'boolean';
  },
  isDefined: (value: unknown): boolean => {
    return value !== undefined && value !== null;
  },
  isPositiveNumber: (value: unknown): boolean => {
    const num = typeof value === 'number' ? value : Number(value);
    return !isNaN(num) && num > 0;
  },
  isNonEmptyString: (value: unknown): boolean => {
    return typeof value === 'string' && value.length > 0;
  },
  matchesRegex: (pattern: RegExp) => (value: unknown): boolean => {
    return typeof value === 'string' && pattern.test(value);
  },
  isOneOf: <T>(allowedValues: T[]) => (value: unknown): boolean => {
    return allowedValues.includes(value as T);
  },
};

export function validateJobData(data: unknown): ValidationResult {
  return validateObject(data, [
    { field: 'jobId', validate: commonRules.isBigInt, message: 'Invalid jobId' },
    { field: 'client', validate: commonRules.isAddress, message: 'Invalid client address' },
    { field: 'provider', validate: commonRules.isAddress, message: 'Invalid provider address' },
    { field: 'status', validate: (v) => commonRules.isNumber(v) && Number(v) >= 0 && Number(v) <= 5, message: 'Invalid status' },
  ]);
}

export function validateServiceData(data: unknown): ValidationResult {
  return validateObject(data, [
    { field: 'serviceId', validate: commonRules.isBigInt, message: 'Invalid serviceId' },
    { field: 'provider', validate: commonRules.isAddress, message: 'Invalid provider address' },
    { field: 'name', validate: commonRules.isNonEmptyString, message: 'Invalid service name' },
    { field: 'price', validate: commonRules.isBigInt, message: 'Invalid price' },
  ]);
}

export function validateAgentData(data: unknown): ValidationResult {
  return validateObject(data, [
    { field: 'agentId', validate: commonRules.isBigInt, message: 'Invalid agentId' },
    { field: 'owner', validate: commonRules.isAddress, message: 'Invalid owner address' },
    { field: 'agentURI', validate: commonRules.isString, message: 'Invalid agentURI' },
  ]);
}

export default validateObject;
