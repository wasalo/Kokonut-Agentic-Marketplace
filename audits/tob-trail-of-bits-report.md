# Trail of Bits Security Audit — Consolidated Report

**Date:** May 1, 2026
**Modules Used:** entry-point-analyzer, building-secure-contracts, sharp-edges, insecure-defaults, agentic-actions-auditor
**Scope:** 14 Solidity contracts + frontend + CI/CD workflows

---

## Executive Summary

| Module | Findings | New vs Prior Audits |
|--------|----------|---------------------|
| Entry Point Analysis | 23 Public, 98 Role-Restricted, 60 Review-Required | Attack surface baseline |
| Sharp Edges + Secure Contracts | 18 findings (1 CRITICAL, 6 HIGH, 7 MEDIUM, 4 LOW) | 15 NEW findings |
| Insecure Defaults | 22 findings (1 CRITICAL, 6 HIGH, 6 MEDIUM, 9 LOW) | 12 NEW findings |
| Agentic Actions (CI/CD) | 1 MEDIUM (subshell injection) + 2 HIGH (secrets overexposure) | 3 NEW findings |

**Total New Findings (not in prior sc-auditor/quillshield/cyfrin audits): 30**

---

## Critical Findings

### C-01: Empty `catch` Blocks Bypass All Blacklist Checks (AgenticCommerceV9)

**Severity:** CRITICAL
**File:** `AgenticCommerceV9.sol:351-366`
**Vectors:** Silent Failure pattern

All 6 `try/catch` blocks for AdminRegistry blacklist checks silently swallow failures. If AdminRegistry reverts for any reason, blacklisted wallets can freely create jobs and be assigned as providers/evaluators.

**Fix:** Emit `BlacklistCheckFailed` event, or add `bool public blacklistCheckRequired` toggle.

### C-02: API Key Authentication Fail-Open to Enterprise Tier (Frontend)

**Severity:** CRITICAL
**File:** `apps/web/lib/api-keys.ts:97-108`
**Vectors:** Insecure Default — Fail-Open Security

Any API key starting with `kokunot_live_` that is NOT registered defaults to `enterprise` tier with unlimited access. Attacker can craft arbitrary keys and get free x402 access.

**Fix:** Return `anonymous` or `free` for unknown keys.

---

## High Findings

### H-01: Parameter Swap — `provider`/`evaluator` in AgenticCommerceV9.createJob()

**File:** `AgenticCommerceV9.sol:321-334`
Two consecutive `address` parameters — callers can easily swap them, inverting the economic relationship.

### H-02: Parameter Swap — `client`/`provider` in MilestoneEscrow.enableMilestones()

**File:** `MilestoneEscrowV2.sol:245-262`
Adjacent `client`/`provider` addresses — swapping sends milestone payments to wrong party.

### H-03: Parameter Swap — `paymentToken`/`paymentAddress` in ServiceRegistryV2.createService()

**File:** `ServiceRegistryV2.sol:210-218`
Swap locks bond refunds permanently at token contract address.

### H-04: Configuration Cliff — `setMinBudgetUsd(0)` Eliminates Enforcement

**File:** `AgenticCommerceV9.sol:259-263`
Setting min budget to 0 allows dust-spam jobs. Setting max to 0 also skips enforcement.

### H-05: Configuration Cliff — `isStablecoin` on Volatile Token

**Files:** `PriceOracleV2.sol:104-107`, `AgenticCommerceV9.sol:290-293`
Marking a volatile token as stablecoin causes 2000x underpricing in budget validation.

### H-06: Storage Layout Break — MilestoneEscrowV2 vs V1

**Files:** `MilestoneEscrow.sol` vs `MilestoneEscrowV2.sol`
V2 interleaves 5 new variables before/among V1's storage layout. Fatal if sharing a proxy.

### H-07: Hardcoded Secrets on Disk (.env / .env.local)

**Files:** `apps/web/.env`, `apps/web/.env.local`
VAPID private key, Resend API key, WalletConnect ID, Alchemy API key, 8004scan API key all hardcoded in plaintext. `NEXT_PUBLIC_*` keys are client-visible.

### H-08: Crypto Polyfill Uses Math.random() + XOR "Hash"

**File:** `apps/web/lib/crypto-polyfill.ts:31-73`
When running over HTTP (not HTTPS), `crypto.randomUUID()` falls back to `Math.random()` and `crypto.subtle.digest` to a trivial XOR operation that is not cryptographically secure.

### H-09: CI Secrets Overexposed to All Jobs

**File:** `.github/workflows/deploy.yml:27-33`, `staging.yml:11-17`
11 deployment secrets declared at workflow-level `env:` block, visible to ALL jobs including `contracts`, `frontend`, `security` — most of which don't need them.

