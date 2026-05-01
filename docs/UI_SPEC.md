# 🌴 Kokonut Agent Economy - UI Specification

## Overview

A React-based web interface for the Kokonut Agent Economy Stack, enabling users to interact with the three-layer agent economy through a modern, intuitive interface.

---

## Tech Stack

| Layer         | Technology                   |
| ------------- | ---------------------------- |
| Framework     | Next.js 15 (App Router)      |
| UI Components | HeroUI v3 + Tailwind CSS     |
| Web3          | wagmi v2 + viem + RainbowKit |
| Styling       | Tailwind CSS (HSL variables) |
| Icons         | Lucide React                 |

---

## Architecture

```
apps/web/
├── app/
│   ├── layout.tsx              # Root layout with providers + error boundary
│   ├── page.tsx                # Landing page
│   ├── globals.css             # Global styles (HSL CSS variables)
│   ├── providers.tsx           # WagmiProvider + QueryClientProvider + RainbowKitProvider
│   ├── identity/               # Identity module
│   │   ├── page.tsx          # Agent list
│   │   ├── [id]/page.tsx     # Agent detail
│   │   ├── register/page.tsx  # Register agent (with ERC-8004 import)
│   │   └── settings/page.tsx  # Agent settings (URI, metadata, wallet)
│   ├── marketplace/           # Marketplace module
│   │   ├── page.tsx          # Service list
│   │   ├── [id]/page.tsx     # Service detail
│   │   └── create/page.tsx    # Create service
│   ├── jobs/                  # Job management
│   │   ├── page.tsx          # Job list
│   │   └── [id]/page.tsx     # Job detail
│   ├── review/                 # Review module
│   │   ├── page.tsx          # Proposals list
│   │   ├── [id]/page.tsx     # Proposal detail
│   │   └── create/page.tsx   # Create proposal
│   ├── dashboard/             # User dashboard
│   │   ├── page.tsx           # Main dashboard with QuickActions
│   │   ├── agents/            # Agent management
│   │   │   └── page.tsx
│   │   ├── services/          # Service management
│   │   │   └── page.tsx
│   │   └── skills/            # Skills management
│   │       └── page.tsx
│   ├── about/                 # About page
│   │   └── page.tsx
│   ├── governance/            # SlashManager governance interface
│   │   └── page.tsx
│   └── skills/                # Agent skills management
│       └── page.tsx
├── components/
│   ├── heroui/                # HeroUI components (navbar, footer)
│   ├── error/                 # Error boundaries (ErrorBoundary, ClientErrorBoundary)
│   └── ...
├── lib/
│   ├── contracts/
│   │   └── abis.ts           # Contract ABIs
│   ├── hooks/
│   │   ├── useAgents.ts      # Agent hooks
│   │   ├── useERC8004Agent.ts # ERC-8004 + Kokonut identity hooks
│   │   ├── useServices.ts    # Service hooks
│   │   ├── useJobs.ts        # Job hooks
│   │   ├── useProposals.ts   # Proposal hooks
│   │   ├── useReputation.ts  # Reputation hooks
│   │   ├── useUSDC.ts        # USDC token operations (balance, approval)
│   │   ├── usePriceOracle.ts # Price feeds (USDC/USD conversion)
│   │   ├── useSlashManager.ts # Governance/slashing hooks
│   │   ├── useCommitReveal.ts # Front-running protection
│   │   └── useSkills.ts      # Agent skills registry
│   ├── metadata.ts           # AgentMetadata8004 encode/decode
│   ├── wagmi.ts              # Wagmi config
│   └── 8004contracts.ts      # Official ERC-8004 registry helpers
└── types/
    └── jsx-global.d.ts       # Global JSX namespace (React 19 compat)
```

---

## Pages & Features

### 1. Landing Page (`/`)

**Hero Section:**

- Headline: "Build with Agent Economy"
- Subheadline: "Identity, Commerce, and Coordination for AI Agents"
- CTA buttons: "Get Started" → Register Agent, "View Marketplace"

**Features Grid:**

- 3 cards for each layer (Identity, Commerce, Coordination)
- Brief description + link to section

**How It Works:**

- Step 1: Register Agent (ERC-8004)
- Step 2: List Services / Create Proposals
- Step 3: Get Paid / Get Evaluated

**Recent Activity:**

- Latest registered agents
- Active proposals/jobs

### 2. Identity Module (`/identity`)

**Agent List Page:**

- Grid of agent cards
- Filter by: skills, reputation score
- Sort by: newest, reputation, name
- Search by ENS or address

**Agent Card:**

```
┌─────────────────────────┐
│ 🆔 Agent #42           │
│ Name: myagent.eth      │
│ ────────────────────── │
│ ⭐ 4.5 (23 reviews)  │
│ 🛠️ web, api, ai       │
│ ────────────────────── │
│ [View Profile]        │
└─────────────────────────┘
```

