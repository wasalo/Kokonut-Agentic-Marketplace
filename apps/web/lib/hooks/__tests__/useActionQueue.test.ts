import { describe, it, expect } from 'vitest';
import { getAttentionReason } from '@/components/marketplace/MarketplaceHubPanels';
import type { Job } from '@/lib/hooks/useJobs';

function job(overrides: Partial<Job>): Job {
  return {
    id: 1n,
    client: '0xclient',
    provider: '0xprovider',
    evaluator: '0xevaluator',
    status: 0,
    budget: 1000000n,
    paymentToken: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    expiredAt: 0n,
    description: 'Test',
    deliverable: '0x',
    serviceId: 0n,
    hook: '0x0000000000000000000000000000000000000000',
    ...overrides,
  };
}

describe('getAttentionReason', () => {
  const user = '0xabc' as `0x${string}`;

  it('returns null when user is not a participant', () => {
    const j = job({ client: '0xother', provider: '0xother', evaluator: '0xother', status: 0 });
    expect(getAttentionReason(j, user)).toBeNull();
  });

  it('returns "Fund escrow to start the job" for client + Open', () => {
    const j = job({ client: user, status: 0 });
    expect(getAttentionReason(j, user)).toBe('Fund escrow to start the job');
  });

  it('returns "Awaiting provider deliverable" for client + Funded', () => {
    const j = job({ client: user, status: 1 });
    expect(getAttentionReason(j, user)).toBe('Awaiting provider deliverable');
  });

  it('returns "Submit your deliverable" for provider + Funded', () => {
    const j = job({ provider: user, status: 1 });
    expect(getAttentionReason(j, user)).toBe('Submit your deliverable');
  });

  it('returns "Finalize evaluation" for evaluator + Submitted', () => {
    const j = job({ evaluator: user, status: 2 });
    expect(getAttentionReason(j, user)).toBe('Finalize evaluation');
  });

  it('returns "Review deliverable and release payment" for client + Submitted', () => {
    const j = job({ client: user, status: 2 });
    expect(getAttentionReason(j, user)).toBe('Review deliverable and release payment');
  });

  it('returns "Review deliverable and release payment" for client + PendingClientApproval', () => {
    const j = job({ client: user, status: 6 });
    expect(getAttentionReason(j, user)).toBe('Review deliverable and release payment');
  });

  it('returns "Deliverable rejected — review feedback" for provider + Rejected', () => {
    const j = job({ provider: user, status: 4 });
    expect(getAttentionReason(j, user)).toBe('Deliverable rejected — review feedback');
  });

  it('returns "Job expired — claim refund if funded" for client + Expired', () => {
    const j = job({ client: user, status: 5 });
    expect(getAttentionReason(j, user)).toBe('Job expired — claim refund if funded');
  });

  it('returns "Job was rejected — open to inspect" for client + Rejected', () => {
    const j = job({ client: user, status: 4 });
    expect(getAttentionReason(j, user)).toBe('Job was rejected — open to inspect');
  });

  it('returns null for client + Completed', () => {
    const j = job({ client: user, status: 3 });
    expect(getAttentionReason(j, user)).toBeNull();
  });

  it('matches user address case-insensitively', () => {
    const j = job({ client: '0xAbC', status: 0 });
    expect(getAttentionReason(j, '0xABC' as `0x${string}`)).toBe('Fund escrow to start the job');
  });
});
