# Entry Point Map

> Kokonut Agent Economy | 154+ entry points | 38 permissionless | 60+ role-gated | 56+ admin-only

---

## Protocol Flow Paths

### Setup (Owner)

`setAdminRegistry()` → `AdminRegistry.setSlashManager()` → `SlashManager.setCommerce()` → `BiddingSystem.setMinStake/MaxStake()` → `PriceOracleV2.setPriceFeed()` / `setStablecoin()` → `MilestoneEscrowV2.setArbiterStake()` / `setSupportedToken()` → `ServiceRegistryV2.setIdentityRegistry()` → Phase 46 UUPS scripts for AgentSkillRegistryV2 / AgenticCommerceV9 / SlashManager / BiddingSystem

### Service Listing (Provider)

`[owner setup above]` → `ServiceRegistryV2.createService()` ◄── identity NFT + 0.01 ETH bond
                                          ├─→ `updateService()`
                                          ├─→ `setPaymentAddress()`
                                          └─→ `deactivateService()` → [7 days] → `withdrawServiceBond()`

### Direct Job (Client)

`[owner setup above]` → `AgenticCommerceV9.createJob()` ◄── USDC/ETH budget
                                                  ├─→ `setProvider()` (if open)
                                                  ├─→ `setBudget()`
                                                  ├─→ `fund()` ◄── msg.value
                                                  ├─→ `enableMilestones()` (optional) → `MilestoneEscrowV2.fundMilestones()`
                                                  ├─→ `submit()` (provider)
                                                  ├─→ `approveByClient()` (client) or `finalizeByEvaluator()` (evaluator)
                                                  └─→ `completeAfterTimeout()` (after dispute window)

### Bidding Session (Provider as creator)

`[owner setup above]` → `BiddingSystem.createBiddingSession()` ◄── stake
                                                            ├─→ `commitBid()` × N (bidders, 1% stake)
                                                            ├─→ `revealBid()` × N
                                                            ├─→ `acceptBid()` → `createJobAndFund()` → exact ERC-20 allowance / ETH payment → `AgenticCommerceV9.createJobForClient()`
                                                            ├─→ `rejectBid()`
                                                            ├─→ `cancelSession()`
                                                            ├─→ `withdrawCreatorStake()` (pending pull refund or stuck recovery after 7 days)
                                                            └─→ [30 days] → `sweepUnclaimedStakes()` (unrevealed no-shows only)

### Dispute (Client or Provider)

`AgenticCommerceV9.submit()` → `flagDispute()` on `MilestoneEscrowV2` ◄── payment-token fee
                                                                       ├─→ `submitEvidence()` (parties)
                                                                       └─→ `resolveDispute()` (assigned arbiter) → `_spendMilestoneBalance` + `safeTransfer`

### Slashing (Multisig 3-of-5)

`SlashManager.createProposal()` (owner or signer) → `confirmProposal()` × 3 (3 distinct signers) → [1 hour] → `executeSlash()` → capped slash amount → `AgenticCommerceV9.slashByGovernance(evaluator, slashAmount, reason)`

### Maintenance (Anyone)

- `AgenticCommerceV9.refundExpired()` — anyone, for expired jobs
- `BiddingSystem.sweepUnclaimedStakes()` — anyone, after 30-day timeout; only unrevealed no-shows are swept
- `BiddingSystem.closeBidding()` — anyone, after deadline
- `MilestoneEscrowV2.releaseMilestone()` — client, after provider `submitMilestone()`
- `ServiceRegistryV2.withdrawServiceBond()` — provider, after 7-day cooldown

---

## Permissionless

### `BiddingSystem.sweepUnclaimedStakes(uint256 sessionId)`

