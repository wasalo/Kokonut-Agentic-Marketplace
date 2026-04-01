# Deployed Contracts Reference

> Last Updated: 2026-03-30
> Network: Sepolia Testnet (Chain ID: 11155111)
> ✅ **Security Audit Complete** - All critical vulnerabilities fixed
> ✅ **Test Suite Complete** - 201 tests passing, 87%+ coverage

This document serves as the single source of truth for all deployed contract addresses. All other documentation should reference this file.

## Test Coverage Summary

| Contract          | Coverage | Tests   | Status |
| ----------------- | -------- | ------- | ------ |
| AgenticCommerceV4 | 89.25%   | 50      | ✅     |
| AgentReviewV4     | 91.24%   | 46      | ✅     |
| ServiceRegistryV2 | 83.33%   | 29      | ✅     |
| **Total**         | **87%+** | **201** | ✅     |

> **Note**: All V3 contracts have been removed from production. Use V4 addresses only.

---

## Quick Reference

| Contract | Address                                      | Environment Variable       |
| -------- | -------------------------------------------- | -------------------------- |
| USDC     | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` | `NEXT_PUBLIC_USDC_ADDRESS` |

---

## ERC-8004 Official Registries

These are the official ERC-8004 identity and reputation registries that all Kokonut contracts integrate with.

| Contract            | Address                                      | Environment Variable                  |
| ------------------- | -------------------------------------------- | ------------------------------------- |
| ERC-8004 Identity   | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | `NEXT_PUBLIC_8004_REGISTRY_ADDRESS`   |
| ERC-8004 Reputation | `0x8004B663056A597Dffe9eCcC1965A193B7388713` | `NEXT_PUBLIC_8004_REPUTATION_ADDRESS` |

---

## Kokonut Contracts

### Core Contracts (Phase 4)

| Contract              | Address                                      | Environment Variable                   | Description                             | Version |
| --------------------- | -------------------------------------------- | -------------------------------------- | --------------------------------------- | ------- |
| AgentSkillRegistry    | `0x7cf16C00ed4831EB9eE3a8765831968F0a28f53D` | `NEXT_PUBLIC_SKILL_REGISTRY_ADDRESS`   | Skills/capabilities (wired to ERC-8004) | Live    |
| **ServiceRegistryV2** | `0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201` | `NEXT_PUBLIC_SERVICE_REGISTRY_ADDRESS` | Service listings (UUPS Proxy, ERC-8004) | V2      |
| AgentReview           | `0x716B02447b52Eab450e31bD77103B41bC2c7bE0b` | `NEXT_PUBLIC_AGENT_REVIEW_ADDRESS`     | A/B evaluation with staking (V4)        | V4      |
| AgenticCommerce       | `0xA7E8F13AC8E659356333Bf3e579BF3f39334821e` | `NEXT_PUBLIC_AGENTIC_COMMERCE_ADDRESS` | Job escrow with USDC (V4)               | V4      |

### Supporting Contracts

| Contract     | Address                                      | Environment Variable                | Description                                  | Version |
| ------------ | -------------------------------------------- | ----------------------------------- | -------------------------------------------- | ------- |
| PriceOracle  | `0x5C4AC3dAF76708DCd51911BA3B33027eAB1B4047` | `NEXT_PUBLIC_PRICE_ORACLE_ADDRESS`  | Price feeds (Chainlink on Sepolia & mainnet) | Live    |
| CommitReveal | `0x6CEd1574A3dF7ec646e43DD8408300117c453Aa3` | `NEXT_PUBLIC_COMMIT_REVEAL_ADDRESS` | Front-running protection (12-block delay)    | Live    |
| SlashManager | `0x7Cf955900FD7a12680E90D834eAf19346f5DBcf9` | `NEXT_PUBLIC_SLASH_MANAGER_ADDRESS` | 3-of-5 multisig governance                   | V1      |

---

## Network Configuration

| Network | Chain ID | RPC URL                         | Explorer             |
| ------- | -------- | ------------------------------- | -------------------- |
| Sepolia | 11155111 | ethereum-sepolia.publicnode.com | sepolia.etherscan.io |

---

## Environment Setup

Copy these values into `apps/web/.env.local`:

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Sepolia Contract Addresses (Phase 4 - 201 Tests Passing, 87%+ Coverage)
NEXT_PUBLIC_SKILL_REGISTRY_ADDRESS=0x7cf16C00ed4831EB9eE3a8765831968F0a28f53D
NEXT_PUBLIC_SERVICE_REGISTRY_ADDRESS=0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201
NEXT_PUBLIC_AGENT_REVIEW_ADDRESS=0x716B02447b52Eab450e31bD77103B41bC2c7bE0b
NEXT_PUBLIC_AGENTIC_COMMERCE_ADDRESS=0xA7E8F13AC8E659356333Bf3e579BF3f39334821e
NEXT_PUBLIC_USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238

# ERC-8004 Official Registry (Sepolia)
NEXT_PUBLIC_8004_REGISTRY_ADDRESS=0x8004A818BFB912233c491871b3d84c89A494BD9e
NEXT_PUBLIC_8004_REPUTATION_ADDRESS=0x8004B663056A597Dffe9eCcC1965A193B7388713

# Supporting Contracts
NEXT_PUBLIC_PRICE_ORACLE_ADDRESS=0x5C4AC3dAF76708DCd51911BA3B33027eAB1B4047
NEXT_PUBLIC_COMMIT_REVEAL_ADDRESS=0x6CEd1574A3dF7ec646e43DD8408300117c453Aa3
NEXT_PUBLIC_SLASH_MANAGER_ADDRESS=0x7Cf955900FD7a12680E90D834eAf19346f5DBcf9

# RPC URLs
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://ethereum-sepolia.publicnode.com
```

---

## Contract Wiring

The contracts are wired together as follows:

```
ERC-8004 Identity (0x8004...)
       │
       ├──► AgentSkillRegistry
       │         │
       │         └──► Uses identity for agent verification
       │
       └──► ServiceRegistry
                 │
                 └──► AgenticCommerce
                           │
                           └──► Jobs reference services
```

```
AgentReview
       │
       └──► SlashManager
                 │
                 └──► 3-of-5 multisig for slashing
```

---

## Important Updates

### March 29, 2026 - ServiceRegistryV2 Deployment

**ServiceRegistryV2** has been deployed to fix a critical ABI bug in V1.

**Changes:**

- **Proxy**: `0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201` (UUPS pattern)
- **Implementation**: `0xcF7f9685d1BB8De46e48D20f06820B4eCa660F6c`
- **Bug Fixed**: Old contract called `identityRegistry.getAgent()` which doesn't exist in ERC-8004
- **Solution**: New contract uses `IERC721.ownerOf()` for proper agent verification

**Action Required:**

- AgenticCommerce and CommitReveal need to update their ServiceRegistry reference
- See `docs/SERVICEREGISTRYV2_DEPLOYMENT.md` for update commands

## Updating This Document

When deploying new contracts:

1. Update this document with new addresses
2. Update `apps/web/.env.local` with new addresses
3. Update `.env.example` in project root
4. Update any other docs that reference these addresses
5. Update `docs/DEPLOYED_CONTRACTS.md` (this file) as the source of truth
