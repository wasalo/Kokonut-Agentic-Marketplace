# Developer & Git History

> Repo shape: **normal_dev** — 177 total commits, 33 source-touching, 55-day development spread (2026-04-11 → 2026-06-05)

---

## Contributors

| Author | Commits | Source Lines (+/-) | % of Source Changes |
|--------|--------:|--------------------|--------------------:|
| Wasabi | 177 | source changes attributed to one author | 100.0% |

> Single-developer project. No code review from peers; all architectural decisions and security remediations are one-engineer decisions.

---

## Review & Process Signals

| Signal | Value | Assessment |
|--------|-------|------------|
| Unique contributors | 1 | Single-dev — no peer review of code or tests |
| Merge commits | 1 of 177 (<1%) | Squash-merged development; no merge-conflict resolution as a review signal |
| Repo age | 2026-04-11 → 2026-06-05 | 55 days — unusually fast development cycle for the surface area |
| Recent source activity (30d) | ~20 source-touching commits | **Active** — late burst before audit |
| Test co-change rate | 69.7% | Above average — most source changes also touch tests |
| Fix-without-test rate | 30.0% | Concerning — 30% of fix-style commits don't modify test files (residual risk) |
| Avg commit size | 551.8 lines | Large — high blast radius per commit |

---

## File Hotspots

| File | Modifications | Note |
|------|-------------:|------|
| `contracts/shared/AgenticCommerceV9.sol` | High | Primary escrow, 1494 LOC, all V9 features; Phase 46b partial slash + invalid oracle-price checks |
| `contracts/shared/BiddingSystem.sol` | High | 1105 LOC, every phase upgrade touches this file (45b, 45c, 46a, 46b) |
| `contracts/shared/MilestoneEscrowV2.sol` | High | 745 LOC, per-job balance custody (Phase 34b critical fix) |
| `contracts/shared/AdminRegistry.sol` | High | 599 LOC, blacklist + verification + reputation decay |
| `contracts/shared/ServiceRegistryV2.sol` | High | 558 LOC, bond + identity coupling |
| `contracts/shared/MilestoneEscrow.sol` | Medium | 534 LOC, legacy alongside V2 |
| `contracts/shared/SlashManager.sol` | Medium | 376 LOC, 3-of-5 + 1h timelock; Phase 46b capped partial slash forwarding |
| `contracts/shared/AgenticCommerceV6.sol` | Low | 746 LOC legacy, bidding disabled stubs |
| `contracts/shared/AgentSkillRegistryV2.sol` | Low | 343 LOC, secondary feature; Phase 46a domain hash lookup fix |
| `contracts/shared/PriceOracleV2.sol` | Low | 282 LOC, per-token Chainlink feeds |

> Files marked "High" have been touched in 3+ of the 10 fix-candidate commits; these are the highest-leverage targets for audit.

---

## Security-Relevant Commits

> Score = weighted sum of fix-like signals (commit message, diff shape, file areas touched). 10+ warrants a manual diff; all 5 entries below warrant a manual re-read.

| SHA | Date | Subject | Score | Key Signal |
|-----|------|---------|------:|------------|
| `cffaf6b` | 2026-05-21 | Multi-audit fixes: security, CI, SBOM, deploy gate | 20 | 6-frame audit remediation (Cyfrin, Pashov, QuillShield, SC-Auditor, SCV-Scan, Trail of Bits) |
| `71bb8f8` | 2026-05-01 | Security Audit Remediation: Cross-audit fixes from sc-auditor, Quillshield, Cyfrin, and Trail of Bits | 20 | First major cross-audit fix |
| `24eaf44` | 2026-05-19 | fix(BiddingSystem): resolve critical design flaws and security issues | 19 | Commit-reveal binding, hook validation, sweep |
| `264290f` | 2026-05-25 | Phase 34b: security hardening & storage recovery | 16 | Storage corruption recovery, per-job milestone balance, auth patch |
| `a40b67f` | 2026-04-30 | Phase 29e: Pashov audit fixes + AdminRegistry UUPS migration + full stack parity | 15 | First Pashov audit fixes |
| `ebe8f82` | 2026-04-29 | Phase 29c: V9 Multi-Token Architecture + Dynamic Oracle + Codebase Cleanup | 13 | Multi-token (USDC/ETH) at creation |
| `4368799` | 2026-05-22 | fix(contracts): Phase 32 multi-audit remediation — reentrancy, zero-checks, weak | 12 | Slither-mandated reentrancy, zero-address, weak-PRNG |
| `b13ef85` | 2026-05-24 | Phase 34: Native currency refactor & dashboard UI | 12 | Native ETH for evaluator/arbiter stakes |
| `1093591` | 2026-04-21 | feat(Phase 28): Add Bad Actors Red Team blacklist protection system | 11 | AdminRegistry blacklist + grace period |
| `6d4aa6f` | 2026-05-01 | fix(contracts): remove __UUPSUpgradeable_init() for OZ v5 compatibility | 10 | OZ v5 upgrade pattern fix |

