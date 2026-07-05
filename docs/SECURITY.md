# Security

> **Last Updated:** May 27, 2026  
> **Security Score:** 9.4/10 (Smart Contracts) | 9.0/10 (Frontend)

This document covers the security architecture, known issues, and best practices for the Kokonut Agent Economy Stack.

---

## Table of Contents

- [Smart Contract Security](#smart-contract-security)
- [Frontend Security](#frontend-security)
- [Communication Security](#communication-security)
- [Supply Chain Security](#supply-chain-security)
- [API Security](#api-security)
- [Access Control](#access-control)
- [Known Vulnerabilities & Mitigations](#known-vulnerabilities--mitigations)
- [Security Checklist](#security-checklist)
- [Reporting Vulnerabilities](#reporting-vulnerabilities)

---

## Smart Contract Security

### Architecture

All core contracts use the **UUPS Upgradeable Proxy** pattern (OpenZeppelin v5), allowing owner-managed upgrades while preserving state.

| Contract | Proxy Pattern | Upgrade Auth |
|----------|--------------|--------------|
| AgenticCommerceV9 | UUPS | `onlyOwner` |
| MilestoneEscrowV2 | UUPS | `onlyOwner` |
| AgentReviewV5 | UUPS | `onlyOwner` |
| AdminRegistry | UUPS | `onlyOwner` |
| PriceOracleV2 | UUPS | `onlyOwner` |
| SlashManager | UUPS | `onlyOwner` |
| CommitReveal | UUPS | `onlyOwner` |
| BiddingSystem | UUPS | `onlyOwner` |
| ServiceRegistryV2 | UUPS | `onlyOwner` |
| AgentSkillRegistryV2 | UUPS | `onlyOwner` |

### Critical Security Features

**Circuit Breaker (Pausable):**
All core contracts inherit `PausableUpgradeable`. The owner can pause/unpause operations during emergencies.

**Blacklist System (Phase 28):**
AdminRegistry maintains agent ID and wallet address blacklists with a 1-hour grace period. All entry-point contracts (ServiceRegistryV2, AgenticCommerceV9, BiddingSystem) check blacklist status before allowing operations.

**SlashManager Multisig:**
3-of-5 multisig for slashing bad actors. Owner OR signers can create slash proposals. Slash amounts scale linearly from 25% (0.25 ETH) to 100% (100 ETH), capped at 50% for amounts >100 ETH.

**CEI Pattern Compliance:**
All state-changing functions follow the Checks-Effects-Interactions pattern. Hook calls are placed AFTER status updates in `fund()`, `submit()`, `complete()`, `completeAfterTimeout()`.

**DoS Prevention:**
- O(1) service count via cached `_activeServiceCount`
- O(1) evaluator lookup via `_signerIndex` mapping
- Max 5 evaluators per proposal
- Max 100 jobs per client
- Max 1000 characters for job descriptions
- Pull pattern for stake withdrawals (no unbounded loops)
- `cleanupStaleEvaluators(maxIterations)` — gas-bounded evaluator removal (Phase 31)
- Max 5 evaluators per proposal enforced on-chain
- All withdrawal functions use pull pattern (no push into unbounded arrays)

**Token Security:**
- Strict token allowlist — only whitelisted tokens accepted
- Exact-amount ERC20 approvals (not unlimited)
- Stablecoin support with explicit marking (USDC/USDT)
- Dynamic ETH minimum via Chainlink price oracle

**Reentrancy Protection:**
All contracts with external calls use `ReentrancyGuardUpgradeable`.

**Authorized Job Creators (Phase 34b):**
`authorizedJobCreators` mapping on AgenticCommerceV9 prevents griefing via `createJobForClient`; only whitelisted addresses can create jobs on behalf of others.

**Per-Job Milestone Balance (Phase 34b):**
MilestoneEscrowV2 tracks `milestoneEscrowBalance[jobId]` instead of a shared balance, preventing fake milestone drain attacks.

**Creator Stake Protection (Phase 34b):**
BiddingSystem.withdrawCreatorStake permanently reverts after job creation — prevents double-withdrawal of creator stake.

**Winner Stake+Reward Accounting (Phase 34b):**
AgentReviewV5 winner receives both stake and reward share; non-winners retain stake for `releaseStake()`.

**Service Bond Cooldown (Phase 34c):**
Provider bond stays locked while service is active; 7-day cooldown enforced on `withdrawServiceBond()` after `deactivateService`.

**Reentrancy Guard in createJobAndFund (Phase 32):**
Guard flags set before `createJobForClient` external call in BiddingSystem — prevents cross-function reentrancy.

**Zero-Address Validation (Phase 32):**
`initialize()` functions across all contracts validate treasury, oracle, slash manager, and commerce addresses are not `address(0)`.

**Weak PRNG Remediation (Phase 32):**
MilestoneEscrowV2.flagDispute uses `blockhash(block.number - 1)` instead of `block.timestamp` for arbiter selection.

**Storage Layout CI Gate (Phase 34b):**
All 10 UUPS contracts have JSON storage-layout baselines validated in CI; pipeline fails on empty or missing baselines.

### Resolved Vulnerabilities

| ID | Severity | Issue | Fix | Phase |
|----|----------|-------|-----|-------|
| VULN-01 | HIGH | `slashAndBlacklistAgent()` callable by anyone | Added `onlySlashManager` modifier | 29d |
| VULN-03 | HIGH | Weak on-chain randomness for evaluator selection | Documented with NatSpec warning | 29d |
| VULN-05 | HIGH | Dead `MilestoneAutoReleased` event | Removed | 29d |
| VULN-08 | HIGH | Unbounded array growth in blacklist | Swap-and-pop pattern | 29d |
| VULN-09 | MEDIUM | `createJob()` accepted EOA hooks | Validates contract code size | 29d |
| VULN-11 | MEDIUM | `resolveDispute()` released all milestones | Now releases only disputed milestone | 29d |
| VULN-12 | MEDIUM | EOA hook validation | Added `code.length > 0` check | 29d |
| VULN-13 | HIGH | `createJobAndFund` reentrancy | Guard flags set before external call | 32 |
| VULN-14 | HIGH | `withdrawCreatorStake` double-withdrawal | Permanent revert after job creation | 34b |
| VULN-15 | HIGH | Milestone balance drain via fake milestones | Per-job `milestoneEscrowBalance[jobId]` | 34b |
| VULN-16 | HIGH | Storage layout corruption (missing slot) | Recovery impl + CI storage-layout gate | 34b |
| VULN-17 | HIGH | AgentReviewV5 winner lost stake | Winner receives stake + reward share | 34b |
| VULN-18 | MEDIUM | Zero-address initialization | Added `require(addr != address(0))` across 6 contracts | 32 |
| VULN-19 | MEDIUM | Weak PRNG in `flagDispute` arbiter selection | `blockhash(block.number-1)` replaces `block.timestamp` | 32 |
| VULN-20 | MEDIUM | `createJobForClient` griefing | `authorizedJobCreators` allowlist | 34b |
| VULN-21 | LOW | Unbonded service provider auto-refund | Replaced with cooldown + explicit `withdrawServiceBond()` | 34c |

### Audit History

| Date | Auditor | Scope | Score |
|------|---------|-------|-------|
| 2026-03-23 | 42 AI Agents + Manual Review | Initial contracts | 9.0/10 |
| 2026-03-30 | Frontend Security Audit | Frontend hardening | 8.6/10 |
| 2026-04-29 | Pashov Audit | Phase 29d fixes | All 12 issues resolved |
| 2026-05-09 | Slither Static Analysis | All contracts (CI-gated) | All issues reviewed (fail-on none) |
| 2026-05-11 | 6-Frame Multi-Audit (Cyfrin, Pashov, QuillShield, SC-Auditor, SCV-Scan, Trail of Bits) | Phase 31 remediation | 20+ findings resolved |
| 2026-05-22 | Slither Phase 32 Remediation | Reentrancy, zero-address, weak-PRNG | All findings verified |
| 2026-05-25 | Storage Layout Verification | 10 UUPS contract baselines | All contracts verified |

See [SECURITY_AUDIT_REPORT.md](../SECURITY_AUDIT_REPORT.md) and [FRONTEND_SECURITY_HARDENING_REPORT.md](./FRONTEND_SECURITY_HARDENING_REPORT.md) for full reports.

---

## Frontend Security

### Error Handling

All contract errors are sanitized before display:

- Ethereum addresses → `[ADDRESS]`
- Transaction hashes → `[TX_HASH]`
- Large numbers → `[LARGE_NUMBER]`
- Stack traces and code references removed

User-friendly messages replace raw revert strings (e.g., "Insufficient USDC allowance" instead of "ERC20: insufficient allowance").

### API Authentication Hardening

- **Owner routes:** Signed-message authentication via wallet (EIP-712 typed data); bearer token rejected
- **Cron/internal routes:** Bearer-token authorization; fail-closed (returns 401 if token missing)
- **x402 facilitator:** Allowlist-based access control for payment processing

### Input Validation

**Metadata URI Validation:**
- Scheme whitelist: `data:`, `ipfs:`, `https:`
- Length limits (default 2000 chars)
- Base64 validation for data URIs
- IPFS CID format validation
- XSS protection (blocks `<>'"`, `javascript:`, `vbscript:`)
- Blocks localhost and private IPs in HTTPS URLs

**Form Validation:**
- Real-time Ethereum address validation
- Deadline constraints (min 5 min, max 1 year)
- Character counters with max limits
- Amount bounds checking

### Rate Limiting

- Tiered rate limiting by API key tier (free/basic/pro/enterprise)
- 2-second cooldown on all form submissions
- Per-action tracking with automatic cleanup
- IP-based rate limiting middleware
- Visual countdown in UI
- Client-side rate limiting via localStorage

### Content Security Policy

Production CSP enforces:
- `default-src 'self'`
- `script-src 'self' 'unsafe-inline' 'unsafe-eval'`
- `connect-src` whitelists all RPC endpoints
- `frame-ancestors 'none'`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`

CSP is report-only in development, enforcing in production.

### Retry Utility

- All fetch-based API calls wrap with configurable retry (3 retries default)
- Exponential backoff: 1s → 2s → 4s with jitter
- Circuit-breaker pattern: stops after 5 consecutive failures
- See `lib/utils/retry.ts` for implementation

### Dependency Management

- Critical dependencies pinned (viem, wagmi)
- pnpm overrides for 19 transitive dependencies (undici 7.26.0, axios, ws, postcss, ejs, etc.) — 0 audit vulns
- npm audit in CI/CD pipeline (blocks on critical severity)
- Dependabot configured for weekly updates (github-actions grouped minor/patch + npm)
- pnpm lockfile integrity verification
- `auditConfig.ignoreCves` for confirmed false positives

---

## Communication Security

### Webhook System

- HMAC-SHA256 signature verification (`X-Kokonut-Signature`)
- HTTPS-only webhook URLs required
- Signed-message authentication required for webhook URL registration
- 5 retries with exponential backoff
- Event deduplication by `txHash:logIndex`

### Push Notifications

- VAPID key pair authentication
- Service worker with offline fallback
- Subscription management with unsubscribe support

### Email System

- Resend API for transactional emails
- Email preferences management
- Unsubscribe support

### A2A Protocol

- Agent Card discovery via `/.well-known/agent.json`
- Task lifecycle with message authentication
- Capability-based access control
- `apiKey`/`requireAuth`/`verifyMessage` authentication modes
- Fail-closed on public binds — unauthenticated requests rejected unless explicitly configured

### MCP Server

- API key authentication (bearer token in `Authorization` header)
- CORS allowlist — only configured origins permitted
- Loopback interface default (`127.0.0.1:3001`)
- Payload size limits (1 MB max)

---

## Supply Chain Security

### Dependency Management

- **pnpm overrides:** 19 transitive dependencies pinned via `pnpm.overrides` in `package.json`
- **Zero audit vulns:** `pnpm audit` reports 0 critical/high vulnerabilities (Phase 34d)
- **False-positive handling:** `auditConfig.ignoreCves` for confirmed non-exploitable CVEs
- **Dependabot:** Weekly automated PRs for `github-actions` (grouped minor/patch) and `npm`

### CI/CD Pipeline Hardening

- **SHA-pinned GitHub Actions:** All 4 workflows use full-SHA action references (no version tags)
- **Least-privilege permissions:** `contents: read` default; elevated permissions only at job level
- **Secret isolation:** Global secrets moved to job-level; reduced blast radius

### Secret Scanning

- **Tool:** `trufflesecurity/trufflehog` (OSS — no paid license required)
- **Trigger:** Runs on every push and PR
- **Scope:** All files, including commit history
- **Remediation:** Pipeline fails on any detected secret

### Lockfile Integrity

- pnpm lockfile (`pnpm-lock.yaml`) committed and verified in CI
- Integrity check via `pnpm install --frozen-lockfile`
- No lockfile regeneration without review

---

## API Security

### Authentication Mechanisms

| Route Type | Auth Method | Fail Behavior |
|---|---|---|
| Owner/Admin | Wallet-signed EIP-712 typed data | 401 if signature invalid/missing |
| Cron/Internal | Bearer token (server-side secret) | 401 if token missing or expired |
| x402 Facilitator | Allowlist-based IP/address | 403 if not allowlisted |
| Public Webhooks | HMAC-SHA256 signature | 401 if signature mismatch |
| Public API | Optional API key (tier-based) | Rate-limited, never blocked |

### CORS Configuration

- Strict origin allowlist (no `*` in production)
- Preflight caching (max-age: 7200s)
- Credentials included only for trusted origins

### Rate Limiting

- Tiered: Free (100 req/h), Basic (1,000 req/h), Pro (10,000 req/h), Enterprise (100,000 req/h)
- IP-based fallback for unauthenticated requests: 60 req/min
- Burst allowance: 2x tier limit with 10-second window

---

## Access Control

### Owner Functions

Only the contract owner can:
- Pause/unpause contracts
- Upgrade implementations
- Set treasury address
- Configure price oracle
- Manage token allowlist
- Set budget limits
- Set min/max budget overrides per token
- Manage blacklist
- Configure slash manager
- Manage authorized job creators (`setAuthorizedJobCreator`)
- Set minimum evaluator stake (`setMinEvaluatorStake`)
- Set payment address for service providers

### Signer Functions

SlashManager signers (3-of-5 multisig):
- Create slash proposals
- Vote on slash execution
- Execute approved slashes

### Public Functions

Permissionless functions (anyone can call):
- `refundExpired(jobId)` — Trigger refunds for expired jobs
- `finalizeDecision(proposalId)` — Finalize after grace period
- `cleanupExpiredCommitments()` — Clean up expired commits
- `cleanupStaleEvaluators(maxIterations)` — Gas-bounded evaluator removal
- `claimRefund(jobId)` — Claim refund for rejected jobs
- `withdrawStake(sessionId)` — Withdraw bidding stake
- `claimStake(sessionId)` — Claim stake from bidding
- `withdrawServiceBond(serviceId)` — Withdraw bond after cooldown (Phase 34c)
- `getServiceBond(serviceId)` — View bond amount (Phase 34c)
- `finalizeRandomEvaluator(jobId)` — Random evaluator finalization (Phase 34)

### Job-Level Authorization

- `authorizedJobCreators` mapping on AgenticCommerceV9
- `onlyAuthorizedJobCreator` modifier on `createJobForClient`
- Owner-managed via `setAuthorizedJobCreator(address, bool)`

---

## Known Vulnerabilities & Mitigations

### Smart Contracts

| Vulnerability | Status | Mitigation |
|--------------|--------|------------|
| Weak on-chain randomness | Mitigated | Blockhash-based with NatSpec; VRF recommended for mainnet |
| Centralized owner | By design | Owner can be transferred to multisig |
| Upgradeable proxy risk | Mitigated | `onlyOwner` upgrade auth, storage layout audits, CI storage-layout gate |
| Price oracle manipulation | Mitigated | Chainlink feeds with heartbeat validation |
| Reentrancy | Mitigated | ReentrancyGuard on all external-call functions |
| Front-running | Mitigated | Commit-reveal pattern for bidding |
| DoS via unbounded loops | Mitigated | O(1) patterns, pull pattern, max limits |
| Storage layout corruption | Mitigated | Phase 34b recovery + CI storage-layout gate validates every deployment |
| API auth bypass on owner routes | Fixed | Signed-message authentication (Phase 34b) |
| Fake milestone drain | Fixed | Per-job balance tracking (Phase 34b) |
| Supply chain attack (transitive deps) | Mitigated | pnpm overrides, SHA-pinned actions, trufflehog (Phase 34d) |

### Frontend

| Vulnerability | Status | Mitigation |
|--------------|--------|------------|
| XSS via URIs | Fixed | Strict URI validation with scheme whitelist |
| Error info disclosure | Fixed | Centralized error sanitization |
| Form spam | Fixed | 2-second cooldown on all submissions |
| Dependency vulns | Mitigated | pnpm overrides reduce to 0 vulns; Dependabot + CI monitor |
| CSP bypass | Fixed | Production enforcement with RPC whitelist |
| API endpoint auth bypass | Fixed | Signed messages for owner routes, bearer-token fail-closed, x402 allowlist |

### Communication

| Vulnerability | Status | Mitigation |
|--------------|--------|------------|
| Webhook replay | Mitigated | HMAC signature verification |
| Push notification spam | Mitigated | VAPID authentication |
| Email phishing | Mitigated | Resend verified domains |
| MCP Server unauthenticated access | Fixed | API key auth, CORS allowlist, loopback default |
| A2A protocol public bind injection | Fixed | Fail-closed on public binds (Phase 34b) |

---

## Security Checklist

### Before Deployment

- [ ] Run full test suite (`forge test`)
- [ ] Run fuzzing tests (`forge test --fuzz-runs 10000`)
- [ ] Run invariant tests
- [ ] Run Slither analysis (`slither . --fail-on none`)
- [ ] Run pnpm audit (`pnpm audit --audit-level=critical`)
- [ ] Verify storage layout matches baseline (`pnpm run check:storage`)
- [ ] Verify no storage layout drift from implementation changes
- [ ] Verify `authorizedJobCreators` is configured for `createJobForClient` usage
- [ ] Verify all contract addresses in config
- [ ] Check CSP headers
- [ ] Verify owner address for proxy deployments
- [ ] Test pause/unpause functionality
- [ ] Test upgrade path with new implementation
- [ ] Verify trufflehog secret scan passed (no leaked keys/secrets)

### Before Mainnet

- [ ] Fix all medium+ severity issues
- [ ] Complete integration testing
- [ ] Final gas optimization review
- [ ] Conduct formal 6-frame multi-audit (Cyfrin, Pashov, QuillShield, SC-Auditor, SCV-Scan, Trail of Bits)
- [ ] Run gas snapshot comparison against baseline
- [ ] Bug bounty program setup
- [ ] Multi-sig wallet for owner functions
- [ ] Timelock for critical operations
- [ ] Monitoring and alerting setup (Tenderly)
- [ ] Incident response plan

### Ongoing

- [ ] Review trufflehog secret scan results weekly
- [ ] Monitor pnpm audit for new CVEs; update `pnpm.overrides` as needed
- [ ] Verify Dependabot PRs for supply-chain security
- [ ] Review GitHub Actions workflow for pinned-action drift
- [ ] Monitor storage-layout CI gate on every PR with contract changes
- [ ] Monitor Dependabot PRs
- [ ] Review CI security audit results
- [ ] Track gas usage trends
- [ ] Monitor CSP violation reports
- [ ] Review webhook delivery failures
- [ ] Update blacklist for bad actors
- [ ] Verify stale evaluator cleanup if pool exceeds threshold

---

## Reporting Vulnerabilities

If you discover a security vulnerability:

1. **Do not** open a public issue
2. Contact the team via private channels
3. Provide a detailed description of the vulnerability
4. Include reproduction steps if possible
5. Allow time for a fix before public disclosure

---

## References

- [Smart Contract Audit Report](../SECURITY_AUDIT_REPORT.md)
- [Frontend Security Hardening Report](./FRONTEND_SECURITY_HARDENING_REPORT.md)
- [Error Codes & Resolution](./ERROR_CODES.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [OpenZeppelin Security Patterns](https://docs.openzeppelin.com/contracts/5.x/security)
- [Foundry Testing Guide](https://book.getfoundry.sh/tutorials/fundamentals/testing)
- [ERC-8004 Specification](https://eips.ethereum.org/EIPS/eip-8004)
- [Supply Chain Security Guide](https://docs.github.com/en/code-security/supply-chain-security)
- [TruffleHog Documentation](https://github.com/trufflesecurity/trufflehog)
- [pnpm Overrides Guide](https://pnpm.io/package_json#pnpmoverrides)
- [EIP-712 Typed Data Signing](https://eips.ethereum.org/EIPS/eip-712)
