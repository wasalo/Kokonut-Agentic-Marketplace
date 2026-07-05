# X-Ray Report

> Kokonut Agent Economy | 4,595 active implementation nSLOC / 8,734 source LOC | `cbe5e13` (`develop`) | Foundry + OpenZeppelin v5 | 2026-06-08

---

## 1. Protocol Overview

**What it does:** A multi-sided on-chain marketplace where agents post services, clients fund jobs in escrow, providers deliver work, and disputes are resolved by staking arbiters — with commit-reveal bidding and 3-of-5 multisig slashing as governance primitives.

- **Users**: ERC-8004-registered agents (via Identity NFT at `0x8004A818BFB912233c491871b3d84c89A494BD9e`); clients and providers are both agents acting in different roles. External evaluators (stake 0.01 ETH) verify work. External arbiters (stake 0.01 ETH per token) resolve disputes. 3-of-5 signers slash misbehaving evaluators through SlashManager.
- **Core flow**: Client creates job with USDC/ETH budget → funds escrow → provider submits deliverable hash → evaluator finalizes OR client approves → funds released net of platform fees (1%) and evaluator fees (1% optional). Service listing bonds (0.01 ETH) remain locked while active and are withdrawn only after deactivation + 7-day cooldown. Milestones split the budget into ≤10 stages with arbiter-mediated dispute resolution.
- **Key mechanism**: Per-job escrow with 4-state machine (Open → Funded → Submitted → Completed/Rejected/Expired) + commit-reveal auction (BiddingSystem, Phase 45b/45c/46b) + per-token milestone balance (Phase 34b custody hotfix) + 3-of-5 multisig with 1h timelock and capped partial slashing (Phase 46b) + Chainlink USD pricing for multi-token min/max budgets (Phase 46a rejects invalid oracle prices in max-budget checks).
- **Token model**: USDC (6 decimals, primary), native ETH (18 decimals, Phase 42 service listings + Phase 34 evaluator/arbiter stakes), or any Chainlink-priced ERC-20. No protocol token.
- **Admin model**: Single `Owner` EOA (2-step transfer) for UUPS upgrades on all 8 contracts. `Multisig` 3-of-5 (no Owner) for slashing. `AdminRegistry` owner for blacklist/featured/verification. ServiceRegistryV2 owner for service-level config. No on-chain governance token.

For a visual overview of the protocol's architecture, see the [architecture diagram](x-ray/architecture.svg).

### Contracts in Scope

| Subsystem | Key Contracts | nSLOC | Role |
|-----------|--------------|------:|------|
| **Marketplace Escrow** | AgenticCommerceV9 (current), AgenticCommerceV6 (legacy, bidding-disabled stubs) | 1,452 | Job lifecycle: create, fund, submit, approve, finalize, reject, refund |
| **Bidding Auction** | BiddingSystem | 738 | Commit-reveal bidding with 1% stake, 30-day withdraw timeout, per-token platform fees, creator recovery, no-show-only sweep (Phase 45b/45c/46b) |
| **Commit-Reveal Primitive** | CommitReveal | 144 | Standalone commit-reveal registry; not used by current BiddingSystem (legacy) |
| **Milestone Escrow** | MilestoneEscrowV2 (current), MilestoneEscrow (legacy) | 780 | Per-job milestone balance, arbiter-mediated dispute resolution |
| **Service Registry** | ServiceRegistryV2 | 369 | Service listings with 0.01 ETH bond, 7-day withdrawal cooldown, ERC-8004 identity check |
| **Price Oracle** | PriceOracleV2 (current), PriceOracle (legacy) | 270 | Per-token Chainlink feeds, stablecoin detection, 1h staleness check |
| **Identity & Governance** | AdminRegistry, AgentSkillRegistryV2 | 583 | Blacklist with 1h grace, featured agents, verification configs, skill rules, reputation decay |
| **Multisig Slashing** | SlashManager | 236 | 3-of-5 + 1h timelock, dispatches capped partial `slashByGovernance(evaluator, amount, reason)` to AgenticCommerceV9 |
| **Proxy Wrapper** | AgenticCommerceProxy | 9 | TransparentUpgradeableProxy deployment wrapper (artifact) |
| **Hook Interface** | IACPHook | 14 | ERC-8183-style hook extension (interface only) |

### Backwards-Compatibility Code

