import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MyWorkHubPanel, MyBidsPanel } from '../marketplace/MarketplaceHubPanels';
import { useMyBids } from '@/lib/hooks/useMyBids';
import { useBiddingSessions, SessionStatus } from '@/lib/hooks/useBiddingSystem';
import { ZERO_ADDRESS } from '@/lib/contracts/config';
import type { Job } from '@/lib/hooks/useJobs';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
  usePathname: vi.fn(() => '/marketplace'),
}));
vi.mock('@/lib/hooks/useMyBids', () => ({ useMyBids: vi.fn() }));
vi.mock('@/lib/hooks/useBiddingSystem', () => ({
  useBiddingSessions: vi.fn(),
  SessionStatus: { Active: 0, BiddingClosed: 1, WinnerSelected: 2, JobCreated: 3, Completed: 4, Cancelled: 5 },
  getSessionStatusBadge: vi.fn(() => ({ badge: 'active' })),
}));

const mockUseRouter = vi.mocked(useRouter);
const mockUseSearchParams = vi.mocked(useSearchParams);
const mockUseMyBids = vi.mocked(useMyBids);
const mockUseBiddingSessions = vi.mocked(useBiddingSessions);

const PUSH = vi.fn();
const REPLACE = vi.fn();

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
    hook: ZERO_ADDRESS,
    ...overrides,
  };
}

describe('MyBidsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBiddingSessions.mockReturnValue({
      sessions: [],
      isLoading: false,
    } as never);
  });

  it('shows the empty state when there are no active bids', () => {
    mockUseMyBids.mockReturnValue({ entries: [], isLoading: false } as never);
    render(<MyBidsPanel user={'0xabc' as `0x${string}`} />);
    expect(screen.getByText(/No active bids/i)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Browse bidding sessions/i });
    expect(link.getAttribute('href')).toBe('/marketplace?tab=bidding');
  });

  it('shows a loading skeleton while data is being fetched', () => {
    mockUseMyBids.mockReturnValue({ entries: [], isLoading: true } as never);
    const { container } = render(<MyBidsPanel user={'0xabc' as `0x${string}`} />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders an entry for each non-terminal bid', () => {
    mockUseMyBids.mockReturnValue({
      entries: [
        { sessionId: 1n, bid: { id: 1n } as never },
        { sessionId: 2n, bid: { id: 2n } as never },
      ],
      isLoading: false,
    } as never);
    mockUseBiddingSessions.mockReturnValue({
      sessions: [
        { id: 1n, paymentToken: '0x0', maxBudget: 1000000n, status: SessionStatus.Active } as never,
        { id: 2n, paymentToken: '0x0', maxBudget: 2000000n, status: SessionStatus.BiddingClosed } as never,
      ],
      isLoading: false,
    } as never);
    render(<MyBidsPanel user={'0xabc' as `0x${string}`} />);
    expect(screen.getByText('Session #1')).toBeInTheDocument();
    expect(screen.getByText('Session #2')).toBeInTheDocument();
  });

  it('omits completed and JobCreated sessions', () => {
    mockUseMyBids.mockReturnValue({
      entries: [
        { sessionId: 1n, bid: { id: 1n } as never },
        { sessionId: 2n, bid: { id: 2n } as never },
        { sessionId: 3n, bid: { id: 3n } as never },
      ],
      isLoading: false,
    } as never);
    mockUseBiddingSessions.mockReturnValue({
      sessions: [
        { id: 1n, paymentToken: '0x0', maxBudget: 1000000n, status: SessionStatus.Active } as never,
        { id: 2n, paymentToken: '0x0', maxBudget: 2000000n, status: SessionStatus.Completed } as never,
        { id: 3n, paymentToken: '0x0', maxBudget: 3000000n, status: SessionStatus.JobCreated } as never,
      ],
      isLoading: false,
    } as never);
    render(<MyBidsPanel user={'0xabc' as `0x${string}`} />);
    expect(screen.getByText('Session #1')).toBeInTheDocument();
    expect(screen.queryByText('Session #2')).not.toBeInTheDocument();
    expect(screen.queryByText('Session #3')).not.toBeInTheDocument();
  });
});

describe('MyWorkHubPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: PUSH, replace: REPLACE, back: vi.fn(), refresh: vi.fn() } as never);
    mockUseSearchParams.mockReturnValue(new URLSearchParams() as never);
    mockUseMyBids.mockReturnValue({ entries: [], isLoading: false } as never);
    mockUseBiddingSessions.mockReturnValue({ sessions: [], isLoading: false } as never);
  });

  it('shows a connect prompt when no user is provided', () => {
    render(<MyWorkHubPanel jobs={[]} isLoading={false} />);
    expect(screen.getByText(/Connect to see your work/i)).toBeInTheDocument();
  });

  it('shows the Jobs subtab by default and switches to My Bids on click', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('') as never);
    render(<MyWorkHubPanel jobs={[]} user={'0xabc' as `0x${string}`} isLoading={false} />);
    const bidsButton = screen.getByRole('button', { name: /My Bids/i });
    expect(bidsButton).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(bidsButton);
    await waitFor(() => {
      expect(REPLACE).toHaveBeenCalledWith(
        expect.stringContaining('subtab=bids'),
        expect.anything()
      );
    });
  });

  it('starts on the bids subtab when ?subtab=bids is in the URL', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('subtab=bids') as never);
    render(<MyWorkHubPanel jobs={[]} user={'0xabc' as `0x${string}`} isLoading={false} />);
    const bidsButton = screen.getByRole('button', { name: /My Bids/i });
    expect(bidsButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows a loading skeleton when isLoading is true', () => {
    const { container } = render(<MyWorkHubPanel jobs={[]} user={'0xabc' as `0x${string}`} isLoading={true} />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('filters jobs to those the user participates in', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('') as never);
    const jobs: Job[] = [
      job({ id: 1n, client: '0xabc', provider: '0xother', evaluator: '0xother' }),
      job({ id: 2n, client: '0xother', provider: '0xother', evaluator: '0xother' }),
    ];
    render(<MyWorkHubPanel jobs={jobs} user={'0xabc' as `0x${string}`} isLoading={false} />);
    // Job 1 has status Open + user is client → attention reason fires
    expect(screen.getByText(/Job #1/i)).toBeInTheDocument();
    // Job 2 is filtered out (user not a participant)
    expect(screen.queryByText(/Job #2/i)).not.toBeInTheDocument();
  });
});