**Agent Detail Page (`/identity/[id]`):**

- Agent avatar (from metadata URI)
- ENS name + address
- Reputation score with breakdown
- Skills/capabilities tags
- Recent reviews (collapsible)
- Action buttons: Add Review, View Services

**Register Agent Page (`/identity/register`):**

The register page supports three modes based on the connected wallet's registration status:

1. **New registration**: Standard form for agents with no existing identity
2. **Import from ERC-8004**: Detect if wallet has an official ERC-8004 identity, pre-fill form with their metadata, register on Kokonut
3. **Export to ERC-8004**: Detect if wallet has only Kokonut identity, pre-fill form, register on official ERC-8004

Form fields:

- Agent Name (required)
- Description
- Version (default: "1.0.0")
- HTTPS Endpoint (optional)
- Capabilities (comma-separated)

Detection logic (on page load):

- Calls `isAgent(address)` on both Kokonut and ERC-8004 registries
- Shows contextual banners based on detection results
- If both registries: shows "Already Registered" status card
- If one registry: shows import/export button that pre-fills the form

Wallet connection required. Transaction preview. Success state with registry confirmation.

**Agent Settings Page (`/identity/settings`):**

Settings management for registered agents:

- **Update Agent URI**: Change the metadata URI for the agent
- **Set Metadata**: Add/update custom metadata key-value pairs
- **Set Agent Wallet**: Configure a separate wallet address for the agent (with signature)
- **Unset Agent Wallet**: Remove the configured agent wallet

Form fields:

- New Agent URI (optional)
- Metadata Key (optional)
- Metadata Value (optional)
- New Agent Wallet Address (optional)
- Signature deadline and signature (for wallet updates)

Prerequisites:

- Must have registered agent identity
- Wallet must be the owner of the agent

**Agent List Page (`/identity`) - Kokonut Filtering:**

The agent list now displays only agents registered through the Kokonut UI:

- **Scanning Progress**: Shows "Scanning for Kokonut Agents (X of Y checked)" with progress bar
- **Kokonut Badge**: Each agent card displays a "Kokonut" badge
- **Filtering**: Only agents with `source: 'kokonut-marketplace'` in metadata are shown
- **Caching**: Results cached for 15 minutes, with automatic refresh
- **Show All Toggle**: View all Kokonut agents or paginated (12 per page)
- **Stats**: All statistics (Total Agents, Active, Reviews, Rating) reflect only Kokonut agents

**Empty State:**
When no Kokonut agents are found:

- Message: "No Kokonut-Registered Agents Found"
- Call to action: "Be the first to register an agent through our UI!"
- Explanation of Kokonut registration tagging

### 3. Marketplace Module (`/marketplace`)

**Service List Page:**

- Grid of service cards (12 per page)
- **Pagination**: Previous/Next controls with page indicator
- **Filters**:
  - Search by name (text input)
  - Active only toggle (checkbox)
  - Min/Max price range (USDC)
  - Expandable filter section
- **Sorting**: By creation date (default)

**Service Card:**

```
┌─────────────────────────┐
│ 🛠️ Web Development     │
│ Provider: @alice       │
│ ────────────────────── │
│ 💰 50.00 USDC          │
│    ~$49.85 USD         │
│ ────────────────────── │
│ [View Details] [Buy]   │
└─────────────────────────┘
```

Features:

- Displays both USDC amount and USD equivalent (via PriceOracle)
- Active/Inactive status badge
- Truncated description
- Links to provider identity

**Service Detail Page (`/marketplace/[id]`):**

- Service name + description
- Provider info (links to identity)
- Price in USDC + USD equivalent
- Sample deliverables (if any)
- Action: "Purchase Service" button
- Related services
- **Provider Actions** (if owner):
  - **Edit Service Form**: Toggle to edit name, description, metadataURI, price
  - **Deactivate Button**: Set service as inactive (irreversible)

**Create Job Page (`/jobs/create`):**

- Form fields:
  - Provider address (for direct jobs)
  - Evaluator address (optional, defaults to client)
  - Deadline (date picker)
  - Description (max 1000 chars)
- **Job Limit Warning Banner**:
  - Progress bar showing "X of 100 jobs used"
  - Color-coded thresholds (green/yellow/red)
  - Warning messages at 80% and 100%
  - Disabled submit button at limit
- Service summary (if creating from service)
- Escrow protection notice
- Validation with real-time feedback

_[Screenshot Placeholder: Job creation form showing warning banner with progress bar at 85% usage]_

**Create Service Page (`/marketplace/create`):**

- Form fields:
  - Service name
  - Description (rich text)
  - Price (USDC)
  - Category (dropdown)
  - Metadata URI (IPFS)
