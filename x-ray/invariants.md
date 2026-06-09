# Invariant Map

> Kokonut Agent Economy | 38 guards | 26 inferred | 1 not enforced on-chain

---

## 1. Enforced Guards (Reference)

Per-call preconditions. Heading IDs below (`G-N`) are anchor targets from x-ray.md attack surfaces.

#### G-1
`provider != address(0)` · `AgenticCommerceV9.sol:L3xx` (createJob variants) · prevents zero-address provider in escrow binding

#### G-2
`evaluator != address(0)` · `AgenticCommerceV9.sol:L3xx` (createJob variants) · prevents zero-address evaluator in escrow binding

#### G-3
`client != provider && client != evaluator && provider != evaluator` · `AgenticCommerceV9.sol:L_RolesMustBeDistinct` · prevents role collision that would break access-control modifiers

#### G-4
`expiredAt > block.timestamp + 5 minutes` · `AgenticCommerceV9.sol:L_MinExpiry` · prevents immediate expiry DOS

#### G-5
`expiredAt < block.timestamp + 365 days` · `AgenticCommerceV9.sol:L_MaxExpiry` · bounds expiry window for refund eligibility

#### G-6
`budget >= getMinBudget(token, decimals)` · `AgenticCommerceV9.sol:L_createJob` (V9 12-arg signature) · prevents dust budget bypassing price-based minimums

#### G-7
`bytes(description).length in (0, 1000]` · `AgenticCommerceV9.sol:L_validateJobCreation` · bounds calldata cost on description

#### G-8
`paymentToken == address(0) || allowedTokens[paymentToken]` · `AgenticCommerceV6.sol:L154-157` · restricts job creation to allowlisted tokens (V6; V9 uses PriceOracle token allowlist)

#### G-9
`msg.sender == jobs[jobId].client` · `AgenticCommerceV9.sol:L_onlyClient modifier` · access control on fund/approve/reject paths

#### G-10
`msg.sender == jobs[jobId].provider` · `AgenticCommerceV9.sol:L_onlyProvider modifier` · access control on submit paths

#### G-11
`msg.sender == jobs[jobId].evaluator` · `AgenticCommerceV9.sol:L_onlyEvaluator modifier` · access control on finalize path

#### G-12
`job.status == Open` · `AgenticCommerceV9.sol:L_setProvider/L_setBudget` · prevents modification of funded/in-flight jobs

#### G-13
`job.status == Funded` · `AgenticCommerceV9.sol:L_submit` · prevents double-submit of same job

#### G-14
`job.status == Submitted` · `AgenticCommerceV9.sol:L_complete/L_reject (after timeout)` · prevents double-finalization

#### G-15
`block.timestamp >= submittedAt + disputeWindow` · `AgenticCommerceV9.sol:L_completeAfterTimeout` · temporal gate preventing premature timeout-finalization

#### G-16
`msg.value >= job.budget` for native · `AgenticCommerceV9.sol:L_fund` · ensures full budget deposited

#### G-17
`block.timestamp >= job.expiredAt` for refund · `AgenticCommerceV9.sol:L_claimRefund/L_refundExpired` · temporal gate on refund eligibility

#### G-18
`msg.sender == authorizedJobCreators[jobId] || msg.sender == jobs[jobId].client` · `AgenticCommerceV9.sol:L_createJobForClient` · prevents griefing via unauthorized job creation on behalf of client

#### G-19
`commitHash == keccak256(abi.encode(PROTOCOL_VERSION, sessionId, msg.sender, amount, message, salt))` · `BiddingSystem.sol:L_revealBid` · prevents cross-bidder hash collision and cross-session replay (PROTOCOL_VERSION=2 invalidates v0/v1)

#### G-20
`block.timestamp < session.deadline` (commit) and `block.timestamp >= session.deadline && block.timestamp < session.revealDeadline` (reveal) · `BiddingSystem.sol:L_commitBid/L_revealBid` · enforces commit-reveal phase ordering

#### G-21
`stake >= minStake && stake <= maxStake` · `BiddingSystem.sol:L_createBiddingSession` · O-4 bound enforcement (Phase 45c)

#### G-22
`evaluatorFee == true ⇒ evaluator != address(0)` · `BiddingSystem.sol:L_createBiddingSession` · prevents fee-enabled session with no evaluator to receive

#### G-23
`hook == address(0) || hook.code.length > 0` · `BiddingSystem.sol:L_createBiddingSession` · assembly extcodesize rejects EOA as hook (O-7)

