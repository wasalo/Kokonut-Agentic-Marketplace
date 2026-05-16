# Security

> **Last Updated:** May 16, 2026  
> **Security Score:** 9.0/10 (Smart Contracts) | 8.6/10 (Frontend)

This document covers the security architecture, known issues, and best practices for the Kokonut Agent Economy Stack.

---

## Table of Contents

- [Smart Contract Security](#smart-contract-security)
- [Frontend Security](#frontend-security)
- [Communication Security](#communication-security)
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

**Token Security:**
- Strict token allowlist — only whitelisted tokens accepted
- Exact-amount ERC20 approvals (not unlimited)
- Stablecoin support with explicit marking (USDC/USDT)
- Dynamic ETH minimum via Chainlink price oracle

**Reentrancy Protection:**
All contracts with external calls use `ReentrancyGuardUpgradeable`.

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

### Audit History

| Date | Auditor | Scope | Score |
|------|---------|-------|-------|
| 2026-03-23 | 42 AI Agents + Manual Review | Initial contracts | 9.0/10 |
| 2026-03-30 | Frontend Security Audit | Frontend hardening | 8.6/10 |
| 2026-04-29 | Pashov Audit | Phase 29d fixes | All 12 issues resolved |

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

- 2-second cooldown on all form submissions
- Per-action tracking with automatic cleanup
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

### Dependency Management

- Critical dependencies pinned (viem, wagmi)
- npm audit in CI/CD pipeline (blocks on high severity)
- Dependabot configured for weekly updates
- pnpm lockfile integrity verification

---

## Communication Security

### Webhook System

- HMAC-SHA256 signature verification (`X-Kokonut-Signature`)
- HTTPS-only webhook URLs required
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
- Manage blacklist
- Configure slash manager

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
- `cleanupStaleEvaluators()` — Remove stale evaluators
- `claimRefund(jobId)` — Claim refund for rejected jobs
- `withdrawStake(sessionId)` — Withdraw bidding stake
- `claimStake(sessionId)` — Claim stake from bidding

---

## Known Vulnerabilities & Mitigations

### Smart Contracts

| Vulnerability | Status | Mitigation |
|--------------|--------|------------|
| Weak on-chain randomness | Documented | NatSpec warning; consider Chainlink VRF for production |
| Centralized owner | By design | Multi-sig recommended for mainnet |
| Upgradeable proxy risk | Mitigated | `onlyOwner` upgrade auth, storage layout audits |
| Price oracle manipulation | Mitigated | Chainlink feeds with heartbeat validation |
| Reentrancy | Mitigated | ReentrancyGuard on all external-call functions |
| Front-running | Mitigated | Commit-reveal pattern for bidding |
| DoS via unbounded loops | Mitigated | O(1) patterns, pull pattern, max limits |

### Frontend

| Vulnerability | Status | Mitigation |
|--------------|--------|------------|
| XSS via URIs | Fixed | Strict URI validation with scheme whitelist |
| Error info disclosure | Fixed | Centralized error sanitization |
| Form spam | Fixed | 2-second cooldown on all submissions |
| Dependency vulns | Monitored | npm audit in CI + Dependabot |
| CSP bypass | Fixed | Production enforcement with RPC whitelist |

### Communication

| Vulnerability | Status | Mitigation |
|--------------|--------|------------|
| Webhook replay | Mitigated | HMAC signature verification |
| Push notification spam | Mitigated | VAPID authentication |
| Email phishing | Mitigated | Resend verified domains |

---

## Security Checklist

### Before Deployment

- [ ] Run full test suite (`forge test`)
- [ ] Run fuzzing tests (`forge test --fuzz-runs 10000`)
- [ ] Run invariant tests
- [ ] Run Slither analysis (`slither .`)
- [ ] Run npm audit (`pnpm audit --audit-level=high`)
- [ ] Verify all contract addresses in config
- [ ] Check CSP headers
- [ ] Verify owner address for proxy deployments
- [ ] Test pause/unpause functionality
- [ ] Test upgrade path with new implementation

### Before Mainnet

- [ ] Fix all medium+ severity issues
- [ ] Complete integration testing
- [ ] Final gas optimization review
- [ ] Formal audit by independent auditor
- [ ] Bug bounty program setup
- [ ] Multi-sig wallet for owner functions
- [ ] Timelock for critical operations
- [ ] Monitoring and alerting setup (Tenderly)
- [ ] Incident response plan

### Ongoing

- [ ] Monitor Dependabot PRs
- [ ] Review CI security audit results
- [ ] Track gas usage trends
- [ ] Monitor CSP violation reports
- [ ] Review webhook delivery failures
- [ ] Update blacklist for bad actors
- [ ] Clean up stale evaluators

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
