# Quillshield Module 3: External Call Safety Analysis

**Methodology:** quillshield/external-call-safety SKILL.md (9-step workflow)
**Date:** May 1, 2026

---

## Part 1: External Call Safety

### 1.1 Unchecked Return Values

| Contract | Call Pattern | Return Checked? | Status |
|----------|-------------|----------------|--------|
| All `.call{value: ETH}` (21 sites) | Raw ETH `.call` | ✅ `require(success)` | SAFE |
| `safeTransfer` / `safeTransferFrom` (14 sites) | OZ SafeERC20 | ✅ Reverts on failure | SAFE |
| `latestRoundData` (3 in PriceOracleV2, 3 in PriceOracle) | Chainlink feed | ✅ `require(price > 0)`, `require(answeredInRound >= roundId)` | SAFE (V2 fixed) |
| `staticcall decimals()` (2 sites) | ERC20 metadata | ✅ `require(success && data.length >= 32)` | SAFE (H-08 fix) |

### 1.2 Gas Stipend (2300 vs All Gas)

| Pattern | Gas Forwarded | Status |
|---------|--------------|--------|
| `.call{value: ETH}` | All remaining gas | ✅ SAFE — flexible, compatible with smart contract wallets |
| All `.transfer()` | 2300 gas | ✅ FIXED — replaced with `.call{value}` (F-01) |

### 1.3 Return Data Bomb

All external calls to known interfaces (`IERC20`, `IACPHook`, `IAgenticCommerceV9`, `AggregatorV3Interface`) have bounded return data. The hook calls (`IACPHook.beforeAction`) are wrapped in `try/catch`, which also protects against return data bombs.

### 1.4 Delegatecall to Untrusted

**Finding:** `AdminRegistry.sol` uses `ERC1967Utils` import but never calls `delegatecall`. All `staticcall` calls target verified contract addresses (identity registry for ERC-8004 metadata).

---

## Part 2: Token Integration Safety ("Weird ERC20")

### 2.1 Fee-on-Transfer Tokens

| Contract | Function | Detection Method | Status |
|----------|----------|-----------------|--------|
| AgenticCommerceV9 | `createJob()` L438 | `balanceOf` diff | ✅ FIXED (this session) |
| AgenticCommerceV9 | `fund()` L610 | `balanceOf` diff | ✅ FIXED (this session) |
| MilestoneEscrowV2 | `registerAsArbiter()` L546 | `balanceOf` diff | ✅ FIXED (this session) |
| MilestoneEscrowV2 | `flagDispute()` L391 | `balanceOf` diff | ✅ FIXED (this session) |
| MilestoneEscrowV2 | `releaseMilestone()` L340 | No diff check needed | ⚠️ LOW — pre-funded, fixed amount |
| MilestoneEscrowV2 | `resolveDispute()` L436,442,458 | No diff check needed | ⚠️ LOW — pre-funded, fixed amount |

⚠️ **Remaining exposure:** `releaseMilestone()` and `resolveDispute()` use `safeTransfer` with amounts recorded in milestones. If the payment token has fee-on-transfer, the contract may not hold enough to complete the transfer. Mitigated by the `supportedTokens` allowlist — fee-on-transfer tokens should never be added.

### 2.2 Missing Return Values (USDT/BNB compatibility)

- ✅ **All ERC20 transfers** use OpenZeppelin `SafeERC20` (`safeTransfer`, `safeTransferFrom`), which handles non-standard return values
- ✅ USDT's missing `bool` return value is handled by SafeERC20's low-level call wrapper

### 2.3 Rebase/Elastic Supply Tokens

**Risk:** If a rebasing token (stETH, AMPL) is used as `paymentToken`, the contract balance can change without transfers. This would break:
- `createJob()` — balanceOf diff for fee-on-transfer would also detect rebases
- `releaseMilestone()` — amount recorded at milestone may not match available balance

**Mitigation:** The `allowedTokens` (AgenticCommerceV9) and `supportedTokens` (MilestoneEscrowV2) allowlists prevent rebasing tokens from being added. Documented design tradeoff.

### 2.4 ERC-777 Callback Risk

✅ All transfers use ERC20 `transfer`/`transferFrom`, not ERC-777-specific functions. The `safeTransferFrom` from OZ does NOT trigger ERC-777 hooks (it calls `transferFrom` which only has the standard ERC20 interface). ERC-777 risk only applies when using the ERC-777 standard's custom functions.

### 2.5 Token Blacklists (USDC)

**Finding (LOW):** USDC and USDT can freeze or blacklist specific addresses. If a provider, client, or arbiter is blacklisted:
- `_transferPayment()` in AgenticCommerceV9 would revert, locking payments
- `releaseMilestone()` in MilestoneEscrowV2 would revert
- `registerAsArbiter()` with USDC as stake token could freeze an arbiter's collateral

**Impact:** LOW — these are external constraints of the stablecoin issuers, not Solidity bugs. Standard risk for any protocol integrating USDC/USDT.

### 2.6 Unlimited Approve Race Condition

- ✅ No contract calls `approve()` — only `safeTransferFrom` is used
- ✅ The `allowance` check in `createJob()` is read-only (no approve call)
- ✅ Exact-amount approvals are the user's responsibility

---

## Part 3: Payment Pattern Analysis

### Push vs Pull Pattern

| Pattern | Usage | Status |
|---------|-------|--------|
| **Push** (contract initiates transfer) | All payment flows | ✅ Standard, gas-efficient |
| **Pull** (user withdraws) | `claimReward()`, `releaseStake()`, `withdrawStake()`, `claimStake()` | ✅ Used where appropriate |

### Findings

**F-3-01: Selfdestruct Force-Feeding (LOW)**

| Contract | Line | Issue | Risk |
|----------|------|-------|------|
| AgentReviewV5.sol | 631 | `address(this).balance - locked` | Selfdestruct inflates balance, `onlyOwner` |
| BiddingSystem.sol | 657 | `address(this).balance - totalStakesHeld` | Selfdestruct inflates available, `onlyOwner` |

Both are `onlyOwner` protected. No direct exploit path for attackers.

---

## Summary

| Severity | New Findings | Already Fixed |
|----------|-------------|---------------|
| CRITICAL | 0 | — |
| HIGH | 0 | 4 (fee-on-transfer diff checks) |
| MEDIUM | 0 | — |
| LOW | 2 (selfdestruct force-feed, USDC blacklist) | — |

**Conclusion:** External call patterns are well-protected. All critical checks were already applied (SafeERC20, checked `.call{value}`, balanceOf diffs, try/catch hooks). No new HIGH/CRITICAL findings.
