# Trail of Bits: Entry Point Analysis

**Scope:** contracts/shared/
**Focus:** State-changing external/public functions only

## Summary

| Category | Count |
|----------|-------|
| Public (Unrestricted) | 23 |
| Role-Restricted | 98 |
| Restricted (Review Required) | 60 |
| Contract-Only | 0 |
| **Total** | **181** |

---

## Public Entry Points (Unrestricted)

State-changing functions callable by anyone — **highest priority**.

| Contract | Function | Notes |
|----------|----------|-------|
| `AgentReviewV5` | `setUnderReview` | No modifiers |
| `AgentSkillRegistryV2` | `deactivateSkill` | No modifiers |
| `AgentSkillRegistryV2` | `registerSkill` | No modifiers |
| `AgentSkillRegistryV2` | `updateSkill` | No modifiers |
| `AgenticCommerceV6` | `acceptBid` | No modifiers |
| `AgenticCommerceV6` | `commitBid` | No modifiers |
| `AgenticCommerceV6` | `registerAsEvaluator` | No modifiers |
| `AgenticCommerceV6` | `revealBid` | No modifiers |
| `AgenticCommerceV6` | `unregisterAsEvaluator` | No modifiers |
| `AgenticCommerceV6` | `withdrawStake` | No modifiers |
| `AgenticCommerceV9` | `cleanupStaleEvaluators` | No modifiers |
| `AgenticCommerceV9` | `finalizeRandomEvaluator` | No modifiers |
| `AgenticCommerceV9` | `registerAsEvaluator` | No modifiers |
| `AgenticCommerceV9` | `unregisterAsEvaluator` | No modifiers |
| `CommitReveal` | `cancel` | No modifiers |
| `CommitReveal` | `cleanupExpiredCommitments` | No modifiers |
| `CommitReveal` | `commit` | No modifiers |
| `CommitReveal` | `reveal` | No modifiers |
| `MilestoneEscrow` | `registerAsArbiter` | No modifiers |
| `MilestoneEscrow` | `unregisterAsArbiter` | No modifiers |
| `ServiceRegistryV2` | `deactivateAgentServices` | No modifiers |
| `ServiceRegistryV2` | `refundServiceBond` | No modifiers |
| `SlashManager` | `confirmProposal` | No modifiers |

---

## Role-Restricted Entry Points

### Admin / Owner

