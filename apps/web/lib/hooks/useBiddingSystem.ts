import { useMemo } from 'react';
import { useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { BIDDING_SYSTEM_ABI } from '@/lib/contracts/abis';
import { getContractAddress, ZERO_ADDRESS, SEPOLIA_CHAIN_ID } from '@/lib/contracts/config';
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

export type SessionStatusBadgeType = 'active' | 'pending' | 'under-review' | 'completed' | 'cancelled';

export const SESSION_STATUS_BADGE: Record<SessionStatusType, { badge: SessionStatusBadgeType; label: string }> = {
  [SessionStatus.Active]: { badge: 'active', label: 'Active' },
  [SessionStatus.BiddingClosed]: { badge: 'pending', label: 'Bidding Closed' },
  [SessionStatus.WinnerSelected]: { badge: 'under-review', label: 'Winner Selected' },
  [SessionStatus.JobCreated]: { badge: 'under-review', label: 'Job Created' },
  [SessionStatus.Completed]: { badge: 'completed', label: 'Completed' },
  [SessionStatus.Cancelled]: { badge: 'cancelled', label: 'Cancelled' },
};

export function getSessionStatusBadge(status: number | SessionStatusType): { badge: SessionStatusBadgeType; label: string } {
  return SESSION_STATUS_BADGE[status as SessionStatusType] ?? SESSION_STATUS_BADGE[SessionStatus.Active];
}

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
  useRandomEvaluator: boolean;
  paymentToken: `0x${string}`;
  evaluatorFee: boolean; // Phase 45c O-6
  hook: `0x${string}`;    // Phase 45c O-7
}

export type BidStatusType =
  | 'None'       // 0
  | 'Pending'    // 1
  | 'Revealed'   // 2
  | 'Accepted'   // 3
  | 'Rejected'   // 4
  | 'Withdrawn'; // 5

export const BID_STATUS = {
  None: 0,
  Pending: 1,
  Revealed: 2,
  Accepted: 3,
  Rejected: 4,
  Withdrawn: 5,
} as const;

export interface BidInfo {
  bidId: bigint;
  bidder: `0x${string}`;
  proposedAmount: bigint;
  stake: bigint;
  message: string;
  commitHash: `0x${string}`;
  revealed: boolean;
  accepted: boolean;
  rejected: boolean;
  stakeWithdrawn: boolean;
  timestamp: bigint;
  status: number; // Phase 45c O-12: BidStatus enum value (use BID_STATUS)
}

// ============ Read Hooks ============

export function useBiddingSessionCount() {
  const { data, isLoading, error, refetch } = useReadContract({
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
    refetch,
  };
}

export function useBiddingSessions(start: number = 0, count?: number) {
  const { count: totalCount, isLoading: isCountLoading, error: countError } = useBiddingSessionCount();

  const sessionIds = useMemo(() => {
    if (totalCount <= 0) return [];

    const effectiveCount = count ?? totalCount;
    const startIndex = Math.max(start, 0);
    const endExclusive = Math.min(startIndex + effectiveCount, totalCount);

    return Array.from({ length: Math.max(endExclusive - startIndex, 0) }, (_, index) =>
      BigInt(totalCount - (startIndex + index))
    ).filter(id => id > 0n);
  }, [count, start, totalCount]);

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: sessionIds.map(sessionId => ({
      address: BIDDING_SYSTEM_ADDRESS,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'getSession',
      args: [sessionId],
    })),
    query: {
      retry: 2,
      staleTime: 10 * 1000,
      enabled: sessionIds.length > 0,
    },
  });

  const sessions = useMemo(
    () =>
      (data
        ?.map(result => result.result as BiddingSession | undefined)
        .filter((session): session is BiddingSession => session !== undefined) ?? []),
    [data]
  );

  return {
    sessions,
    totalCount,
    isLoading: isCountLoading || isLoading,
    error: error || countError,
    refetch,
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

  const bid = useMemo(() => {
    const userBid = data as BidInfo | undefined;
    if (!userBid || userBid.bidId === 0n || userBid.bidder.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
      return undefined;
    }
    return userBid;
  }, [data]);

  return {
    bid,
    isLoading,
    error,
    refetch,
  };
}