| Aspect | Detail |
|--------|--------|
| Visibility | external, nonReentrant |
| Caller | Anyone |
| Parameters | sessionId (protocol-derived) |
| Call chain | `→ BiddingSystem.sweepUnclaimedStakes → unrevealed no-show bids → _sendToken` |
| State modified | `withdrawStakeClaimableAt[sessionId][bidder] = 0`, `stakeLocked[bidder] = 0`, bid status → Withdrawn |
| Value flow | 5% stake slash → treasury; 95% stake refund → bidder; revealed bids skipped |
| Reentrancy guard | yes |

### `BiddingSystem.closeBidding(uint256 sessionId)`

| Aspect | Detail |
|--------|--------|
| Visibility | external, nonReentrant, whenNotPaused |
| Caller | Anyone, after `block.timestamp >= session.deadline` |
| Parameters | sessionId (protocol-derived) |
| State modified | `session.phase = BiddingClosed`, emits `BiddingClosed` |
| Value flow | None |
| Reentrancy guard | yes |

### `BiddingSystem.slashNoShow(uint256 sessionId, address bidder)`

| Aspect | Detail |
|--------|--------|
| Visibility | external, whenNotPaused |
| Caller | Session creator only, after `revealWindowEnd` |
| Parameters | sessionId (protocol-derived), bidder (user-controlled) |
| State modified | bid status → Withdrawn, `bid.rejected = true`, `stakeLocked[bidder] = 0`, slashAmount → treasury |
| Value flow | 5% of stake → treasury, 95% → bidder |
| Reentrancy guard | yes |

### `AgenticCommerceV9.refundExpired(uint256 jobId)`

| Aspect | Detail |
|--------|--------|
| Visibility | external, nonReentrant, whenNotPaused |
| Caller | Anyone, after `block.timestamp >= job.expiredAt` |
| Parameters | jobId (protocol-derived) |
| Call chain | `→ AgenticCommerceV9.refundExpired → _transferPayment → safeTransfer/transfer` |
| State modified | `job.status = Expired`, `job.budget = 0` |
| Value flow | budget → job.client |
| Reentrancy guard | yes |

### `MilestoneEscrowV2.flagDispute(uint256 jobId, uint256 milestoneIndex)`

| Aspect | Detail |
|--------|--------|
| Visibility | external payable, nonReentrant |
| Caller | job.client or job.provider only; payment in `jm.paymentToken` |
| Parameters | jobId, milestoneIndex |
| State modified | `disputes[jobId]`, `activeDisputeIds[]` |
| Value flow | `arbiterFeePerToken[token]` → contract |
| Reentrancy guard | yes |

### `AgenticCommerceV9.refundExpired(uint256 jobId)` (V6 legacy, same name)

| Aspect | Detail |
|--------|--------|
| Visibility | external, nonReentrant |
| Caller | Anyone, after expiry |
| Parameters | jobId |
| State modified | status → Expired, budget → 0 |
| Value flow | budget → client |
| Reentrancy guard | yes |

### `ServiceRegistryV2.deactivateAgentServices(uint256 agentId)` (IdentityRegistry callback)

| Aspect | Detail |
|--------|--------|
| Visibility | external |
| Caller | `msg.sender == identityRegistry` only |
| Parameters | agentId (IdentityRegistry-supplied) |
| State modified | `_services[id].isActive = false` for all services of agent; `_activeServiceCount--` per service |
| Value flow | None |
| Reentrancy guard | no (callback only from trusted registry) |

### `AdminRegistry.verify(...)` / `setBlacklist(...)` permissionless paths

| Aspect | Detail |
|--------|--------|
| Visibility | external |
| Caller | Configurable per-function: anyone for verification, owner for blacklist |
| State modified | Per function |
| Value flow | None |
| Reentrancy guard | no (no funds at risk) |

---

## Role-Gated

### Client (job owner)

#### `AgenticCommerceV9.fund(uint256 jobId, uint256 expectedBudget)`

| Aspect | Detail |
|--------|--------|
| Visibility | external payable, nonReentrant, whenNotPaused, onlyClient |
| Caller | job.client |
| Parameters | jobId, expectedBudget (user-signed for front-running protection) |
| State modified | `job.status = Funded` |
| Value flow | msg.value (ETH) or `safeTransferFrom` (ERC-20) → contract |
| Reentrancy guard | yes |