| Contract | Function | Restriction |
|----------|----------|-------------|
| `AdminRegistry` | `blacklistAgent` | `onlyOwner` |
| `AdminRegistry` | `blacklistWallet` | `onlyOwner` |
| `AdminRegistry` | `pause` | `onlyOwner` |
| `AdminRegistry` | `setFeaturedAgent` | `onlyOwner` |
| `AdminRegistry` | `setHalfLifeDays` | `onlyOwner` |
| `AdminRegistry` | `setIdentityRegistry` | `onlyOwner` |
| `AdminRegistry` | `setSkillRule` | `onlyOwner` |
| `AdminRegistry` | `setSlashManager` | `onlyOwner` |
| `AdminRegistry` | `setVerificationProvider` | `onlyOwner` |
| `AdminRegistry` | `unblacklistAgent` | `onlyOwner` |
| `AdminRegistry` | `unblacklistWallet` | `onlyOwner` |
| `AdminRegistry` | `unpause` | `onlyOwner` |
| `AgentReviewV5` | `pause` | `onlyOwner` |
| `AgentReviewV5` | `setAdminRegistry` | `onlyOwner` |
| `AgentReviewV5` | `setDefaultSlashPercentage` | `onlyOwner` |
| `AgentReviewV5` | `setSlashManager` | `onlyOwner` |
| `AgentReviewV5` | `setSlashTreasury` | `onlyOwner` |
| `AgentReviewV5` | `unpause` | `onlyOwner` |
| `AgentReviewV5` | `withdrawETH` | `onlyOwner` |
| `AgentSkillRegistryV2` | `setIdentityRegistry` | `onlyOwner` |
| `AgenticCommerceV6` | `pause` | `onlyOwner` |
| `AgenticCommerceV6` | `setAllowedToken` | `onlyOwner` |
| `AgenticCommerceV6` | `setPlatformTreasury` | `onlyOwner` |
| `AgenticCommerceV6` | `unpause` | `onlyOwner` |
| `AgenticCommerceV9` | `pause` | `onlyOwner` |
| `AgenticCommerceV9` | `setAdminRegistry` | `onlyOwner` |
| `AgenticCommerceV9` | `setAllowedToken` | `onlyOwner` |
| `AgenticCommerceV9` | `setMaxBudgetUsd` | `onlyOwner` |
| `AgenticCommerceV9` | `setMinBudgetOverride` | `onlyOwner` |
| `AgenticCommerceV9` | `setMinBudgetUsd` | `onlyOwner` |
| `AgenticCommerceV9` | `setPlatformTreasury` | `onlyOwner` |
| `AgenticCommerceV9` | `setPriceOracle` | `onlyOwner` |
| `AgenticCommerceV9` | `setStablecoin` | `onlyOwner` |
| `AgenticCommerceV9` | `slashEvaluatorStake` | `onlyOwner` |
| `AgenticCommerceV9` | `unpause` | `onlyOwner` |
| `BiddingSystem` | `pause` | `onlyOwner` |
| `BiddingSystem` | `setAdminRegistry` | `onlyOwner` |
| `BiddingSystem` | `setCommerce` | `onlyOwner` |
| `BiddingSystem` | `setMinStakeBP` | `onlyOwner` |
| `BiddingSystem` | `setPlatformFeeBP` | `onlyOwner` |
| `BiddingSystem` | `setRevealWindow` | `onlyOwner` |
| `BiddingSystem` | `setServiceRegistry` | `onlyOwner` |
| `BiddingSystem` | `setTreasury` | `onlyOwner` |
| `BiddingSystem` | `unpause` | `onlyOwner` |
| `BiddingSystem` | `withdrawPlatformFees` | `onlyOwner` |
| `CommitReveal` | `updateServiceRegistry` | `onlyOwner` |
| `MilestoneEscrow` | `pause` | `onlyOwner` |
| `MilestoneEscrow` | `setAgenticCommerce` | `onlyOwner` |
| `MilestoneEscrow` | `unpause` | `onlyOwner` |
| `MilestoneEscrowV2` | `pause` | `onlyOwner` |
| `MilestoneEscrowV2` | `setAgenticCommerce` | `onlyOwner` |
| `MilestoneEscrowV2` | `setArbiterFee` | `onlyOwner` |
| `MilestoneEscrowV2` | `setArbiterStake` | `onlyOwner` |
| `MilestoneEscrowV2` | `setSupportedToken` | `onlyOwner` |
| `MilestoneEscrowV2` | `slashArbiter` | `onlyOwner` |
| `MilestoneEscrowV2` | `unpause` | `onlyOwner` |
| `MilestoneEscrowV2` | `withdrawToken` | `onlyOwner` |
| `PriceOracleV2` | `batchSetPriceFeeds` | `onlyOwner` |
| `PriceOracleV2` | `removePriceFeed` | `onlyOwner` |
| `PriceOracleV2` | `setEthPriceFeed` | `onlyOwner` |
| `PriceOracleV2` | `setPriceFeed` | `onlyOwner` |
| `PriceOracleV2` | `setStablecoin` | `onlyOwner` |
| `ServiceRegistryV2` | `initializeActiveServiceCount` | `onlyOwner` |
| `ServiceRegistryV2` | `pause` | `onlyOwner` |
| `ServiceRegistryV2` | `setAdminRegistry` | `onlyOwner` |
| `ServiceRegistryV2` | `setAgenticCommerce` | `onlyOwner` |
| `ServiceRegistryV2` | `setIdentityRegistry` | `onlyOwner` |
| `ServiceRegistryV2` | `setSlashManager` | `onlyOwner` |
| `ServiceRegistryV2` | `unpause` | `onlyOwner` |
| `SlashManager` | `addSigner` | `onlyOwner` |
| `SlashManager` | `cancelProposal` | `onlyOwner` |
| `SlashManager` | `pause` | `onlyOwner` |
| `SlashManager` | `removeSigner` | `onlyOwner` |
| `SlashManager` | `setAgentReview` | `onlyOwner` |
| `SlashManager` | `unpause` | `onlyOwner` |

### Client / Provider / Evaluator / Other Roles