#### G-24
`evaluatorPool.length > 0` for random selection · `AgenticCommerceV9.sol:L_selectRandomEvaluator` · prevents division by zero + reverts cleanly on empty pool

#### G-25
`msg.value >= ARBITER_STAKE` for V1, `amount >= arbiterStakePerToken[token]` for V2 · `MilestoneEscrow.sol:L_registerAsArbiter / MilestoneEscrowV2.sol:L_registerAsArbiter` · enforces minimum stake at registration

#### G-26
`!activeDisputeIds` contains msg.sender as unresolved · `MilestoneEscrowV2.sol:L_unregisterAsArbiter` · prevents arbiter from abandoning in-flight disputes

#### G-27
`milestoneIndex < jm.milestones.length` · `MilestoneEscrowV2.sol:L_addMilestone/L_submitMilestone/L_releaseMilestone` · bounds check on dynamic array

#### G-28
`currentTotal + amount <= jm.totalBudget` · `MilestoneEscrowV2.sol:L_addMilestone` · I6-04 O(1) running-total check (Phase 34b fix)

#### G-29
`milestoneEscrowBalance[jobId] >= amount` · `MilestoneEscrowV2.sol:L_releaseMilestone/L_resolveDispute` · prevents over-spending per-job balance (Phase 34b critical fix)

#### G-30
`disputes[jobId].flaggedAt == 0` (no existing dispute) · `MilestoneEscrowV2.sol:L_flagDispute` · one-dispute-per-job

#### G-31
`confirmationCount >= 3` and `block.timestamp >= executeAfter` · `SlashManager.sol:L_executeSlash` · 3-of-5 multisig + 1h timelock gate

#### G-32
`!proposal.executed && proposal.confirmations < 3` (for additional confirmations) · `SlashManager.sol:L_confirmProposal` · prevents double-count and post-execution confirmation

#### G-33
`msg.value >= SERVICE_BOND_AMOUNT (0.01 ether)` · `ServiceRegistryV2.sol:L_createService` · enforces listing bond at creation

#### G-34
`block.timestamp >= deactivatedAt[serviceId] + 7 days` · `ServiceRegistryV2.sol:L_withdrawServiceBond` · cooldown gate preventing instant-withdraw of bond

#### G-35
`chainlink.updatedAt > 0 && block.timestamp - updatedAt <= MAX_STALENESS (1h)` · `PriceOracleV2.sol:L__getChainlinkPrice` · prevents stale-price usage

#### G-36
`require(answer > 0)` · `PriceOracleV2.sol:L__getChainlinkPrice` · prevents zero/negative price

#### G-37
`selectedAt > 0 && block.timestamp >= selectedAt + RECOVERY_WINDOW` · `BiddingSystem.sol:L575-L576` · prevents creator stake recovery from a selected winning bid before the 7-day stuck-session recovery window has elapsed

#### G-38
`ethPrice > 0 && tokenPrice > 0` · `AgenticCommerceV9.sol:L230-L234` · prevents invalid oracle prices from passing V9 max-budget checks during token/USD conversion

---

## 2. Inferred Invariants (Single-Contract)

Inferred invariants are derived from structural analysis of the source code.

---

#### I-1

`Conservation` · On-chain: **Yes**

> Sum of all `jobs[jobId].budget` over `status == Funded || Submitted` jobs (ETH) equals the contract's ETH balance minus accumulated platform fees, evaluator fees, slash amounts, and disputed/released milestone amounts.

**Derivation** — Δ-pair: `AgenticCommerceV9.sol` `fund():L_fund` (`+msg.value` to `address(this)`) ↔ `complete()/completeAfterTimeout():L_complete` (`-net - platformFee - slashAmount` to `treasury/provider/evaluator`) ↔ `claimRefund()/refundExpired():L_refund` (`-refundAmount` to `client`).

**If violated** — Insolvency; provider/evaluator/client claim from a contract with insufficient balance.

---

#### I-2

`Conservation` · On-chain: **Yes**

> `milestoneEscrowBalance[jobId]` exactly equals the sum of unreleased milestone amounts for that job.

**Derivation** — Δ-pair: `MilestoneEscrowV2.sol` `fundMilestones():L_fund` (`+= amount`) ↔ `releaseMilestone()/resolveDispute():L_spend` (`-= amount` via `_spendMilestoneBalance`).