- **`AgenticCommerceV6.sol:L604-611`** — Bidding functions `calculateStake`, `commitBid`, `revealBid`, `acceptBid`, `withdrawStake`, `getUserBid` all revert with `"Bidding disabled"`. Retained for storage layout compatibility with V6-era proxy. **Not active** — V9 is the deployed escrow.
- **`AgenticCommerceV6.sol:L273-296`** — `createJobFromService` and `createOpenJob` revert. Replaced in V9 by `createJob` 12-arg signature.
- **`MilestoneEscrow.sol` (entire file, 534 LOC)** — Legacy alongside V2. Uses native ETH only (no per-token config), $1T USDC transfer bug, no per-job balance isolation. V2 fixes these.
- **`PriceOracle.sol` (entire file, 224 LOC)** — Legacy standalone (not UUPS) with hardcoded Sepolia Chainlink addresses. V2 is UUPS with per-token mapping.
- **`CommitReveal.sol` (entire file, 225 LOC)** — Standalone commit-reveal primitive. Not used by current BiddingSystem (which has its own commit-reveal logic). May be a deprecated primitive or for external integrators.

### How It Fits Together

**The core trick:** Escrow holds funds until work is delivered, with a multi-stakeholder state machine (client/provider/evaluator) that any of three roles can resolve — and any misbehavior is slashable through 3-of-5 multisig with a 1-hour timelock.

#### Direct Job Flow (no bidding)

```
Client
  ├─→ AgenticCommerceV9.createJob()        ◄── sets budget, evaluator, hook
  ├─→ AgenticCommerceV9.setProvider()      ◄── optional, if Open
  ├─→ AgenticCommerceV9.fund()             ◄── msg.value (ETH) or safeTransferFrom (USDC)
  │     └─→ IACPHook.beforeAction()       ◄── optional hook, reverts on failure
  ├─→ MilestoneEscrowV2.enableMilestones() (optional)
  │     └─→ Client calls addMilestone() + fundMilestones()
  ├─→ AgenticCommerceV9.submit()          ◄── provider sets deliverable hash
  │     └─→ IACPHook.beforeAction()
  └─→ AgenticCommerceV9.approveByClient()  OR  AgenticCommerceV9.finalizeByEvaluator()
        └─→ _transferPayment() → safeTransfer/transfer
```

#### Bidding Session Flow

```
Provider (creator)
  ├─→ BiddingSystem.createBiddingSession()    ◄── stake, deadline, paymentToken
  │     └─→ Creates session in `Active` phase
Bidder[]
  ├─→ BiddingSystem.commitBid() × N           ◄── 1% stake, hash(PROTOCOL_VERSION, sessionId, msg.sender, amount, message, salt)
  │     └─→ stakeLocked[bidder] += 1% of maxBudget
  ├─→ BiddingSystem.revealBid() × N           ◄── (amount, message, salt) verified against commitHash
  │     └─→ bid.status: Pending → Revealed
Provider
  ├─→ BiddingSystem.acceptBid()               ◄── selects winning bid
  │     └─→ bid.status: Revealed → Accepted, winnerSelectedAt = now
  ├─→ BiddingSystem.createJobAndFund()        ◄── creates job in AgenticCommerceV9
  │     └─→ AgenticCommerceV9.createJobForClient()
  │           ├─→ exact temporary ERC-20 allowance if paymentToken != ETH
  │           ├─→ pendingCreatorRefund[sessionId] += creatorStake
  │           ├─→ ETH excess refunded to payer
  │           └─→ [Direct Job Flow continues...]
  └─→ BiddingSystem.withdrawCreatorStake() OR sweepUnclaimedStakes() ◄── recovery / no-show-only sweep paths
```

#### Dispute & Slashing Flow

```
Client or Provider (milestone dispute)
  ├─→ MilestoneEscrowV2.flagDispute()         ◄── pays fee in paymentToken
  │     └─→ Random arbiter assigned (blockhash-based)
Arbiter
  ├─→ MilestoneEscrowV2.resolveDispute()      ◄── releaseToProvider bool
  │     └─→ _spendMilestoneBalance + _safeTransfer
Multisig 3-of-5 (evaluator slash)
  ├─→ SlashManager.createProposal()           ◄── owner or signer
  ├─→ SlashManager.confirmProposal() × 3      ◄── 3 distinct signers
  │     └─→ executeAfter = now + 1h
  └─→ [1h timelock] → SlashManager.executeSlash()
        └─→ AgenticCommerceV9.slashByGovernance(evaluator, slashAmount, reason)  ◄── capped partial stake deduction
```

---

## 2. Threat & Trust Model

### Protocol Threat Profile

> Protocol classified as: **Marketplace / Escrow** with **Auction (commit-reveal bidding)**, **Staking (evaluator/arbiter)**, and **Governance (multisig slashing)** characteristics.

