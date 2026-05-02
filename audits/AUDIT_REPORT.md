# Kokonut Agent Economy Stack — Security Audit Report

**Date:** May 1, 2026
**Scope:** 14 Solidity contracts in `contracts/shared/`
**Tools Used:** Slither 0.11.4, Manual Code Review (sc-auditor methodology)
**Auditor:** AI Agent (sc-auditor Map-Hunt-Attack methodology)

---

## Executive Summary

| Statistic | Count |
|-----------|-------|
| Total Slither findings | 251 (11 High, 15 Medium, 76 Low, 149 Info) |
| HUNT lane manual findings | 28 new findings (2 Critical, 8 High, 8 Medium, 10 Low) |
| Previously fixed (this session) | 24 issues (gap, transfer→call, hooks try/catch, etc.) |

---

## Proved Findings (with Code References)

### C-01: `_checkMaxBudget()` Unit Mismatch — 8-dec vs 6-dec USD

**Severity:** CRITICAL
**File:** `contracts/shared/AgenticCommerceV9.sol:207-220`
**Status:** UNFIXED

The `_checkMaxBudget()` function compares Chainlink oracle prices (8 decimals) against `maxBudgetUsd` (6 decimals) without normalizing.

```solidity
// Line 213 — ETH path, result is 8-decimal USD:
budgetInUsd = (budget * uint256(ethPrice)) / (10 ** decimals);
// Line 220 — compared against 6-decimal maxBudgetUsd:
if (budgetInUsd > maxBudgetUsd) revert BudgetTooHigh();
```

- `getUsdPriceOfToken()` returns 8-decimal USD (per `ONE_USD = 100000000`)
- `maxBudgetUsd` is declared as "6-decimal USD terms" (line 62)
- The comparison effectively makes `maxBudgetUsd` 100x more restrictive for ETH/volatile tokens
- Stablecoin path (line 209) is correct because `budget / 10^(6-6) = budget`

**Fix:** Normalize to 6 decimals: `budgetInUsd = budgetInUsd / 100;` before comparison, or compare against `maxBudgetUsd * 100`.

### C-02: `PriceOracleV2` Rejects ETH (`address(0)`) Conversion

**Severity:** CRITICAL
**File:** `contracts/shared/PriceOracleV2.sol:160`
**Status:** UNFIXED

```solidity
function getTokenAmountForUsd(uint256 usdAmount, address token) external view returns (uint256) {
    require(token != address(0), "Zero address");  // Blocks ETH
}
```

`getUsdPriceOfToken()` correctly handles `address(0)` for ETH/USD price, but `getTokenAmountForUsd()` and `getUsdAmountForTokens()` reject it.

**Fix:** Remove the `require(token != address(0))` and handle ETH in the conversion logic.

---

## Confirmed (Unproven) Findings

### H-01: `answeredInRound` Validation Missing — All 7 Chainlink Call Sites

**Severity:** HIGH
**Files:** `PriceOracleV2.sol:142,241`, `PriceOracle.sol:94,165,219`
**Status:** UNFIXED

All `latestRoundData()` calls discard `roundId` and `answeredInRound`. During round transitions, stale data may be accepted.

**Fix:** Add `require(answeredInRound >= roundId, "Stale price")` to all call sites.

### H-02: Stale Price Returns `ONE_USD` Optimistically

**Severity:** HIGH
**File:** `PriceOracleV2.sol:145-147`
**Status:** UNFIXED

When the ETH price feed is stale, the oracle returns `ONE_USD` ($1). This means `getMinBudget()` computes a minimum of ~$0.00001 for ETH instead of $5 — enabling negligible-cost job creation during feed outages.

**Fix:** Revert on stale feed, or return a conservative high price.

### H-03: `decimals - 6` Underflow for Low-Decimal Tokens

**Severity:** HIGH
**File:** `AgenticCommerceV9.sol:237,245,251`
**Status:** UNFIXED

Tokens with <6 decimals cause `decimals - 6` to underflow (Solidity 0.8 checked arithmetic), DoS-ing `getMinBudget()` and `_checkMaxBudget()`.

**Fix:** `if (decimals < 6) decimals = 6;` before subtraction.

### H-04: `PriceOracle.sol` Hardcoded to 18 Decimals

**Severity:** HIGH
**File:** `PriceOracle.sol:118-131,179-181`
**Status:** UNFIXED

`_getTokenDecimals()` always returns 18. For USDC (6 decimals), `getTokenAmountForUsd()` is off by 10^12.

### H-05: Fee-on-Transfer Token Accounting

**Severity:** HIGH
**Files:** `MilestoneEscrowV2.sol:526-528,567`, `AgenticCommerceV9.sol:434-438`
**Status:** UNFIXED

If a fee-on-transfer token is used as payment or staking token, the contract records the pre-fee amount but receives less. Unregistration/release will revert due to insufficient balance.

### H-06: `slashEvaluatorStake()` Missing `nonReentrant` + CEI Violated

**Severity:** HIGH
**File:** `AgenticCommerceV9.sol:981-1006`
**Status:** UNFIXED

ETH `.call{value}` at line 991 happens before `isRegisteredEvaluator` flag is cleared (line 1004) and pool removal (lines 996-1001). Missing `nonReentrant`. An attacker-controlled `platformTreasury` could re-enter `unregisterAsEvaluator()` and bypass stake refund.

### H-07: `batchSetPriceFeeds()` No Contract Validation

**Severity:** HIGH
**File:** `PriceOracleV2.sol:250-261`
**Status:** UNFIXED

`batchSetPriceFeeds()` and `setPriceFeed()` don't validate that feed addresses are actual contracts. An EOA registered as feed causes `latestRoundData()` revert.

### H-08: `_getTokenDecimals()` Silently Defaults to 18