**If violated** — Insufficient balance to release a completed milestone; or phantom release without actual token outflow.

---

#### I-3

`Conservation` · On-chain: **Yes**

> `_serviceBonds[serviceId]` exactly equals deposited minus refunded minus withdrawn.

**Derivation** — Δ-pair: `ServiceRegistryV2.sol` `createService():L270` (`+= msg.value`) ↔ `refundServiceBond():L394` (`= 0` on refund) ↔ `withdrawServiceBond():L413` (`= 0` on withdraw).

**If violated** — Phantom bond withdrawal; or bond double-refund (refundServiceBond + withdrawServiceBond on same serviceId).

---

#### I-4

`Conservation` · On-chain: **Yes**

> `accumulatedFeesByToken[token]` equals sum of platform fees collected for that token across all BiddingSystem-created jobs.

**Derivation** — Δ-pair: `BiddingSystem.sol` `createJobAndFund():L_createJobAndFund` (`+= platformFee`) ↔ `withdrawFees(token):L_withdrawFees` (`= 0` on withdrawal). *Phase 45b addition; Phase 46b keeps creator stake refund separate in `pendingCreatorRefund`.*

**If violated** — Treasury under-claims or over-claims accumulated fees.

---

#### I-5

`StateMachine` · On-chain: **Yes**

> A `jobs[jobId].status` transitions through at most Open → Funded → Submitted → {Completed, Rejected, Expired}. No back-edges, no skipping Open.

**Derivation** — edge: State@L_createJob (Open) → State@L_fund (Funded) → State@L_submit (Submitted) → State@L_complete/L_finalize/L_approveByClient (Completed) | State@L_reject (Rejected) | State@L_refundExpired (Expired). Each transition guarded by `status == previous` (G-12, G-13, G-14).

**If violated** — Double-payment (Completed + Refunded); or stuck state (Submitted but never resolvable).

---

#### I-6

`StateMachine` · On-chain: **Yes**

> A `Bid` transitions through at most None → Pending → Revealed → {Accepted, Rejected, Withdrawn}; unrevealed no-show bids can move Pending → Withdrawn through slash paths. The `BidStatus` enum (Phase 45c) replaces v0/v1 boolean flags.

**Derivation** — edge: `BiddingSystem.sol` `commitBid():L_commit` (None → Pending) → `revealBid():L_reveal` (Pending → Revealed) → `acceptBid():L_accept` (Revealed → Accepted) | `rejectBid():L_reject` (Revealed → Rejected) | `withdrawStake()/slashNoShow()/sweepUnclaimedStakes():L_withdraw` (Revealed/Pending → Withdrawn). Each transition is one-shot.

**If violated** — Bid retargeting after acceptance; or accepting an already-withdrawn bid.

---

#### I-7

`StateMachine` · On-chain: **Yes**

> A `Milestone` transitions through `{incomplete, completed, released}`. Released is terminal.

**Derivation** — edge: `MilestoneEscrowV2.sol` `submitMilestone():L_submit` (incomplete → completed) → `releaseMilestone():L_release` (completed → released). No reverse path; `released == true` is the terminal latch.

**If violated** — Double-release of a single milestone amount (since milestoneEscrowBalance is spent at release).

---

#### I-8

`StateMachine` · On-chain: **Yes**

> A `SlashProposal` transitions through `{created, confirmed, executable, executed}`. Executed is terminal.

**Derivation** — edge: `SlashManager.sol` `createProposal():L_create` (created) → `confirmProposal():L_confirm` (3+ confirmations → executable + `executeAfter = now + 1h`) → `executeSlash():L_execute` (executable → executed). No path back from `executed == true`.

**If violated** — Same evaluator slashed twice for the same targetProposalId.

---

#### I-9

`StateMachine` · On-chain: **Yes**

> A `Service` is either `isActive == true` (listed) or `isActive == false` (deactivated). `_activeServiceCount` exactly equals the number of `isActive == true` services.

**Derivation** — edge: `ServiceRegistryV2.sol` `createService():L276` (++_activeServiceCount), `deactivateService():L318` (--_activeServiceCount), `activateService():L340` (++_activeServiceCount), `deactivateAgentServices():L375` (--_activeServiceCount per affected service).

**If violated** — `getActiveServiceCount()` returns wrong value; UI displays ghost services or hides live ones.

---

#### I-10

`Bound` · On-chain: **Yes**

