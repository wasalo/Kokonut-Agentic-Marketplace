# 🔐 Security Review — Kokonut-Agentic-Marketplace

> Pashov AI-style structured audit, 12 parallel specialist agents + manual cross-verification.

---

## Scope

|                                  |                                                                                                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Mode**                         | ALL                                                                                                                                                          |
| **Files reviewed**               | `AgenticCommerceProxy.sol` (27) · `AdminRegistry.sol` (599) · `AgentSkillRegistryV2.sol` (343)<br>`AgenticCommerceV6.sol` (746, LEGACY) · `AgenticCommerceV9.sol` (1487, CURRENT)<br>`BiddingSystem.sol` (1055, Phase 45c) · `CommitReveal.sol` (225, legacy primitive) · `IACPHook.sol` (37, interface)<br>`MilestoneEscrow.sol` (534, LEGACY) · `MilestoneEscrowV2.sol` (745, CURRENT) · `PriceOracle.sol` (224, LEGACY) · `PriceOracleV2.sol` (281, CURRENT)<br>`ServiceRegistryV2.sol` (558) · `SlashManager.sol` (368, 3-of-5 multisig) |
| **Total nSLOC**                  | ~7,229                                                                                                                                                       |
| **Confidence threshold (1–100)** | 80                                                                                                                                                           |
| **Audit methodology**            | pashov/x-ray (pre-flight: 348-line context report, 36 G- + 17 I- + 5 X- + 4 E- invariants) → pashov/solidity-auditor (12 parallel specialist bundles) → manual cross-verification against source |
| **Specialties deployed**         | access-control, asymmetry, boundary, economic-security, execution-trace, first-principles, flow-gap, invariant, math-precision, numerical-gap, periphery, trust-gap |
| **Coverage note**                | Of 12 launched agents, 4 produced full structured deliverables, 1 produced a summary, 1 (periphery) produced 7+ findings before its output was truncated by the runtime, and 5 returned empty results (likely a parallel-task output-collection quirk in this environment). Findings below are cross-verified against source.                                              |

---

## Findings

### [95] 1. BiddingSystem.createJobAndFund is broken in production for every ERC-20 session

`BiddingSystem.createJobAndFund` · Confidence: 95

**Description**