| Contract | Function | Restriction |
|----------|----------|-------------|
| `AdminRegistry` | `slashAndBlacklistAgent` | `onlySlashManager` |
| `AgentReviewV5` | `slashEvaluator` | `onlySlashManager` |
| `AgenticCommerceV6` | `claimRefund` | `onlyClient` |
| `AgenticCommerceV6` | `complete` | `onlyEvaluator` |
| `AgenticCommerceV6` | `fund` | `onlyClient` |
| `AgenticCommerceV6` | `setBudget` | `onlyClient` |
| `AgenticCommerceV6` | `setDisputeWindow` | `onlyClient` |
| `AgenticCommerceV6` | `setNonResponsiveSlashBP` | `onlyClient` |
| `AgenticCommerceV6` | `setProvider` | `onlyClient` |
| `AgenticCommerceV6` | `submit` | `onlyProvider` |
| `AgenticCommerceV9` | `approveByClient` | `onlyClient` |
| `AgenticCommerceV9` | `claimRefund` | `onlyClient` |
| `AgenticCommerceV9` | `finalizeByEvaluator` | `onlyEvaluator` |
| `AgenticCommerceV9` | `fund` | `onlyClient` |
| `AgenticCommerceV9` | `setBudget` | `onlyClient` |
| `AgenticCommerceV9` | `setDisputeWindow` | `onlyClient` |
| `AgenticCommerceV9` | `setNonResponsiveSlashBP` | `onlyClient` |
| `AgenticCommerceV9` | `setPaymentToken` | `onlyClient, onlyAllowedToken` |
| `AgenticCommerceV9` | `submit` | `onlyProvider` |
| `BiddingSystem` | `cancelSession` | `onlySessionCreator` |
| `BiddingSystem` | `createJobAndFund` | `onlySessionCreator` |
| `BiddingSystem` | `extendRevealWindow` | `onlySessionCreator` |
| `BiddingSystem` | `rejectBid` | `onlySessionCreator` |

---

## Restricted (Review Required)