The dominant signal density is marketplace: `createJob`, `createService`, `fund`, `submit`, `approve`, `claimRefund` — all revolving around holding and releasing escrowed funds against delivered work. The secondary signal is auction: `commitBid`, `revealBid`, `acceptBid`, `withdrawStake`, `withdrawCreatorStake`, `sweepUnclaimedStakes` with the Phase 45c commit-hash binding `keccak256(PROTOCOL_VERSION, sessionId, msg.sender, amount, message, salt)` and the Phase 46b creator recovery/pull-refund semantics. Tertiary signals are staking (evaluator + arbiter pools) and governance (SlashManager 3-of-5 + 1h timelock with partial slash amounts).

### Actors & Adversary Model

| Actor | Trust Level | Capabilities |
|-------|-------------|-------------|
| **Client** | Trusted | Creates jobs, funds escrow, approves/rejects deliverables, claims refunds after expiry. All client-side operations instant (no timelock); client controls its own funds throughout. |
| **Provider** | Trusted | Submits deliverable hashes, calls `completeAfterTimeout` after dispute window. Subject to `slashByGovernance` if `evaluator == provider` (rare, disabled at createJob by `RolesMustBeDistinct`). |
| **Evaluator** | Bounded (must finalize fairly or get slashed) | Verifies submitted work, receives 1% of budget if `evaluatorFee == true`. Not subject to `whenNotPaused`. Stake 0.01 ETH (V9). |
| **Arbiter** | Bounded (must resolve fairly or get slashed via `slashArbiter`) | Resolves milestone disputes. Receives fee on resolution. Stakes per-token (V2). Not subject to `whenNotPaused`. |
| **Bidder** | Bounded (1% stake at risk) | Commits sealed bids, reveals after deadline. 5% slash on creator `slashNoShow` or no-show-only `sweepUnclaimedStakes`; revealed non-winners keep withdrawal semantics. 30-day withdraw timeout (Phase 45c). |
| **Multisig (3-of-5)** | Trusted | Proposes, confirms, executes slash. No timelock on confirm, but 1h `executeAfter` on execute. Slash amount is capped by proposal amount, stake, default basis-point cap, and 100 ETH max. |
| **Owner (UUPS)** | Trusted (single EOA) | Upgrades all 8 UUPS contracts. 2-step transfer via `Ownable2StepUpgradeable`. All operational functions (setters, pause) instant. |
| **IdentityRegistry (ERC-8004)** | External (out of scope) | `ownerOf(agentId)` consulted at `ServiceRegistryV2.createService`. Not subject to Kokonut's pause. |

**Adversary Ranking** (ordered by threat level for this protocol type, adjusted by git evidence):

1. **Compromised Owner (UUPS upgrade power)** — Single EOA, no timelock on upgrades, controls 8 contracts. A compromised key can drain all escrow by upgrading `AgenticCommerceV9` to a malicious implementation. The 2-step transfer helps but is not a substitute for a multisig at the upgrade role. (Mitigated by 2-step + operational discipline; remaining risk is single-key compromise.)
2. **Front-running bidder (commit-reveal race)** — In a competitive bidding session, the first reveal can be observed in the mempool. The Phase 45b `closeBidding` + 5-field commit hash with `PROTOCOL_VERSION=2` mitigates the most common attacks, but reveal-time front-running remains if miners/validators reorder. (Mitigated by 5-field hash binding; remaining risk is validator-level MEV.)
3. **Evaluator/arbiter colluder (dispute manipulation)** — A coalition of N evaluators or arbiters can systematically favor one party. The 3-of-5 multisig can slash colluders; the dispute window is the only delay. (Mitigated by 3-of-5 + 1h timelock; remaining risk is low-collusion cost when N < 3.)
4. **Bidder grief (spam + no-show)** — Spamming low-stake bids to crowd out competition, or accepting then not delivering. Phase 45b `slashNoShow` (5% slash) and Phase 46b no-show-only `sweepUnclaimedStakes` mitigate unrevealed bidders without penalizing revealed non-winners. (Mitigated by `slashNoShow` + sweep; remaining risk is bidder who pays the 5% slash.)
5. **Hook griefing** — A malicious `IACPHook` can revert at any of `fund`, `submit`, `complete`, `completeAfterTimeout` to DOS the job. Hook is set at `createJob` and cannot be changed. (Mitigated by `extcodesize` check; remaining risk is hook contract becoming malicious post-deployment.)
6. **Oracle staleness attacker** — A stale Chainlink feed returns the last good price, which may diverge from spot. The 1h `MAX_STALENESS` is the only protection. (Mitigated by 1h staleness check; remaining risk is rapid price moves within 1h.)
7. **Bad-actor reactivation** — A blacklisted agent re-registers with a new wallet or new identity NFT. Mitigated by `AdminRegistry` checking both `agentId` and `msg.sender` against blacklist, plus a 1h blacklist grace period before enforcement. (Mitigated by dual blacklist; remaining risk is identity NFT churn.)
8. **Service bond griefing** — A provider lists a service, gets a job, deactivates, waits 7 days, withdraws bond — leaving the job half-done. (Mitigated by 7-day cooldown; remaining risk is 7-day job delay for client.)