> `bid.stake ∈ [minStake, maxStake]` for every bid in every session.

**Derivation** — guard-lift: `BiddingSystem.sol` `createBiddingSession():L_stakeBounds` (`require(stake >= minStake && stake <= maxStake)`) + commit-time stake deduction. Only writer of `bid.stake` is `commitBid`; writer is gated by the same bound via `_calculateStake(bidAmount)`.

**If violated** — Stakes below minStake (spam with dust) or above maxStake (griefing with overcommit).

---

#### I-11

`Bound` · On-chain: **Yes**

> `jobs[jobId].budget <= maxBudgetUsd` (V9) and `>= getMinBudget(token, decimals)`.

**Derivation** — guard-lift: `AgenticCommerceV9.sol` `createJob():L_budget` (`require(budget >= minBudget && budget <= maxBudget)`) + `setBudget():L_setBudget` (same). Only writers of `job.budget` are `createJob` and `setBudget`; both enforce the bound.

**If violated** — Dust budgets or unbounded budgets bypassing price-based safety rails.

---

#### I-12

`Bound` · On-chain: **Yes**

> `arbiterStakes[arbiter] >= arbiterStakePerToken[token]` while `isRegisteredArbiter[arbiter] == true`.

**Derivation** — guard-lift: `MilestoneEscrowV2.sol` `registerAsArbiter():L_register` (`amount >= requiredStake`) + `slashArbiter():L_slash` (reduces stake by SLASH_PERCENT but does not unregister if > 0). Boundary: stake can fall below required after slash, but registration persists; ariter is still active.

**If violated** — A registered arbiter with stake < required; potential under-collateralized dispute resolution.

---

#### I-13

`Bound` · On-chain: **Yes**

> `proposal.amount <= MAX_SLASH_AMOUNT (100 ether)` for every SlashProposal.

**Derivation** — guard-lift: `SlashManager.sol` `createProposal():L_amount` (`require(amount <= MAX_SLASH_AMOUNT)`). Only writer of `proposal.amount` is `createProposal`.

**If violated** — Single proposal can slash 100+ ETH, exceeding practical limits.

---

#### I-14

`Temporal` · On-chain: **Yes**

> A bid can be accepted only after `block.timestamp < session.revealDeadline`. After that, `withdrawStake()` is the only path for non-winners; `sweepUnclaimedStakes()` becomes available 30 days after session deadline.

**Derivation** — temporal: `BiddingSystem.sol` `acceptBid():L_accept` (`require(block.timestamp < session.revealDeadline)`) + `withdrawStakeClaimableAt[sessionId][bidder] = now + 30 days` stamped at session-end events (O-9).

**If violated** — Post-deadline acceptance of stale bid; or premature sweep of unclaimed stakes.

---

#### I-15

`Temporal` · On-chain: **Yes**

> A slash can be executed only after `block.timestamp >= proposal.executeAfter` (created at 3rd confirmation + 1h).

**Derivation** — temporal: `SlashManager.sol` `executeSlash():L_execute` (`require(block.timestamp >= proposal.executeAfter)`).

**If violated** — Immediate slashing bypasses timelock; emergency exit for affected evaluator is removed.

---

#### I-16

`Temporal` · On-chain: **Yes**

> A service bond can be withdrawn only after `block.timestamp >= deactivatedAt[serviceId] + 7 days`.

**Derivation** — temporal: `ServiceRegistryV2.sol` `withdrawServiceBond():L_withdraw` (`require(block.timestamp >= deactivatedAt[serviceId] + 7 days)`).

**If violated** — Instant bond withdrawal defeats the deactivation period that prevents service abuse.

---

#### I-17

`Ratio` · On-chain: **Yes**

> `platformFee = (amount * platformFeeBP) / 10000` and `net = amount - platformFee - slashAmount - evaluatorFee` for every payment.

**Derivation** — `AgenticCommerceV9.sol` `complete():L_fee` + `completeAfterTimeout():L_fee` + `BiddingSystem.sol` `createJobAndFund():L_fee` (Phase 45b per-token). The ratio is computed in the same function that transfers the funds, so any deviation reverts.

**If violated** — Over- or under-charging platform fees; mismatch between emitted events and actual transfers.

---

#### I-18

`Conservation` · On-chain: **Yes**

> For every BiddingSystem session, creator stake is either locked, pending as `pendingCreatorRefund[sessionId]`, returned through `withdrawCreatorStake`, or recoverable only after `winnerSelectedAt + RECOVERY_WINDOW` if job creation remains stuck.