| Contract | Function | Pattern |
|----------|----------|--------|
| `AdminRegistry` | `initialize` | Moderate-only (`whenNotPaused`/`payable`) |
| `AgentReviewV5` | `initialize` | Moderate-only (`whenNotPaused`/`payable`) |
| `AgentReviewV5` | `createProposal` | Moderate-only (`whenNotPaused`/`payable`) |
| `AgentReviewV5` | `submitEvaluation` | Moderate-only (`whenNotPaused`/`payable`) |
| `AgentReviewV5` | `attestDecision` | Moderate-only (`whenNotPaused`/`payable`) |
| `AgentReviewV5` | `finalizeDecision` | Moderate-only (`whenNotPaused`/`payable`) |
| `AgentReviewV5` | `claimReward` | Moderate-only (`whenNotPaused`/`payable`) |
| `AgentReviewV5` | `releaseStake` | Moderate-only (`whenNotPaused`/`payable`) |
| `AgentReviewV5` | `cancelProposal` | Moderate-only (`whenNotPaused`/`payable`) |
| `AgentSkillRegistryV2` | `initialize` | Moderate-only (`whenNotPaused`/`payable`) |
| `AgenticCommerceV6` | `initialize` | Moderate-only (`whenNotPaused`/`payable`) |
| `AgenticCommerceV6` | `createJob` | Moderate-only (`whenNotPaused`/`payable`) |
| `AgenticCommerceV6` | `createJobFromService` | Moderate-only (`whenNotPaused`/`payable`) |
| `AgenticCommerceV6` | `completeAfterTimeout` | Moderate-only (`whenNotPaused`/`payable`) |
| `AgenticCommerceV6` | `reject` | Moderate-only (`whenNotPaused`/`payable`) |
| `AgenticCommerceV6` | `refundExpired` | Moderate-only (`whenNotPaused`/`payable`) |
| `AgenticCommerceV6` | `createJobWithRandomEvaluator` | Moderate-only (`whenNotPaused`/`payable`) |
| `AgenticCommerceV9` | `initialize` | Moderate-only (`whenNotPaused`/`payable`) |
| `AgenticCommerceV9` | `createJob` | Moderate-only (`whenNotPaused`/`payable`) |
| `AgenticCommerceV9` | `createJobV7` | Moderate-only (`whenNotPaused`/`payable`) |
| `AgenticCommerceV9` | `reject` | Moderate-only (`whenNotPaused`/`payable`) |
| `AgenticCommerceV9` | `refundExpired` | Moderate-only (`whenNotPaused`/`payable`) |
| `AgenticCommerceV9` | `completeAfterTimeout` | Moderate-only (`whenNotPaused`/`payable`) |
| `BiddingSystem` | `initialize` | Moderate-only (`whenNotPaused`/`payable`) |
| `BiddingSystem` | `createBiddingSession` | Moderate-only (`whenNotPaused`/`payable`) |
| `BiddingSystem` | `commitBid` | Moderate-only (`whenNotPaused`/`payable`) |
| `BiddingSystem` | `revealBid` | Moderate-only (`whenNotPaused`/`payable`) |
| `BiddingSystem` | `acceptBid` | Moderate-only (`whenNotPaused`/`payable`) |
| `BiddingSystem` | `withdrawStake` | Moderate-only (`whenNotPaused`/`payable`) |
| `BiddingSystem` | `claimStake` | Moderate-only (`whenNotPaused`/`payable`) |
| `CommitReveal` | `initialize` | Moderate-only (`whenNotPaused`/`payable`) |
| `CommitReveal` | `execute` | Moderate-only (`whenNotPaused`/`payable`) |
| `MilestoneEscrow` | `initialize` | Moderate-only (`whenNotPaused`/`payable`) |
| `MilestoneEscrow` | `enableMilestones` | Moderate-only (`whenNotPaused`/`payable`) |
| `MilestoneEscrow` | `addMilestone` | Moderate-only (`whenNotPaused`/`payable`) |
| `MilestoneEscrow` | `completeMilestone` | Moderate-only (`whenNotPaused`/`payable`) |
| `MilestoneEscrow` | `releaseMilestone` | Moderate-only (`whenNotPaused`/`payable`) |
| `MilestoneEscrow` | `flagDispute` | Moderate-only (`whenNotPaused`/`payable`) |
| `MilestoneEscrow` | `submitEvidence` | Moderate-only (`whenNotPaused`/`payable`) |
| `MilestoneEscrow` | `resolveDispute` | Moderate-only (`whenNotPaused`/`payable`) |
| `MilestoneEscrowV2` | `initialize` | Moderate-only (`whenNotPaused`/`payable`) |
| `MilestoneEscrowV2` | `enableMilestones` | Moderate-only (`whenNotPaused`/`payable`) |
| `MilestoneEscrowV2` | `addMilestone` | Moderate-only (`whenNotPaused`/`payable`) |
| `MilestoneEscrowV2` | `submitMilestone` | Moderate-only (`whenNotPaused`/`payable`) |
| `MilestoneEscrowV2` | `releaseMilestone` | Moderate-only (`whenNotPaused`/`payable`) |
| `MilestoneEscrowV2` | `flagDispute` | Moderate-only (`whenNotPaused`/`payable`) |
| `MilestoneEscrowV2` | `submitEvidence` | Moderate-only (`whenNotPaused`/`payable`) |
| `MilestoneEscrowV2` | `resolveDispute` | Moderate-only (`whenNotPaused`/`payable`) |
| `MilestoneEscrowV2` | `registerAsArbiter` | Moderate-only (`whenNotPaused`/`payable`) |
| `MilestoneEscrowV2` | `unregisterAsArbiter` | Moderate-only (`whenNotPaused`/`payable`) |
| `PriceOracleV2` | `initialize` | Moderate-only (`whenNotPaused`/`payable`) |
| `ServiceRegistryV2` | `initialize` | Moderate-only (`whenNotPaused`/`payable`) |
| `ServiceRegistryV2` | `createService` | Moderate-only (`whenNotPaused`/`payable`) |
| `ServiceRegistryV2` | `updateService` | Moderate-only (`whenNotPaused`/`payable`) |
| `ServiceRegistryV2` | `deactivateService` | Moderate-only (`whenNotPaused`/`payable`) |
| `ServiceRegistryV2` | `activateService` | Moderate-only (`whenNotPaused`/`payable`) |
| `ServiceRegistryV2` | `setPaymentAddress` | Moderate-only (`whenNotPaused`/`payable`) |
| `SlashManager` | `initialize` | Moderate-only (`whenNotPaused`/`payable`) |
| `SlashManager` | `createProposal` | Moderate-only (`whenNotPaused`/`payable`) |
| `SlashManager` | `executeSlash` | Moderate-only (`whenNotPaused`/`payable`) |

---

## Files Analyzed

- `AdminRegistry.sol` (14 state-changing entry points)
- `AgentReviewV5.sol` (17 state-changing entry points)
- `AgentSkillRegistryV2.sol` (5 state-changing entry points)
- `AgenticCommerceV6.sol` (25 state-changing entry points)
- `AgenticCommerceV9.sol` (30 state-changing entry points)
- `BiddingSystem.sol` (21 state-changing entry points)
- `CommitReveal.sol` (7 state-changing entry points)
- `MilestoneEscrow.sol` (13 state-changing entry points)
- `MilestoneEscrowV2.sol` (18 state-changing entry points)
- `PriceOracleV2.sol` (6 state-changing entry points)
- `ServiceRegistryV2.sol` (15 state-changing entry points)
- `SlashManager.sol` (10 state-changing entry points)
