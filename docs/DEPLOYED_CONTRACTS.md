# Deployed Contracts Reference

> Last Updated: 2026-04-06
> Network: Sepolia Testnet (Chain ID: 11155111)
> ✅ **Phase 11 Complete** - BiddingSystem deployed
> ✅ **Security Audit Round 3 Complete** - All critical vulnerabilities fixed
> ✅ **Test Suite Complete** - 318 tests passing, 87%+ coverage

This document serves as the single source of truth for all deployed contract addresses. All other documentation should reference this file.

## Test Coverage Summary

| Contract          | Coverage | Tests   | Status |
| ----------------- | -------- | ------- | ------ |
| BiddingSystem     | ✅       | 45      | ✅     |
| AgenticCommerceV4 | 89.25%   | 50      | ✅     |
| AgentReviewV4/V5  | 91.24%   | 77      | ✅     |
| ServiceRegistryV2 | 83.33%   | 29      | ✅     |
| **Total**         | **87%+** | **318** | ✅     |

> **Note**: AgentReviewV4 is deprecated. Use AgentReviewV5 (UUPS upgradeable with security fixes).
> **Note**: V6 contracts deployed with ERC-2771 meta-transactions, evaluator fees.

---

## ERC-8004 Official Registries

These are the official ERC-8004 identity and reputation registries that all Kokonut contracts integrate with.

| Contract            | Address                                      | Environment Variable                  |
| ------------------- | -------------------------------------------- | ------------------------------------- |
| ERC-8004 Identity   | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | `NEXT_PUBLIC_8004_REGISTRY_ADDRESS`   |
| ERC-8004 Reputation | `0x8004B663056A597Dffe9eCcC1965A193B7388713` | `NEXT_PUBLIC_8004_REPUTATION_ADDRESS` |

---

## Kokonut Contracts (Phase 11 - Latest)

### Identity & Skills

| Contract             | Address                                      | Environment Variable                 | Description                      | Version |
| -------------------- | -------------------------------------------- | ------------------------------------ | -------------------------------- | ------- |
| AgentSkillRegistryV2 | `0xA84684261558f342d6871DD2CFef90A2117Aa20A` | `NEXT_PUBLIC_SKILL_REGISTRY_ADDRESS` | Skills/capabilities (UUPS Proxy) | V2      |
| AgentSkillRegistryV2 | `0x3Eec6BAF9FAc410B9C580d3Eb8c971a14298BC87` | —                                    | Implementation (ownerOf fix)     | V2      |

### Marketplace

| Contract               | Address                                      | Environment Variable                   | Description                             | Version |
| ---------------------- | -------------------------------------------- | -------------------------------------- | --------------------------------------- | ------- |
| ServiceRegistryV2      | `0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201` | `NEXT_PUBLIC_SERVICE_REGISTRY_ADDRESS` | Service listings (UUPS Proxy, ERC-8004) | V2      |
| ServiceRegistryV2 Impl | `0xe2fB4aDA35B8d5FbB041a9C0ED4a655Be329a457` | —                                      | Implementation (activateService added)  | V2      |

### Commerce (Jobs & Escrow)

| Contract             | Address                                      | Environment Variable                   | Description                     | Version |
| -------------------- | -------------------------------------------- | -------------------------------------- | ------------------------------- | ------- |
| AgenticCommerce      | `0x948d97EA7F0c49796fB576ADff375C900627568E` | `NEXT_PUBLIC_AGENTIC_COMMERCE_ADDRESS` | Job escrow (UUPS Proxy)         | V6.1    |
| AgenticCommerce Impl | `0x28704E1547f97b7A27d08dfd24a24fecfB7C0433` | —                                      | Implementation (Security Fixes) | V6.1    |

### Bidding (Phase 11 - NEW)

| Contract           | Address                                      | Environment Variable                 | Description                        | Version |
| ------------------ | -------------------------------------------- | ------------------------------------ | ---------------------------------- | ------- |
| BiddingSystem      | `0x32c9d069a248a619d3EAc4D1FC76F2639AaBeF04` | `NEXT_PUBLIC_BIDDING_SYSTEM_ADDRESS` | Commit-reveal bidding (UUPS Proxy) | V1      |
| BiddingSystem Impl | `0x0A09e4Ff6DAa0eeA49526560e2c946Ea32a293Bb` | —                                    | Implementation                     | V1      |

### Review & Coordination

| Contract                   | Address                                      | Environment Variable               | Description                               | Version |
| -------------------------- | -------------------------------------------- | ---------------------------------- | ----------------------------------------- | ------- |
| AgentReviewV5              | `0x5CDb592Fd37749bF87448FBf5725D1Cd986dd1Cb` | `NEXT_PUBLIC_AGENT_REVIEW_ADDRESS` | A/B evaluation (UUPS + Pull Pattern)      | V5      |
| AgentReviewV5 Impl         | `0xE997529ED48B2612Fb4134048c45a767B8B9cE47` | —                                  | Implementation (SlashManager, Locked ETH) | V5      |
| AgentReviewV4 (deprecated) | `0x716B02447b52Eab450e31bD77103B41bC2c7bE0b` | —                                  | Legacy version (do not use)               | V4 ⚠️   |

### Infrastructure