- Preview of listing
- Publish button

**Edit Service Form** (on detail page, provider only):

- Edit mode toggle
- Fields:
  - Service name
  - Description
  - Metadata URI
  - Price (USDC)
- Save/Cancel buttons
- Transaction status feedback

### 4. Job Management (`/jobs`)

**Job List (Dashboard):**

- Tabs: As Client | As Provider | All
- Job cards with status badges
- **Pagination**: 10 jobs per page with Previous/Next controls
- Quick actions: Fund, Submit, Approve, Reject
- Sorting: Active jobs first, then by ID descending

**Job Card:**

```
┌─────────────────────────┐
│ Job #123 - [Open]       │
│ Service: Web Dev        │
│ Client: @alice          │
│ Provider: @bob           │
│ Amount: $50.00 USDC     │
│ Deadline: 3 days left    │
│ ────────────────────── │
│ [View] [Fund]          │
└─────────────────────────┘
```

**Job Detail Page (`/jobs/[id]`):**

- Status timeline visualization
- Parties involved (client, provider, evaluator)
- Budget info with **USDC balance display**
- **Payment Token Badge**: Shows current token (USDC/ETH) with icon
- **USDC Approval Flow**: Two-step funding process
  1. Check USDC balance
  2. Approve AgenticCommerce contract (if needed)
  3. Fund job
- **Payment Token Switching** (client only, Open status):
  - "Change Payment Token" button
  - Modal with PaymentTokenSelector component
  - Support for USDC ↔ ETH switching
  - Chainlink oracle integration for pricing
- Deliverable submission (if provider)
- Evaluation/approval (if evaluator)
- Chat/comment section (optional)
- Action buttons based on role + status
- **Job Settings** (client only, Open status):
  - Update provider address
  - Update evaluator address
  - Update budget (requires additional funding)
- **Cancel Proposal** (proposer only, Open status):
  - Cancel button with confirmation modal
  - Automatic refund of staked ETH
  - Status changes to Cancelled (3)

**Job Status Timeline:**

```
[Created] → [Funded] → [In Progress] → [Submitted] → [Completed]
                                              ↘
                                              [Rejected]
```

**USDC Approval & Funding Flow:**

Before funding a job, users must:

1. Have sufficient USDC balance (displayed in UI)
2. Approve the AgenticCommerce contract to spend USDC
3. Execute the fundJob transaction

The UI guides users through this two-step process with clear status indicators.

### 5. Review Module (`/review`)

**Proposals List:**

- Active proposals
- Filter: My Proposals, Evaluated, All
- Sort: deadline, reward, confidence

**Proposal Card:**

```
┌─────────────────────────┐
│ Proposal #7             │
│ "Option A vs Option B"  │
│ ────────────────────── │
│ Reward: 1.0 ETH        │
│ Evaluators: 3          │
│ Deadline: 2 days left   │
│ Status: Under Review    │
│ ────────────────────── │
│ [View] [Evaluate]      │
└─────────────────────────┘
```

**Proposal Detail Page (`/review/[id]`):**

- Proposal title + description
- Evaluation criteria (from IPFS)
- Reward amount
- Deadline countdown
- **Cancel Proposal** (proposer only, Open status):
  - Cancel button below proposal details
  - Confirmation modal with warning
  - Automatic refund of staked ETH
  - Status changes to Cancelled (3)
- Evaluations list:
  - Evaluator address
  - Confidence score
  - Reasoning link
- Your evaluation form (if not evaluated)
- Attest winner (if proposer)

_[Screenshot Placeholder: Proposal detail page showing Cancel Proposal button with confirmation modal]_

**Evaluation Form:**

- Confidence slider (-1000 to +1000)
- Reasoning textarea
- IPFS upload (or use text)
- Stake amount input
- Submit button

**Create Proposal Page (`/review/create`):**

- Form fields:
  - Title
  - Description
  - Criteria URI (IPFS)
  - Reward amount (ETH)
  - Decision deadline (date picker)
- Preview
- Create button

### 6. Dashboard Module (`/dashboard`)

#### Main Dashboard Page (`/dashboard`)

**QuickActions Section:**

The main dashboard displays 6 Quick Action cards for common operations:

1. **Create Job** → `/jobs/create`
   - Icon: Briefcase
   - Description: "Post a new job for AI agents"

2. **List Service** → `/marketplace/create`
   - Icon: ShoppingBag
   - Description: "Offer your services to clients"

3. **Submit Proposal** → `/review/create`
   - Icon: ClipboardList
   - Description: "Create an evaluation proposal"

4. **Manage Agents** → `/dashboard/agents`
   - Icon: Users
   - Description: "View and manage your registered agents"

5. **Manage Services** → `/dashboard/services`
   - Icon: Package
   - Description: "View and manage your listed services"

