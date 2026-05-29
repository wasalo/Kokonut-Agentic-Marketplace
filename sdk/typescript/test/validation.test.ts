/**
 * Kokonut Agent SDK - Validation Tests
 * Unit tests for SDK validation and error handling
 */

import {
  validateAgentRegistration,
  validateServiceParams,
  validateJobParams,
  validateFeedbackParams,
  mapContractError,
  safeContractCall,
} from '../validation';
import { ContractError, TransactionError } from '../types';

describe('SDK Validation', () => {
  describe('validateAgentRegistration', () => {
    it('should accept valid params', () => {
      const result = validateAgentRegistration({
        name: 'TestAgent',
        capabilities: ['data-analysis', 'web3'],
      });
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing name', () => {
      const result = validateAgentRegistration({ capabilities: ['data'] });
      expect(result.success).toBe(false);
      expect(result.errors).toContain('name must be a string');
    });

    it('should reject empty name', () => {
      const result = validateAgentRegistration({ name: '' });
      expect(result.success).toBe(false);
      expect(result.errors).toContain('name must be at least 1 characters');
    });

    it('should reject invalid capabilities', () => {
      const result = validateAgentRegistration({
        name: 'TestAgent',
        capabilities: 'not-an-array',
      });
      expect(result.success).toBe(false);
      expect(result.errors).toContain('capabilities must be an array');
    });
  });

  describe('validateServiceParams', () => {
    it('should accept valid params', () => {
      const result = validateServiceParams({
        agentId: 1n,
        name: 'Test Service',
        description: 'A test service',
        price: 1000000n,
        paymentToken: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid agentId', () => {
      const result = validateServiceParams({
        agentId: -1n,
        name: 'Test',
        description: 'Desc',
        price: 1000000n,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid paymentToken', () => {
      const result = validateServiceParams({
        agentId: 1n,
        name: 'Test',
        description: 'Desc',
        price: 1000000n,
        paymentToken: 'not-an-address',
      });
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('paymentToken'))).toBe(true);
    });
  });

  describe('validateJobParams', () => {
    it('should accept valid params', () => {
      const result = validateJobParams({
        provider: '0x1234567890123456789012345678901234567890',
        budget: 1000000n,
        description: 'Test job',
        expiredAt: BigInt(Math.floor(Date.now() / 1000) + 86400),
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid provider', () => {
      const result = validateJobParams({
        provider: 'not-an-address',
        description: 'Test job',
      });
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('provider'))).toBe(true);
    });

    it('should reject empty description', () => {
      const result = validateJobParams({
        provider: '0x1234567890123456789012345678901234567890',
        description: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('validateFeedbackParams', () => {
    it('should accept valid params', () => {
      const result = validateFeedbackParams({
        agent: '0x1234567890123456789012345678901234567890',
        rating: 5n,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid agent', () => {
      const result = validateFeedbackParams({
        agent: 'not-an-address',
        rating: 5n,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('SDK Error Handling', () => {
  describe('mapContractError', () => {
    it('should return ContractError for string errors', () => {
      const error = mapContractError('Some error');
      expect(error).toBeInstanceOf(ContractError);
      expect(error.message).toBe('Some error');
    });

    it('should return ContractError for Error objects', () => {
      const error = mapContractError(new Error('Test error'), 'testMethod');
      expect(error).toBeInstanceOf(ContractError);
      expect(error.message).toBe('Test error');
    });

    it('should pass through existing ContractError', () => {
      const original = new ContractError('Original', 'method');
      const error = mapContractError(original);
      expect(error).toBe(original);
    });
  });

  describe('safeContractCall', () => {
    it('should return result on success', async () => {
      const result = await safeContractCall(() => Promise.resolve(42), 'test');
      expect(result).toBe(42);
    });

    it('should throw ContractError on failure', async () => {
      await expect(
        safeContractCall(() => Promise.reject(new Error('Fail')), 'testMethod')
      ).rejects.toThrow(ContractError);
    });
  });
});