See [entry-points.md](x-ray/entry-points.md) for the full permissionless entry point map.

### Trust Boundaries

**Owner → UUPS upgrades** — 2-step transfer via `Ownable2StepUpgradeable` but no timelock. Worst instant action: upgrade `AgenticCommerceV9` to drain all escrow. *Git signal: 8 UUPS contracts, all single-Owner; no multisig at the upgrade role.* **Affected**: all 8 UUPS contracts in `contracts/shared/`.

**Multisig → SlashManager.executeSlash** — 1h `executeAfter` between 3rd confirmation and execution. Worst instant action: 3 signers create+confirm+execute a malicious proposal within 1h. Phase 46b caps the forwarded slash amount by proposal amount, current stake, `DEFAULT_SLASH_BP`, and `MAX_SLASH_AMOUNT`; full slashes unregister evaluators, partial slashes keep them registered. *Git signal: 3-of-5 multisig is the only governance layer; no Governor, no Token.* **Affected**: evaluator stake in `AgenticCommerceV9.slashByGovernance`.

**AdminRegistry blacklist → ServiceRegistryV2** — 1h blacklist grace period before blacklist is enforced. Worst instant action: blacklist an agent and wait 1h, then their services are deactivated. *Git signal: 11 access_control commits; blacklist added in Phase 28 (single commit `1093591`).* **Affected**: `ServiceRegistryV2.createService/activateService`.

**IdentityRegistry → ServiceRegistryV2** — External ERC-8004 contract. Worst action: `setAgentWallet` transfers agent ownership to a different EOA. *Git signal: signatures area has 17 commits; `setAgentWallet` is a signed-message flow.* **Affected**: agent identity binding in `ServiceRegistryV2._verifyAgentOwnership`.

**Chainlink → PriceOracleV2** — 1h staleness window. Worst action: front-run a job creation with a stale high price. *Git signal: oracle_price area has 19 commits; mainnet stub `PriceOracle.sol:153` still placeholder.* **Affected**: `getMinBudget` in `AgenticCommerceV9.createJob` and `BiddingSystem.createBiddingSession`.

### Key Attack Surfaces

- **Owner upgrade authority spans 8 UUPS contracts** &nbsp;&#91;[X-2](x-ray/invariants.md#x-2)&#93; — `AgenticCommerceV9.sol:L__authorizeUpgrade` (onlyOwner) is the single point of failure for all upgrades. Worth tracing what storage layout is preserved across versions (verified 9/9 by `scripts/check-storage-layout.js` per AGENTS.md).

- **SlashManager 3-of-5 is the only governance layer** &nbsp;&#91;[I-8](x-ray/invariants.md#i-8), [I-15](x-ray/invariants.md#i-15), [X-6](x-ray/invariants.md#x-6)&#93; — `SlashManager.sol:L_REQUIRED_SIGNATURES` (51). No Governor, no on-chain token vote. Phase 46b changed the downstream ABI to `slashByGovernance(address,uint256,string)`, so auditors should trace the capped partial amount path end-to-end.

- **Commit-reveal salt is client-side** &nbsp;&#91;[G-19](x-ray/invariants.md#g-19)&#93; — `BiddingSystem.sol:L_revealBid` accepts user-supplied `salt`. Worth tracing whether localStorage salt loss (browser cleared) is recoverable via `useBiddingSalt` / `useBidRecovery` (Phase 44a).

- **Evaluator selection uses blockhash** &nbsp;&#91;[X-5](x-ray/invariants.md#x-5)&#93; — `AgenticCommerceV9.sol:L_selectRandomEvaluator` uses `keccak256(blockhash, prevrandao, msg.sender)`. Worth tracing validator MEV — a validator can withhold blocks if the predicted evaluator is unfavorable.

- **Price oracle falls back to $1 for unknown tokens** &nbsp;&#91;[X-4](x-ray/invariants.md#x-4)&#93; — `PriceOracleV2.sol:L149` returns `ONE_USD` for tokens without a registered feed. Worth tracing whether a non-stable token can register, get the $1 fallback, and create a near-zero-budget job.