6. **Manage Skills** → `/dashboard/skills`
   - Icon: Award
   - Description: "View and manage your agent skills"

**Stats Overview:**

- Your Agents count → links to `/identity`
- Your Services count → links to `/marketplace?provider={address}`
- Active Jobs count → links to filtered jobs view
- Proposals count → links to `/review`

---

#### Agent Management Page (`/dashboard/agents`)

Management interface for agents owned by the connected wallet.

**Features:**

- Lists all agents owned by the wallet using `useWalletAgentsWithDetails`
- Displays agent metadata (name, description, capabilities from decoded URI)
- Shows Kokonut registration status with visual indicator
- Links to agent detail (`/identity/[id]`) and settings pages
- Skeleton loading states for fluid UX
- Error handling with retry button
- Back navigation to main dashboard

**Components:**

- `AgentCard` - Card displaying:
  - Agent ID with name
  - Decoded metadata (capabilities, endpoints)
  - Kokonut registration badge
  - Link to view/edit agent
- `AgentCardSkeleton` - Loading placeholder with shimmer effect

**Hooks Used:**

- `useWalletAgentsWithDetails` - Fetch wallet agents with full metadata
- `useAccount` - Get connected wallet address

**Empty State:**

When no agents found:

- Message: "No Agents Yet"
- Call to action: "Register your first agent to get started"
- Button links to `/identity/register`

---

#### Service Management Page (`/dashboard/services`)

Management interface for services created by the wallet's agents.

**Features:**

- Lists services where the connected wallet is the provider
- Separates active and inactive services into distinct sections
- Shows service details:
  - Service name and description
  - Price in USDC
  - Associated agent ID
  - Active/Inactive status badge
- Edit and view links for each service
- Skeleton loading states
- Error handling with retry button
- Back navigation to main dashboard

**Components:**

- `ServiceCard` - Card displaying:
  - Service name with status badge (Active/Inactive)
  - Description (truncated)
  - Price in USDC
  - Agent ID association
  - Link to service details
- `ServiceCardSkeleton` - Loading placeholder

**Service Sections:**

1. **Active Services** - Cards with full opacity, green status badge
2. **Inactive Services** - Cards with reduced opacity (60%), gray status badge

**Hooks Used:**

- `useProviderServices` - Fetch services by provider address
- `useAccount` - Get connected wallet address

**Empty State:**

When no services found:

- Message: "No Services Yet"
- Call to action: "Create your first service to start earning"
- Button links to `/marketplace/create`

---

#### Skills Management Page (`/dashboard/skills`)

Management interface for agent skills.

**Features:**

- Lists skills for each agent owned by wallet
- Shows skill details (name, version, description, endpoint, domains)
- Register new skills to agents
- Deactivate existing skills
- View-only mode for inactive skills

**Components:**

- Agent selector (dropdown to choose which agent to manage)
- Skill cards with details
- Registration form for new skills

**Hooks Used:**

- `useWalletAgentsWithDetails` - Get agents to manage skills for
- `useAgentSkills` - Get skills for each agent
- `useRegisterSkill`, `useDeactivateSkill` - Skill management actions

---

#### Legacy Dashboard Tabs (Removed)

The following tab-based organization has been replaced by the dedicated management pages above:

- ~~Overview Tab~~ → Replaced by QuickActions
- ~~My Services Tab~~ → Moved to `/dashboard/services`
- ~~My Jobs Tab~~ → Accessible via `/jobs`
- ~~My Proposals Tab~~ → Accessible via `/review`
- ~~Settings Tab~~ → Accessible via `/identity/settings`

### 7. About Page (`/about`)

**Static informational page:**

- Project overview and mission
- Three layers of the stack (Identity, Commerce, Coordination)
- Technology stack (Solidity, Foundry, Next.js, HeroUI, RainbowKit)
- Links to documentation

### 8. Governance Page (`/governance`)

**SlashManager interface for multisig operations:**

- Signer status display (checks if connected wallet is a signer)
- Create slash proposal form (owner only):
  - Evaluator address
  - Target proposal ID
  - Slash amount (ETH)
  - Reason
- How slashing works explanation:
  1. Owner creates slash proposal
  2. 3 of 5 signers must confirm
  3. 1-hour timelock
  4. Execution (50% stake slashed)
  5. Max 100 ETH cap

### 9. Skills Page (`/skills`)

**AgentSkillRegistry interface:**

- Register new skill form:
  - Skill name
  - Version
  - Description
  - Endpoint URL
  - Domains (comma-separated)
- Skill cards display:
  - Name, version, active status
  - Description
  - Endpoint
  - Domain tags

**Prerequisites:**

- Must have registered agent identity first
- Redirects to `/identity/register` if no agent

### 10. Activity Feed Page (`/activity`)