#### `AgenticCommerceV9.setProvider(uint256 jobId, address provider)`

| Aspect | Detail |
|--------|--------|
| Visibility | external, onlyClient, status == Open |
| Caller | job.client |
| Parameters | jobId, provider (user-controlled, non-zero, not self) |
| State modified | `job.provider` |
| Value flow | None |
| Reentrancy guard | no (state-only) |

#### `AgenticCommerceV9.approveByClient(uint256 jobId)`

| Aspect | Detail |
|--------|--------|
| Visibility | external, nonReentrant, whenNotPaused, onlyClient |
| Caller | job.client |
| Parameters | jobId |
| State modified | `job.status = Completed`, `job.budget = 0` |
| Value flow | budget → provider (net of platform/evaluator fees) |
| Reentrancy guard | yes |

#### `AgenticCommerceV9.setDisputeWindow(uint256 jobId, uint256 window)`

| Aspect | Detail |
|--------|--------|
| Visibility | external, onlyClient, status == Funded |
| Caller | job.client |
| Parameters | jobId, window (1 day ≤ window ≤ 30 days) |
| State modified | `jobDisputeWindow[jobId]` |
| Value flow | None |
| Reentrancy guard | no |

#### `AgenticCommerceV9.setNonResponsiveSlashBP(uint256 jobId, uint256 slashBP)`

| Aspect | Detail |
|--------|--------|
| Visibility | external, onlyClient, status == Funded |
| Caller | job.client |
| Parameters | jobId, slashBP (≤ 1000 = 10%) |
| State modified | `jobNonResponsiveSlashBP[jobId]` |
| Value flow | None |
| Reentrancy guard | no |

#### `ServiceRegistryV2.createService(...)`

| Aspect | Detail |
|--------|--------|
| Visibility | external payable, whenNotPaused |
| Caller | agent NFT owner, not blacklisted |
| Parameters | agentId, name, description, metadataURI, price, paymentToken, paymentAddress |
| State modified | `_services[id]`, `_serviceBonds[id]`, `_providerServices[provider]`, `_agentServices[agentId]`, `_activeServiceCount++` |
| Value flow | msg.value (≥ 0.01 ETH) → contract |
| Reentrancy guard | no |

---

### Provider (job worker)

#### `AgenticCommerceV9.submit(uint256 jobId, bytes32 deliverable)`

| Aspect | Detail |
|--------|--------|
| Visibility | external, nonReentrant, whenNotPaused, onlyProvider |
| Caller | job.provider |
| Parameters | jobId, deliverable (user-controlled 32-byte hash) |
| State modified | `job.status = Submitted`, `job.deliverable`, `jobSubmittedAt[jobId]` |
| Value flow | None |
| Reentrancy guard | yes |

#### `AgenticCommerceV9.completeAfterTimeout(uint256 jobId, bytes32 reason)`

| Aspect | Detail |
|--------|--------|
| Visibility | external, nonReentrant, whenNotPaused |
| Caller | job.provider or job.client after timeout |
| Parameters | jobId, reason (user-controlled) |
| State modified | `job.status = Completed`, `job.budget = 0` |
| Value flow | budget → provider (net of platform + slash) |
| Reentrancy guard | yes |

#### `BiddingSystem.commitBid(uint256 sessionId, bytes32 commitHash)`

| Aspect | Detail |
|--------|--------|
| Visibility | external payable, nonReentrant, whenNotPaused |
| Caller | Anyone (non-creator, non-already-committed) |
| Parameters | sessionId, commitHash (user-controlled 32-byte hash) |
| State modified | `bids[bidder]`, `stakeLocked[bidder]`, `accumulatedFeesByToken[paymentToken] += fee` |
| Value flow | msg.value (1% of bid) → contract |
| Reentrancy guard | yes |

#### `BiddingSystem.revealBid(uint256 sessionId, uint256 amount, string message, bytes32 salt)`