- **Service bond withdrawal has 7-day cooldown but bond is held in contract** &nbsp;&#91;[I-3](x-ray/invariants.md#i-3), [I-16](x-ray/invariants.md#i-16)&#93; — `ServiceRegistryV2.sol:L_withdrawServiceBond` requires `deactivatedAt + 7 days`. Worth tracing whether `_serviceBonds[serviceId]` can be drained via a 7-day-old deactivation path.

- **`refundServiceBond` and `withdrawServiceBond` are mutually exclusive on `serviceId`** &nbsp;&#91;[I-3](x-ray/invariants.md#i-3)&#93; — `ServiceRegistryV2.sol:L_refundServiceBond` (only AgenticCommerce) zeros the bond; `withdrawServiceBond` also zeros it. Worth tracing whether both can be called on the same service (the contract sets `_serviceBonds[serviceId] = 0` in both, so the second reverts with `No_bond`).

- **Authorized job creator is enumerable** &nbsp;&#91;[G-18](x-ray/invariants.md#g-18)&#93; — `AgenticCommerceV9.sol:L_createJobForClient` (Phase 34b auth patch). Worth tracing whether `setAuthorizedJobCreator(BiddingSystem, true)` is the only authorized creator or if others can be added.

- **`BiddingSystem.createJobAndFund` ERC-20 handoff** &nbsp;&#91;[I-18](x-ray/invariants.md#i-18), [X-7](x-ray/invariants.md#x-7)&#93; — Phase 46a grants AgenticCommerceV9 an exact temporary ERC-20 allowance for the downstream `createJobForClient` transfer and then clears it. Worth tracing allowance cleanup around all reverts and whether the downstream commerce address is the configured authorized job creator.

- **`BiddingSystem` creator stake recovery** &nbsp;&#91;[G-37](x-ray/invariants.md#g-37), [I-18](x-ray/invariants.md#i-18)&#93; — Phase 46b changed job-creation refund from push to pull accounting with `pendingCreatorRefund[sessionId]`, plus a `RECOVERY_WINDOW` for sessions stuck after winner selection. Worth tracing every path that can zero `pendingCreatorRefund` and `winnerSelectedAt`.

- **`sweepUnclaimedStakes` no-show semantics** &nbsp;&#91;[I-19](x-ray/invariants.md#i-19)&#93; — Phase 46b sweep skips revealed bids and only slashes unrevealed no-shows 5%/95%. Worth tracing that revealed non-winners remain withdrawable and are not swept into treasury.

- **`MilestoneEscrowV2.fundMilestones` balance check** &nbsp;&#91;[I-2](x-ray/invariants.md#i-2)&#93; — `MilestoneEscrowV2.sol:L_fund` uses `balanceAfter - balanceBefore` (handles fee-on-transfer). Worth tracing whether reentrancy via the ERC-20 callback can manipulate `balanceAfter` after the safeTransferFrom.

- **V6 legacy is still deployed** &nbsp;&#91;[I-5](x-ray/invariants.md#i-5)&#93; — `AgenticCommerceV6.sol` is alongside V9 in the same proxy lineage. Worth tracing whether V6 bugs were fixed in V9 but remain on V6 deployment.

- **Single-developer, no peer review** &nbsp;&#91;[X-3](x-ray/invariants.md#x-3)&#93; — Source-touching commits are attributed to one author. Worth tracing whether architectural assumptions encoded in V9 (e.g., `slashByGovernance` semantics) have been independently validated.

### Upgrade Architecture Concerns

- **8 UUPS contracts, single Owner key** — `AgenticCommerceV9.sol:L_authorizeUpgrade`, `BiddingSystem.sol`, `MilestoneEscrowV2.sol`, `ServiceRegistryV2.sol`, `AdminRegistry.sol`, `PriceOracleV2.sol`, `AgentSkillRegistryV2.sol`, `SlashManager.sol`. All `_authorizeUpgrade` are `onlyOwner`. A compromised key upgrades all 8 instantly; no multisig at the upgrade role.

- **V6 and V9 are in same proxy lineage** — `AgenticCommerceV6.sol` is the "legacy" implementation. If the deployed proxy is V6, V9 features (12-arg `createJob`, hook integration) are not available. The 4-version V6→V9 migration path is via UUPS upgrade; storage layout 9/9 compatible per AGENTS.md.

- **2-step Owner transfer not enforced on initial deploy** — `Ownable2StepUpgradeable` is used, but if the initial Owner is a single EOA (vs. multisig), the transfer step is the only protection. No on-chain check for `owner() != initial deployer` post-launch.