> 10+ fix candidates total. Every major change since Phase 28 is a security fix; the team is operating in continuous-remediation mode. Phase 46a/46b continues that pattern with direct Pashov remediation.

---

## Dangerous Area Evolution

| Security Area | Commits | Key Files |
|--------------|--------:|-----------|
| `access_control` | 28 | AdminRegistry, AgenticCommerceV9, BiddingSystem, MilestoneEscrowV2, ServiceRegistryV2, SlashManager |
| `state_machines` | 28 | (same files as access_control) |
| `fund_flows` | 27 | AgenticCommerceV9, BiddingSystem, MilestoneEscrowV2, ServiceRegistryV2 |
| `oracle_price` | 19 | AgenticCommerceV9, PriceOracleV2, ServiceRegistryV2 |
| `signatures` | 17 | AdminRegistry, AgenticCommerceV9, PriceOracleV2, SlashManager |

> `access_control` and `state_machines` are tied at 28 commits, both touching every major contract. This is consistent with the continuous-remediation pattern: every new feature requires a new role or a new state transition. **Risk: rule-based invariants (I-5, I-6, I-7, I-8, I-9) are the highest-stability targets — they get touched in every upgrade.**

---

## Forked Dependencies

| Library | Path | Upstream | Status | Notes |
|---------|------|----------|--------|-------|
| OpenZeppelin Contracts | `lib/openzeppelin-contracts/contracts/` | OZ v5.x | Submodule (vendored) | Standard library; access control and proxy patterns from upstream. No modifications detected in the `dangerous_area_changes` analysis (all changes attributed to OZ's own certora harnesses / mocks / governor examples). |

> No forked deps with pragma or logic changes from upstream. Standard OZ usage. Auditors can trust OZ's own audit posture for the inherited code.

---

## Technical Debt Markers

| File:Line | Type | Text | Author | Date |
|-----------|------|------|--------|------|
| `contracts/shared/PriceOracle.sol:153` | TODO | `Replace with actual Chainlink feeds for mainnet` | Wasabi 🥥🌴 | 2026-05-02 |

> Only 1 TODO marker in the entire codebase, and it is NOT security-critical — it's a mainnet-only branch (`_getChainlinkPriceForMainnet` returns `ONE_USD` placeholder). The Sepolia path (the live deployment target) has real Chainlink feeds.

> **However, the implication is significant:** Phase 34 introduced native currency pricing via PriceOracle, but the production mainnet path is still a placeholder. A mainnet deployment without first replacing this stub would treat all non-allowlisted tokens as $1.

---

## Security Observations

- **Single-developer risk** — 100% of code authored by one person. No peer review, no security council. All architectural and security decisions are one-engineer calls.

- **No merge commits as review signal** — 1 merge commit in 177 total (<1%). Likely squash-merged feature branches; no PR review trail visible in commit history.

- **55-day development cycle is fast** — Combined with the 27+ commits touching dangerous areas (access_control, state_machines, fund_flows), the team is moving fast on security-critical code.

- **Late burst before audit** — The most recent work includes the Phase 45b/45c/45d/45e series plus Phase 46a/46b remediation, all touching security-sensitive code (BiddingSystem, AgenticCommerceV9, SlashManager, AgentSkillRegistryV2, MilestoneEscrowV2, AdminRegistry). This is the highest-density review period.

- **30% fix-without-test rate** — Per `dev_patterns`, 30% of fix-style commits modify code but not test files. This is a residual-risk signal: a fix to a known bug without an associated regression test may be incomplete or the test may rely on outdated fixtures.

- **2-version legacy drift** — V6 and V9 of AgenticCommerce, V1 and V2 of MilestoneEscrow, V1 and V2 of PriceOracle coexist. The V* predecessors are "deprecated but not deleted." A bug fix in V9 does not retroactively fix V6. If the deployed V6 implementation has the same bug class, it's a hidden risk surface.

- **3 commit messages reference "Pashov"** — `a40b67f` (Phase 29e), `24eaf44` (BiddingSystem design flaws), and likely `71bb8f8` (cross-audit remediation). The current audit is from Pashov (`pashov/solidity-auditor` skill loaded in this session). The team is familiar with Pashov's findings; auditors should verify that prior Pashov findings have not regressed.

- **Test co-change rate is high (69.7%)** — Above the typical baseline. Most source changes also touch tests, which is a positive signal. The 30% that don't is the residual concern. Phase 46a/46b added targeted regression tests for every remediated contract surface.

- **SlashManager is the only multisig** — 3-of-5 + 1h timelock. No additional governance layers (no Governor, no Token, no quorum voting). All slashing authority concentrates here.

- **UUPS upgrade authority is Owner-only** — Every UUPS contract has `_authorizeUpgrade` with `onlyOwner` (single EOA, with `Ownable2Step` for transfer). A compromised Owner key upgrades all 8 UUPS contracts instantly.

- **`/scripts/check-storage-layout.js` validates 9/9 storage layouts** — Per AGENTS.md, all storage upgrades (Phase 34b, 45b, 45c, 46b) preserve the existing layout. Phase 46b consumes BiddingSystem gap slots for `winnerSelectedAt` and `pendingCreatorRefund`; storage compatibility is verified but semantic correctness still depends on tests and manual review.

---

## Cross-Reference Synthesis

- **AgenticCommerceV9 is the highest-leverage file** — 27 of 33 source-touching commits modify it (per `fund_flows` + `access_control` + `state_machines` tracking). It is also the largest active source file (1494 LOC) and the integration point for BiddingSystem, MilestoneEscrowV2, PriceOracle, and SlashManager. The economic invariants (E-1, E-2) and state machine (I-5) concentrate here.

- **BiddingSystem + SlashManager are the contested surfaces** — BiddingSystem handles 1% stakes from bidders in commit-reveal (state machine I-6 plus Phase 46b creator recovery/no-show sweep); SlashManager handles 3-of-5 multisig on evaluator stakes (state machine I-8 plus Phase 46b capped partial slash). Both have been heavily modified and deserve highest-priority manual re-read.

- **MilestoneEscrowV2's $1T USDC fix aligns with I-2** — The Phase 34b fix (`milestoneEscrowBalance[jobId]` per-job balance) directly addresses the cross-contract custody hotfix where fake milestones could drain real funds. Invariant I-2 is the structural manifestation of this fix.

- **30% fix-without-test rate × 5 score-19+ fixes = ~1.5 unverified fixes** — Back-of-envelope: 5 score-19+ fixes × 30% = 1.5 fixes without explicit test updates. These are the highest-leverage targets for "is the fix actually fixed?" verification.

- **Single-developer + fast cycle + late burst = elevated review priority for the Phase 45/46 series** — All three factors amplify: no peer review, fast changes, recent changes. The Phase 45b/45c BiddingSystem upgrades and Phase 46a/46b remediations are the highest-leverage areas for this rerun.

- **V6/V9 coexistence × `fund_flows` 27 commits = hidden V6 surface** — V6 is still deployed. If the same bug class that triggered V9 fixes existed in V6, it remains exploitable on the V6 deployment. V6 has no dedicated test file.