| Aspect | Detail |
|--------|--------|
| Visibility | external, nonReentrant, whenNotPaused |
| Caller | bidder with prior commit |
| Parameters | sessionId, amount, message, salt (user-controlled) |
| State modified | `bids[bidder].revealed = true`, `bids[bidder].amount` |
| Value flow | None (settlement at acceptBid) |
| Reentrancy guard | yes |

#### `BiddingSystem.withdrawStake(uint256 sessionId)`

| Aspect | Detail |
|--------|--------|
| Visibility | external, nonReentrant, whenNotPaused |
| Caller | non-winning bidder after session ends |
| Parameters | sessionId |
| State modified | `bids[bidder].stakeWithdrawn = true`, `withdrawStakeClaimableAt[bidder] = 0` |
| Value flow | stake → bidder |
| Reentrancy guard | yes |

#### `MilestoneEscrowV2.submitMilestone(uint256 jobId, uint256 milestoneIndex, bytes32 proofHash)`

| Aspect | Detail |
|--------|--------|
| Visibility | external, whenNotPaused, onlyProvider |
| Caller | job.provider |
| Parameters | jobId, milestoneIndex, proofHash |
| State modified | `milestone.completed = true`, `milestone.proofHash` |
| Value flow | None |
| Reentrancy guard | no (state-only) |

---

### Evaluator (job verifier)

#### `AgenticCommerceV9.finalizeByEvaluator(uint256 jobId, bytes32 reason)`

| Aspect | Detail |
|--------|--------|
| Visibility | external, nonReentrant, whenNotPaused, onlyEvaluator |
| Caller | job.evaluator |
| Parameters | jobId, reason |
| State modified | `job.status = Completed`, `job.budget = 0` |
| Value flow | budget → provider (net of fees) |
| Reentrancy guard | yes |

#### `AgenticCommerceV9.registerAsEvaluator()` / `unregisterAsEvaluator()`

| Aspect | Detail |
|--------|--------|
| Visibility | external payable / external, whenNotPaused |
| Caller | Anyone (V9); payable ≥ minEvaluatorStake |
| Parameters | None (V9); uses msg.value for stake |
| State modified | `evaluatorPool[]`, `isRegisteredEvaluator[msg.sender]`, stakes (V9) |
| Value flow | msg.value → contract (V9) |
| Reentrancy guard | no (V9) |

---

### Arbiter (dispute resolver)

#### `MilestoneEscrowV2.registerAsArbiter(address token, uint256 amount)`

| Aspect | Detail |
|--------|--------|
| Visibility | external payable, nonReentrant, whenNotPaused |
| Caller | Anyone, with supportedToken + amount ≥ requiredStake |
| Parameters | token (user-controlled, must be supported), amount |
| State modified | `arbiterPool[]`, `arbiterStakes[msg.sender]`, `arbiterStakeToken[msg.sender]`, `isRegisteredArbiter[msg.sender]` |
| Value flow | amount → contract (native or ERC-20) |
| Reentrancy guard | yes |

#### `MilestoneEscrowV2.resolveDispute(uint256 jobId, bool releaseToProvider)`

| Aspect | Detail |
|--------|--------|
| Visibility | external, nonReentrant, whenNotPaused |
| Caller | `disputes[jobId].arbiter` only |
| Parameters | jobId, releaseToProvider (user-controlled bool) |
| State modified | `dispute.resolved = true`, `milestone.released = true`, `activeDisputeIds` swap-and-pop |
| Value flow | milestone amount → provider or client; arbiter fee → arbiter |
| Reentrancy guard | yes |

---

### Multisig (3-of-5 signers)

#### `SlashManager.confirmProposal(bytes32 proposalHash)`

| Aspect | Detail |
|--------|--------|
| Visibility | external |
| Caller | Any signer (3-of-5 required) |
| Parameters | proposalHash (protocol-derived from createProposal) |
| State modified | `proposal.confirmed[signer] = true`, `proposal.confirmations++`, `proposal.executeAfter = now + 1h` on 3rd |
| Value flow | None |
| Reentrancy guard | no (state-only) |