- **Storage gap reductions are tracked** — `__gap[50] → __gap[49]` (Phase 38, BiddingSystem), `__gap[50] → __gap[47]` → `46` → `42` → `40` across Phases 34b, 45b, 45c, 46b. Phase 46b intentionally consumes gap slots for `winnerSelectedAt` and `pendingCreatorRefund` before existing post-gap variables. All 9/9 storage layouts verified by `scripts/check-storage-layout.js`.

### Protocol-Type Concerns

**As a Marketplace/Escrow:**

- **Per-job balance isolation is the linchpin** — `MilestoneEscrowV2.sol:L_milestoneEscrowBalance` (Phase 34b) prevents fake milestones from draining real funds. `AgenticCommerceV9.sol:L_jobs[jobId].budget` (cleared on Completed) and `_serviceBonds[serviceId]` (cleared on refund/withdraw) follow the same pattern. Worth tracing whether any per-job accumulator is missing the `= 0` reset on terminal state.

- **No partial refund without dispute** — `AgenticCommerceV9.claimRefund` requires `block.timestamp >= expiredAt`. There is no mid-flight partial refund for jobs that have been funded but not submitted; the only path is the dispute (via `MilestoneEscrowV2.flagDispute`) or the timeout (`completeAfterTimeout`).

- **Funds flow has 4 terminal states** — `Completed`, `Rejected`, `Expired`, `Slash` (via `completeAfterTimeout`). All must be reviewed for whether they leave the contract in a zero-balance state. I-1 (conservation) verifies this on-chain.

**As an Auction (BiddingSystem):**

- **5-field commit hash with PROTOCOL_VERSION=2** — `BiddingSystem.sol:L_buildCommitHash` (5 fields, including version). Phase 45b fix invalidates v0/v1 reveals. Worth tracing whether v0/v1 active bids are now stuck (commit successful, reveal impossible).

- **30-day withdraw timeout + no-show-only permissionless sweep** — `BiddingSystem.sol:L_sweepUnclaimedStakes` (Phase 45c O-9, Phase 46b semantics). Worth tracing whether a bidder who lost their salt is correctly treated as an unrevealed no-show, while revealed non-winners are skipped and remain withdrawable.

- **Bid status enum replaces boolean flags** — `BidStatus` (None/Pending/Revealed/Accepted/Rejected/Withdrawn) in `BiddingSystem.sol:L_Bid.status`. Phase 45c fix removes ambiguity of v0/v1 `stakeWithdrawn/rejected` booleans.

**As Staking (evaluator/arbiter):**

- **Native ETH stakes since Phase 34** — `AgenticCommerceV9.sol:L_minEvaluatorStake` (default 0.01 ETH, owner-settable). `MilestoneEscrowV2.sol:L_arbiterStakePerToken[token]` (per-token, owner-settable). Worth tracing whether the stake can be slashed to zero while the evaluator remains registered (I-12 boundary case).

- **Bidding no-show slash vs governance partial slash** — `BiddingSystem.sol:L_NO_SHOW_SLASH_BP = 500` (5% per unrevealed no-show), `SlashManager.sol:L_DEFAULT_SLASH_BP = 5000` (50% default governance cap). The two slash paths have different percentages and target different stake pools; worth tracing whether treasury accounting treats both consistently.

**As Governance (SlashManager):**

- **3-of-5 + 1h timelock is the only governance layer** — No Governor, no Token, no quorum. The 1h timelock is the only delay between confirmation and execution. Phase 46b makes slash execution partial by amount, so auditors should trace both full-slash unregister and partial-slash keep-registered branches.

### Temporal Risk Profile

**Deployment & Initialization:**

- **Initial Owner is single EOA** — All 8 UUPS contracts take `initialOwner` at `initialize()`. Per git analysis, the deployer EOA is the Owner. The 2-step transfer is the only protection; no on-chain check for "is the Owner a multisig?" post-deploy.

- **First-time setup is multi-step and order-sensitive** — `SlashManager.setCommerce()` must point to AgenticCommerceV9; `MilestoneEscrowV2.setAgenticCommerce()` must point to AgenticCommerceV9; `PriceOracleV2.setPriceFeed()` for ETH + USDC. Missed setup step = missing dependency at runtime. No `initialize` validation that all dependencies are set.

- **Per-token platform fee defaults to 0** — `BiddingSystem.sol:L_platformFeeBPByToken` default = 0 (uses global). Worth tracing whether a missed `setPlatformFeeBPForToken(USDC, 100)` leaves USDC jobs at 0% fee (lost revenue, not a security issue).

**Deprecation (V6→V9, V1→V2):**

- **V6 is still deployed alongside V9** — `AgenticCommerceV6.sol` retains 746 LOC. No V6→V9 migration script that force-closes V6 jobs. A user with an open V6 job is on the legacy state machine. Worth tracing whether V6's `refundExpired` works the same as V9's (it does, but the bidding stubs revert).

