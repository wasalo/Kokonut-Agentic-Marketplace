// Generic entity hook factory for single entity lookups
// Eliminates duplicate useJob, useService, useProposal, useSkill patterns

import { useReadContract } from 'wagmi';
import { useMemo } from 'react';

export interface EntityConfig<T> {
  address: string;
  abi: unknown[];
  getFunction: string;
  mapData: (id: bigint, data: unknown) => T | null;
  staleTime?: number;
}

export interface EntityResult<T> {
  entity: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Creates a generic single entity hook (useJob, useService, useProposal, etc.)
 * 
 * @example
 * const useJob = createEntityHook<Job>({
 *   address: AGENTIC_COMMERCE_ADDRESS,
 *   abi: AGENTIC_COMMERCE_ABI,
 *   getFunction: 'getJob',
 *   mapData: (id, data) => mapJobData(id, data)
 * });
 */
export function createEntityHook<T>(config: EntityConfig<T>) {
  return function useEntity(id: bigint | undefined): EntityResult<T> {
    const { data, isLoading, error, refetch } = useReadContract({
      address: config.address as `0x${string}`,
      abi: config.abi as readonly unknown[],
      functionName: config.getFunction,
      args: id ? [id] : undefined,
      query: {
        enabled: !!id,
        retry: 2,
        staleTime: config.staleTime || 10000,
      },
    });

    const entity = useMemo(() => {
      if (!id || !data) return null;
      return config.mapData(id, data);
    }, [id, data, config]);

    return {
      entity,
      isLoading,
      error: error as Error | null,
      refetch,
    };
  };
}

// ============================================================================
// MAPPERS - Shared data transformation utilities
// ============================================================================

import type { Job, Service, Proposal } from '@/lib/types/contracts';

/**
 * Maps contract Job data to Job interface
 */
export function mapJobData(id: bigint, data: unknown): Job | null {
  if (!data) return null;

  if (typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    if ('client' in obj) {
      return {
        id,
        client: (obj.client as `0x${string}`) || '0x',
        provider: (obj.provider as `0x${string}`) || '0x',
        evaluator: (obj.evaluator as `0x${string}`) || '0x',
        serviceId: (obj.serviceId as bigint) || BigInt(0),
        paymentToken: (obj.paymentToken as `0x${string}`) || '0x',
        description: (obj.description as string) || '',
        budget: (obj.budget as bigint) || BigInt(0),
        expiredAt: (obj.expiredAt as bigint) || BigInt(0),
        status: (obj.status as number) || 0,
        hook: (obj.hook as `0x${string}`) || '0x',
        deliverable: (obj.deliverable as `0x${string}`) || '0x',
      };
    }
  }

  return null;
}

/**
 * Maps contract Service data to Service interface
 */
export function mapServiceData(id: bigint, data: unknown): Service | null {
  if (!data) return null;

  if (typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    if ('provider' in obj && 'name' in obj) {
      return {
        id,
        provider: (obj.provider as `0x${string}`) || '0x',
        agentId: (obj.agentId as bigint) || BigInt(0),
        name: (obj.name as string) || '',
        description: (obj.description as string) || '',
        metadataURI: (obj.metadataURI as string) || '',
        price: (obj.price as bigint) || BigInt(0),
        paymentToken: (obj.paymentToken as `0x${string}`) || '0x',
        paymentAddress: (obj.paymentAddress as `0x${string}`) || '0x',
        isActive: (obj.isActive as boolean) || false,
        createdAt: (obj.createdAt as bigint) || BigInt(0),
      };
    }
  }

  return null;
}

/**
 * Maps contract Proposal data to Proposal interface
 */
export function mapProposalData(id: bigint, data: unknown): Proposal | null {
  if (!data) return null;

  if (typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    if ('proposer' in obj) {
      return {
        id,
        proposer: (obj.proposer as `0x${string}`) || '0x',
        title: (obj.title as string) || '',
        description: (obj.description as string) || '',
        criteriaURI: (obj.criteriaURI as string) || '',
        reward: (obj.reward as bigint) || BigInt(0),
        decisionDeadline: (obj.decisionDeadline as bigint) || BigInt(0),
        status: (obj.status as number) || 0,
        createdAt: (obj.createdAt as bigint) || BigInt(0),
      };
    }
  }

  return null;
}