#### `SlashManager.executeSlash(bytes32 proposalHash)`

| Aspect | Detail |
|--------|--------|
| Visibility | external, nonReentrant, whenNotPaused |
| Caller | Anyone (after 3 confirmations + 1h) |
| Parameters | proposalHash |
| Call chain | `→ SlashManager.executeSlash → AgenticCommerceV9.slashByGovernance → evaluator stake deduction` |
| State modified | `proposal.executed = true`, `activeSlashByEvaluator[evaluator][id] = 0`; V9 stake reduced by capped partial amount |
| Value flow | capped slash amount → treasury; full slash unregisters evaluator, partial slash keeps registration |
| Reentrancy guard | yes |

---

## Admin-Only

| Contract | Function | Parameters | State Modified |
|----------|----------|------------|----------------|
| `AgenticCommerceV9` | `setPlatformTreasury(address)` | treasury | platformTreasury |
| `AgenticCommerceV9` | `setPriceOracle(address)` | oracle | priceOracle |
| `AgenticCommerceV9` | `setMinEvaluatorStake(uint256)` | stake | minEvaluatorStake |
| `AgenticCommerceV9` | `setMaxBudgetUsd(uint256)` | maxUsd | maxBudgetUsd |
| `AgenticCommerceV9` | `setMinBudgetOverride(address, uint256)` | token, minAmount | minBudgetOverride[token] |
| `AgenticCommerceV9` | `setStablecoin(address, bool)` | token, isStable | (via PriceOracle) |
| `AgenticCommerceV9` | `setAuthorizedJobCreator(address, bool)` | creator, allowed | authorizedJobCreators[creator] |
| `AgenticCommerceV9` | `setAdminRegistry(address)` | registry | adminRegistry |
| `AgenticCommerceV9` | `setSlashManager(address)` | mgr | (in AdminRegistry) |
| `AgenticCommerceV9` | `pause()` / `unpause()` | none | _paused |
| `BiddingSystem` | `setMinStake(uint256)` | minStake | minStake |
| `BiddingSystem` | `setMaxStake(uint256)` | maxStake | maxStake |
| `BiddingSystem` | `setStakeBounds(uint256, uint256)` | min, max | both |
| `BiddingSystem` | `setPlatformFeeBPForToken(address, uint256)` | token, bp | platformFeeBPByToken[token] |
| `BiddingSystem` | `setPlatformTreasury(address)` | treasury | treasury |
| `BiddingSystem` | `setPriceOracle(address)` | oracle | priceOracle |
| `BiddingSystem` | `withdrawFees(address)` | token | accumulatedFeesByToken → treasury |
| `BiddingSystem` | `setBiddingSystem(address)` (in AgenticCommerce) | bidding | authorizedJobCreators |
| `BiddingSystem` | `pause()` / `unpause()` | none | _paused |
| `MilestoneEscrowV2` | `setArbiterFee(address, uint256)` | token, fee | arbiterFeePerToken[token] |
| `MilestoneEscrowV2` | `setArbiterStake(address, uint256)` | token, stake | arbiterStakePerToken[token] |
| `MilestoneEscrowV2` | `setSupportedToken(address, bool)` | token, supported | supportedTokens[token] |
| `MilestoneEscrowV2` | `setAgenticCommerce(address)` | commerce | agenticCommerce |
| `MilestoneEscrowV2` | `slashArbiter(address, string)` | arbiter, reason | arbiterStakes -= SLASH_PERCENT |
| `MilestoneEscrowV2` | `withdrawToken(address, uint256)` | token, amount | balance → owner |
| `MilestoneEscrowV2` | `pause()` / `unpause()` | none | _paused |
| `PriceOracleV2` | `setPriceFeed(address, address, uint8)` | token, feed, decimals | priceFeeds, feedDecimals |
| `PriceOracleV2` | `setEthPriceFeed(address, uint8)` | feed, decimals | ethPriceFeed |
| `PriceOracleV2` | `setStablecoin(address, bool)` | token, isStable | isStablecoin |
| `PriceOracleV2` | `removePriceFeed(address)` | token | priceFeeds |
| `PriceOracleV2` | `batchSetPriceFeeds(address[], address[], uint8[])` | tokens, feeds, decimals | bulk write |
| `ServiceRegistryV2` | `setIdentityRegistry(address)` | registry | identityRegistry |
| `ServiceRegistryV2` | `setAgenticCommerce(address)` | commerce | agenticCommerce |
| `ServiceRegistryV2` | `setSlashManager(address)` | mgr | slashManager |
| `ServiceRegistryV2` | `setAdminRegistry(address)` | registry | adminRegistry |
| `ServiceRegistryV2` | `initializeActiveServiceCount()` | none | _activeServiceCount, _activeCountInitialized |
| `ServiceRegistryV2` | `pause()` / `unpause()` | none | _paused |
| `ServiceRegistryV2` | `refundServiceBond(uint256)` | serviceId | _serviceBonds, ETH → provider (called by AgenticCommerce) |
| `AdminRegistry` | `addBlacklistedAgent(uint256)` | agentId | blacklistedAgents[agentId] |
| `AdminRegistry` | `addBlacklistedWallet(address)` | wallet | blacklistedWallets[wallet] |
| `AdminRegistry` | `setVerificationConfig(...)` | (multiple) | verificationConfig |
| `AdminRegistry` | `setSkillRule(...)` | (multiple) | skillRules |
| `AdminRegistry` | `setFeaturedAgent(uint256, bool)` | agentId, featured | featuredAgents |
| `AdminRegistry` | `setReputationDecay(...)` | (multiple) | reputationDecayConfig |
| `AdminRegistry` | `pause()` / `unpause()` | none | _paused |
| `SlashManager` | `addSigner(address)` | signer | signers[] |
| `SlashManager` | `removeSigner(address)` | signer | signers[] (swap-and-pop) |
| `SlashManager` | `setCommerce(address)` | commerce | commerce |
| `SlashManager` | `createProposal(address, uint256, uint256, string)` | evaluator, id, amount, reason | proposals[hash] |
| `SlashManager` | `cancelProposal(bytes32)` | hash | proposals[hash].executed = true |
| `SlashManager` | `pause()` / `unpause()` | none | _paused |
| `AgentSkillRegistryV2` | (none beyond UUPS + pause) | | |
| `CommitReveal` | (none beyond commit/reveal; not UUPS) | | |

