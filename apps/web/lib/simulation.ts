import { formatUnits } from 'viem';
import type { Token } from '@/lib/tokenUtils';

export interface SimulationResult {
  ethBalanceChange: number;
  tokenBalanceChanges: Array<{
    token: string;
    symbol: string;
    decimals: number;
    change: number;
    reason: string;
  }>;
  stateChanges: Array<{
    entity: string;
    from: string;
    to: string;
    reason: string;
  }>;
  warnings: Array<{
    severity: 'low' | 'medium' | 'high';
    message: string;
  }>;
  gasEstimate?: bigint;
}

function formatTokenAmount(amount: bigint, decimals: number): string {
  return formatUnits(amount, decimals);
}

export function simulateCreateJob(params: {
  budget: bigint;
  token: Token;
  provider: `0x${string}`;
  evaluator?: `0x${string}`;
  evaluatorFee: boolean;
  fundNow: boolean;
}): SimulationResult {
  const { budget, token, evaluatorFee, fundNow } = params;
  const feeBP = evaluatorFee ? 500 : 0;
  const feeAmount = (budget * BigInt(feeBP)) / 10000n;
  const providerAmount = budget - feeAmount;

  const result: SimulationResult = {
    ethBalanceChange: -0.001,
    tokenBalanceChanges: [],
    stateChanges: [
      {
        entity: 'Job status',
        from: '—',
        to: 'Open',
        reason: 'New job created',
      },
    ],
    warnings: [],
  };

  if (fundNow) {
    result.tokenBalanceChanges.push({
      token: token.address || 'ETH',
      symbol: token.symbol,
      decimals: token.decimals,
      change: -Number(formatUnits(budget, token.decimals)),
      reason: 'Job budget (escrow)',
    });
    result.stateChanges.push({
      entity: 'Job status',
      from: 'Open',
      to: 'Funded',
      reason: 'Immediate funding',
    });
  }

  result.stateChanges.push({
    entity: 'Provider balance',
    from: '—',
    to: `${formatTokenAmount(providerAmount, token.decimals)} ${token.symbol}`,
    reason: `Locked until delivery`,
  });

  if (feeAmount > 0n) {
    result.stateChanges.push({
      entity: 'Platform fee',
      from: '—',
      to: `${formatTokenAmount(feeAmount, token.decimals)} ${token.symbol}`,
      reason: 'Evaluator + platform fee (5%)',
    });
  }

  const budgetUsd = Number(formatUnits(budget, token.decimals));
  if (budgetUsd > 1000) {
    result.warnings.push({
      severity: 'high',
      message: 'Budget > $1,000. Consider enabling milestones.',
    });
  } else if (budgetUsd > 500) {
    result.warnings.push({
      severity: 'medium',
      message: 'High-value job. Milestones recommended.',
    });
  }

  return result;
}

export function simulateFundJob(params: {
  budget: bigint;
  token: Token;
  jobId: number;
}): SimulationResult {
  const { budget, token, jobId } = params;

  return {
    ethBalanceChange: -0.0005,
    tokenBalanceChanges: [
      {
        token: token.address || 'ETH',
        symbol: token.symbol,
        decimals: token.decimals,
        change: -Number(formatUnits(budget, token.decimals)),
        reason: 'Job funding (escrow)',
      },
    ],
    stateChanges: [
      {
        entity: `Job #${jobId}`,
        from: 'Open',
        to: 'Funded',
        reason: 'Client funded job',
      },
    ],
    warnings: [],
  };
}

export function simulateApproveByClient(params: {
  jobId: number;
  budget: bigint;
  token: Token;
  provider: `0x${string}`;
}): SimulationResult {
  const { jobId, budget, token, provider } = params;

  return {
    ethBalanceChange: -0.0005,
    tokenBalanceChanges: [],
    stateChanges: [
      {
        entity: `Job #${jobId}`,
        from: 'Submitted',
        to: 'Pending Client Approval',
        reason: 'Client approved deliverable',
      },
      {
        entity: `Provider (${provider.slice(0, 6)}...)`,
        from: '0',
        to: `${formatUnits(budget, token.decimals)} ${token.symbol}`,
        reason: 'Payment released from escrow',
      },
    ],
    warnings: [],
  };
}

export function simulateUsdcApprove(params: {
  amount: bigint;
  spender: `0x${string}`;
}): SimulationResult {
  return {
    ethBalanceChange: -0.0003,
    tokenBalanceChanges: [],
    stateChanges: [
      {
        entity: 'USDC Allowance',
        from: 'Limited / 0',
        to: `${formatUnits(params.amount, 6)} USDC`,
        reason: `Approve ${params.spender.slice(0, 6)}... to spend USDC`,
      },
    ],
    warnings: [
      {
        severity: 'low',
        message: 'Only approve amounts you intend to spend.',
      },
    ],
  };
}

export function simulateUnlimitedUsdcApprove(params: {
  spender: `0x${string}`;
}): SimulationResult {
  return {
    ethBalanceChange: -0.0003,
    tokenBalanceChanges: [],
    stateChanges: [
      {
        entity: 'USDC Allowance',
        from: 'Limited',
        to: 'Unlimited',
        reason: `Approve ${params.spender.slice(0, 6)}... for unlimited spending`,
      },
    ],
    warnings: [
      {
        severity: 'medium',
        message: 'Unlimited approval carries risk if the contract is compromised.',
      },
    ],
  };
}