**Severity:** HIGH
**Files:** `AgenticCommerceV9.sol:1150-1161`, `PriceOracleV2.sol:197-213`
**Status:** UNFIXED

When `decimals()` call fails, both contracts silently assume 18 decimals. For a 6-decimal token like USDC, this introduces 10^12 error in conversions.

---

## Detected Candidates (Medium)

| ID | Severity | File | Line | Issue | Status |
|----|----------|------|------|-------|--------|
| M-01 | MEDIUM | `AgenticCommerceV9.sol` | 343 | `createJob()` `budget == 0` bypasses all budget validation | UNFIXED |
| M-02 | MEDIUM | `AgenticCommerceV9.sol` | 64,236-238 | `isStablecoin` owner-controlled — volatile token labeled stable bypasses min budget | UNFIXED |
| M-03 | MEDIUM | `AgenticCommerceV9.sol` | 417-442 | No `msg.value > 0` guard when `!fundNow` — ETH permanently locked | UNFIXED |
| M-04 | MEDIUM | `MilestoneEscrowV2.sol` | 370-377 | Weak on-chain randomness for arbiter selection | UNFIXED |
| M-05 | MEDIUM | `MilestoneEscrowV2.sol` | 494-506 | Slashed arbiter funds accumulate with no withdrawal mechanism | UNFIXED |
| M-06 | MEDIUM | `PriceOracleV2.sol` | 43,76,201 | `feedDecimals` naming misleading (stores token, not feed decimals) | UNFIXED |
| M-07 | MEDIUM | `AdminRegistry.sol` | 343 | Future `timestamp` underflow revert in `calculateDecayedRating()` | UNFIXED |
| M-08 | MEDIUM | `BiddingSystem.sol` | 505-531 | CEI violation — ETH refund before `session.status = Cancelled` | UNFIXED |
| M-09 | MEDIUM | `BiddingSystem.sol` | 435-499 | CEI violation — multiple ext calls before state update | UNFIXED |
| M-10 | MEDIUM | `AgentReviewV5.sol` | 444-469 | Missing `nonReentrant` on `slashEvaluator()` | UNFIXED |
| M-11 | MEDIUM | `MilestoneEscrowV2.sol` | 517-534 | CEI violation — ERC20 transfer before arbiter state | UNFIXED |
| M-12 | MEDIUM | `MilestoneEscrowV2.sol` | 353-394 | CEI violation — ERC20 transfer before dispute state | UNFIXED |
| M-13 | MEDIUM | `AgenticCommerceV9.sol` | 681-718 | Hook positioned between two transfer sets in `_releasePayment()` | UNFIXED |

---

## Previously Fixed (This Session)

Issues remediated during this audit session:

| ID | Severity | Description | Fix |
|----|----------|-------------|-----|
| F-01 | HIGH | 10 `.transfer()` → `.call{value}` | Replaced in BiddingSystem + AgenticCommerceV9 |
| F-02 | MEDIUM | `setUnderReview()` missing `onlyOwner` | Added access control |
| F-03 | MEDIUM | `abi.encodePacked` collision risk | Changed to `abi.encode` in AgentSkillRegistryV2 |
| F-04 | HIGH | Hook DoS via revert | Wrapped all 4 hook calls in try/catch |
| F-05 | MEDIUM | `__gap[45]` non-standard sizes | Normalized to `__gap[50]` in 3 contracts |
| F-06 | MEDIUM | Missing `_disableInitializers()` | Added to 5 contracts |
| F-07 | MEDIUM | Missing `__gap[50]` in 4 contracts | Added storage gaps |
| F-08 | LOW | Pragma `^0.8.20` floating | Pinned to `0.8.22` across 14 contracts |
| F-09 | MEDIUM | Exposed `NEXT_PUBLIC_*` secrets | Moved to server-only proxy routes |

---

## Slither Findings Summary

| Detector | Impact | Count | Key Files Affected |
|----------|--------|-------|-------------------|
| `reentrancy-eth` | HIGH | 3 | BiddingSystem, AgenticCommerceV9 |
| `arbitrary-send-eth` | HIGH | 3 | AgentReviewV5, AgenticCommerceV6/V9 |
| `weak-prng` | HIGH | 4 | AgenticCommerceV6/V9, MilestoneEscrowV1/V2 |
| `reentrancy-no-eth` | MEDIUM | 4 | MilestoneEscrowV1/V2 |
| `divide-before-multiply` | MEDIUM | 2 | AdminRegistry, PriceOracle |
| `incorrect-equality` | MEDIUM | 2 | AgenticCommerceV9 |
| `unused-return` | MEDIUM | 7 | PriceOracle, PriceOracleV2 |
| `uninitialized-state` | HIGH | 1 | AgentReviewV5 |

---

## Recommendations (Priority Order)

1. **Fix C-01, C-02 immediately** — budget ceiling unit mismatch breaks core protocol invariant
2. **Fix H-01, H-02, H-03, H-05** — Chainlink integration and decimal handling
3. **Fix H-06** (`slashEvaluatorStake` reentrancy) — add `nonReentrant` + CEI fix
4. **Fix M-01, M-03** — budget validation and stuck ETH
5. **Fixes from this session (F-01 through F-09)** — already applied, deploy to Sepolia
6. **Deploy all contract fixes** via UUPS upgrade

---

## Design Tradeoffs (Accepted Risk)

1. **Weak PRNG for evaluator/arbiter selection** — documented in NatSpec, acceptable for testnet
2. **`isStablecoin` owner-managed** — centralization risk, acceptable with multisig owner
3. **`allowedTokens` allowlist** — owner-managed token list prevents fee-on-transfer issues
4. **`nonReentrant` granularity** — some functions intentionally skip it (no external calls)