---

## Initialization

| Contract | Initializer | Caller | Side Effects |
|----------|-------------|--------|--------------|
| `AgenticCommerceV9` | `initialize(address treasury, address adminRegistry, address identityRegistry, uint256 minEvaluatorStake, address initialOwner)` | Deployer (one-shot) | Sets owner, treasury, dependencies |
| `BiddingSystem` | `initialize(address initialOwner, address priceOracle, address platformTreasury, address adminRegistry)` | Deployer | Sets owner, min/max stake defaults |
| `MilestoneEscrowV2` | `initialize(address initialOwner, address agenticCommerce)` | Deployer | Sets owner, agenticCommerce ref |
| `PriceOracleV2` | `initialize(address initialOwner)` | Deployer | Sets owner |
| `ServiceRegistryV2` | `initialize(address identityRegistry, address initialOwner)` | Deployer | Sets owner, identity registry |
| `AdminRegistry` | `initialize(address initialOwner)` | Deployer | Sets owner |
| `SlashManager` | `initialize(address owner, address[] signers)` | Deployer | Sets owner, signers (3-5 required) |
| `AgentSkillRegistryV2` | `initialize(address initialOwner)` | Deployer | Sets owner |
| `CommitReveal` | (none — not UUPS) | N/A | N/A |

---
