# Quillshield Module 4: Oracle & Flash Loan Analysis

**Methodology:** quillshield/oracle-flashloan-analysis SKILL.md (4-phase)
**Date:** May 1, 2026

---

## Phase 1: Oracle Source Identification

### Price Feeds Used

| Oracle | Contract | Purpose | Trust Level |
|--------|----------|---------|-------------|
| **PriceOracleV2** (Chainlink) | `contracts/shared/PriceOracleV2.sol` | ETH/USD price, token prices | **Level 2** (Chainlink validated) |
| **PriceOracle** (legacy, Chainlink) | `contracts/shared/PriceOracle.sol` | Legacy, non-upgradeable | **Level 3** (Chainlink partial) |

### Quillshield Oracle Trust Hierarchy

| Level | Description | Our Status |
|-------|-------------|-----------|
| 1 | Multi-oracle / TWAP + Chainlink | ❌ Single oracle |
| **2** | **Chainlink with full validation** | ✅ **After Batch B fixes** |
| 3 | Chainlink partial validation | ⚠️ PriceOracle.sol (legacy, unfixed) |
| 4 | TWAP (short window) | ❌ Not used |
| 5 | AMM spot price / balanceOf | ❌ Not used |

### Where Prices are Consumed

| Consumer Contract | Function | Price Used For |
|------------------|----------|---------------|
| AgenticCommerceV9.sol | `getMinBudget()` (L241-251) | Convert $5 USD min to token/ETH units |
| AgenticCommerceV9.sol | `_checkMaxBudget()` (L210-218) | Convert budget to USD for max cap |
| AgenticCommerceV9.sol | `setMinBudgetUsd/setMaxBudgetUsd` | Admin-set USD values (no oracle needed) |

---

## Phase 2: Chainlink Validation Verification

### PriceOracleV2 (after Batch B fixes)

| Check | Quillshield Requirement | Status |
|-------|------------------------|--------|
| `price > 0` | Required | ✅ `require(answer > 0)` |
| `updatedAt > 0` | Required | ✅ Newly added |
| `block.timestamp - updatedAt <= MAX_STALENESS` | Required | ✅ `require(staleness)` |
| `answeredInRound >= roundId` | Required | ✅ Newly added |
| Round completeness | Required | ✅ Covered by `answeredInRound >= roundId` |
| L2 sequencer check | N/A (Sepolia) | ✅ Not needed for L1 |
| Feed address validation | Recommended | ✅ Added `code.length > 0` |

**Status:** PriceOracleV2 now passes all 6 Chainlink validation checks after Batch B fixes.

### PriceOracle.sol (Legacy, No Fix Applied)

| Check | Status |
|-------|--------|
| `price > 0` | ✅ Present |
| `updatedAt > 0` | ❌ Missing |
| `MAX_STALENESS` check | ✅ Present |
| `answeredInRound >= roundId` | ❌ Missing (all 3 call sites) |
| `decimals()` hardcoded to 18 | ❌ Broken for USDC |

**Status:** **CRITICAL** — PriceOracle.sol should be deprecated in favor of PriceOracleV2. It has:
- Missing `answeredInRound` validation on all 3 `latestRoundData()` calls
- Hardcoded 18-decimal assumption (broken for USDC)
- Non-upgradeable (can't fix)

---

## Phase 3: Flash Loan Attack Surface Analysis

### Detection Algorithm

| Attack Vector | Applicable? | Rationale |
|--------------|-------------|-----------|
| Oracle manipulation | ❌ Not applicable | No AMM spot pricing, no TWAP, Chainlink is manipulation-resistant |
| Governance attack | ❌ Not applicable | No token-based governance |
| Vault share inflation | ❌ Not applicable | No vault/share system |
| Liquidation manipulation | ❌ Not applicable | No lending/liquidation |
| Circular amplification | ❌ Not applicable | No protocol-owned liquidity |

**Conclusion:** The Kokonut Agent Economy Stack has **zero flash loan attack surface**. There are no:
- AMM pools or spot pricing
- Lending/borrowing markets
- Liquidation mechanisms
- Vault/share systems
- Protocol-owned liquidity pools

---

## Phase 4: Circular Dependency Analysis

| Check | Status |
|-------|--------|
| Does protocol have its own token? | ❌ No (uses ETH/USDC) |
| Does pricing depend on protocol's own token? | ❌ No |
| Does any protocol token trade in protocol-controlled pools? | ❌ No |
| Does any contract read its own balance for pricing? | ❌ No |

**Conclusion:** No circular dependencies detected.

---

## Summary

| Severity | Finding | Status |
|----------|---------|--------|
| CRITICAL | PriceOracle.sol non-upgradeable with 3 missing `answeredInRound` checks + broken USDC pricing | **Deferred — deprecate** |
| HIGH | Chainlink validation gap in PriceOracleV2 | ✅ **FIXED** (Batch B) |
| LOW | Flash loan risk | ❌ Not applicable to this codebase |

**Recommendation:** Fully deprecate `PriceOracle.sol` and remove from deployment. All price queries should go through `PriceOracleV2`.