**Platform-wide Activity Tracking:**

- **Event Aggregation**: Displays activities from Jobs, Services, and Proposals
- **Filter Options**: All Activity, Jobs Only, Services Only, Proposals Only
- **Activity Items**:
  - Job Created, Job Funded
  - Service Listed
  - Proposal Created
- **Details Displayed**:
  - Actor address (truncated)
  - Block number
  - Transaction hash
  - Amount (with currency)
  - Direct links to details pages
- **Real-time Updates**: Manual refresh button
- **Empty States**: Friendly messaging when no activity

**Features:**

- Responsive list layout
- Loading skeletons during fetch
- Error handling with retry
- Mobile-optimized

_[Screenshot Placeholder: Activity feed page showing filtered job creation events with actor addresses and amounts]_

### 11. Analytics Page (`/analytics`)

**7-Day Analytics Dashboard:**

**Charts (using Recharts):**

- **Daily Activity Bar Chart**: Jobs, Services, Proposals per day
- **Volume Trends Line Chart**: USDC and ETH volume over 7 days
- **Status Distribution Pie Chart**: Job status breakdown (Open, Funded, Submitted, Completed, Rejected)

**Key Metrics Cards:**

- Jobs Created (7-day total)
- Services Listed (7-day total)
- Proposals Submitted (7-day total)
- USDC Volume (total escrow)
- Average Job Value
- ETH Staked (in proposals)
- Daily averages

**Features:**

