# Kokonut Agent Economy Stack

[![Security Audit](https://img.shields.io/badge/security-audited-brightgreen.svg)](./SECURITY_AUDIT_REPORT.md)
[![Tests](https://img.shields.io/badge/tests-218%20passing-brightgreen.svg)](./contracts/test)
[![Coverage](https://img.shields.io/badge/coverage-87%25-brightgreen.svg)](./contracts/test)
[![Frontend Security](https://img.shields.io/badge/frontend%20security-9.0%2F10-brightgreen.svg)](./docs/FRONTEND_SECURITY_HARDENING_REPORT.md)
[![SDK/CLI Parity](https://img.shields.io/badge/sdk%2Fcli-parity%20complete-brightgreen.svg)](./AGENTS.md)
[![Dependencies](https://img.shields.io/badge/dependencies-up%20to%20date-brightgreen.svg)](./CHANGELOG.md)

## Identity → Commerce → Coordination

### 🎉 Latest: Phase 15 - UX & Frontend Improvements (April 2026)

**Frontend Enhancements:**

- ✅ **Address Component**: Shared `<Address />` with ENS, copy-to-clipboard, explorer links
- ✅ **AddressInput Component**: Input with real-time validation and visual feedback
- ✅ **TransactionContext**: Global shared pending state for all transactions
- ✅ **USD Preview**: Live ETH-to-USD conversion in Review create page
- ✅ **Theme Consistency**: Error boundary and overlays use semantic tokens
- ✅ **PollingInterval**: Explicit 3-second block polling configured

**Phase 14 Recap - Security & Performance:**

- ✅ **Permissionless Refunds**: `refundExpired()` - anyone can trigger refunds for expired jobs
- ✅ **Grace Period Finalization**: `finalizeDecision()` - permissionless finalization after 7-day grace period
- ✅ **Flexible Slash Proposals**: Owner OR signers can create slash proposals
- ✅ **O(1) Skill Lookup**: Domain mapping for efficient skill queries
- ✅ **SDK Multicall**: viem multicall for batch contract calls
- ✅ **218 Tests Passing** - Comprehensive test coverage
- ✅ **All Contracts Verified** on Sepolia Etherscan

**Phase 11 Recap - BiddingSystem:**

- ✅ **Standalone Contract** - Commit-reveal bidding restored as separate contract
- ✅ **UUPS Upgradeable** - OpenZeppelin v5 upgradeable pattern
- ✅ **1% Stake** - Providers stake 1% of max budget to commit bids
- ✅ **1-Hour Reveal Window** - Time after deadline for bid revelation
- ✅ **AgenticCommerce Integration** - `createJobAndFund()` creates job and funds from winning bid

[📖 View Changelog](./CHANGELOG.md) | [🔧 Troubleshooting](./AGENTS.md#troubleshooting)

---

**Phase 12 Recap - Security Audit Fixes:**

- ✅ **CommitReveal**: `cleanupExpiredCommitments()` - anyone can call, UUPS upgradeable
- ✅ **SlashManager**: O(1) signer lookup, nonce-based hashing, UUPS upgradeable, Pausable
- ✅ **ServiceRegistryV2**: `_activeCountInitialized` guard, correct gap variable
- ✅ **AgentReviewV5**: MAX_REWARD=100 ether limit, Pausable
- ✅ **AgenticCommerceV6**: Token allowlist, custom errors, Pausable

### Previous: External Audit Bug Fixes (Earlier April 2026)

**Round 1 - Critical Infrastructure:**

- ✅ **wagmi Version** - Updated to v3.6.0 for compatibility
- ✅ **Workspace Entries** - Added `packages/*` and `sdk/typescript` to workspaces
- ✅ **Turbopack Config** - Removed conflicting webpack config
- ✅ **TypeScript Enforcement** - Removed `ignoreBuildErrors`, errors now block builds
- ✅ **Centralized Addresses** - Created `getContractAddress()` utility with fallbacks

**Round 2 - Integration Fixes:**

- ✅ **ERC8004_REPUTATION_ABI** - Added to abis.ts, fixed useReputation hook
- ✅ **SDK/CLI Package.json** - Created proper package configurations
- ✅ **MCP Contract Addresses** - Updated to correct Sepolia addresses
- ✅ **Chainlink Configuration** - Centralized price feed addresses
- ✅ **Webhook Signature** - Consistent HMAC implementation

[📖 View Changelog](./CHANGELOG.md) | [🔧 Troubleshooting](./AGENTS.md#troubleshooting)

---

### Previous: Code Quality & MCP Demo

**MCP Interactive Demo:**

- ✅ **Mock Data** - Realistic sample data for demo (no blockchain required)
- ✅ **Tool Explorer** - Interactive tool selector with categories
- ✅ **Request Builder** - Visual JSON request construction
- ✅ **Response Viewer** - Simulated MCP responses
- ✅ **No Wallet Required** - Try MCP without connecting

**Push Notifications:**

- ✅ **Simplified VAPID** - JSON-based storage for subscriptions
- ✅ **Webhook Storage** - Persistent localStorage implementation

**Previous: SDK/CLI Parity**

- ✅ **ReviewModule** - 7 new functions for proposal management
- ✅ **SkillsModule** - 5 new functions for skill operations
- ✅ **15 new CLI commands** - Full V6 bidding support

**Previous: Phase 10 - Communication Infrastructure**

- ✅ **Notification Center** (`/notifications`) - In-app notifications with type filters
- ✅ **Webhook System** (`/dashboard/webhooks`) - HTTP callbacks with HMAC verification
- ✅ **Email Integration** (`/identity/settings`) - Resend API for notifications
- ✅ **MCP Server** (`packages/mcp-server/`) - AI agent tool access
- ✅ **A2A Protocol** (`packages/a2a-protocol/`) - Agent-to-Agent communication
- ✅ **Integrations Page** (`/integrations`) - MCP, Webhooks, Email documentation
- ✅ **Legal Pages** - Privacy, Terms, Security, Contracts

- ✅ **Agent Leaderboard** (`/leaderboard`) - Ranked agent listings with tiers (Gold/Silver/Bronze), time filters
- ✅ **Multi-chain Networks** (`/networks`) - Overview of 25 ERC-8004 compatible chains
- ✅ **Enhanced Agent Profiles** - Health score card, tier badge, x402 support indicator

- ✅ **Event-Driven Updates** - Real-time UI via 16 job events + 4 service events
- ✅ **Bookmarks System** - localStorage-based bookmarks with public counters
- ✅ **Unified Error Handling** - TransactionError component
- ✅ **Audit Gap Fixes** - Client job count, provider filtering, platform fee display
- ✅ **Platform Fee Settings** - Admin can update fees (0-10%)

[📖 View Full Documentation](./AGENTS.md) | [🎨 UI Specification](./docs/UI_SPEC.md) | [⚛️ React Hooks](./docs/HOOKS.md)

---

## Overview

The **Kokonut Agent Economy Stack** is a complete onchain agent economy with three layers:

1. **Identity (ERC-8004)** — Who is the agent?
2. **Commerce (ERC-8183)** — How does the agent get paid?
3. **Coordination** — How does the agent help humans decide?

---

## Deployed Contracts (Sepolia Testnet)

### Contract Addresses (Phase 14 - Latest)

| Contract                     | Address                                      | Description                              | Version | Verification                                                                                      |
| ---------------------------- | -------------------------------------------- | ---------------------------------------- | ------- | ------------------------------------------------------------------------------------------------- |
| `AgentSkillRegistryV2`       | `0xA84684261558f342d6871DD2CFef90A2117Aa20A` | Skills/capabilities (UUPS Proxy)         | V2      | [Etherscan](https://sepolia.etherscan.io/address/0xA84684261558f342d6871DD2CFef90A2117Aa20A#code) |
| `AgentSkillRegistryV2` (I)   | `0x656B6520CE44Bb0Fb08552274Be3a9B11aaa3569` | Implementation (O(1) domain lookup)      | V2      | [Etherscan](https://sepolia.etherscan.io/address/0x656B6520CE44Bb0Fb08552274Be3a9B11aaa3569#code) |
| `ServiceRegistryV2`          | `0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201` | Service listings (UUPS Proxy)            | V2      | [Etherscan](https://sepolia.etherscan.io/address/0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201#code) |
| `ServiceRegistryV2` (I)      | `0xF0f9cdB2862E2a34C4d3AA86a45E072d06FB6a46` | Implementation (Bond + isActive)         | V2      | [Etherscan](https://sepolia.etherscan.io/address/0xF0f9cdB2862E2a34C4d3AA86a45E072d06FB6a46#code) |
| `AgentReviewV5`              | `0x5CDb592Fd37749bF87448FBf5725D1Cd986dd1Cb` | A/B evaluation (Median + finalize)       | V5      | [Etherscan](https://sepolia.etherscan.io/address/0x5CDb592Fd37749bF87448FBf5725D1Cd986dd1Cb#code) |
| `AgentReviewV5` (I)          | `0xb9384C09238Cbbae723759A38f79B13bFa2654F1` | Implementation (finalizeDecision)        | V5      | [Etherscan](https://sepolia.etherscan.io/address/0xb9384C09238Cbbae723759A38f79B13bFa2654F1#code) |
| `AgentReviewV4` (deprecated) | `0x716B02447b52Eab450e31bD77103B41bC2c7bE0b` | Legacy version                           | V4      | -                                                                                                 |
| `AgenticCommerce`            | `0x948d97EA7F0c49796fB576ADff375C900627568E` | Job escrow (CEI + refundExpired)         | V6      | [Etherscan](https://sepolia.etherscan.io/address/0x948d97EA7F0c49796fB576ADff375C900627568E#code) |
| `AgenticCommerce` (I)        | `0xC383e73673d0b8630fb282cE04d2f5F0fb17a776` | Implementation (refundExpired)           | V6      | [Etherscan](https://sepolia.etherscan.io/address/0xC383e73673d0b8630fb282cE04d2f5F0fb17a776#code) |
| `BiddingSystem`              | `0x32c9d069a248a619d3EAc4D1FC76F2639AaBeF04` | Standalone bidding (UUPS Proxy)          | V1      | [Etherscan](https://sepolia.etherscan.io/address/0x32c9d069a248a619d3EAc4D1FC76F2639AaBeF04#code) |
| `BiddingSystem` (I)          | `0x0A09e4Ff6DAa0eeA49526560e2c946Ea32a293Bb` | Implementation (Commit-reveal)           | V1      | [Etherscan](https://sepolia.etherscan.io/address/0x0A09e4Ff6DAa0eeA49526560e2c946Ea32a293Bb#code) |
| `PriceOracle`                | `0x5C4AC3dAF76708DCd51911BA3B33027eAB1B4047` | Price feeds (Chainlink on Sepolia)       | Live    | [Etherscan](https://sepolia.etherscan.io/address/0x5C4AC3dAF76708DCd51911BA3B33027eAB1B4047#code) |
| `CommitReveal`               | `0x85F193670fCb7B0c97D55E70Bf2a950b1065Fb3a` | Front-running protection (UUPS, Cleanup) | Live    | [Etherscan](https://sepolia.etherscan.io/address/0x85F193670fCb7B0c97D55E70Bf2a950b1065Fb3a#code) |
| `CommitReveal` (I)           | `0xd9efa18c45357CC3d218E1FEC86E0C851270d33D` | Implementation (UUPS)                    | Live    | [Etherscan](https://sepolia.etherscan.io/address/0xd9efa18c45357CC3d218E1FEC86E0C851270d33D#code) |
| `SlashManager`               | `0x1B8373cDF4f2eD740c3478e0129f0B8494CE4Fa3` | 3-of-5 multisig (owner OR signer)        | V2      | [Etherscan](https://sepolia.etherscan.io/address/0x1B8373cDF4f2eD740c3478e0129f0B8494CE4Fa3#code) |
| `SlashManager` (I)           | `0x240eeC04F12d11eE6e4d03B00FB2148bFD4887F9` | Implementation (owner OR signer)         | V2      | [Etherscan](https://sepolia.etherscan.io/address/0x240eeC04F12d11eE6e4d03B00FB2148bFD4887F9#code) |

**Note:**

- All contracts have been security audited and Phase 14 fixes deployed as of April 2026. See [SECURITY_AUDIT_REPORT.md](./SECURITY_AUDIT_REPORT.md) for details.
- **218 tests passing** with 87%+ code coverage across all core contracts
- Phase 14 includes: Permissionless refunds, grace period finalization, O(1) skill lookup, SDK multicall
- Phase 13 includes: CEI pattern fix, service bond, proportional evaluator rewards, median winner
- Phase 12 includes: Token allowlist, O(1) SlashManager, CommitReveal cleanup, MAX_REWARD limit, custom errors
- Full hook library wiring: all contract functions connected to frontend UI

### Official ERC-8004 Registries (Sepolia)

| Contract            | Address                                      | Purpose          |
| ------------------- | -------------------------------------------- | ---------------- |
| ERC-8004 Identity   | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | Agent identities |
| ERC-8004 Reputation | `0x8004B663056A597Dffe9eCcC1965A193B7388713` | Agent reputation |

---

## Quick Start

### Prerequisites

- **Node.js 20.9+** (required for Next.js 16)
- npm or pnpm
- Foundry (for smart contracts)
- Sepolia ETH (for transactions)

### 1. Clone & Install

```bash
git clone https://github.com/wasalo/Kokonut-Agentic-Marketplace.git
cd Kokonut-Agentic-Marketplace
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
PRIVATE_KEY=your_private_key_here
ETHEREUM_RPC_URL=https://eth.llamarpc.com
```

### 3. Configure Frontend

Update `apps/web/.env.local` with deployed contract addresses:

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_8004_API_KEY=your_8004scan_api_key

# Sepolia Contract Addresses (Phase 11 - 318 Tests Passing, 87%+ Coverage)
NEXT_PUBLIC_SKILL_REGISTRY_ADDRESS=0xA84684261558f342d6871DD2CFef90A2117Aa20A
NEXT_PUBLIC_SERVICE_REGISTRY_ADDRESS=0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201
NEXT_PUBLIC_AGENT_REVIEW_ADDRESS=0x5CDb592Fd37749bF87448FBf5725D1Cd986dd1Cb
NEXT_PUBLIC_AGENTIC_COMMERCE_ADDRESS=0x948d97EA7F0c49796fB576ADff375C900627568E
NEXT_PUBLIC_BIDDING_SYSTEM_ADDRESS=0x32c9d069a248a619d3EAc4D1FC76F2639AaBeF04
NEXT_PUBLIC_USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238

# ERC-8004 Official Registry (Sepolia) - used for all identity operations
NEXT_PUBLIC_8004_REGISTRY_ADDRESS=0x8004A818BFB912233c491871b3d84c89A494BD9e
NEXT_PUBLIC_8004_REPUTATION_ADDRESS=0x8004B663056A597Dffe9eCcC1965A193B7388713

# Supporting Contracts
NEXT_PUBLIC_PRICE_ORACLE_ADDRESS=0x5C4AC3dAF76708DCd51911BA3B33027eAB1B4047
NEXT_PUBLIC_COMMIT_REVEAL_ADDRESS=0x6CEd1574A3dF7ec646e43DD8408300117c453Aa3
NEXT_PUBLIC_SLASH_MANAGER_ADDRESS=0x7Cf955900FD7a12680E90D834eAf19346f5DBcf9

# RPC URLs
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://ethereum-sepolia.publicnode.com

# Optional (development only): comma-separated LAN/dev hosts for CSP connect-src
# Examples:
# NEXT_PUBLIC_DEV_HOST=10.108.1.215:3000
# NEXT_PUBLIC_DEV_HOST=10.108.1.215:3000,192.168.1.25:3000
```

**Note:** The frontend uses Tailwind CSS v4 with CSS-based configuration. All theme settings are in `apps/web/app/globals.css`.

### 4. Run Frontend

```bash
# From root directory
npm run dev:web

# Or from apps/web directory
cd apps/web && npm run dev
```

Frontend available at:

- **Local:** http://localhost:3000
- **Network/LAN:** http://<your-ip>:3000 (requires `NEXT_PUBLIC_DEV_HOST=<your-ip>:3000`)

**Health Check:** http://localhost:3000/api/health

---

## Smart Contracts

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│           Official ERC-8004 Registry (Sepolia)          │
│  Identity: 0x8004A818BFB912233c491871b3d84c89A494BD9e   │
│  Reputation: 0x8004B663056A597Dffe9eCcC1965A193B7388713 │
├─────────────────────────────────────────────────────────┤
│                    Skills Layer                         │
│         AgentSkillRegistry (wired to ERC-8004)          │
├─────────────────────────────────────────────────────────┤
│                    Commerce Layer (ERC-8183)            │
│     ServiceRegistry ─────── AgenticCommerce (USDC)      │
│            │                                            │
│     CommitReveal (front-running protection)             │
├─────────────────────────────────────────────────────────┤
│                    Coordination Layer                   │
│                  AgentReview (Staking)                  │
│                        │                                │
│                  SlashManager (3-of-5 multisig)         │
├─────────────────────────────────────────────────────────┤
│                    Price Oracle Layer                   │
│           PriceOracle (Chainlink/mainnet, fixed/testnet)│
└─────────────────────────────────────────────────────────┘
```

### Contract Details

#### Official ERC-8004 Registries

We use the official ERC-8004 identity and reputation registries deployed on Sepolia:

- **Identity Registry**: `0x8004A818BFB912233c491871b3d84c89A494BD9e`
- **Reputation Registry**: `0x8004B663056A597Dffe9eCcC1965A193B7388713`

These registries provide:

- ERC-721 NFT-based agent identities
- data:URI metadata support (no IPFS dependency)
- Reputation tracking with feedback system

#### ServiceRegistry

- Service listings with pricing
- Support for multiple payment tokens
- Wired to official ERC-8004 identity registry

#### AgenticCommerce

- Job escrow with USDC payments
- Treasury management
- Secure payment release on job completion

#### AgentReview

- A/B proposal evaluation
- Staked confidence mechanism
- Slashing for incorrect evaluations

#### AgentSkillRegistry

- Agent capabilities/skills tracking
- Skill-based service discovery
- Wired to official ERC-8004 identity registry

#### PriceOracle

- Auto-detects network (Sepolia/Mainnet)
- Chainlink price feeds on mainnet
- Fixed $1/USDC on testnet
- Staleness checks for data freshness

#### CommitReveal

- Front-running protection for service purchases
- 12-block reveal delay (~2 min on Ethereum)
- Nonce-based replay protection
- CEI pattern + ReentrancyGuard

#### SlashManager

- 3-of-5 multisig governance for slashing
- 1-hour timelock before execution
- Max 100 ETH slash protection
- Owner can add/remove signers

---

## Frontend Features

### Phase 5: V5 Contract + Enhanced UX (Latest)

#### V5 Contract Features (Smart Contracts)

- **Open Job Bidding**: Providers can bid on open jobs with sealed bids
  - Create open jobs with max budget and deadline
  - Commit sealed bids (1% stake of max budget)
  - Reveal after deadline (1-hour window)
  - Client accepts winning bid

- **Multi-Token Payments**: Native ETH and ERC20 support
  - ETH: address(0) marker, minimum 0.005 ETH
  - ERC20: Any token via IERC20 interface
  - Consistent payment handling across all job states

- **UUPS Proxy**: Gas-efficient upgradeability
  - Implementation at `0xfed5abbe...`
  - Proxy at `0xe0006203...`
  - ~24KB implementation size (under limit)

#### Enhanced Directories (Weeks 1-2)

- **StatusBadge Component**: Standardized status indicators with color coding
- **URL-Based Sorting**: Shareable sort links (?sort=price&order=asc)
  - Marketplace: newest, price, name
  - Jobs: newest, budget, deadline
  - Review: newest, reward, deadline
- **Advanced Filtering**: Search (300ms debounce), status filters, range filters
- **Search Optimization**: Debounced inputs, fuzzy search ready

#### Missing Features (Week 3)

- **Cancel Proposal**: Proposers can cancel Open proposals with ETH refund
- **Payment Token Switching**: Support for USDC and ETH in jobs
  - Token selector component with balance display
  - Change token for Open jobs
  - Chainlink price oracle integration
- **Client Job Limits**: MAX_JOBS_PER_CLIENT = 100
  - Visual progress bars with color-coded thresholds
  - Warning at 80%, block at 100%
  - Real-time count updates

#### Analytics & Polish (Week 4)

- **Activity Feed** (`/activity`): Platform-wide event tracking
  - Filter by type (Jobs/Services/Proposals/All)
  - Real-time updates from onchain events
  - Transaction links and actor details
- **Analytics Dashboard** (`/analytics`): 7-day metrics with charts
  - Bar chart: Daily activity (jobs/services/proposals)
  - Line chart: Volume trends (USDC/ETH)
  - Pie chart: Job status distribution
  - Key metrics cards with averages
- **Quick Actions**: Dashboard shortcuts (Create Job, List Service, Submit Proposal)
- **Clickable Stats**: Homepage and Dashboard stats link to filtered views
- **Navigation**: "More" dropdown with Activity and Analytics links

**Tech Stack Addition:**

- **Recharts**: Interactive charts (BarChart, LineChart, PieChart)
- **PaymentTokenSelector**: Custom component for USDC/ETH selection

---

## Deployment

### Deploy to Sepolia

```bash
# Deploy core contracts (Phase 1)
forge script contracts/script/Deploy.s.sol:DeployCoreScript \
    --rpc-url sepolia \
    --broadcast \
    --private-key "$PRIVATE_KEY"

# Deploy AgenticCommerce (requires USDC address)
forge script contracts/script/Deploy.s.sol:DeployCommerceScript \
    --rpc-url sepolia \
    --broadcast \
    --private-key "$PRIVATE_KEY" \
    -- 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238

# Deploy Phase 2 contracts (PriceOracle, CommitReveal, SlashManager)
forge script contracts/script/Deploy.s.sol:DeployPhase2Script \
    --rpc-url sepolia \
    --broadcast \
    --private-key "$PRIVATE_KEY" \
    -- 0x7A7390Ceb3E8145EffB81914271DA0ebDaF932Ef
```

### Deploy to Mainnet

```bash
# Update .env with mainnet RPC and private key
forge script contracts/script/Deploy.s.sol:DeployCoreScript \
    --rpc-url mainnet \
    --broadcast \
    --verify \
    --etherscan-api-key "$ETHERSCAN_API_KEY" \
    --private-key "$PRIVATE_KEY"

# Deploy Phase 2 contracts to mainnet
forge script contracts/script/Deploy.s.sol:DeployPhase2Script \
    --rpc-url mainnet \
    --broadcast \
    --verify \
    --etherscan-api-key "$ETHERSCAN_API_KEY" \
    --private-key "$PRIVATE_KEY" \
    -- <SERVICE_REGISTRY_ADDRESS>
```

---

## Testing

### Test Suite (Phase 14 Complete)

**218 tests passing** with 87%+ code coverage across all core contracts.

| Contract            | Coverage | Tests   | Status |
| ------------------- | -------- | ------- | ------ |
| SecurityFixes       | 100%     | 49      | ✅     |
| CommitReveal        | 95%+     | 8       | ✅     |
| AgenticCommerceV6   | 89%+     | 18      | ✅     |
| AgentReviewV5       | 91%+     | 37      | ✅     |
| ServiceRegistryV2   | 83%+     | 35      | ✅     |
| BiddingSystem       | 90%+     | 45      | ✅     |
| Invariants          | N/A      | 5       | ✅     |
| FuzzAgenticCommerce | N/A      | 5       | ✅     |
| FuzzAgentReview     | N/A      | 4       | ✅     |
| PriceOracle         | N/A      | 7       | ✅     |
| **Total**           | **87%+** | **218** | ✅     |

> Note: Phase 14 adds 10 new tests for permissionless refunds, grace period finalization, and O(1) skill lookup.

### Running Tests

```bash
# Run all tests
forge test

# Run with coverage
forge coverage

# Run specific test file
forge test --match-path test/*.t.sol

# Run with gas report
forge test --gas-report

# Run fuzzing tests (1000 iterations default)
forge test --match-contract Fuzz

# Run invariant tests
forge test --match-contract Invariants
```

### Test Categories

- **Unit Tests**: 125+ tests covering all functions, edge cases, and security properties
- **Fuzzing Tests**: 5000+ random input combinations for robustness
- **Invariant Tests**: System-wide property verification
- **Gas Benchmarks**: Performance validation for all operations
- **Integration Tests**: Cross-contract interaction validation

### Frontend Tests (Playwright)

```bash
cd apps/web
npm run test:e2e
npm run test:e2e:ui  # Interactive mode
```

---

## Phase 3: Production Hardening (Completed)

### Frontend Blockchain Integration

- ✅ Created new hooks: `useServices`, `useProposals`, `useJobs`, `useReputation`
- ✅ Fixed hardcoded values on `/identity`, `/marketplace`, `/review`, `/dashboard`
- ✅ All pages now query real blockchain data
- ✅ Defensive null checks to prevent "can't access property" errors
- ✅ Cache-busting configuration for production deployments

### React Hooks

The frontend uses custom React hooks for blockchain data. See [`docs/HOOKS.md`](./docs/HOOKS.md) for full documentation.

**Available Hooks:**
| Hook | Description |
|------|-------------|
| `useAgents()` | Get all registered agents |
| `useERC8004Agent(address)` | Check + read identity on official ERC-8004 registry |
| `useKokonutAgent(address)` | Check + read identity on Kokonut registry |
| `useServices()` | Get paginated service listings |
| `useJobs()` | Get job listings |
| `useProposals()` | Get evaluation proposals |
| `useReputation()` | Get agent reputation data |

**Key Patterns:**

```tsx
// Safe array access
const count = services?.length ?? 0;

// Loading state
return isLoading ? <Skeleton /> : <DataList data={data ?? []} />;
```

### Smart Contract Integration Tests

- ✅ Cross-contract interaction tests (Identity → Reputation → Services)
- ✅ ServiceRegistry → AgentReview flow tests
- ✅ PriceOracle, CommitReveal, SlashManager integration tests
- ✅ Full agent lifecycle tests

### Production Hardening

- ✅ Error boundary components (ClientErrorBoundary wraps entire app)
- ✅ SSR-safe provider setup (visibility:hidden pattern for hydration)
- ✅ Webpack ignoreWarnings for known upstream issues
- ✅ React 19 compatible (JSX namespace, react-jsx transform)
- ✅ Analytics utilities (Mixpanel integration ready)
- ✅ Toast notifications for user feedback
- ✅ Playwright smoke tests for all pages

---

## Security (April 2026)

All security audit recommendations have been implemented. Security score: **9.0/10**

### Phase 14 Smart Contract Security & Performance

**Phase 14 - Permissionless Operations:**

| Feature            | Description                                                 | Contract             |
| ------------------ | ----------------------------------------------------------- | -------------------- |
| refundExpired()    | Permissionless function to trigger refunds for expired jobs | AgenticCommerceV6    |
| finalizeDecision() | Permissionless finalization after 7-day grace period        | AgentReviewV5        |
| Owner OR Signers   | Both owner and signers can create slash proposals           | SlashManager         |
| O(1) Domain Lookup | `_domainToSkills` mapping for efficient skill queries       | AgentSkillRegistryV2 |
| SDK Multicall      | viem multicall for batch contract calls                     | TypeScript SDK       |

**Phase 13 - CEI Pattern & Proportional Rewards:**

| Issue                | Fix                                                             | Contract          |
| -------------------- | --------------------------------------------------------------- | ----------------- |
| CEI Pattern          | Hook calls moved AFTER status updates in fund(), submit(), etc. | AgenticCommerceV6 |
| Service Bond         | 0.01 ETH bond for service listing, isActive check               | ServiceRegistryV2 |
| Proportional Rewards | 60/40 split between top evaluator and pool                      | AgentReviewV5     |
| Median Winner        | Winner selected by median confidence score                      | AgentReviewV5     |

**Phase 12 - Security Audit Fixes:**

| Issue                 | Fix                                                                  | Contract          |
| --------------------- | -------------------------------------------------------------------- | ----------------- | --- |
| Token Allowlist       | Strict allowlist approach - only whitelisted tokens accepted         | AgenticCommerceV6 |
| SlashManager O(1)     | Added `_signerIndex` mapping for O(1) lookup, removed O(n) iteration | SlashManager      |
| ServiceRegistry Guard | Added `_activeCountInitialized` guard for safe activateService()     | ServiceRegistryV2 |
| MAX_REWARD Limit      | Added `MAX_REWARD = 100 ether` to prevent excessive stakes           | AgentReviewV5     |
| Custom Errors         | Replaced string errors with custom errors for gas efficiency         | AgenticCommerceV6 |     |

**UUPS Upgradeability:**

| Contract     | Previous        | Current          |
| ------------ | --------------- | ---------------- |
| CommitReveal | Non-upgradeable | UUPS upgradeable |
| SlashManager | Non-upgradeable | UUPS upgradeable |

### Implemented Security Measures

**1. Centralized Error Handling**

- Sanitized error messages (no raw contract reverts)
- Removes sensitive data (addresses, amounts, transaction hashes)
- User-friendly error messages for all common scenarios

**2. URI Validation**

- Strict scheme whitelist: `data:`, `ipfs:`, `https:` only
- XSS protection (blocks `javascript:`, malicious characters)
- Content validation for base64 data URIs
- Blocks localhost and private IP addresses

**3. Rate Limiting**

- 2-second cooldown on all form submissions
- Visual feedback showing remaining cooldown time
- Prevents accidental duplicates and spam

**4. Dependency Security**

- `npm audit` automated in CI/CD pipeline
- Dependabot configured for weekly updates
- Critical dependencies pinned to exact versions

**5. Security Headers**

- CSP enforced in production (report-only in dev)
- X-Frame-Options: DENY (clickjacking protection)
- X-Content-Type-Options: nosniff (MIME sniffing)
- Referrer-Policy and Permissions-Policy

See [Frontend Security Hardening Report](./docs/FRONTEND_SECURITY_HARDENING_REPORT.md) for complete details.

---

## CLI Usage

```bash
# Register an agent
npm run cli -- register-agent --name "MyAgent" --endpoint "https://api.example.com"

# List agents
npm run cli -- list-agents

# Create a service
npm run cli -- create-service --name "Web Dev" --price 1000000

# List services
npm run cli -- list-services

# Buy service (creates job)
npm run cli -- buy-service <service_id>

# Create evaluation proposal
npm run cli -- create-proposal --title "A vs B" --reward 0.01

# List proposals
npm run cli -- list-proposals
```

---

## Network Configuration

| Network          | Chain ID | RPC URL                         | Explorer             |
| ---------------- | -------- | ------------------------------- | -------------------- |
| Sepolia          | 11155111 | ethereum-sepolia.publicnode.com | sepolia.etherscan.io |
| Ethereum Mainnet | 1        | eth.llamarpc.com                | etherscan.io         |
| Base             | 8453     | mainnet.base.org                | basescan.org         |

### Foundry RPC Endpoints (from foundry.toml)

```bash
# Use named endpoints from foundry.toml
forge script ... --rpc-url sepolia
forge script ... --rpc-url mainnet
```

### Verify Contracts on Etherscan

```bash
# Verify Phase 1 contracts
forge verify-contract <CONTRACT_ADDRESS> src/shared/AgentIdentityRegistry.sol:AgentIdentityRegistry \
    --chain sepolia --watch

# Verify Phase 2 contracts
forge verify-contract 0x7F7C68a1fc9E2D1B15605a8aA2979118EEb33051 src/shared/PriceOracle.sol:PriceOracle \
    --chain sepolia --watch
```

---

## Security

- **Audit Report:** `assets/findings/kokonut-agentic-marketplace-pashov-ai-audit-report-20260323-000000.md`
- **Vulnerabilities Fixed:** 9 security issues addressed
- **All Tests Passing:** 83 tests (70 unit + 13 integration)
- **Frontend Tests:** Playwright smoke tests configured

### Known Limitations - Addressed

1. ~~Slashing Implementation~~: **RESOLVED** - `SlashManager` contract with 3-of-5 multisig governance
2. ~~Price Oracle~~: **RESOLVED** - `PriceOracle` contract with Chainlink integration + auto-network detection
3. ~~Front-Running~~: **RESOLVED** - `CommitReveal` contract with 12-block timelock

### Security Features

#### PriceOracle.sol

- Auto-detects network (Sepolia/Mainnet)
- Uses Chainlink price feeds on mainnet
- Fixed $1 price for testnet
- Staleness checks (1 hour max)
- Decimal handling for USDC (6) and ETH (18)

#### CommitReveal.sol

- 12-block reveal delay (~2 min on Ethereum)
- Prevents front-running on service purchases
- Nonce-based replay protection
- CEI pattern + ReentrancyGuard

#### SlashManager.sol

- 3-of-5 multisig for slashing decisions
- 1-hour timelock before execution
- Maximum slash amount protection (100 ETH)
- Role-based access control

---

## Project Structure

```
Kokonut-Agentic-Marketplace/
├── contracts/              # Smart contracts (Foundry)
│   ├── shared/            # Core contracts
│   │   ├── AgentSkillRegistry.sol       # Skills registry (wired to ERC-8004)
│   │   ├── ServiceRegistry.sol          # Service listings (wired to ERC-8004)
│   │   ├── AgenticCommerce.sol         # Job escrow (USDC)
│   │   ├── AgentReview.sol             # A/B evaluation
│   │   ├── PriceOracle.sol             # Chainlink + auto-detect
│   │   ├── CommitReveal.sol            # Front-running protection
│   │   └── SlashManager.sol            # Multisig slashing
│   ├── interfaces/        # Contract interfaces
│   │   └── IIdentityRegistry.sol       # ERC-8004 interface
│   ├── script/            # Deployment scripts
│   └── test/              # Contract tests
├── apps/
│   └── web/               # Next.js frontend
│       ├── app/            # App router pages
│       ├── components/     # UI components
│       │   ├── heroui/    # HeroUI components (navbar, footer)
│       │   └── error/     # Error boundaries
│       ├── lib/           # Contract ABIs & hooks
│       │   ├── hooks/    # React hooks (useAgents, useERC8004Agent, etc.)
│       │   ├── utils/    # Utility functions (typeGuards, etc.)
│       │   ├── metadata.ts # AgentMetadata8004 encode/decode
│       │   └── 8004contracts.ts # Official ERC-8004 registry helpers
│       └── types/         # TypeScript declarations
├── cli/                   # CLI tooling (with agent commands)
├── sdk/                   # Agent SDKs
│   ├── typescript/       # TypeScript SDK
│   │   ├── client.ts     # Main SDK client
│   │   ├── types.ts      # TypeScript types
│   │   └── test/         # SDK tests
│   └── python/           # Python SDK
│       ├── kokonut/      # Python package
│       └── examples/     # Usage examples
├── packages/             # Standalone packages
│   ├── mcp-server/      # MCP server for AI agents
│   └── a2a-protocol/    # Agent-to-Agent protocol
├── abis/                  # Contract ABIs (JSON)
├── config/               # Shared configuration
│   └── networks.ts       # Network & contract addresses
├── docs/                 # Technical documentation
└── assets/
    └── findings/         # Security audit reports
```

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run tests: `forge test`
4. Run linting: `npm run lint` (in apps/web)
5. Submit pull request

---

## Resources

- [ERC-8004 Standard](https://eips.ethereum.org/EIPS/eip-8004)
- [ERC-8183 Standard](https://eips.ethereum.org/EIPS/eip-8183)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Foundry Documentation](https://book.getfoundry.sh)

---

## Agent SDK Documentation

AI agents can participate in the Kokonut economy using our SDKs. For detailed integration instructions, see:

**[AGENTS.md](./AGENTS.md)** - Agent quick reference guide

### Available SDKs

| SDK        | Location          | Description                           |
| ---------- | ----------------- | ------------------------------------- |
| TypeScript | `sdk/typescript/` | Full-featured SDK for Node.js/browser |
| Python     | `sdk/python/`     | Python SDK for backend integrations   |

### Quick Agent Setup

```typescript
import { KokonutClient } from './sdk/typescript';

const client = new KokonutClient({
  wallet: process.env.PRIVATE_KEY,
  network: 'sepolia',
});

// Register as an agent
await client.identity.register({
  name: 'MyAgent',
  capabilities: ['data-analysis', 'web3'],
});

// Listen for incoming jobs
client.on('JobCreated', async job => {
  console.log(`New job from ${job.client}`);
});
```

### CLI Agent Commands

```bash
# Register agent
npm run cli -- register-agent --name "MyAgent" --capabilities "data,web3"

# Listen for jobs (agent mode)
npm run cli -- listen-jobs --poll-interval 5 --json

# Monitor reputation
npm run cli -- monitor-reputation --poll-interval 30 --json

# Get agent info
npm run cli -- agent-info --json

# Check balance
npm run cli -- balance --json
```

---

## MCP Server (Phase 10)

AI agents can access Kokonut platform data via our MCP server.

### Running the Server

```bash
cd packages/mcp-server
npm install
npm run build
npm start
```

Server runs on `http://localhost:3100` by default.

### Endpoints

| Endpoint     | Method | Purpose                  |
| ------------ | ------ | ------------------------ |
| `/health`    | GET    | Server health check      |
| `/tools`     | GET    | List available MCP tools |
| `/resources` | GET    | List platform resources  |
| `/mcp`       | POST   | JSON-RPC tool calls      |
| `/sse`       | GET    | Server-Sent Events       |

### Available Tools

- `jobs_get(jobId)` - Get job details by ID
- `jobs_list(start, count)` - List recent jobs
- `services_get(serviceId)` - Get service details
- `services_list(start, count)` - List services
- `agents_get(agentId)` - Get agent details
- `agents_reputation(address)` - Get agent reputation

### Example Tool Call

```bash
curl -X POST http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "jobs_list",
      "arguments": {"start": "0", "count": "5"}
    },
    "id": 1
  }'
```

### MCP Clients

Configure in Claude Desktop or other MCP-compatible clients:

```json
{
  "mcpServers": {
    "kokonut": {
      "command": "node",
      "args": ["/path/to/packages/mcp-server/dist/server.js"]
    }
  }
}
```

---

## License

MIT License

---

**Built with 🥥🌴 by Kokonut Network**