- **V1 MilestoneEscrow is the legacy alongside V2** — `MilestoneEscrow.sol` (534 LOC) has the $1T USDC transfer bug. V2 fixes the per-job balance isolation. V1 deployed jobs may still be vulnerable.

- **Phase 38 removed AgentReviewV5** — Per AGENTS.md, the Review feature was archived. Worth tracing whether any contract still references the removed `I agentReview` and would break on read (e.g., subgraph mappings, hook calls).

### Composability & Dependency Risks

**Dependency Risk Map:**

> **ERC-8004 IdentityRegistry** — via `ServiceRegistryV2._verifyAgentOwnership:213`
> - Assumes: `ownerOf(agentId)` returns a non-zero address
> - Validates: `owner != address(0)` (revert `Invalid_agent`)
> - Mutability: External ERC-721 contract; not Kokonut's
> - On failure: reverts `Invalid_agent`, no service created

> **Chainlink PriceFeeds (ETH/USD, USDC/USD)** — via `PriceOracleV2._getChainlinkPrice:155-164`
> - Assumes: `latestRoundData` returns non-stale, positive answer
> - Validates: `answeredInRound >= roundId`, `updatedAt > 0`, `block.timestamp - updatedAt <= 1h`, `answer > 0`
> - Mutability: Chainlink-controlled; not Kokonut's
> - On failure: reverts `Stale_round` / `Round_not_complete` / `Stale_price` / `Invalid_price`

> **USDC ERC-20 (Sepolia `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`)** — via all value transfers in `AgenticCommerceV9`, `BiddingSystem`, `MilestoneEscrowV2`
> - Assumes: Standard ERC-20 (revert on failure, exact transfer amount)
> - Validates: `SafeERC20.safeTransfer` / `safeTransferFrom` (handles non-reverting tokens); `balanceAfter - balanceBefore == expected` (handles fee-on-transfer)
> - Mutability: Circle-controlled; not Kokonut's
> - On failure: reverts custom error

> **Native ETH** — via `payable(...).call{value:...}("")` in `AgenticCommerceV9._transferPayment`, `MilestoneEscrowV2._safeTransfer`
> - Assumes: Recipient is a payable address (contract or EOA)
> - Validates: `if (!success) revert Eth_transfer_failed` (V2) / `require(success)` (V1 legacy)
> - Mutability: N/A (native asset)
> - On failure: reverts `Eth_transfer_failed`

> **IACPHook (optional, per-job)** — via `AgenticCommerceV9.sol` `fund/submit/complete/completeAfterTimeout` `IACPHook(hook).beforeAction`
> - Assumes: Hook contract is non-malicious
> - Validates: `extcodesize > 0` at createJob
> - Mutability: Per-job, set at createJob
> - On failure: reverts (CEI pattern keeps state consistent)

**Token Assumptions** *(unvalidated only)*:

- **USDC**: assumes 6 decimals, no rebase, no transfer fee, Circle-controlled blacklisting. Impact: minor (deposit credited in 6-decimal units).
- **Native ETH**: assumes recipient is `payable` (no check in `_transferPayment` for ERC-20 fallback to ETH path). Impact: edge case where a non-payable contract is the recipient — revert at transfer.

**Shared State Exposure** *(if applicable)*:

- **Chainlink ETH/USD + USDC/USD feeds** are shared with the broader Sepolia ecosystem. A misconfiguration by Chainlink affects all consumers simultaneously, but Kokonut's 1h staleness check is the line of defense.
- **ERC-8004 IdentityRegistry** is shared with the agent ecosystem. An identity re-issuance (e.g., after key rotation) affects all consumers; Kokonut caches `ownerOf` only at createService time.

---

## 3. Invariants

> ### 📋 Full invariant map: **[invariants.md](x-ray/invariants.md)**
>
> A dedicated reference file contains the complete invariant analysis — do not look here for the catalog.
>
> - **[38] Enforced Guards** (`G-1` … `G-38`) — per-call preconditions with `Check` / `Location` / `Purpose`
> - **[19] Single-Contract Invariants** (`I-1` … `I-19`) — Conservation (5), Bound (4), StateMachine (5), Ratio (1), Temporal (3), Semantic (1)
> - **[7] Cross-Contract Invariants** (`X-1` … `X-7`) — caller/callee pairs that cross scope boundaries
> - **[4] Economic Invariants** (`E-1` … `E-4`) — higher-order properties deriving from `I-N` + `X-N`
>
> Every inferred block cites a concrete Δ-pair, guard-lift + write-sites, state edge, temporal predicate, or NatSpec quote. The **On-chain=No** blocks (E-4) are the high-signal ones — each is simultaneously an invariant and a potential bug. Attack-surface bullets above cross-link directly into the relevant blocks.