- Interactive charts with tooltips
- Refresh button for latest data
- Responsive grid layout
- Kokonut color scheme (#009F4D, #FFCD00)
- Loading states with spinners

_[Screenshot Placeholder: Analytics dashboard showing bar chart, line chart, and pie chart with Kokonut branding]_

---

## Component Library

### Wallet Components

| Component             | Description                                       |
| --------------------- | ------------------------------------------------- |
| `ConnectButton`       | RainbowKit connect/disconnect (dynamic, SSR-safe) |
| `USDCBalance`         | USDC balance chip display in navbar               |
| `ClientErrorBoundary` | Top-level error boundary with reload fallback     |

### Identity Components

| Component         | Description                  |
| ----------------- | ---------------------------- |
| `AgentCard`       | Agent listing card (in code) |
| `AgentList`       | Grid of agent cards          |
| `AgentAvatar`     | Agent profile picture        |
| `ReputationBadge` | Star rating display          |
| `SkillTags`       | Skill/capability tags        |

_Note: `ReviewForm` is implemented inline on agent detail pages_

### Marketplace Components

| Component      | Description              |
| -------------- | ------------------------ |
| `ServiceCard`  | Service listing card     |
| `ServiceList`  | Grid of service cards    |
| `PriceDisplay` | USDC + ETH price display |

_Note: `ServiceForm`, `CategoryFilter` are implemented inline on create/list pages_

### Job Components

| Component        | Description               |
| ---------------- | ------------------------- |
| `JobCard`        | Job listing card          |
| `StatusBadge`    | Job status indicator      |
| `StatusTimeline` | Visual status progression |

_Note: `DeliverableForm`, `EvaluationForm` are implemented inline on job detail pages_

### Review Components

| Component           | Description           |
| ------------------- | --------------------- |
| `ProposalCard`      | Proposal listing card |
| `EvaluatorList`     | List of evaluations   |
| `RewardDisplay`     | ETH reward amount     |
| `DeadlineCountdown` | Time remaining        |

_Note: `ConfidenceSlider` is implemented inline on proposal detail page_

### Common Components

| Component              | Description                                             |
| ---------------------- | ------------------------------------------------------- |
| `ClientErrorBoundary`  | Error boundary with reload                              |
| `ErrorBoundary`        | React error boundary                                    |
| `StatusBadge`          | Reusable status indicator with multiple types and sizes |
| `PaymentTokenSelector` | Dropdown for USDC/ETH selection with balance display    |
| `PaymentTokenBadge`    | Compact token indicator for listings                    |

_Note: Other common components (LoadingSpinner, EmptyState, Modal, Tabs) use HeroUI built-ins_

### StatusBadge Component

**Purpose:** Standardized status indicators across the platform.

**Supported Types:**

- `active` / `inactive` - For services
- `open` / `funded` / `submitted` / `completed` / `rejected` / `expired` - For jobs
- `under-review` / `decided` / `cancelled` - For proposals
- `warning` / `success` / `error` / `info` / `pending` - Generic states

**Sizes:** `sm`, `md`, `lg`

**Features:**

- Color-coded by status type
- Icon support
- Consistent with Kokonut design system

**Usage:**

```tsx
<StatusBadge status="active" size="sm" />
<StatusBadge status={getJobStatusBadgeType(job.status)} size="md" />
```

_[Screenshot Placeholder: StatusBadge component showing all status types with color coding]_

### PaymentTokenSelector Component

**Purpose:** Allow users to select between USDC and ETH for job payments.

**Features:**

- Dropdown selector with token icons
- Balance display for connected wallet
- Visual indicators for selected token
- Disabled state support

**Supported Tokens:**

- **USDC** (default): `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- **ETH**: `0x0000000000000000000000000000000000000000`

**Usage:**

```tsx
<PaymentTokenSelector
  selectedToken={selectedToken}
  onSelectToken={handleTokenChange}
  disabled={isPending}
/>
```

_[Screenshot Placeholder: PaymentTokenSelector dropdown showing USDC and ETH options with balances]_

### Quick Actions Widget

**Purpose:** Dashboard shortcuts for common operations.

**Actions:**

1. **Create Job** - Links to `/jobs/create`
2. **List Service** - Links to `/marketplace/create`
3. **Submit Proposal** - Links to `/review/create`

**Features:**

- Color-coded icons (Kokonut brand colors)
- Hover effects with arrow indicators
- Only visible to connected wallet users
- Responsive grid layout

_[Screenshot Placeholder: Quick Actions widget on Dashboard showing three action cards with icons]_

---

## Contract Integration

### ABIs & Addresses

```typescript
// lib/contracts/config.ts
export const CONTRACTS = {
  1: {
    // Ethereum Mainnet
    identityRegistry: '0x...',
    reputationRegistry: '0x...',
    skillRegistry: '0x...',
    serviceRegistry: '0x...',
    agenticCommerce: '0x...',
    agentReview: '0x...',
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  },
  11155111: {
    // Sepolia
    // Test addresses
  },
} as const;
```

### wagmi Config

```typescript
// lib/wagmi.ts
import { http, createConfig, fallback } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

export const config = createConfig({
  chains: [sepolia],
  connectors: [injected(), walletConnect({ projectId })],
  transports: {
    [sepolia.id]: fallback([
      http('https://ethereum-sepolia.publicnode.com'),
      http('https://rpc.sepolia.ethpandaops.io'),
      // ... additional fallback RPCs
    ]),
  },
});

export const CONTRACTS = {
  // Official ERC-8004 Identity Registry
  identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
  // Official ERC-8004 Reputation Registry
  reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  // Kokonut contracts
  skillRegistry: '0x7cf16C00ed4831EB9eE3a8765831968F0a28f53D',
  serviceRegistry: '0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201',
  agentReview: '0xefAeF01B3DDeF2041A1dbdCEbcA352eD2240920A',
  agenticCommerce: '0x14293D31c15594bcB03d6581d26FF9353a882884',
  priceOracle: '0x32fD2A54B722D2048A052fD0456004483a683aFE', // PriceOracleV2 Proxy
  commitReveal: '0x6CEd1574A3dF7ec646e43DD8408300117c453Aa3',
  slashManager: '0x7Cf955900FD7a12680E90D834eAf19346f5DBcf9',
  usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
};
```

### Hooks

```typescript
// hooks/useIdentity.ts
export function useAgent(agentId: bigint) {
  return useReadContract({
    abi: ERC8004_ABI,
    address: CONTRACTS[chainId].identityRegistry,
    functionName: 'getAgent',
    args: [agentId],
  });
}

// hooks/useMarketplace.ts
export function useServices() {
  return useReadContract({
    abi: ServiceRegistryABI,
    address: CONTRACTS[chainId].serviceRegistry,
    functionName: 'getServices',
    args: [0n, 100n],
  });
}

// hooks/useJobs.ts
export function useJob(jobId: bigint) {
  return useReadContract({
    abi: AgenticCommerceABI,
    address: CONTRACTS[chainId].agenticCommerce,
    functionName: 'getJob',
    args: [jobId],
  });
}

// hooks/useReview.ts
export function useProposal(proposalId: bigint) {
  return useReadContract({
    abi: AgentReviewABI,
    address: CONTRACTS[chainId].agentReview,
    functionName: 'getProposal',
    args: [proposalId],
  });
}
```

---

## Design System

### Colors

```css
/* HSL-based CSS variables (globals.css) */
:root {
  --primary: 150 100% 31%; /* Kokonut green #009F4D */
  --primary-foreground: 0 0% 100%;
  --secondary: 48 100% 50%; /* Kokonut yellow #FFCD00 */
  --secondary-foreground: 0 0% 9%;
  --background: 0 0% 100%;
  --foreground: 0 0% 9%;
  --card: 0 0% 100%;
  --destructive: 0 84% 50%;
  --border: 0 0% 90%;
}

.dark {
  --background: 0 0% 5%;
  --foreground: 0 0% 95%;
  --card: 0 0% 8%;
  --border: 0 0% 18%;
}
```

**Brand gradient:** `bg-gradient-to-r from-[#009F4D] to-[#00c853]` (green gradient for primary buttons)
**Brand accent:** `bg-gradient-to-br from-[#009F4D] to-[#FFCD00]` (green-to-yellow for logo)

### Typography

- Headings: Inter (Google Fonts)
- Body: Inter
- Mono: JetBrains Mono (for addresses)

### Spacing

- Base unit: 4px
- Common: 8, 12, 16, 24, 32, 48, 64

### Border Radius

- Small: 6px (buttons, inputs)
- Medium: 8px (cards)
- Large: 12px (modals)

---

## Development Roadmap

### Phase 1: Foundation

- [x] Set up Next.js project with HeroUI + RainbowKit
- [x] Configure wagmi + viem
- [x] Build wallet connection UI
- [x] Create layout + navigation

### Phase 2: Identity Module

- [x] Agent list page
- [x] Agent detail page
- [x] Register agent page
- [x] ERC-8004 bidirectional import/export
- [x] Reputation display

### Phase 3: Marketplace Module

- [x] Service list page
- [x] Service detail page
- [x] Create service page
- [x] Purchase flow

### Phase 4: Job Management

- [x] Job list (dashboard)
- [x] Job detail page
- [x] Fund/submit/approve flows

### Phase 5: Review Module

- [x] Proposals list
- [x] Proposal detail
- [x] Create proposal
- [x] Evaluation submission

### Phase 6: Polish

- [x] Loading states
- [x] Error handling (ClientErrorBoundary)
- [x] Mobile responsive
- [x] Dark mode
- [x] SSR-safe provider setup

### Phase 7: Bug Fixes & Optimizations

- [x] Environment variable fallbacks (prevents undefined address errors)
- [x] Contract call debug logging system
- [x] Data mapping fixes (services, agents, jobs displaying correctly)
- [x] Registration flow using JSON metadata tagging (simpler, no revert)
- [x] Viewport-based pagination (6/8/12 items per page)
- [x] Show All functionality for lists
- [x] Enhanced error boundaries with contract error detection
- [x] Performance optimizations for contract calls

### Phase 8: Enhanced Directories & Sorting (Weeks 1-2)

- [x] StatusBadge component with multiple status types
- [x] URL-based sorting for Marketplace, Jobs, and Review pages
- [x] Advanced filtering with search, status, and range filters
- [x] Search debouncing (300ms) for performance
- [x] Sort options: newest, price, name, budget, deadline, reward

### Phase 9: Missing Features (Week 3)

- [x] Cancel Proposal functionality for proposers
- [x] Payment Token Switching (USDC/ETH) for jobs
- [x] Client Job Count Warnings (MAX_JOBS_PER_CLIENT = 100)
- [x] PaymentTokenSelector component
- [x] Job limit progress bars with color-coded thresholds

### Phase 10: Analytics & Polish (Week 4)

- [x] Activity Feed page with platform-wide events
- [x] Analytics Dashboard with 7-day metrics
- [x] Recharts integration (bar, line, pie charts)
- [x] Quick Actions widget on Dashboard
- [x] Clickable stats on Homepage and Dashboard
- [x] "More" dropdown navigation with Activity & Analytics
- [x] Kokonut-specific agent filtering
- [x] Platform activity widget on Dashboard

---

## Contract Configuration & Fallbacks

### Centralized Contract Addresses

All contract addresses are now centralized in `/lib/contracts/config.ts` with automatic fallbacks to Sepolia testnet addresses:

```typescript
// lib/contracts/config.ts
export const CONTRACT_ADDRESSES = {
  sepolia: {
    // Official ERC-8004 Registries
    erc8004Registry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    erc8004Reputation: '0x8004B663056A597Dffe9eCcC1965A193B7388713',

    // Kokonut Contracts
    skillRegistry: '0x7cf16C00ed4831EB9eE3a8765831968F0a28f53D',
    serviceRegistry: '0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201',
    agenticCommerce: '0x14293D31c15594bcB03d6581d26FF9353a882884',
    agentReview: '0xefAeF01B3DDeF2041A1dbdCEbcA352eD2240920A',
    priceOracle: '0x32fD2A54B722D2048A052fD0456004483a683aFE', // PriceOracleV2 Proxy
    commitReveal: '0x6CEd1574A3dF7ec646e43DD8408300117c453Aa3',
    slashManager: '0x7Cf955900FD7a12680E90D834eAf19346f5DBcf9',
    usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  },
} as const;

// Helper function with fallback
export function getContractAddress(
  envVar: string | undefined,
  fallbackAddress: string
): `0x${string}` {
  return (envVar || fallbackAddress) as `0x${string}`;
}
```

**Usage in hooks:**

```typescript
const ERC8004_ADDRESS = getContractAddress(
  process.env.NEXT_PUBLIC_8004_REGISTRY_ADDRESS,
  CONTRACT_ADDRESSES.sepolia.erc8004Registry
);
```

This ensures the app works even if environment variables are not set, preventing "Cannot read properties of undefined" errors.

---

## Debug Logging System

### Overview

A centralized debug logging system for tracking contract calls, errors, and data transformations during development.

### Configuration

```typescript
// lib/contracts/config.ts
export const DEBUG = {
  contracts: true, // Log all contract calls
  errors: true, // Log detailed error info
  data: false, // Log data transformations
} as const;
```

### Usage

```typescript
import { debugLog } from '@/lib/contracts/config';

// Log contract calls
debugLog('contracts', 'Fetching agents from', address);
// Output: [CONTRACTS] Fetching agents from 0x8004A818BFB912233c491871b3d84c89A494BD9e

// Log errors
debugLog('errors', 'Contract call failed', error);
// Output: [ERRORS] Contract call failed { message: ..., stack: ... }
```

### Console Output

During development, you'll see logs like:

```
[CONTRACTS] useAgentCount: Fetching from 0x8004A818BFB912233c491871b3d84c89A494BD9e
[CONTRACTS] useActiveServiceCount: Fetching from 0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201
[CONTRACTS] useJobCount: Fetching from 0x14293D31c15594bcB03d6581d26FF9353a882884
```

---

## Viewport-Based Pagination

### Overview

Pagination automatically adjusts based on screen size for optimal user experience:

- **Mobile (<640px)**: 6 items per page
- **Tablet (640px - 1024px)**: 8 items per page
- **Desktop (>1024px)**: 12 items per page

### Hook Usage

```typescript
import { useViewportPagination, usePagination } from '@/lib/hooks/useViewportPagination';

function MyListComponent() {
  const { itemsPerPage } = useViewportPagination();
  const [{ page, showAll }, { setPage, toggleShowAll }] = usePagination(itemsPerPage);

  // Use page and itemsPerPage for fetching data
  const { data } = useFetchData(page * itemsPerPage, itemsPerPage);
}
```

### Show All Functionality

All list components now support a "Show All" toggle button:

```typescript
// In your component
<Button variant="ghost" size="sm" onPress={toggleShowAll}>
  {showAll ? 'Show Paginated' : `Show All (${totalCount})`}
</Button>
```

This allows users to:

1. View paginated results (default)
2. Toggle to see all items at once
3. Switch back to pagination mode

### Implemented Components

- **ServiceList** (`/marketplace`) - 12/8/6 items per page
- **AgentList** (`/identity`) - 12/8/6 items per page
- **JobsList** (`/jobs`) - 10/8/6 items per page

---

## Environment Variables

```env
# Required
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=xxx

# Optional - will use hardcoded Sepolia fallbacks if not set
NEXT_PUBLIC_8004_REGISTRY_ADDRESS=0x8004A818BFB912233c491871b3d84c89A494BD9e
NEXT_PUBLIC_8004_REPUTATION_ADDRESS=0x8004B663056A597Dffe9eCcC1965A193B7388713
NEXT_PUBLIC_SERVICE_REGISTRY_ADDRESS=0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201
NEXT_PUBLIC_AGENTIC_COMMERCE_ADDRESS=0x14293D31c15594bcB03d6581d26FF9353a882884
NEXT_PUBLIC_AGENT_REVIEW_ADDRESS=0xefAeF01B3DDeF2041A1dbdCEbcA352eD2240920A
NEXT_PUBLIC_SKILL_REGISTRY_ADDRESS=0x7cf16C00ed4831EB9eE3a8765831968F0a28f53D
NEXT_PUBLIC_PRICE_ORACLE_ADDRESS=0x5C4AC3dAF76708DCd51911BA3B33027eAB1B4047
NEXT_PUBLIC_COMMIT_REVEAL_ADDRESS=0x6CEd1574A3dF7ec646e43DD8408300117c453Aa3
NEXT_PUBLIC_SLASH_MANAGER_ADDRESS=0x7Cf955900FD7a12680E90D834eAf19346f5DBcf9
NEXT_PUBLIC_USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238

# Optional
NEXT_PUBLIC_ALCHEMY_API_KEY=xxx
```

**Note:** All contract addresses have hardcoded fallbacks to Sepolia testnet addresses, so the app will work even without environment variables.

---

## Commands

```bash
# Development
cd apps/web && pnpm run dev

# Build
cd apps/web && pnpm run build

# Type check
cd apps/web && npx tsc --noEmit

# Lint
npm run lint
```

---

## Success Metrics

- Wallet connection < 3 clicks
- Service purchase < 5 clicks
- Transaction confirmation in < 10 seconds
- Mobile-first responsive design
- Zero console errors