**Derivation** — Δ-pair: `BiddingSystem.sol` `createBiddingSession():L_create` (creator stake deposited) ↔ `createJobAndFund():L772-L773` (`pendingCreatorRefund += creatorStake`) ↔ `withdrawCreatorStake():L565-L585` (pending refund withdrawal or stuck-session recovery). Phase 46b moved creator refund to pull accounting to avoid smart-contract creator DoS.

**If violated** — Creator stake double-withdrawal, permanent creator-stake lock, or premature clawback before the selected winner has a fair job-creation window.

---

#### I-19

`Semantic` · On-chain: **Yes**

> `sweepUnclaimedStakes(sessionId)` slashes only unrevealed no-show bids; revealed bids are skipped and remain withdrawable by the bidder.

**Derivation** — semantic branch: `BiddingSystem.sol` `sweepUnclaimedStakes():L598-L626` checks claimable stake, skips revealed bids, computes `slashAmount = amount * NO_SHOW_SLASH_BP / FEE_DENOMINATOR`, sends 5% to treasury and 95% to bidder, and marks only swept no-shows Withdrawn.

**If violated** — Revealed non-winning bidders lose stake despite satisfying reveal obligations; or no-show bidders avoid the intended 5% slash.

---

## 3. Inferred Invariants (Cross-Contract)

Trust assumptions that span contract boundaries.

---

#### X-1

On-chain: **Yes**

> `MilestoneEscrowV2` assumes `AgenticCommerceV9.jobs(jobId)` returns the matching `(client, provider, paymentToken, budget)` for any `jobId` it validates.

**Caller side** — `MilestoneEscrowV2.sol:L__validateLinkedJob` (L198-226) — checks `id == jobId`, `jobClient == client`, `jobProvider == provider`, `jobPaymentToken == paymentToken`, `jobBudget == totalBudget`.

**Callee side** — `AgenticCommerceV9.sol` `jobs(uint256)` auto-generated getter returns the `Job` struct.

**If violated** — Phantom milestones attached to nonexistent or differently-configured jobs; over-release of funds.

---

#### X-2

On-chain: **Yes**

> `AgenticCommerceV9` assumes `SlashManager.commerce` is its own address (the slash caller).

**Caller side** — `AgenticCommerceV9.sol:L_slashByGovernance` — only the address in `adminRegistry.slashManager()` can call.

**Callee side** — `SlashManager.sol` `setCommerce():L_setCommerce` (L157-161) — owner-only setter; but the address is not validated to equal AgenticCommerceV9.

**If violated** — Owner of SlashManager sets `commerce` to a non-Commerce address, locking out future slashing; or to a malicious contract that calls `slashByGovernance` with crafted partial-slash args.

---

#### X-3

On-chain: **Yes**

> `ServiceRegistryV2` assumes `identityRegistry.ownerOf(agentId)` returns the actual owner of the agent NFT.

**Caller side** — `ServiceRegistryV2.sol:L__verifyAgentOwnership` (L211-216) — uses `ownerOf` for ERC-721 compatibility.

**Callee side** — External `IIdentityRegistry` (ERC-8004) deployed at `0x8004A818BFB912233c491871b3d84c89A494BD9e`. Out of scope.

**If violated** — Anyone could list services under any agentId; the `isActive` check on `getAgent` (V1) was replaced with `ownerOf` (V2) for ERC-721 compatibility, losing the active-status check.

---

#### X-4

On-chain: **Yes**

> `AgenticCommerceV9.getMinBudget(token, decimals)` assumes `PriceOracleV2.getUsdPriceOfToken(token)` returns a non-stale, positive price.

**Caller side** — `AgenticCommerceV9.sol:L_getMinBudget` — uses oracle output to convert USD bounds to token units.

**Callee side** — `PriceOracleV2.sol:L__getChainlinkPrice` — validates staleness (G-35) and positivity (G-36), but falls back to `ONE_USD` ($1) for unknown tokens (L149).

**If violated** — Stablecoin detection bypass: a non-stable token registered without a feed returns $1, allowing a job with budget equivalent to 1 USDC even if the token trades at $0.01. Combined with G-11, this could create a near-zero-budget job.

---

#### X-5

On-chain: **Yes**

> `AgenticCommerceV9._selectRandomEvaluator` assumes the `blockhash(block.number - 1)` and `block.prevrandao` are unbiased predictors.

