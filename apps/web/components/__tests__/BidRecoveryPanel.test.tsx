import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useAccount } from 'wagmi';
import { BidRecoveryPanel } from '../bidding/BidRecoveryPanel';
import { useBidRecovery, type BidRecovery } from '@/lib/hooks/useBidRecovery';

vi.mock('wagmi', () => ({ useAccount: vi.fn() }));
vi.mock('@/lib/hooks/useBidRecovery', () => ({
  useBidRecovery: vi.fn(),
  buildEnvelopeFingerprint: vi.fn(() => '0x' + 'a'.repeat(64)),
  importBidFromEnvelope: vi.fn(),
}));
vi.mock('@/lib/toast', () => ({
  showToast: { success: vi.fn(), error: vi.fn() },
}));

const mockUseAccount = vi.mocked(useAccount);
const mockUseBidRecovery = vi.mocked(useBidRecovery);

function recovery(overrides: Partial<BidRecovery> = {}): BidRecovery {
  return {
    salt: '0x' + '1'.repeat(64),
    amount: '100',
    message: 'I will deliver',
    status: 'local',
    signedEnvelope: null,
    sign: vi.fn(),
    isSigning: false,
    signError: null,
    verify: vi.fn(() => false),
    ...overrides,
  };
}

describe('BidRecoveryPanel', () => {
  beforeEach(() => {
    mockUseAccount.mockReturnValue({ address: '0xabc', isConnected: true } as never);
  });

  it('renders nothing when status is missing', () => {
    mockUseBidRecovery.mockReturnValue(recovery({ status: 'missing', salt: '' }));
    const { container } = render(<BidRecoveryPanel sessionId="1" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the local-state copy and a sign button when status is local', () => {
    mockUseBidRecovery.mockReturnValue(recovery({ status: 'local' }));
    render(<BidRecoveryPanel sessionId="1" />);
    expect(screen.getByText(/Bid saved locally/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign bid backup/i })).toBeInTheDocument();
  });

  it('calls sign() and shows success toast on click', async () => {
    const sign = vi.fn().mockResolvedValue({
      sessionId: '1',
      address: '0xabc',
      salt: '0x' + '1'.repeat(64),
      amount: '100',
      message: 'I will deliver',
      signature: '0x' + '0'.repeat(130),
      signedAt: 1,
    });
    mockUseBidRecovery.mockReturnValue(recovery({ status: 'local', sign }));
    const { showToast } = await import('@/lib/toast');
    render(<BidRecoveryPanel sessionId="1" />);
    fireEvent.click(screen.getByRole('button', { name: /Sign bid backup/i }));
    await waitFor(() => expect(sign).toHaveBeenCalledTimes(1));
    expect(showToast.success).toHaveBeenCalled();
  });

  it('disables the sign button while signing', () => {
    mockUseBidRecovery.mockReturnValue(recovery({ status: 'local', isSigning: true }));
    render(<BidRecoveryPanel sessionId="1" />);
    expect(screen.getByRole('button', { name: /Sign bid backup/i })).toBeDisabled();
  });

  it('shows connect-wallet hint when disconnected', () => {
    mockUseAccount.mockReturnValue({ address: undefined, isConnected: false } as never);
    mockUseBidRecovery.mockReturnValue(recovery({ status: 'local' }));
    render(<BidRecoveryPanel sessionId="1" />);
    expect(screen.getByText(/Connect wallet to sign/i)).toBeInTheDocument();
  });

  it('shows the signed-state copy, fingerprint, and copy button when status is signed', () => {
    const envelope = {
      sessionId: '1',
      address: '0xabc',
      salt: '0x' + '1'.repeat(64),
      amount: '100',
      message: 'I will deliver',
      signature: '0x' + '0'.repeat(130),
      signedAt: 1,
    };
    mockUseBidRecovery.mockReturnValue(recovery({ status: 'signed', signedEnvelope: envelope }));
    render(<BidRecoveryPanel sessionId="1" />);
    expect(screen.getByText(/Bid signed to your wallet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy fingerprint/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy full envelope/i })).toBeInTheDocument();
  });

  it('shows the migrated-state copy when local salt matches signed envelope', () => {
    const envelope = {
      sessionId: '1',
      address: '0xabc',
      salt: '0x' + '1'.repeat(64),
      amount: '100',
      message: 'I will deliver',
      signature: '0x' + '0'.repeat(130),
      signedAt: 1,
    };
    mockUseBidRecovery.mockReturnValue(recovery({ status: 'migrated', signedEnvelope: envelope }));
    render(<BidRecoveryPanel sessionId="1" />);
    expect(screen.getByText(/Bid signed and verified/i)).toBeInTheDocument();
  });
});
