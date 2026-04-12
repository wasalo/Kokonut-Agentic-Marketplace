import {
  OWSPolicy,
  OWSPolicyRule,
  OWSSignRequest,
  OWSError,
  OWSErrorCode,
  OWSChain,
  OWS_CHAIN_IDS,
} from './types';

export interface PolicyCheckResult {
  allowed: boolean;
  reason?: string;
  exceededLimits?: {
    rule: string;
    requested: bigint;
    limit: bigint;
  };
}

export class PolicyEngine {
  private policies: Map<string, OWSPolicy> = new Map();

  registerPolicy(policy: OWSPolicy): void {
    this.policies.set(policy.id, policy);
  }

  unregisterPolicy(policyId: string): void {
    this.policies.delete(policyId);
  }

  getPolicy(policyId: string): OWSPolicy | undefined {
    return this.policies.get(policyId);
  }

  evaluate(policy: OWSPolicy, request: OWSSignRequest): PolicyCheckResult {
    for (const rule of policy.rules) {
      const result = this.evaluateRule(rule, request);
      if (!result.allowed) {
        return result;
      }
    }

    return { allowed: true };
  }

  private evaluateRule(rule: OWSPolicyRule, request: OWSSignRequest): PolicyCheckResult {
    switch (rule.type) {
      case 'chain-restriction':
        return this.evaluateChainRestriction(rule, request);
      case 'spending-limit':
        return this.evaluateSpendingLimit(rule, request);
      case 'contract-whitelist':
        return this.evaluateContractWhitelist(rule, request);
      case 'time-lock':
        return this.evaluateTimeLock(rule, request);
      default:
        return { allowed: true };
    }
  }

  private evaluateChainRestriction(
    rule: { type: 'chain-restriction'; allowedChains: OWSChain[] },
    request: OWSSignRequest
  ): PolicyCheckResult {
    if (!rule.allowedChains.includes(request.chain)) {
      return {
        allowed: false,
        reason: `Chain '${request.chain}' is not allowed. Allowed chains: ${rule.allowedChains.join(', ')}`,
      };
    }
    return { allowed: true };
  }

  private evaluateSpendingLimit(
    rule: { type: 'spending-limit'; dailyLimit?: bigint; perTransactionLimit?: bigint; monthlyLimit?: bigint },
    request: OWSSignRequest
  ): PolicyCheckResult {
    const value = request.value || 0n;

    if (rule.perTransactionLimit && value > rule.perTransactionLimit) {
      return {
        allowed: false,
        reason: `Transaction value ${this.formatAmount(value)} exceeds per-transaction limit ${this.formatAmount(rule.perTransactionLimit)}`,
        exceededLimits: {
          rule: 'perTransactionLimit',
          requested: value,
          limit: rule.perTransactionLimit,
        },
      };
    }

    return { allowed: true };
  }

  private evaluateContractWhitelist(
    rule: { type: 'contract-whitelist'; allowedContracts: `0x${string}`[] },
    request: OWSSignRequest
  ): PolicyCheckResult {
    if (rule.allowedContracts.length === 0) {
      return { allowed: true };
    }

    if (!rule.allowedContracts.includes(request.to.toLowerCase() as `0x${string}`)) {
      return {
        allowed: false,
        reason: `Contract ${request.to} is not in the whitelist. Allowed contracts: ${rule.allowedContracts.join(', ')}`,
      };
    }

    return { allowed: true };
  }

  private evaluateTimeLock(
    rule: {
      type: 'time-lock';
      activeHoursStart?: number;
      activeHoursEnd?: number;
      activeDays?: number[];
    },
    _request: OWSSignRequest
  ): PolicyCheckResult {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    if (rule.activeHoursStart !== undefined && rule.activeHoursEnd !== undefined) {
      if (hour < rule.activeHoursStart || hour > rule.activeHoursEnd) {
        return {
          allowed: false,
          reason: `Transaction not allowed outside of active hours (${rule.activeHoursStart}:00 - ${rule.activeHoursEnd}:00)`,
        };
      }
    }

    if (rule.activeDays && rule.activeDays.length > 0) {
      if (!rule.activeDays.includes(day)) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return {
          allowed: false,
          reason: `Transaction not allowed on ${dayNames[day]}. Allowed days: ${rule.activeDays.map(d => dayNames[d]).join(', ')}`,
        };
      }
    }

    return { allowed: true };
  }

  private formatAmount(amount: bigint): string {
    const usdcAmount = Number(amount) / 1e6;
    return `${usdcAmount.toFixed(2)} USDC`;
  }

  canSign(policyId: string, request: OWSSignRequest): PolicyCheckResult {
    const policy = this.policies.get(policyId);
    if (!policy) {
      return { allowed: true };
    }
    return this.evaluate(policy, request);
  }

  getAllowedChains(policyId: string): OWSChain[] {
    const policy = this.policies.get(policyId);
    if (!policy) {
      return Object.keys(OWS_CHAIN_IDS) as OWSChain[];
    }

    for (const rule of policy.rules) {
      if (rule.type === 'chain-restriction') {
        return rule.allowedChains;
      }
    }

    return Object.keys(OWS_CHAIN_IDS) as OWSChain[];
  }

  getSpendingLimits(policyId: string): { daily?: bigint; perTransaction?: bigint; monthly?: bigint } {
    const policy = this.policies.get(policyId);
    if (!policy) {
      return {};
    }

    for (const rule of policy.rules) {
      if (rule.type === 'spending-limit') {
        return {
          daily: rule.dailyLimit,
          perTransaction: rule.perTransactionLimit,
          monthly: rule.monthlyLimit,
        };
      }
    }

    return {};
  }

  isContractWhitelistEnabled(policyId: string): boolean {
    const policy = this.policies.get(policyId);
    if (!policy) {
      return false;
    }

    for (const rule of policy.rules) {
      if (rule.type === 'contract-whitelist' && rule.allowedContracts.length > 0) {
        return true;
      }
    }

    return false;
  }

  getAllowedContracts(policyId: string): `0x${string}`[] {
    const policy = this.policies.get(policyId);
    if (!policy) {
      return [];
    }

    for (const rule of policy.rules) {
      if (rule.type === 'contract-whitelist') {
        return rule.allowedContracts;
      }
    }

    return [];
  }
}

export const policyEngine = new PolicyEngine();