**Caller side** — `AgenticCommerceV9.sol:L_selectRandomEvaluator` (L674-682 in V6; L_selectRandomEvaluator in V9) — uses `keccak256(blockhash, prevrandao, msg.sender)` for random index.

**Callee side** — EVM. Miners/validators can choose to withhold blocks if the random outcome is unfavorable; the `block.number - 1` lag gives the most-recent block's hash, but it's known at the time of the call.

**If violated** — Evaluator MEV: a validator can predict the selected evaluator and front-run with a low-stake registration or stake withdrawal to influence the outcome (Phase 31 H-02 fix made randomness blockhash-based, not timestamp-based).

---

#### X-6

On-chain: **Yes**

> `SlashManager.executeSlash` and `AgenticCommerceV9.slashByGovernance` must agree on the Phase 46b 3-argument ABI: `(address evaluator, uint256 slashAmount, string reason)`.

**Caller side** — `SlashManager.sol:L245-L261` caps `slashAmount` by proposal amount, current stake, `DEFAULT_SLASH_BP`, and `MAX_SLASH_AMOUNT`, then calls `slashByGovernance(evaluator, slashAmount, reason)`.

**Callee side** — `AgenticCommerceV9.sol:L1168-L1196` validates caller via `onlySlashManager`, rejects zero/over-stake amounts, deducts exactly `slashAmount`, unregisters only if remaining stake is zero, and sends the slash to treasury.

**If violated** — Slash execution reverts due ABI mismatch, over-slashes relative to proposal/stake, or unregisters evaluators after a partial slash.

---

#### X-7

On-chain: **Yes**

> `BiddingSystem.createJobAndFund` must fund AgenticCommerceV9 with the selected bid amount while leaving only the intended platform fee and pending creator refund in BiddingSystem.

**Caller side** — `BiddingSystem.sol:L679-L774` receives ETH/ERC-20 payment, gives AgenticCommerceV9 an exact temporary ERC-20 allowance for ERC-20 sessions, calls `createJobForClient`, accumulates platform fees, records `pendingCreatorRefund`, and refunds native ETH excess.

**Callee side** — `AgenticCommerceV9.createJobForClient` requires the BiddingSystem authorization and pulls ERC-20 funding from the caller for ERC-20 paths; native paths receive `msg.value`.

**If violated** — ERC-20 job creation fails despite bidder payment, allowance remains after job creation, or BiddingSystem becomes insolvent against pending creator refunds / accumulated fees.

---

## 4. Economic Invariants

Higher-order properties derived from combinations of §2 and §3 invariants.

---

#### E-1

On-chain: **Yes**

> For every job, `treasury + provider + evaluator + slashed + client_refund == original_deposit`.

**Follows from** — `I-1` + `I-17` + the explicit `completeAfterTimeout` slash flow.

**If violated** — Insolvency on at least one job.

---

#### E-2

On-chain: **Yes**

> The protocol's solvency equals: `Σ jobs.budget (Funded/Submitted) + Σ milestoneEscrowBalance[jobId] + Σ serviceBonds + Σ accumulatedFeesByToken + Σ pendingCreatorRefund + Σ arbiterStakes == contract balance`.

**Follows from** — `I-1` + `I-2` + `I-3` + `I-4` + `I-12` + `I-18`.

**If violated** — Insolvency at the protocol level; some user class cannot withdraw.

---

#### E-3

On-chain: **Yes**

> A 3-of-5 multisig compromise cannot move funds directly, but can: (a) slash any evaluator's stake (up to 100 ETH), (b) upgrade all 8 UUPS contracts (via 2-step Owner transfer to a compromised address).

**Follows from** — `I-8` + `I-13` + `I-15` + the Owner role's UUPS upgrade authority.

**If violated** — The timelock + multisig design is intact; the 2-step Owner transfer is the long-tail risk.

---

#### E-4

On-chain: **No**

> The protocol's flash-loan resistance assumes no on-chain asset can be flash-loaned that grants meaningful governance power. ERC-8004 agent NFTs cannot be flash-loaned in standard ERC-721 implementations, so `service.bond + identity` is safe; but if an integration ever uses a flash-loan-compatible proxy, the assumption breaks.

**Follows from** — `X-3` + the absence of any flash-loan-checked function across all in-scope contracts.

**If violated** — A flash-loaned agent NFT could list/bid/claim in a single transaction.

---