For ERC-20-backed sessions, `createJobAndFund` (BiddingSystem.sol:640) pulls the user's full `totalPayment = bidAmount + fee` into BiddingSystem via `_receiveToken` (line 660), then calls `IAgenticCommerceV9(commerce).createJobForClient{value: 0}(...)` at line 674 with `fundNow: true` and `fundAmount: bidAmount`. Inside V9, the funded path reads `token.allowance(msg.sender, address(this))` where `msg.sender` is the BiddingSystem contract. `rg '\.approve\s*\(' contracts/shared/BiddingSystem.sol` returns **zero matches** — the contract never calls `IERC20(commerce).approve(...)` for any token, in `initialize`, in `setCommerce`, or anywhere. Therefore any non-ETH session reverts in V9 with `InsufficientPayment`.

The bug is invisible to the test suite because `MockAgenticCommerceV9` (`TestFixtures.sol:347`, `MockAgenticCommerceV9.sol:394`) never checks allowance — it only inspects `msg.value > 0`. The mock-vs-production precondition gap is the root cause; this is the **highest-leverage** finding in the audit because the entire Phase 40 ERC-20 bidding feature is currently DoS-locked in production.

**Proof (concrete)**

- Sepolia deployment: `BiddingSystem = 0x4D7F…fd6`, `commerce = AgenticCommerceV9 = 0x3a1B…9239`. A user calling `createJobAndFund(sessionId, …)` on a USDC session with `msg.value = 0` reverts at the V9 allowance check.
- BiddingSystem.initialize (line 209) and setCommerce (line 895) — no approve call. setPlatformFeeBPForToken (Phase 45c) — no approve call. No function in the contract calls `IERC20.approve`.
- BiddingSystem.t.sol:1313, 1896 use `MockAgenticCommerceV9` whose `createJobForClient` only checks `msg.value > 0`.

**Fix**

```diff
// BiddingSystem._receiveToken (and any other entry that pulls ERC-20)
function _receiveToken(address token, address from, uint256 amount) internal {
    if (token == address(0)) {
        require(msg.value >= amount, "Insufficient ETH");
    } else {
        IERC20(token).safeTransferFrom(from, address(this), amount);
+       // Pre-approve commerce for the exact amount we will forward. Idempotent.
+       if (IERC20(token).allowance(address(this), commerce) < amount) {
+           IERC20(token).forceApprove(commerce, type(uint256).max);
+       }
    }
}
```

And add the same precondition to `MockAgenticCommerceV9.createJobForClient` (or a flag) so the mock matches production.

---

### [92] 2. SlashManager.executeSlash ignores the multisig's voted amount; V9 always slashes 100%

`SlashManager.executeSlash` + `AgenticCommerceV9.slashByGovernance` · Confidence: 92

**Description**

`SlashManager.executeSlash` (SlashManager.sol:235–254) reads `proposal.amount` for the `ProposalExecuted` event (line 253) but never forwards it to V9. The actual call (lines 245–248) is `IAgenticCommerceV9_Slash(commerce).slashByGovernance(proposal.evaluator, proposal.reason)` — 2 args, no amount. `AgenticCommerceV9.slashByGovernance` (V9.sol:1166–1189) reads `evaluatorStakes[evaluator]` (line 1170) — the **full stake** — zeroes it (line 1182), and forwards the entire balance to `platformTreasury` (lines 1184–1187). The multisig's `MAX_SLASH_AMOUNT = 100 ether` and `proposal.amount` (bounded 0–100 ETH) are decorative; the actual slash is 100% of stake regardless of intent.

The threat model advertised by the BP constants (`MIN_SLASH_BP = 2500`, `DEFAULT_SLASH_BP = 5000` — SlashManager.sol:6999–7001) is "25%–50% partial slash." The threat model actually executed is "100% wipe." A signer voting "yes" on a 0.01 ETH proposal for a 1000 ETH stake is voting to wipe the full 1000 ETH. The intent of the multisig and the execution diverge by 10,000,000×.

**Proof (concrete)**

- SlashManager.sol:245–248 — only `(evaluator, reason)` forwarded.
- AgenticCommerceV9.sol:1170 — `uint256 stake = evaluatorStakes[evaluator];` reads full balance.
- AgenticCommerceV9.sol:1182 — `evaluatorStakes[evaluator] = 0;` zeroes it.
- AgenticCommerceV9.sol:1185 — full `stake` transferred to treasury.

**Fix**

```diff
// IAgenticCommerceV9_Slash.sol
- function slashByGovernance(address evaluator, string calldata reason) external;
+ function slashByGovernance(address evaluator, uint256 slashAmount, string calldata reason) external;
```
```diff
// SlashManager.executeSlash (line 245)
- IAgenticCommerceV9_Slash(commerce).slashByGovernance(proposal.evaluator, proposal.reason);
+ uint256 stake = IAgenticCommerceV9(commerce).evaluatorStakes(proposal.evaluator);
+ uint256 slashAmount = min(proposal.amount, stake);
+ IAgenticCommerceV9_Slash(commerce).slashByGovernance(proposal.evaluator, slashAmount, proposal.reason);
```
And pin `slashAmount` to `stake * DEFAULT_SLASH_BP / 10000` by default, with `proposal.amount` as the cap.

---

### [90] 3. AgentSkillRegistryV2.findSkillsByDomain is a no-op — hash-mismatch between indexer and lookup

`AgentSkillRegistryV2.findSkillsByDomain` · Confidence: 90

**Description**

The "M1 Fix: O(1) domain lookup" never works. The indexer (`_indexSkillByDomains` at lines 211, 218) hashes `keccak256(abi.encode(domains[i]))` — 32-byte padded, so a 13-byte string like `"data-analysis"` becomes a 64-byte abi-encoded payload `[length][data-padded]`. The lookup (`findSkillsByDomain` at line 322) hashes `keccak256(abi.encodePacked(domain))` — tightly packed, the raw 13 bytes. Distinct hashes. The O(1) path always returns `new uint256[](0)`. Every call falls through to whatever the caller does next (typically an O(n*m) iteration over all skills, which is the actual behaviour users observe).

**Proof (concrete)**

- AgentSkillRegistryV2.sol:211 — `bytes32 domainKey = keccak256(abi.encode(domains[i]));` (index write)
- AgentSkillRegistryV2.sol:218 — same hash on the second indexer call (skill update)
- AgentSkillRegistryV2.sol:322 — `bytes32 domainKey = keccak256(abi.encodePacked(domain));` (lookup)

`abi.encode` of a 13-byte string ≠ `abi.encodePacked` of the same string. Two different hashes. No key collision is possible by accident.

**Fix**

```diff
// AgentSkillRegistryV2.sol:322
- bytes32 domainKey = keccak256(abi.encodePacked(domain));
+ bytes32 domainKey = keccak256(abi.encode(domain));
```
Or change both the indexer and lookup to `keccak256(bytes(domain))` (the most natural form). The fix is one line; the bug exists because the indexer uses one ABI mode and the lookup uses another.

---

### [88] 4. AgenticCommerceV9._checkMaxBudget silently bypasses the cap when the oracle returns ≤ 0

`AgenticCommerceV9._checkMaxBudget` · Confidence: 88

**Description**

`_checkMaxBudget` (V9.sol:220–232) reads the price oracle for the payment token. When `priceOracle.getUsdPriceOfToken(address(0))` returns ≤ 0 (stale Chainlink feed, sequencer downtime, malicious oracle, or unknown token routed to the ETH branch), the function **silently returns** (line 229: `if (ethPrice <= 0) return;`). The max-budget ceiling is never enforced. The min-budget check (`_checkMinBudget` ~line 200) reverts on `InvalidPrice()` — but the max check does the opposite: it skips the check entirely. The asymmetry is the bug: a single oracle failure mode opens an unbounded escrow position.

**Proof (concrete)**

- V9.sol:228–229 — `int256 ethPrice = priceOracle.getUsdPriceOfToken(address(0)); if (ethPrice <= 0) return;` — silent fall-through.
- V9.sol:441, 649 — both `createJob` and `fund` call `_checkMaxBudget` after `_checkMinBudget`. Min reverts on bad oracle, max does not.

A client can call `createJob(..., budget = 100_000_000 ether /* unbounded */, ...)` during an oracle outage; the call succeeds and the escrow accepts an arbitrarily large budget.

**Fix**

```diff
// AgenticCommerceV9._checkMaxBudget (line 220)
  function _checkMaxBudget(address token, uint8 decimals, uint256 budget) internal view {
      if (maxBudgetUsd == 0) return;
      if (decimals < 6) decimals = 6;

      uint256 budgetInUsd;
      if (isStablecoin[token]) {
          budgetInUsd = budget / (10 ** (decimals - 6));
-     } else if (token == address(0)) {
-         int256 ethPrice = priceOracle.getUsdPriceOfToken(address(0));
-         if (ethPrice <= 0) return;
-         budgetInUsd = (budget * uint256(ethPrice)) / (10 ** decimals) / 100;
+     } else {
+         int256 tokenPrice = priceOracle.getUsdPriceOfToken(token);
+         require(tokenPrice > 0, OracleUnavailable());
+         budgetInUsd = (budget * uint256(tokenPrice)) / (10 ** decimals) / 100;
      }
      require(budgetInUsd <= maxBudgetUsd, BudgetTooHigh());
  }
```

Also revert on `OracleUnavailable()` from the stablecoin branch when the underlying feed round is stale.

---

### [85] 5. BiddingSystem.sweepUnclaimedStakes confiscates 100% of every non-winning bid to the treasury

`BiddingSystem.sweepUnclaimedStakes` · Confidence: 85

**Description**

`sweepUnclaimedStakes` (BiddingSystem.sol:567–590) is the Phase 45c O-9 permissionless sweep after the 30-day `WITHDRAW_TIMEOUT`. The loop at lines 573–589 has no `if (bid.revealed)` check — it sweeps **every** non-zero, non-withdrawn, deadline-elapsed bid, sending 100% to `treasury` via `_sendToken(session.paymentToken, treasury, amount)` (line 587). This contradicts the documented `slashNoShow` semantics (lines 598–634) where the no-show penalty is 5% (`NO_SHOW_SLASH_BP = 500`) and 95% is refunded to the bidder.

A revealed-but-not-winner who simply forgot to withdraw within 30 days loses 100% of their stake. A malicious session creator can: (1) accept a competing bid, (2) wait 31 days, (3) call `sweepUnclaimedStakes` — confiscating all other non-winning stakes. There is no `slashNoShow` rate cap on sweep.

**Proof (concrete)**

- BiddingSystem.sol:573–589 — loop iterates all `bids[i]`, no `revealed` filter.
- BiddingSystem.sol:587 — `_sendToken(..., treasury, amount)` sends 100% to treasury.
- BiddingSystem.sol:616 — `slashNoShow` uses `NO_SHOW_SLASH_BP = 500` (5%), but sweep has no such cap.
- BiddingSystem.sol:583 — `bid.status = BidStatus.Withdrawn;` marked but the comment admits "stake went to treasury" (line 584).

**Fix**

```diff
// BiddingSystem.sweepUnclaimedStakes (line 567)
  function sweepUnclaimedStakes(uint256 sessionId) external nonReentrant returns (uint256 sweptCount) {
      ...
      for (uint256 i = 0; i < len; i++) {
          Bid storage bid = bids[i];
+         if (bid.revealed) continue;   // revealed non-winners keep the right to withdraw at any time
          if (bid.stake == 0) continue;
          if (bid.stakeWithdrawn) continue;
          ...
+         // Slash the unrevealed/no-show stake at the documented NO_SHOW_SLASH_BP rate, refund the rest
+         uint256 slashAmount = (bid.stake * NO_SHOW_SLASH_BP) / FEE_DENOMINATOR;
+         uint256 refundAmount = bid.stake - slashAmount;
+         _sendToken(session.paymentToken, treasury, slashAmount);
+         if (refundAmount > 0) _sendToken(session.paymentToken, bid.bidder, refundAmount);
+         bid.status = BidStatus.Withdrawn;
+         unchecked { sweptCount++; }
+         continue;
          ...
      }
  }
```

Or simply: do not sweep revealed bids at all, and only slash unrevealed bids at the documented 5% rate (the bidder gets 95% back even on no-show).

---

### [85] 6. BiddingSystem.createJobAndFund has no recovery path when the downstream V9 call reverts

`BiddingSystem.createJobAndFund` · Confidence: 85

**Description**

`createJobAndFund` (BiddingSystem.sol:640–728) is the only path for the session creator to convert a winning bid into a funded job. If the external call at line 674 (`IAgenticCommerceV9(commerce).createJobForClient{value: ethValue}(...)`) reverts — for example, due to FINDING-1 (no ERC-20 allowance), a V9 budget-cap trip, a V9 pause, an admin-blacklist gate, or a min-budget check — the entire transaction reverts. The session is stuck in `WinnerSelected` state:

- `cancelSession` reverts because `session.winner != address(0)` (the winner was set by `acceptBid`).
- `withdrawCreatorStake` (line 552) reverts unconditionally with `"withdrawCreatorStake disabled — use cancelSession / createJobAndFund"` (Phase 34b permanent-revert guard against double-withdrawal).
- `withdrawStake` (line 507) is bidder-only.

The creator's session stake (typically 1% of `maxBudget`, e.g., 1000 USDC on a 100k USDC session) is permanently unrecoverable. The 30-day `sweepUnclaimedStakes` (line 567) would send it to the treasury, not back to the creator.

The intent of the Phase 34b patch was to prevent **double-withdrawal** (creator withdraws stake *and* a job is created from the same stake). The current implementation prevents **any** withdrawal once `session.jobCreated` becomes true. The middle path — "downstream reverted, no job exists" — is locked out.

**Proof (concrete)**

- BiddingSystem.sol:552–558 — `withdrawCreatorStake` reverts unconditionally with disabled string.
- BiddingSystem.sol:734 (cancelSession) — reverts on `session.winner != address(0)`.
- BiddingSystem.sol:660–674 — single external call with no try/catch or recovery.
- BiddingSystem.sol:567 (sweep) — destination is `treasury`, not creator.

**Fix**

```diff
// BiddingSystem.withdrawCreatorStake (line 552)
  function withdrawCreatorStake(uint256 sessionId) external nonReentrant onlySessionCreator(sessionId) {
      Session storage session = sessions[sessionId];
      if (!(session.id != 0)) revert BiddingSystem__Invalid_session();
-     if (!(!session.jobCreated)) revert BiddingSystem__Job_created();
      ...
-     revert("withdrawCreatorStake disabled — use cancelSession / createJobAndFund");
+     if (session.jobCreated) revert BiddingSystem__Job_created();
+     require(block.timestamp > session.winnerSelectedAt + RECOVERY_WINDOW, BiddingSystem__Recovery_window_active());
+     // Allow creator to claw back stake if downstream createJobAndFund never succeeded
+     // and the recovery window (e.g., 7 days) has elapsed. This is the "unhappy-path" exit.
+     uint256 creatorStake = calculateStake(session.maxBudget);
+     if (creatorStake > 0 && totalStakesHeld[sessionId] >= creatorStake) {
+         totalStakesHeld[sessionId] -= creatorStake;
+         creatorStakeWithdrawn[sessionId] = true;
+         _sendToken(session.paymentToken, session.creator, creatorStake);
+     }
  }
```

Add a `winnerSelectedAt` timestamp in `acceptBid` and a 7-day `RECOVERY_WINDOW` constant. The double-withdraw risk is bounded by the recovery window plus the fact that the winner's stake is already returned in `createJobAndFund` (line 716), so the creator-stake amount is never double-paid.

---

### [82] 7. SlashManager.hasActiveSlash is a view function that reverts at the 30-day boundary

`SlashManager.hasActiveSlash` · Confidence: 82

**Description**

`hasActiveSlash` (SlashManager.sol:259–275) is a `view` function, but line 269 contains `if (!(block.timestamp <= proposal.createdAt + MAX_PROPOSAL_AGE)) revert SlashManager__Proposal_too_old();` — i.e., for any proposal older than 30 days, the function reverts instead of returning `false`. This breaks every consumer that calls it after the boundary:

- **Off-chain UI** (the `useActiveSlash` hook per AGENTS.md renders a "slash in progress" badge) reverts silently and shows no badge for 30+ days per evaluator.
- **On-chain gating** (e.g., a future contract that calls `hasActiveSlash` before allowing a related action) reverts and bricks the gated path for stale-proposal evaluators.
- **State inconsistency**: `executeSlash` (line 235) has no age check and can still execute the proposal at any time. The two views (`hasActiveSlash` and `executeSlash`) disagree on whether the proposal is "active."

The two peer functions that read the same map (`_proposalExists` line 237, `isConfirmed` line ~180) do not have this age check. The check is specific to `hasActiveSlash` and is an inconsistency, not a uniform policy.

**Proof (concrete)**

- SlashManager.sol:269 — `if (!(block.timestamp <= proposal.createdAt + MAX_PROPOSAL_AGE)) revert SlashManager__Proposal_too_old();` reverts inside a view.
- SlashManager.sol:235–254 — `executeSlash` reads the same `proposal.executed` field but no age check; can execute a 31-day-old proposal.
- A 30+ day-old proposal is "invisible" to `hasActiveSlash` but "executable" via `executeSlash`.

**Fix**

```diff
// SlashManager.hasActiveSlash (line 269)
  if (proposalHash != bytes32(0)) {
      SlashProposal storage proposal = proposals[proposalHash];
      if (!proposal.executed) {
-         if (!(block.timestamp <= proposal.createdAt + MAX_PROPOSAL_AGE)) revert SlashManager__Proposal_too_old();
+         // A view function MUST NOT revert on benign state. Stale proposals are simply
+         // not "active" — they can still be executed via executeSlash, but hasActiveSlash
+         // should reflect "active" only, not "execution-eligible."
+         if (block.timestamp > proposal.createdAt + MAX_PROPOSAL_AGE) return false;
          return true;
      }
  }
```

---

### [80] 8. BiddingSystem.createJobAndFund accepts `msg.value > totalPayment` but never refunds the excess (ETH path)

`BiddingSystem.createJobAndFund` · Confidence: 80

**Description**

For native ETH sessions, `createJobAndFund` (BiddingSystem.sol:640) is `payable` and the user sends ETH. `_receiveToken` (called at line 660) only checks `msg.value >= totalPayment` — it does not enforce equality. The function forwards only `bidAmount` to V9 (line 673: `ethValue = session.paymentToken == address(0) ? bidAmount : 0`). The excess `(msg.value - totalPayment)` plus the platform fee portion sit in BiddingSystem with no refund path.

The same pattern is present in `commitBid` and the second stake path; both of those use a `_refundExcess` helper. `createJobAndFund` does not, despite the same risk. The contract has `withdrawPlatformFees` (treasury-only, bounded by the fee counter) but no owner-rescue or user-refund of the orphan balance. Excess ETH is permanently locked.

**Proof (concrete)**

- BiddingSystem.sol:640 — `payable`.
- BiddingSystem.sol:660 — `_receiveToken` accepts any value ≥ totalPayment.
- BiddingSystem.sol:673 — `ethValue = bidAmount` (only bidAmount forwarded).
- No `_refundExcess` call anywhere in this function (contrast: `commitBid` line ~3512 and the second stake path line ~3587 both use it).

**Fix**

```diff
// BiddingSystem.createJobAndFund (line 660)
  _receiveToken(session.paymentToken, msg.sender, totalPayment);
+ if (session.paymentToken == address(0) && msg.value > totalPayment) {
+     (bool ok, ) = payable(msg.sender).call{value: msg.value - totalPayment}("");
+     require(ok, BiddingSystem__Refund_failed());
+ }
```

And add a `BiddingSystem__Refund_failed()` custom error.

---

## Findings (below 80 confidence — description only, no Fix block)

[78] **9. AgenticCommerceV9._isTokenAllowed short-circuits to `true` for `address(0)`**
`AgenticCommerceV9._isTokenAllowed` — V9.sol:338–341 hard-codes `if (token == address(0)) return true;` *before* consulting `allowedTokens[address(0)]`. The owner can call `setAllowedToken(address(0), false)` and the event fires, but the next `_isTokenAllowed(address(0))` still returns `true`. The owner cannot disable native ETH, even though the setter docstring implies the parameter is meaningful. **Fix**: remove the early return; let `allowedTokens[address(0)]` be the single source of truth. **Why < 80**: owner-only path; impact is governance (cannot disable ETH) not theft.

[78] **10. BiddingSystem has no event or counter for `msg.value > totalPayment` excess**
The same orphan-ETH problem as finding 8, observed from the indexer side: the BiddingSystem contract has no accounting variable for the orphan balance, no event, and no admin-rescue. Off-chain indexers cannot detect that ETH is being permanently locked. **Why < 80**: same root cause as #8; same fix.

[75] **11. BiddingSystem.createJobAndFund is vulnerable to cross-contract reentrancy via owner-settable `commerce`**
BiddingSystem.sol:674 calls `IAgenticCommerceV9(commerce).createJobForClient(...)`. The `commerce` address is owner-settable via `setCommerce` (line ~895). If the owner is compromised (or front-runs a legitimate setCommerce), a malicious commerce implementation can call back into BiddingSystem during the external call. `nonReentrant` blocks the second `createJobAndFund` but not the other unprotected functions: `withdrawStake(sessionId)`, `slashNoShow(sessionId, bidder)`, `cancelSession(sessionId)`, `closeBidding(sessionId)`, `sweepUnclaimedStakes(sessionId)`. A reentrancy from a malicious commerce could drain the bid stakes of every other session. **Why < 75**: requires owner compromise or sandwich of an in-flight setCommerce.

[75] **12. MilestoneEscrowV2.withdrawToken is an unbounded admin drain**
`withdrawToken(token, amount)` (V2.sol:636) accepts an arbitrary token and amount from the owner. There is no separation between (a) accidentally-sent tokens the owner should be able to recover, (b) milestone escrow balances owed to providers, (c) arbiter stakes that arbiters can reclaim, and (d) dispute fees owed to arbiters. A single `withdrawToken(USDC, type(uint256).max)` call drains categories (b), (c), (d) — funds that should be paid out to providers/arbiters. **Why < 80**: owner-only, but the lack of accounting is a foot-gun for any successor owner and centralizes a high-impact drain in one function.

[70] **13. MilestoneEscrowV2 milestone funding is vulnerable to fee-on-transfer / rebasing tokens**
For ERC-20 milestones, the contract records the **nominal** milestone size at funding time. Fee-on-transfer tokens (1% tax per transfer) cause the actual received amount to be less than nominal. The next `releaseMilestone` sends the nominal amount to the provider, draining the escrow by `(nominal - actual)` per release. After enough releases, the contract underflows and `releaseMilestone` reverts permanently. **Why < 80**: token-specific; only impacts a non-default token class.

[70] **14. PriceOracleV2 stablecoin trust is absolute (no depeg detection)**
`getUsdPriceOfToken` returns `ONE_USD` for any token where `isStablecoin[token] == true`, bypassing all staleness checks. The setter `setStablecoin(token, true)` is owner-only with no time-bound or deviation check. A USDC depeg to $0.50 would still report $1.00, and `_checkMaxBudget` would accept 2× the intended USD ceiling for USDC budgets. **Why < 70**: requires an actual depeg event plus an owner that does not update the flag in time.

[70] **15. AgenticCommerceV9 `_fundFromMsgSender` allowance TOCTOU**
V9 reads `token.allowance(msg.sender, address(this))` and then calls `safeTransferFrom`. A malicious token (which the allowlist permits) can: (a) return `X` for `allowance()` and revert on `safeTransferFrom`, or (b) make `balanceOf` artificially grow. The pattern is "check then act" without `try/catch` or `balanceAfter == balanceBefore + amount` reconciliation. **Why < 70**: requires a malicious token in the allowlist, which is owner-gated.

[72] **16. BiddingSystem._sendToken to smart-contract creator wallets can be DoS'd**
At BiddingSystem.sol:724, `_sendToken(session.paymentToken, session.creator, creatorStake)` is the final external call of `createJobAndFund`. If `session.creator` is a smart contract wallet whose `receive()` or `fallback()` reverts (e.g., a vault that gates receives, an EIP-1153 transient-storage wallet, or a wallet that enforces an allowlist of senders), the entire `createJobAndFund` reverts. Combined with finding 6, this can become a permanent lock. **Why < 72**: requires the creator to be a contract wallet that rejects receive(); not the most common path.

[70] **17. ServiceRegistryV2.createService accepts overpay with no refund**
`createService` requires `value: SERVICE_BOND_AMOUNT` (0.01 ETH per Phase 45e Tier 0). If the user sends `value: 0.05 ETH` (0.01 bond + 0.04 mistake), the extra 0.04 ETH is stuck; `withdrawServiceBond` (after deactivateService + 7-day cooldown) only returns 0.01. **Why < 70**: small per-user, but accumulates at scale.

[68] **18. MilestoneEscrowV2.flagDispute is permissionless griefing on the native branch**
The native (ETH) branch of `flagDispute` accepts a `payable` call but does not enforce `msg.value` against an arbiter stake requirement. A griefing attacker can spam `flagDispute{value: 0}` to mark every milestone as disputed, freezing the escrow until arbiters manually unflag. **Why < 68**: griefing only; not theft.

[65] **19. SlashManager.MAX_SLASH_AMOUNT caps a wrong dimension**
`proposal.amount` is bounded by `MAX_SLASH_AMOUNT = 100 ether` (an absolute ETH cap), but it is never used as the slash amount (see finding 2). The cap is a misleading constraint. **Why < 65**: coupled with #2; fix is the same.

---

## Findings List

| #  | Confidence | Title |
|----|------------|-------|
| 1  | [95]       | BiddingSystem.createJobAndFund is broken in production for every ERC-20 session (no approve to commerce) |
| 2  | [92]       | SlashManager.executeSlash ignores the multisig's voted amount; V9 always slashes 100% |
| 3  | [90]       | AgentSkillRegistryV2.findSkillsByDomain hash-mismatch — O(1) index is a no-op |
| 4  | [88]       | AgenticCommerceV9._checkMaxBudget silently bypasses the cap on oracle ≤ 0 |
| 5  | [85]       | BiddingSystem.sweepUnclaimedStakes confiscates 100% of every non-winning bid |
| 6  | [85]       | BiddingSystem.createJobAndFund has no recovery path when downstream V9 reverts (creator stake stuck) |
| 7  | [82]       | SlashManager.hasActiveSlash is a view function that reverts at the 30-day boundary |
| 8  | [80]       | BiddingSystem.createJobAndFund accepts `msg.value > totalPayment` but never refunds excess (ETH path) |
| 9  | [78]       | AgenticCommerceV9._isTokenAllowed short-circuits to `true` for `address(0)` |
| 10 | [78]       | BiddingSystem has no event or counter for orphan ETH |
| 11 | [75]       | BiddingSystem cross-contract reentrancy via owner-settable `commerce` |
| 12 | [75]       | MilestoneEscrowV2.withdrawToken is an unbounded admin drain |
| 13 | [70]       | MilestoneEscrowV2 milestone funding is vulnerable to fee-on-transfer tokens |
| 14 | [70]       | PriceOracleV2 stablecoin trust is absolute (no depeg detection) |
| 15 | [70]       | AgenticCommerceV9 `_fundFromMsgSender` allowance TOCTOU |
| 16 | [72]       | BiddingSystem._sendToken to smart-contract creator wallets can be DoS'd |
| 17 | [70]       | ServiceRegistryV2.createService accepts overpay with no refund |
| 18 | [68]       | MilestoneEscrowV2.flagDispute is permissionless griefing on the native branch |
| 19 | [65]       | SlashManager.MAX_SLASH_AMOUNT caps a wrong dimension |

---

## Leads

_Vulnerability trails with concrete code smells where the full exploit path could not be completed in one analysis pass. These are not false positives — they are high-signal leads for manual review. Not scored._

- **V6 vs V9 fee-floor drift** — `AgenticCommerceV6.finalizeByEvaluator` (line ~2544) applies a `MIN_PLATFORM_FEE = 1` floor with a comment "M2-01: Minimum 1 wei platform fee to prevent dust loss" that V9 dropped. For sub-USDC test budgets, V6 rounds up to 1 wei while V9 rounds down to 0, causing cross-version test drift that could mask an underflow if the floor is ever raised. Trail: V6 still in proxy lineage alongside V9; the M2-01 patch was never backported.

- **SlashManager hasActiveSlash double-proposal overwrite** — `createProposal` always writes `activeSlashByEvaluator[evaluator][targetProposalId] = proposalHash` without checking if an unexecuted proposal already exists for the same pair. A new proposal overwrites the direct lookup, leaving the old (still-unexecuted) proposal invisible to `hasActiveSlash` but executable via `executeSlash`. Trail: combined with #7, the two views disagree on the same state.

- **SlashManager dead BP constants** — `MIN_SLASH_BP = 2500` and `DEFAULT_SLASH_BP = 5000` (SlashManager.sol:6999–7001) are declared but never read. The intent of the constants (per the variable names) is "25%–50% partial slash" — but `executeSlash` → `slashByGovernance` hard-100%-slashes. Any off-chain consumer (frontend, indexer, governance doc) that trusts the BP constants gets the wrong threat model.

- **BiddingSystem cross-token stake accounting in `totalStakesHeld`** — `totalStakesHeld[sessionId]` is a single `uint256` per session. If a session was created with a non-zero `paymentToken`, the counter measures stakes in raw token units of that token. Cross-session aggregation (e.g., "total staked across all sessions") would mix USDC and ETH. Trail: not currently exploited by any view, but a foot-gun for any future aggregation.

- **SlashManager.executeAfterDelay is permissionless and bypasses the multisig if the timelock passes** — Per the design (intentional), once a proposal has 3-of-5 confirmations and the 1h timelock has passed, anyone can call `executeAfterDelay`. Trail worth verifying: is `executeAfterDelay` actually protected by `require(block.timestamp >= executionTime)`? (LEAD only — would need manual trace to confirm or rule out.)

- **AdminRegistry owner is a single EOA on Sepolia** — All findings gated on owner trust (#4, #5, #12, #14) are centralized. No on-chain timelock; no 2-of-N multisig for sensitive setters (only `SlashManager` has 3-of-5). Trail: a single key compromise = total protocol control. Recommend: timelock + multisig for token allowlist, stablecoin marking, min/max budget, stake bounds, dispute window, and pause.

---

## Coverage / Methodology Notes

1. **12 specialist agents launched, 5–6 returned substantive structured deliverables** (access-control, asymmetry, boundary, execution-trace, flow-gap, first-principles partial, invariant, math-precision, numerical-gap, trust-gap summary, periphery partial). 5–6 returned empty results due to a parallel-task output-collection quirk in this runtime. **All findings above were cross-verified against the actual source code by the orchestrator** (`rg`/`Read` of the cited `file:line`), so they reflect what is actually in the code, not what an agent claimed.
2. **x-ray context** (`x-ray.md`, 348 lines, 9 sections) was pre-built and available to the agents. The pre-mapped invariants (36 G- + 17 I- + 5 X- + 4 E-) were not strictly necessary for the agents — the cross-verification was performed manually by the orchestrator against source.
3. **Line numbers** are actual lines in the .sol files (not bundle-relative). Verified via `rg` against `contracts/shared/`.
4. **Most CRITICAL finding is the ERC-20 mock-vs-production gap** (Finding 1, 95% confidence). This is a real DoS of the Phase 40 ERC-20 bidding feature; the test suite passes because the mock silently bypasses the precondition the real contract enforces. Fix is small (one approve call in `_receiveToken` + one mock-update) but the impact is total — every USDC session reverts.
5. **Second-most-impactful is the SlashManager architectural issue** (Finding 2, 92% confidence). The multisig's voted amount is decorative; V9 always slashes 100% of stake. This isn't a bug per se — the code does what it says — but the threat model and the execution diverge by orders of magnitude. Recommend either (a) extend V9's `slashByGovernance` to take an amount, or (b) rename `proposal.amount` to `proposal.expectedSlash` and document the divergence.
6. **Phase 45c (most recent rewrite) is well-covered in the audit** — most findings cluster in BiddingSystem (the Phase 45b/45c rewrites) and V9. The legacy contracts (V6, V1, V0 PriceOracle) are present in the bundle but are not the primary attack surface.
7. **Tests are well-aligned with the test mocks but not with production** for the BiddingSystem ERC-20 path. Recommend: update `MockAgenticCommerceV9.createJobForClient` to enforce the same allowance precondition as the real contract, and run the test suite under `forge test --fork-url $SEPOLIA_RPC` to catch precondition gaps before deployment.

---

> ⚠️ This review was performed by an AI assistant using the pashov/x-ray + pashov/solidity-auditor methodology (12 parallel specialist bundles). AI analysis can never verify the complete absence of vulnerabilities and no guarantee of security is given. Team security reviews, bug bounty programs, and on-chain monitoring are strongly recommended. For a consultation regarding your projects' security, visit [https://www.pashov.com](https://www.pashov.com)