export function useBiddingRevealedBids(sessionId: number | bigint | undefined) {
  const id =
    sessionId !== undefined
      ? typeof sessionId === 'bigint'
        ? sessionId
        : BigInt(sessionId)
      : undefined;

  const { data, isLoading, error, refetch } = useReadContract({
    address: BIDDING_SYSTEM_ADDRESS,
    abi: BIDDING_SYSTEM_ABI,
    functionName: 'getRevealedBids',
    args: id !== undefined ? [id] : undefined,
    query: {
      retry: 2,
      staleTime: 10 * 1000,
      enabled: id !== undefined,
    },
  });

  return {
    bids: ((data as BidInfo[] | undefined) ?? []).filter(bid => bid.revealed),
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

  const calculateStake = (maxBudget: bigint): bigint => {
    return (maxBudget * 100n) / 10000n;
  };

  return {
    calculateStake,
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
    paymentToken: `0x${string}`;
    evaluatorFee?: boolean;       // Phase 45c O-6 (default false)
    hook?: `0x${string}`;         // Phase 45c O-7 (default address(0))
  }) {
    const stake = (params.maxBudget * 100n) / 10000n; // 1% stake
    const isNativePayment = params.paymentToken.toLowerCase() === ZERO_ADDRESS.toLowerCase();

    writeContract({
      chainId: SEPOLIA_CHAIN_ID,
      address: BIDDING_SYSTEM_ADDRESS,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'createBiddingSession',
      args: [
        params.evaluator,
        params.maxBudget,
        params.deadline,
        params.metadata,
        params.serviceId,
        params.paymentToken,
        params.evaluatorFee ?? false,
        params.hook ?? ZERO_ADDRESS,
      ],
      value: isNativePayment ? stake : 0n,
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

  function commitBid(params: {
    sessionId: bigint;
    commitHash: `0x${string}`;
    stake: bigint;
    paymentToken?: `0x${string}`;
  }) {
    const paymentToken = params.paymentToken ?? ZERO_ADDRESS;
    const isNativePayment = paymentToken.toLowerCase() === ZERO_ADDRESS.toLowerCase();

    writeContract({
      chainId: SEPOLIA_CHAIN_ID,
      address: BIDDING_SYSTEM_ADDRESS,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'commitBid',
      args: [params.sessionId, params.commitHash],
      value: isNativePayment ? params.stake : 0n,
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
      chainId: SEPOLIA_CHAIN_ID,
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
      chainId: SEPOLIA_CHAIN_ID,
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
      chainId: SEPOLIA_CHAIN_ID,
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
      chainId: SEPOLIA_CHAIN_ID,
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
    error: writeError as Error | null,
  };
}

export function useBiddingWithdrawCreatorStake() {
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  function withdrawCreatorStake(sessionId: bigint) {
    writeContract({
      chainId: SEPOLIA_CHAIN_ID,
      address: BIDDING_SYSTEM_ADDRESS,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'withdrawCreatorStake',
      args: [sessionId],
    });
  }

  return {
    withdrawCreatorStake,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error: writeError as Error | null,
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
      chainId: SEPOLIA_CHAIN_ID,
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
      chainId: SEPOLIA_CHAIN_ID,
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
      chainId: SEPOLIA_CHAIN_ID,
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

export function useBiddingCompleteSession() {
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  function completeSession(sessionId: bigint) {
    writeContract({
      chainId: SEPOLIA_CHAIN_ID,
      address: BIDDING_SYSTEM_ADDRESS,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'completeSession',
      args: [sessionId],
    });
  }

  return {
    completeSession,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    writeError,
  };
}

// ============ Phase 45b Hooks ============

/// @notice Phase 45b O-2: Permissionlessly close bidding once the deadline has passed.
export function useCloseBidding() {
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  function closeBidding(sessionId: bigint) {
    writeContract({
      chainId: SEPOLIA_CHAIN_ID,
      address: BIDDING_SYSTEM_ADDRESS,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'closeBidding',
      args: [sessionId],
    });
  }

  return {
    closeBidding,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    writeError,
  };
}

/// @notice Phase 45b O-3: Slash a no-show bidder (5% to treasury, 95% refund).
export function useSlashNoShow() {
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  function slashNoShow(params: { sessionId: bigint; bidder: `0x${string}` }) {
    writeContract({
      chainId: SEPOLIA_CHAIN_ID,
      address: BIDDING_SYSTEM_ADDRESS,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'slashNoShow',
      args: [params.sessionId, params.bidder],
    });
  }

  return {
    slashNoShow,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    writeError,
  };
}

/// @notice Phase 45b O-10: Withdraw the full accumulated platform-fee balance for a token.
///         Use `0x0000…` for native ETH; ERC-20 address for tokenized fees.
export function useWithdrawFees() {
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  function withdrawFees(token: `0x${string}`) {
    writeContract({
      chainId: SEPOLIA_CHAIN_ID,
      address: BIDDING_SYSTEM_ADDRESS,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'withdrawFees',
      args: [token],
    });
  }

  return {
    withdrawFees,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    writeError,
  };
}

/// @notice Phase 45b O-10: Read the accumulated platform-fee balance for a token.
export function useAccumulatedFeesByToken(token: `0x${string}` | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: BIDDING_SYSTEM_ADDRESS,
    abi: BIDDING_SYSTEM_ABI,
    functionName: 'accumulatedFeesByToken',
    args: token !== undefined ? [token] : undefined,
    query: {
      retry: 2,
      staleTime: 30 * 1000,
      enabled: token !== undefined,
    },
  });

  return {
    accumulated: (data as bigint | undefined) ?? 0n,
    isLoading,
    error,
    refetch,
  };
}

// ============ Phase 45c Hooks ============

/// @notice Phase 45c O-4: read the configured min/max stake bounds.
export function useStakeBounds() {
  const { data: minData, isLoading: isMinLoading, error: minError } = useReadContract({
    address: BIDDING_SYSTEM_ADDRESS,
    abi: BIDDING_SYSTEM_ABI,
    functionName: 'minStake',
    query: { retry: 2, staleTime: 60 * 1000 },
  });
  const { data: maxData, isLoading: isMaxLoading, error: maxError } = useReadContract({
    address: BIDDING_SYSTEM_ADDRESS,
    abi: BIDDING_SYSTEM_ABI,
    functionName: 'maxStake',
    query: { retry: 2, staleTime: 60 * 1000 },
  });
  return {
    minStake: (minData as bigint | undefined) ?? 0n,
    maxStake: (maxData as bigint | undefined) ?? 0n,
    isLoading: isMinLoading || isMaxLoading,
    error: minError || maxError,
  };
}

/// @notice Phase 45c O-4: owner-only setters for stake bounds.
export function useSetStakeBounds() {
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  function setMin(newMin: bigint) {
    writeContract({
      chainId: SEPOLIA_CHAIN_ID,
      address: BIDDING_SYSTEM_ADDRESS,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'setMinStake',
      args: [newMin],
    });
  }
  function setMax(newMax: bigint) {
    writeContract({
      chainId: SEPOLIA_CHAIN_ID,
      address: BIDDING_SYSTEM_ADDRESS,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'setMaxStake',
      args: [newMax],
    });
  }
  function setBounds(newMin: bigint, newMax: bigint) {
    writeContract({
      chainId: SEPOLIA_CHAIN_ID,
      address: BIDDING_SYSTEM_ADDRESS,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'setStakeBounds',
      args: [newMin, newMax],
    });
  }
  return { setMin, setMax, setBounds, hash, isPending, isConfirming, isConfirmed, writeError };
}

/// @notice Phase 45c O-9: read the deadline after which `sweepUnclaimedStakes` can
///         pull the bidder's stake. 0 = no pending claim.
export function useWithdrawStakeClaimableAt(sessionId: bigint | undefined, bidder: `0x${string}` | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: BIDDING_SYSTEM_ADDRESS,
    abi: BIDDING_SYSTEM_ABI,
    functionName: 'withdrawStakeClaimableAt',
    args: sessionId !== undefined && bidder !== undefined ? [sessionId, bidder] : undefined,
    query: { retry: 2, staleTime: 30 * 1000, enabled: sessionId !== undefined && bidder !== undefined },
  });
  return { claimableAt: (data as bigint | undefined) ?? 0n, isLoading, error, refetch };
}

/// @notice Phase 45c O-9: permissionless sweep of un-withdrawn stakes after the
///         30-day window. Returns the number of stakes swept.
export function useSweepUnclaimedStakes() {
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } = useWaitForTransactionReceipt({ hash });
  return {
    sweep: (sessionId: bigint) =>
      writeContract({
        chainId: SEPOLIA_CHAIN_ID,
        address: BIDDING_SYSTEM_ADDRESS,
        abi: BIDDING_SYSTEM_ABI,
        functionName: 'sweepUnclaimedStakes',
        args: [sessionId],
      }),
    hash, isPending, isConfirming, isConfirmed, writeError, receipt,
  };
}

/// @notice Phase 45c O-11: read the effective platform fee for a given token.
export function usePlatformFeeBPForToken(token: `0x${string}` | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: BIDDING_SYSTEM_ADDRESS,
    abi: BIDDING_SYSTEM_ABI,
    functionName: 'getPlatformFeeBP',
    args: token !== undefined ? [token] : undefined,
    query: { retry: 2, staleTime: 30 * 1000, enabled: token !== undefined },
  });
  return { feeBP: (data as bigint | undefined) ?? 0n, isLoading, error, refetch };
}

/// @notice Phase 45c O-11: owner-only setter for per-token platform fees.
export function useSetPlatformFeeBPForToken() {
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  function setForToken(token: `0x${string}`, basisPoints: bigint) {
    writeContract({
      chainId: SEPOLIA_CHAIN_ID,
      address: BIDDING_SYSTEM_ADDRESS,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'setPlatformFeeBPForToken',
      args: [token, basisPoints],
    });
  }
  return { setForToken, hash, isPending, isConfirming, isConfirmed, writeError };
}

/// @notice Phase 45c O-12: read the explicit BidStatus for a (session, bidder) pair.
export function useBidStatus(sessionId: bigint | undefined, bidder: `0x${string}` | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: BIDDING_SYSTEM_ADDRESS,
    abi: BIDDING_SYSTEM_ABI,
    functionName: 'getBidStatus',
    args: sessionId !== undefined && bidder !== undefined ? [sessionId, bidder] : undefined,
    query: { retry: 2, staleTime: 15 * 1000, enabled: sessionId !== undefined && bidder !== undefined },
  });
  return { status: (data as number | undefined) ?? 0, isLoading, error, refetch };
}
