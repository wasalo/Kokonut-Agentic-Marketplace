import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HeaderBell } from '../ActionQueuePanel';
import { useActionQueue } from '@/lib/hooks/useActionQueue';
import { useAccount } from 'wagmi';

vi.mock('wagmi', () => ({ useAccount: vi.fn() }));
vi.mock('@/lib/hooks/useActionQueue', () => ({ useActionQueue: vi.fn() }));

const mockUseAccount = vi.mocked(useAccount);
const mockUseActionQueue = vi.mocked(useActionQueue);

function queueState(overrides: Partial<ReturnType<typeof useActionQueue>> = {}) {
  return {
    items: [],
    jobCount: 0,
    biddingCount: 0,
    totalCount: 0,
    isLoading: false,
    ...overrides,
  };
}

describe('HeaderBell', () => {
  beforeEach(() => {
    mockUseAccount.mockReturnValue({ isConnected: true, address: '0xabc' } as never);
  });

  it('renders nothing when wallet is not connected', () => {
    mockUseAccount.mockReturnValue({ isConnected: false, address: undefined } as never);
    mockUseActionQueue.mockReturnValue(queueState());
    const { container } = render(<HeaderBell />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the bell button with the correct aria-label when there are no items', () => {
    mockUseActionQueue.mockReturnValue(queueState());
    render(<HeaderBell />);
    const button = screen.getByRole('button', { name: /Action queue \(0 pending\)/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('does not show a badge when totalCount is 0', () => {
    mockUseActionQueue.mockReturnValue(queueState({ totalCount: 0 }));
    render(<HeaderBell />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('shows the totalCount badge when items exist', () => {
    mockUseActionQueue.mockReturnValue(queueState({ totalCount: 5, jobCount: 3, biddingCount: 2 }));
    render(<HeaderBell />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('opens the dialog on click and shows empty state when there are no items', async () => {
    mockUseActionQueue.mockReturnValue(queueState());
    render(<HeaderBell />);
    fireEvent.click(screen.getByRole('button', { name: /Action queue/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Action queue/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/All caught up/i)).toBeInTheDocument();
  });

  it('shows job + bidding counts in the dialog header', async () => {
    mockUseActionQueue.mockReturnValue(queueState({ totalCount: 5, jobCount: 3, biddingCount: 2 }));
    render(<HeaderBell />);
    fireEvent.click(screen.getByRole('button', { name: /Action queue/i }));
    await waitFor(() => {
      expect(screen.getByText(/3 jobs.*2 bidding/i)).toBeInTheDocument();
    });
  });

  it('closes the dialog on Escape key', async () => {
    mockUseActionQueue.mockReturnValue(queueState({ totalCount: 1, jobCount: 1, biddingCount: 0 }));
    render(<HeaderBell />);
    fireEvent.click(screen.getByRole('button', { name: /Action queue/i }));
    await waitFor(() => screen.getByRole('dialog'));
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('shows the "Open My Work" footer link with the correct tab param', async () => {
    mockUseActionQueue.mockReturnValue(queueState({ totalCount: 1, jobCount: 1, biddingCount: 0 }));
    render(<HeaderBell />);
    fireEvent.click(screen.getByRole('button', { name: /Action queue/i }));
    await waitFor(() => screen.getByRole('dialog'));
    const link = screen.getByRole('link', { name: /Open My Work/i });
    expect(link.getAttribute('href')).toBe('/marketplace?tab=my-work');
  });
});