---

## 4. Documentation Quality

| Aspect | Status | Notes |
|--------|--------|-------|
| README | Present | `README.md` covers network config, contract addresses, bidding system protections, key pages, running tests, and Phase 46a/46b remediation semantics. |
| NatSpec | Adequate | All in-scope contracts have `@title`, `@dev`, `@param`, `@return` on most public/external functions. State vars are documented. Some `_internal` helpers lack NatSpec. |
| Spec/Whitepaper | Missing | No design document or whitepaper. AGENTS.md serves as the closest thing to a spec, but is meant for AI agents, not auditors. |
| Inline Comments | Thorough | Audit-trail comments throughout (e.g., `// CEI Fix: Effects before Interactions`, `// I6-04 FIX: O(1) running total`, `// M3 Fix: Token allowlist`). Each fix commit leaves a breadcrumb. |
| ERC-8004 Integration Docs | Present | AGENTS.md "Agent Discovery via TheGraph Subgraph" + "Official ERC-8004 Registries" tables. ServiceRegistryV2 uses `ownerOf` for ERC-721 compatibility. |

> No spec/whitepaper to anchor expected behavior. Auditor must rely on AGENTS.md (designed for AI agents) and inline comments (per-fix breadcrumbs) for intent.

---

## 5. Test Analysis

> ### 📋 Full test analysis: **[test-coverage.md](x-ray/test-coverage.md)**
>
> - 12 test files · 353 test functions · 6,369 test LOC
> - Line coverage: **Unavailable** — forge coverage fails with stack-too-deep; `--ir-minimum` retry fails Yul stack-depth handling
> - Branch coverage: **Unavailable** — same as above
> - Stateful fuzz: 10 Foundry invariant/test functions in `Invariants.t.sol`
> - Stateless fuzz: ~30 (estimated) in `BiddingSystem.t.sol` and `AgenticCommerceV9.t.sol`
> - Formal verification: **None**
>
> Notable gaps: no fork tests, no formal verification, no full scenario integration tests across contract boundaries, V6 legacy untested, `SlashManager` has no dedicated test file, `CommitReveal` may be dead code with only 8 tests.

---

## 6. Developer & Git History

> ### 📋 Full dev history: **[developer-history.md](x-ray/developer-history.md)**
>
> Repo shape: **normal_dev** — 177 total commits, 33 source-touching, 55-day development spread (2026-04-11 → 2026-06-05)
>
> **Headline signals:**
> - **Single developer** — 100% of source-touching commits, no peer review
> - **Fast cycle** — 55-day development spread for a large escrow/auction/governance surface
> - **Late burst** — Phase 45b/45c/45d/45e plus Phase 46a/46b remediation immediately before this rerun
> - **30% fix-without-test rate** — residual-risk signal
> - **5 score-19+ fix commits** — top targets: `cffaf6b`, `71bb8f8`, `24eaf44`, `264290f`, `a40b67f`
> - **5 dangerous-area categories**: access_control (28), state_machines (28), fund_flows (27), oracle_price (19), signatures (17)
> - **1 TODO marker** at `PriceOracle.sol:153` (mainnet stub, NOT Sepolia-deployed path)
> - **No forked dependencies** with pragma/logic changes

---

## X-Ray Verdict

**ADEQUATE** — Single-developer, fast cycle, late burst, and 30% fix-without-test rate elevate review priority for Phase 45b/45c/46a/46b; otherwise solid test density (353/353), clean storage-layout validation, and audit-trail comments.

**Structural facts:**

1. **4,595 active implementation nSLOC across 9 in-scope subsystems** (14 active shared/proxy files; 8,734 total source LOC including interfaces and archived AgentReviewV5) — Marketplace/Escrow + Auction + Staking + Governance hybrid.
2. **8 UUPS contracts, all single-Owner** — no multisig at the upgrade role. 2-step Owner transfer is the only protection against key compromise.
3. **One developer wrote 100% of source changes** — no peer review, no code-review trail beyond 1 merge commit.
4. **353 forge tests across 12 files (6,369 LOC)** — well above the audit-prep baseline. Test *count* is high; *coverage* is unknown (forge coverage still fails on stack depth / Yul stack-too-deep paths).
5. **Late Phase 45/46 remediation burst** — the most security-critical surfaces (BiddingSystem, AgenticCommerceV9, SlashManager, AgentSkillRegistryV2) were modified immediately before this rerun, making them the highest-priority manual review targets.