---

## Medium Findings

| # | Finding | File | Category |
|---|---------|------|----------|
| M-01 | `sessionId`/`bidId` swap in `acceptBid()`/`rejectBid()` | `BiddingSystem.sol:347-399` | Parameter Swap |
| M-02 | `token`/`feed` swap in `setPriceFeed()` | `PriceOracleV2.sol:84-89` | Parameter Swap |
| M-03 | Hook failures silently ignored (4 sites) | `AgenticCommerceV9.sol:592-884` | Silent Failure |
| M-04 | `PriceOracle.sol` returns $1 on stale Chainlink data | `PriceOracle.sol:96-99` | Silent Failure |
| M-05 | Stringly-typed provider/skill lookup (case-sensitive) | `AdminRegistry.sol:45-48,250-262` | Stringly-Typed |
| M-06 | `require` string in `_getTokenDecimals()` | `AgenticCommerceV9.sol:1158` | Silent Failure |
| M-07 | Missing fee-on-transfer check in V6 `fund()` | `AgenticCommerceV6.sol:374-376` | Token Integration |
| M-08 | API keys generated with `Math.random()` | `apps/web/lib/api-keys.ts:80-81` | Weak Crypto |
| M-09 | 10+ ID generators use `Math.random()` | Various `lib/db/*.ts` | Weak Crypto |
| M-10 | CSP allows `unsafe-inline`/`unsafe-eval` | `apps/web/next.config.js:76` | Permissive Access |
| M-11 | Debug mode enabled by default | `apps/web/.env.local:63` | Debug Features |
| M-12 | CDP API key sent as empty string when missing | `apps/web/lib/x402/client.ts:111` | Fail-Open |
| M-13 | Subshell injection in `deploy.yml` `prepare` job | `.github/workflows/deploy.yml:49,52` | CI/CD Injection |

---

## Low Findings

| # | Finding | File |
|---|---------|------|
| L-01 | `setAdminRegistry()` accepts EOA (3 contracts) | `ServiceRegistryV2.sol:457`, `BiddingSystem.sol:650`, `AgentReviewV5.sol:609` |
| L-02 | `refundServiceBond()` lacks `nonReentrant` | `ServiceRegistryV2.sol:372` |
| L-03 | `setDefaultSlashPercentage()` does nothing | `AgentReviewV5.sol:622` |
| L-04 | 15-minute min reveal window too tight for mainnet | `BiddingSystem.sol:655` |
| L-05 | 20+ contract addresses hardcoded in frontend config | `apps/web/lib/contracts/config.ts` |
| L-06 | 6+ mainnet RPC URLs use public Alchemy `demo` key | `apps/web/lib/wagmi.ts:27` |
| L-07 | Fake USDC addresses in x402 chain configs | `apps/web/lib/x402/chains.ts:95,119` |
| L-08 | WalletConnect project ID falls back to `'demo'` | `apps/web/lib/wagmi.ts:6` |
| L-09 | Empty VAPID email fallback | `apps/web/app/api/push/send/route.ts:7` |

---

## Cross-Audit Coverage Comparison

| Vulnerability Class | sc-auditor | quillshield | cyfrin-solskill | **Trail of Bits** |
|--------------------|-----------|-------------|-----------------|--------------------|
| Parameter swapping | ❌ | ❌ | ❌ | **✅ 5 findings** |
| Configuration cliffs | ❌ | ❌ | ❌ | **✅ 4 findings** |
| Silent failure/catch | ⚠️ Hooks | ❌ | ❌ | **✅ 4 findings** |
| Stringly-typed security | ❌ | ❌ | ❌ | **✅ 1 finding** |
| CI/CD injection | ❌ | ❌ | ❌ | **✅ 1 finding** |
| Secrets overexposure | ❌ | ⚠️ partial | ❌ | **✅ 3 findings** |
| Crypto polyfill | ❌ | ❌ | ❌ | **✅ 1 finding** |
| Token integration | ✅ | ✅ | ✅ | **✅ 1 finding (V6)** |
| Reentrancy | ✅ | ✅ | ✅ | No new |
| Storage collisions | ✅ | ✅ | ✅ | **✅ 1 new (V1→V2)** |
| Upgradeability | ✅ | ✅ | ✅ | No new |

**ToB uniquely detected 5 vulnerability classes missed by all prior audits.**

---

## Files Generated

| File | Content |
|------|---------|
| `audits/tob-entry-point-analysis.md` | Entry point attack surface mapping |
| `audits/tob-trail-of-bits-report.md` | Comprehensive findings report |