| Contract     | Address                                      | Environment Variable                | Description                               | Version |
| ------------ | -------------------------------------------- | ----------------------------------- | ----------------------------------------- | ------- |
| PriceOracle  | `0x5C4AC3dAF76708DCd51911BA3B33027eAB1B4047` | `NEXT_PUBLIC_PRICE_ORACLE_ADDRESS`  | Price feeds (Chainlink on Sepolia)        | Live    |
| CommitReveal | `0x6CEd1574A3dF7ec646e43DD8408300117c453Aa3` | `NEXT_PUBLIC_COMMIT_REVEAL_ADDRESS` | Front-running protection (12-block delay) | Live    |
| SlashManager | `0x7Cf955900FD7a12680E90D834eAf19346f5DBcf9` | `NEXT_PUBLIC_SLASH_MANAGER_ADDRESS` | 3-of-5 multisig governance                | V1      |

### Tokens

| Contract | Address                                      | Environment Variable       | Description  |
| -------- | -------------------------------------------- | -------------------------- | ------------ |
| USDC     | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` | `NEXT_PUBLIC_USDC_ADDRESS` | Sepolia USDC |

---

## Network Configuration

| Network | Chain ID | RPC URL                         | Explorer             |
| ------- | -------- | ------------------------------- | -------------------- |
| Sepolia | 11155111 | ethereum-sepolia.publicnode.com | sepolia.etherscan.io |

---

## Environment Setup

Copy these values into `apps/web/.env.local` and project `.env`:

```env
# Wallet (for deployment only)
PRIVATE_KEY=your_private_key_here

# Sepolia RPC
SEPOLIA_RPC_URL=https://ethereum-sepolia.publicnode.com

# ERC-8004 Official Registry
NEXT_PUBLIC_8004_REGISTRY_ADDRESS=0x8004A818BFB912233c491871b3d84c89A494BD9e
NEXT_PUBLIC_8004_REPUTATION_ADDRESS=0x8004B663056A597Dffe9eCcC1965A193B7388713

# Kokonut Core Contracts (Phase 11)
NEXT_PUBLIC_SKILL_REGISTRY_ADDRESS=0xA84684261558f342d6871DD2CFef90A2117Aa20A
NEXT_PUBLIC_SERVICE_REGISTRY_ADDRESS=0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201
NEXT_PUBLIC_AGENTIC_COMMERCE_ADDRESS=0x948d97EA7F0c49796fB576ADff375C900627568E
NEXT_PUBLIC_BIDDING_SYSTEM_ADDRESS=0x32c9d069a248a619d3EAc4D1FC76F2639AaBeF04
NEXT_PUBLIC_AGENT_REVIEW_ADDRESS=0x5CDb592Fd37749bF87448FBf5725D1Cd986dd1Cb

# Infrastructure
NEXT_PUBLIC_PRICE_ORACLE_ADDRESS=0x5C4AC3dAF76708DCd51911BA3B33027eAB1B4047
NEXT_PUBLIC_COMMIT_REVEAL_ADDRESS=0x6CEd1574A3dF7ec646e43DD8408300117c453Aa3
NEXT_PUBLIC_SLASH_MANAGER_ADDRESS=0x7Cf955900FD7a12680E90D834eAf19346f5DBcf9

# Tokens
NEXT_PUBLIC_USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

---

## Contract Wiring

```
ERC-8004 Identity (0x8004...)
       │
       ├──► AgentSkillRegistryV2
       │         │
       │         └──► Uses ownerOf() for agent verification
       │
       └──► ServiceRegistryV2
                 │
                 └──► AgenticCommerceV6.1
                           │
                           └──► Jobs reference services

BiddingSystem (Phase 11)
       │
       └──► Standalone commit-reveal bidding
                 │
                 └──► createJobAndFund() → AgenticCommerceV6.1

AgentReviewV5
       │
       └──► SlashManager
                 │
                 └──► 3-of-5 multisig for slashing
```

---

## Security Features (Phase 11)

| Feature              | Implementation                                      |
| -------------------- | --------------------------------------------------- |
| Collusion Prevention | V6.1: `RolesMustBeDistinct` in job creation         |
| Deadlock Resolution  | V6.1: `completeAfterTimeout()` after dispute window |
| Winner Pull Pattern  | V5: `claimReward()` instead of automatic transfer   |
| SlashManager         | V5: 3-of-5 multisig controls all slashing           |
| Locked ETH Guard     | V5: `withdrawETH()` validates against locked funds  |
| UUPS Upgradeable     | V5, BiddingSystem: OpenZeppelin v5 upgradeable      |

---

## Deprecation Notice

| Contract              | Status        | Use Instead          |
| --------------------- | ------------- | -------------------- |
| AgentReviewV4         | ⚠️ DEPRECATED | AgentReviewV5        |
| AgenticCommerce V5    | ⚠️ DEPRECATED | AgenticCommerce V6.1 |
| AgentSkillRegistry V1 | ⚠️ DEPRECATED | AgentSkillRegistryV2 |

---

## Updating This Document

When deploying new contracts:

1. Update this document with new addresses
2. Update `apps/web/.env.local` with new addresses
3. Update `.env.example` in project root
4. Update any other docs that reference these addresses
5. Update `docs/DEPLOYED_CONTRACTS.md` (this file) as the source of truth
