import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { AGENTIC_COMMERCE_ABI, BIDDING_SYSTEM_ABI } from '@/lib/contracts/abis';
import { getContractAddress, debugLog } from '@/lib/contracts/config';
import { parseEther } from 'viem';

const BIDDING_SYSTEM_ADDRESS = getContractAddress('BIDDING_SYSTEM');

export const SessionStatus = {
  Active: 0,
  BiddingClosed: 1,
  WinnerSelected: 2,
  JobCreated: 3,
  Completed: 4,
  Cancelled: 5,
} as const;

export type SessionStatusType = (typeof SessionStatus)[keyof typeof SessionStatus];

export interface BiddingSession {
  id: bigint;
  creator: `0x${string}`;
  evaluator: `0x${string}`;
  maxBudget: bigint;
  deadline: bigint;
  revealWindowEnd: bigint;
  metadata: `0x${string}`;
  serviceId: bigint;
  jobId: bigint;
  winner: `0x${string}`;
  winningBidId: bigint;
  jobCreated: boolean;
  status: SessionStatusType;
}

export interface BidInfo {
  bidId: bigint;
  bidder: `0x${string}`;
  proposedAmount: bigint;
  stake: bigint;
  message: string;
  commitHash: `0x${string}`;
  revealed: boolean;
  accepted: boolean;
  stakeWithdrawn: boolean;
  timestamp: bigint;
}

// ============ Read Hooks ============

export function useBiddingSessionCount() {
  const { data, isLoading, error } = useReadContract({
    address: BIDDING_SYSTEM_ADDRESS,
    abi: BIDDING_SYSTEM_ABI,
    functionName: 'sessionCounter',
    query: {
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  return {
    count: data ? Number(data) : 0,
    isLoading,
    error,
  };
}

export function useBiddingSession(sessionId: number | bigint | undefined) {
  const id =
    sessionId !== undefined
      ? typeof sessionId === 'bigint'
        ? sessionId
        : BigInt(sessionId)
      : undefined;

  const { data, isLoading, error, refetch } = useReadContract({
    address: BIDDING_SYSTEM_ADDRESS,
    abi: BIDDING_SYSTEM_ABI,
    functionName: 'getSession',
    args: id !== undefined ? [id] : undefined,
    query: {
      retry: 2,
      staleTime: 10 * 1000,
      enabled: id !== undefined,
    },
  });

  return {
    session: data as BiddingSession | undefined,
    isLoading,
    error,
    refetch,
  };
}

export function useBiddingUserBid(
  sessionId: number | bigint | undefined,
  user: `0x${string}` | undefined
) {
  const id =
    sessionId !== undefined
      ? typeof sessionId === 'bigint'
        ? sessionId
        : BigInt(sessionId)
      : undefined;

  const { data, isLoading, error, refetch } = useReadContract({
    address: BIDDING_SYSTEM_ADDRESS,
    abi: BIDDING_SYSTEM_ABI,
    functionName: 'getUserBid',
    args: id !== undefined && user !== undefined ? [id, user] : undefined,
    query: {
      retry: 2,
      staleTime: 10 * 1000,
      enabled: id !== undefined && user !== undefined,
    },
  });

  return {
    bid: data as BidInfo | undefined,
    isLoading,
    error,
    refetch,
  };
}

export function useBiddingCalculateStake() {
  const { data, isLoading, error } = useReadContract({
    address: BIDDING_SYSTEM_ADDRESS,
    abi: BIDDING_SYSTEM_ABI,
    functionName: 'calculateStake',
    args: [parseEther('1')],
    query: {
      retry: 2,
      staleTime: 60 * 1000,
    },
  });

  return {
    stakePerEth: data as bigint | undefined,
    isLoading,
    error,
  };
}

// ============ Write Hooks ============

export function useCreateBiddingSession() {
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  function createSession(params: {
    evaluator: `0x${string}`;
    maxBudget: bigint;
    deadline: bigint;
    metadata: `0x${string}`;
    serviceId: bigint;
  }) {
    const stake = (params.maxBudget * 100n) / 10000n; // 1% stake

    writeContract({
      address: BIDDING_SYSTEM_ADDRESS,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'createBiddingSession',
      args: [
        params.evaluator,
        params.maxBudget,
        params.deadline,
        params.metadata,
        params.serviceId,
      ],
      value: stake,
    });
  }

  return {
    createSession,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    writeError,
  };
}

export function useBiddingCommitBid() {
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  function commitBid(params: { sessionId: bigint; commitHash: `0x${string}`; stake: bigint }) {
    writeContract({
      address: BIDDING_SYSTEM_ADDRESS,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'commitBid',
      args: [params.sessionId, params.commitHash],
      value: params.stake,
    });
  }

  return {
    commitBid,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    writeError,
  };
}

export function useBiddingRevealBid() {
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  function revealBid(params: {
    sessionId: bigint;
    amount: bigint;
    message: string;
    salt: `0x${string}`;
  }) {
    writeContract({
      address: BIDDING_SYSTEM_ADDRESS,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'revealBid',
      args: [params.sessionId, params.amount, params.message, params.salt],
    });
  }

  return {
    revealBid,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    writeError,
  };
}

export function useBiddingAcceptBid() {
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  function acceptBid(params: { sessionId: bigint; bidId: bigint }) {
    writeContract({
      address: BIDDING_SYSTEM_ADDRESS,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'acceptBid',
      args: [params.sessionId, params.bidId],
    });
  }

  return {
    acceptBid,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    writeError,
  };
}

export function useBiddingRejectBid() {
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  function rejectBid(params: { sessionId: bigint; bidId: bigint; reason: string }) {
    writeContract({
      address: BIDDING_SYSTEM_ADDRESS,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'rejectBid',
      args: [params.sessionId, params.bidId, params.reason],
    });
  }

  return {
    rejectBid,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    writeError,
  };
}

export function useBiddingWithdrawStake() {
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  function withdrawStake(sessionId: bigint) {
    writeContract({
      address: BIDDING_SYSTEM_ADDRESS,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'withdrawStake',
      args: [sessionId],
    });
  }

  return {
    withdrawStake,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    writeError,
  };
}

export function useBiddingClaimStake() {
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  function claimStake(sessionId: bigint) {
    writeContract({
      address: BIDDING_SYSTEM_ADDRESS,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'claimStake',
      args: [sessionId],
    });
  }

  return {
    claimStake,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    writeError,
  };
}

export function useBiddingCreateJobAndFund() {
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  function createJobAndFund(params: {
    sessionId: bigint;
    jobExpiredAt: bigint;
    description: string;
    bidAmount: bigint;
    platformFee: bigint;
  }) {
    const totalPayment = params.bidAmount + params.platformFee;

    writeContract({
      address: BIDDING_SYSTEM_ADDRESS,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'createJobAndFund',
      args: [params.sessionId, params.jobExpiredAt, params.description],
      value: totalPayment,
    });
  }

  return {
    createJobAndFund,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    writeError,
  };
}

export function useBiddingCancelSession() {
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  function cancelSession(sessionId: bigint) {
    writeContract({
      address: BIDDING_SYSTEM_ADDRESS,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'cancelSession',
      args: [sessionId],
    });
  }

  return {
    cancelSession,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    writeError,
  };
}

export function useBiddingExtendRevealWindow() {
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  function extendRevealWindow(params: { sessionId: bigint; additionalSeconds: bigint }) {
    writeContract({
      address: BIDDING_SYSTEM_ADDRESS,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'extendRevealWindow',
      args: [params.sessionId, params.additionalSeconds],
    });
  }

  return {
    extendRevealWindow,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    writeError,
  };
}
