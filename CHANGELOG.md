# Changelog

All notable changes to the Kokonut Agent Economy Stack are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-04-03

### 🚀 Phase 7: Enhanced UX & Admin Features

#### ETH Funding Support

- **Job Detail Page ETH Balance Display**
  - Shows ETH balance when ETH is selected as payment token
  - Dynamic balance display based on selected token (USDC or ETH)
  - "Insufficient balance" warning for both USDC and ETH
  - Balance card updates based on payment token selection

- **ETH Funding with Value**
  - `fundJobWithETH()` callback for native ETH transactions
  - Passes ETH value to `fund()` function for native token payments
  - Works with both USDC (approval flow) and ETH (native value)

#### Payment Token Improvements

- **PaymentTokenSelector Enhancements**
  - ETH balance formatting using `formatUnits()`
  - Fixed `useBalance()` hook to properly format ETH balance
  - Consistent balance display across all token types

#### Job Discovery Filters

- **Provider Role Filters**
  - "My Jobs" filter - shows jobs where user is client, provider, or evaluator
  - "Open for Bidding" filter - shows open jobs without assigned provider
  - Filters accessible in expanded filter panel
  - Only visible when wallet is connected

#### Evaluator Conflict Detection

- **Job Detail Warnings**
  - Warning when evaluator matches client address
  - Warning when evaluator matches provider address
  - Clear explanation of conflict of interest
  - Visible only to relevant parties

#### Admin Dashboard

- **New Admin Page (`/admin`)**
  - Treasury address management
  - Contract info display (job counter, platform fee)
  - Quick links to Etherscan read/write
  - Owner-only function warnings
  - Added to navbar under "More" menu

#### Bug Fixes

- **useServices Hook**
  - Added null check for `results` before iteration
  - Prevents TypeScript errors and runtime issues

- **Contract ABI**
  - Added `setPlatformTreasury` function to AgenticCommerce ABI
  - Enables treasury updates from admin UI

### 🚀 Contract ABI & Hook Completeness

#### Missing ABI Entries Added

- **AgenticCommerceV6 ABI**
  - `withdrawStake` - For losing bidders to reclaim their stake
  - `isEvaluatorFeeEnabled` - Check if evaluator fee is enabled for a job
  - `evaluatorFeeEnabled` - Mapping to check fee status
  - `totalStakesHeld` - Mapping for held stakes per address

- **AgentReviewV4 ABI**
  - `cancelProposal` - Proposers can cancel open proposals
  - `slashEvaluator` - Admin can slash misbehaving evaluators
  - `getEvaluatorCount` - Get number of evaluators for a proposal

#### New Hooks Added

- **useJobs.ts**
  - `useWithdrawStake()` - Withdraw stake for losing bidders
  - `useEvaluatorFeeEnabled()` - Check evaluator fee status for a job
  - `useTotalStakesHeld()` - Get total stakes held by an address

- **useProposals.ts**
  - `useCancelProposal()` - Cancel open proposals (proposers only)
  - `useSlashEvaluator()` - Slash evaluators (admin only)

#### UI Integration

- **Job Detail Page (`/jobs/[id]`)**
  - "Withdraw Stake" button for providers with losing bids
  - Evaluator fee badge (+1%) displayed next to evaluator address
  - Evaluator fee info card for job clients

- **Review Detail Page (`/review/[id]`)**
  - "Cancel Proposal" button for proposers with open proposals
  - Confirmation dialog before cancellation

### 🔧 Agent Identity & Management

#### Agent Profile Improvements

- **Agent Services Hook** - New `useAgentServices(agentId)` hook in `lib/hooks/useServices.ts`
  - Uses `getServicesByAgent()` contract function for accurate service lookup
  - Uses multicall for efficient batch fetching
- **Owner Detection** - Agent profile page (`/identity/[id]`) now shows "Manage" button for owners
  - Links to `/identity/settings?agentId=X`
  - Uses `ownerOf()` from ERC-8004 registry for accurate ownership check
- **Service Status Display** - Agent profile shows active/inactive badges and service descriptions
- **Dashboard Agent Management** - Added "Manage" button on agent cards in `/dashboard/agents`
- **Settings Page Enhancement** - Agent selector dropdown for multi-agent owners
  - URL param support (`?agentId=X`) for direct linking
  - Current agent info card with profile link

### 🚀 API Rate Limiting Fixes

#### React Query Caching

- **useKokonutAgentsByOwner** - Refactored with:
  - React Query `useQuery` wrapper with proper caching
  - Exponential backoff retry (1s, 2s, 4s, max 30s) for 429 errors
  - Environment variable `NEXT_PUBLIC_8004_API_KEY` instead of hardcoded value
  - 5 min stale time, 30 min garbage collection
- **useKokonutAgents** - Improved with:
  - `fetchWithBackoff()` function for exponential backoff
  - Environment variable for API key
  - Increased cache duration to 5 minutes
  - Added `hooks` debug category

### 🚀 Analytics Enhancements

#### Time Range Toggle

- **Time Range Selector** - Analytics page now supports multiple time ranges with URL persistence
  - Options: 7D (7 days), 30D (30 days), 3M (90 days)
  - Segmented button UI with active state highlighting
  - URL parameter support (`?range=30D`) for shareable links
- **useAnalytics Hook Updates**
  - New `timeRange` parameter (default: '7D')
  - Dynamic block constants for each range (50,400 / 216,000 / 648,000)
  - Dynamic data points (max 14 for readability)
  - Per-day calculations use selected range divisor

### 🔧 Bug Fixes

#### Job Detail Page

- **Change Payment Token Button Disabled** - Temporarily disabled due to missing `setPaymentToken` function in AgenticCommerceV5
  - V5 contract only accepts payment token during `createOpenJob()`
  - Feature will be re-enabled when function is added to V5

#### Agent Discovery

- **Empty TokenURI Handling** - Fixed noisy console errors for agents with empty `tokenURI`
  - Agents with empty URI now included as "untagged" instead of error logging
  - Distinguishes between empty string (not an error) vs actual errors
  - Reduces false-positive error logs in dashboard and identity pages

### 🚀 Marketplace & Service Improvements

#### Frontend Optimizations

- **Optimistic USDC Approval** - "Fund Job" button appears immediately after clicking "Approve"
  - No more waiting for 30-second cache expiration
  - Query invalidation after tx confirmation for immediate state refresh
- **Skill Domain Filter** - Filter services by agent skill domain in marketplace
  - Uses multicall for efficient batch fetching of agent IDs
  - Filters services by matching skill domains
- **USD Price Standardization** - All prices normalized to USD equivalents
  - ETH services properly filtered by USD value using Chainlink oracle
  - Price sorting uses USD equivalents for accurate comparison

#### Contract Updates

- **ServiceRegistryV2** - Added `activateService()` function
  - Reactivate previously deactivated services without recreation
  - O(1) counter updates (increments active count on activation)
  - Emits `ServiceActivated` event for event-driven UI updates
- **Bidding UI** - Full open job bidding lifecycle in job detail page
  - CommitBidForm, RevealBidForm, AcceptBidForm components
  - BidStatusCard for provider bid tracking
  - Client bid overview panel with count and status

#### UI Improvements

- **Activate Service Button** - Added to service detail page (`/marketplace/[id]`)
  - Visible when service is inactive
  - One-click reactivation for providers
  - Success/error toast notifications

#### Testing

- **ServiceRegistryV2 Tests** - 6 new tests for activateService (35 total)
  - `test_ActivateService_Success`
  - `test_ActivateService_UpdatesActiveCount`
  - `test_ActivateService_EmitsEvent`
  - `test_ActivateService_NotProvider_Reverts`
  - `test_ActivateService_AlreadyActive_Reverts`
  - `test_ActivateService_InvalidServiceId_Reverts`

### Deployment

- **ServiceRegistryV2** implementation upgraded on Sepolia
  - Proxy: `0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201`
  - New Implementation: `0xe2fB4aDA35B8d5FbB041a9C0ED4a655Be329a457`
  - Activate service function now live

---

## [Unreleased] - 2026-04-02

### 🔧 Full Dependency Upgrade & Network Access Fixes

#### Major Dependency Upgrades

| Package                   | Before  | After       | Notes                                   |
| ------------------------- | ------- | ----------- | --------------------------------------- |
| **Next.js**               | 15.0.0  | **16.2.2**  | Turbopack default, 2-5x faster builds   |
| **React**                 | 19.0.0  | **19.2.4**  | Critical security patches               |
| **React DOM**             | 19.0.0  | **19.2.4**  | Security patches                        |
| **Tailwind CSS**          | 3.4.0   | **4.2.2**   | CSS-based configuration, major rewrite  |
| **TypeScript**            | 5.3.2   | **5.9.3**   | Improved type checking                  |
| **lucide-react**          | 0.460.0 | **1.7.0**   | 32% smaller bundle, brand icons removed |
| **@tanstack/react-query** | 5.60.0  | **5.96.1**  | Bug fixes, performance improvements     |
| **framer-motion**         | 12.x    | **12.38.0** | Latest features                         |
| **tailwind-merge**        | 2.5.0   | **3.5.0**   | Tailwind v4 support                     |
| **viem**                  | 2.21.55 | **2.47.6**  | Synced across all packages              |
| **@radix-ui/\***          | 1.1.x   | **1.2.x+**  | All packages updated                    |
| **@types/react**          | 19.x    | **19.2.14** | Latest types                            |
| **@types/react-dom**      | 19.x    | **19.2.3**  | Latest types                            |

**Web3 Stack (Already Current):**

- wagmi: 3.6.0 ✅
- viem: 2.47.6 ✅
- @rainbow-me/rainbowkit: 2.2.10 ✅
- ethers: 6.16.0 ✅

#### Network Access & Wallet Fixes

- **Crypto Polyfill** - Added `/public/crypto-polyfill.js` for non-secure contexts
  - Provides `crypto.randomUUID()` for HTTP/IP access (non-secure contexts)
  - Provides `crypto.subtle` minimal fallback for cryptographic operations
  - Required for WalletConnect, wagmi, React Query, and RainbowKit on network IPs
  - Loaded before any other JavaScript to prevent race conditions

- **CSP Configuration** - Made `upgrade-insecure-requests` production-only
  - Development CSP allows HTTP connections and network IPs
  - Added HTTP origins to `connect-src`: `http://localhost:* http://10.108.1.215:* http://127.0.0.1:* http://0.0.0.0:*`
  - Added WebSocket HTTP origins for HMR: `ws://localhost:* ws://10.108.1.215:*` etc.
  - Production CSP enforces HTTPS with `upgrade-insecure-requests`
  - CSP switches between Report-Only (dev) and Enforce (prod)

- **WalletConnect Metadata** - Hardcoded URL to prevent origin mismatch
  - Changed from dynamic `window.location.origin` to `https://kokonut.network`
  - Prevents WalletConnect rejection on unregistered origins

- **Hydration Fixes** - Fixed wallet connection state mismatches across all pages
  - Added `suppressHydrationWarning` to `<html>` and `<body>` in layout
  - Navbar: Always renders all links, uses CSS to show/hide Dashboard based on connection state
  - Marketplace page: Added `mounted` state to prevent conditional rendering
  - All pages: Prevents hydration mismatch between server (disconnected) and client (connected)

- **Health Check Endpoint** - Added `/api/health` for service verification
  - Checks WalletConnect project ID configuration
  - Tests RPC connectivity
  - Verifies all contract addresses are configured
  - Confirms environment variables are set
  - Returns status: `healthy`, `degraded`, or `error`

#### UI/UX Improvements

- **Nav Bar** - Added Activity & Analytics links to "More" dropdown
- **Custom ConnectButton** - Created wrapper (`components/wallet/ConnectButton.tsx`) with:
  - Client-side only rendering (prevents hydration mismatch)
  - Error handling with fallback UI
  - Loading state while RainbowKit initializes
  - Proper props configuration
- **Duplicate Files Cleanup** - Removed 13 duplicate/stub files:
  - `navbar 2.tsx`, `footer 2.tsx`, `Navbar.tsx` (unused), `StatusBadge 2.tsx`
  - `useJobs 2.ts`, `useServices 2.ts`, `useActivityFeed 2.ts`, `useKokonutAgentsByOwner 2.ts`
  - `DebugContext 2.tsx`, `ClientErrorBoundary 2.tsx`, `wallet-shim 2.ts`, `globals 2.css`, `tsconfig 2.json`
- **Lucide Icons** - Replaced removed brand icons:
  - `Twitter` → `AtSign`
  - `Github` → `Code2`

#### Configuration Changes

- **Tailwind v4 Migration** - Config moved from `tailwind.config.ts` to CSS `@theme` block
  - Removed `tailwind.config.ts` (no longer needed)
  - All theme configuration now in `globals.css` `@theme` block
  - Added `@source` for HeroUI components
  - Updated `postcss.config.js` to use `@tailwindcss/postcss`

- **Next.js 16 Configuration** - Updated `next.config.js`:
  - Removed deprecated `eslint` config key
  - Added `allowedDevOrigins: ['*']` for network access
  - Added `turbopack: {}` config
  - Made `upgrade-insecure-requests` production-only

- **Node.js Requirement** - Now requires **20.9+** (for Next.js 16)

#### New Proposal Hooks (Complete Contract Integration)

- **`useReviewStats`** - Fetches proposal statistics from AgentReview contract
  - Returns: `totalProposals`, `activeProposals`, `completedProposals`, `totalRewards`, `totalEvaluations`
  - Uses multicall for efficient batch fetching

- **`useCreateProposal`** - Creates proposals via AgentReview contract
  - Parameters: `title`, `description`, `criteriaURI`, `reward`, `decisionDeadline`
  - Returns: `createProposal`, `hash`, `isPending`, `error`, `reset`
  - Handles ETH value transfer for reward staking

- **`useSubmitEvaluation`** - Submits evaluations for proposals
  - Parameters: `proposalId`, `confidenceScore`, `reasoningURI`, `stakeAmount`
  - Returns: `submitEvaluation`, `hash`, `isPending`, `error`, `reset`

- **`useAttestDecision`** - Attests proposal decisions
  - Parameters: `proposalId`, `winningEvaluator`
  - Returns: `attestDecision`, `hash`, `isPending`, `error`, `reset`

- **`useClaimReward`** - Claims rewards from decided proposals
  - Parameters: `proposalId`
  - Returns: `claimReward`, `hash`, `isPending`, `error`, `reset`

- **`useReleaseStake`** - Releases stake from evaluations
  - Parameters: `proposalId`
  - Returns: `releaseStake`, `hash`, `isPending`, `error`, `reset`

- **`useProposalEvaluations`** - Fetches evaluations for a proposal
  - Parameters: `proposalId`
  - Returns: `evaluators` array, `isLoading`, `error`, `refetch`

- **`useEvaluation`** - Fetches specific evaluation details
  - Parameters: `proposalId`, `evaluator`
  - Returns: `evaluation` object, `isLoading`, `error`, `refetch`

#### Breaking Changes

- **Tailwind CSS v4** - Configuration format changed from JS to CSS
  - `tailwind.config.ts` removed, config moved to `globals.css` `@theme` block
  - PostCSS config updated to `@tailwindcss/postcss`
  - Some utility class names changed (e.g., `shadow-sm` → `shadow-xs`)

- **Lucide v1.0** - All brand icons removed
  - `Twitter`, `Github`, and other brand icons no longer available
  - Replaced with generic alternatives (`AtSign`, `Code2`)
  - Use Simple Icons for brand icons if needed

- **Next.js 16** - `middleware.ts` → `proxy.ts` (if applicable)
  - No middleware file exists in this project, so no migration needed
  - `eslint` config key deprecated in `next.config.js`

- **Node.js** - Now requires **20.9+** (was 18+)

---

## [Unreleased] - 2026-04-01

### 🛠️ Dashboard Management Fixes

#### Fixed

- **`/dashboard/agents` page** - Complete rewrite to properly display agents owned by connected wallet
  - Uses `useWalletAgentsWithDetails` hook for efficient fetching via event logs + multicall
  - Added proper loading states with skeletons (`AgentCardSkeleton`)
  - Added error handling with retry functionality
  - Shows agent metadata decoded from URI
  - Displays Kokonut registration status

- **`/dashboard/services` page** - Complete rewrite to properly display services
  - Uses `useProviderServices` hook for service fetching
  - Separates active and inactive services into distinct sections
  - Added proper loading states with skeletons (`ServiceCardSkeleton`)
  - Added error handling with retry functionality
  - Shows service details including associated agent ID

- **`mapServiceData` function** - Fixed to handle both object format and array format
  - Now supports object format from viem/multicall: `data.provider`, `data.name`, etc.
  - Maintains backward compatibility with array format: `data[0]`, `data[1]`, etc.
  - Resolves "data is not an array" errors when using multicall

- **`/dashboard` page** - Removed redundant QuickStats section
  - Removed duplicate "Manage Services" and "Manage Skills" stat cards
  - Dashboard now shows only QuickActions (6 cards) with all management links
  - Cleaner, less cluttered interface

#### Added

- **`useWalletAgentsWithDetails` hook** - New hook for fetching wallet agents with metadata
  - Queries `Registered` events from block 9,989,393 for agent discovery
  - Uses multicall for efficient batch fetching of tokenURIs
  - Decodes metadata and checks for `source === 'kokonut-marketplace'` tag
  - Returns categorized lists: `agents`, `taggedAgents`, `untaggedAgents`
  - Used in dashboard agents page, skills page, and registration flow

#### Technical Details

- **Dashboard Agents Page** (`/dashboard/agents`):
  - Fetches agents owned by connected wallet using event logs
  - Displays agent ID, name, capabilities from decoded metadata
  - Shows visual indicator for Kokonut-registered agents
  - Links to agent detail and settings pages
  - Back navigation to main dashboard

- **Dashboard Services Page** (`/dashboard/services`):
  - Fetches services where wallet is the provider
  - Groups services by active/inactive status
  - Displays price in USDC, associated agent ID
  - Shows status badges using StatusBadge component
  - Edit and view links for each service

---

## [Phase 5] - 2026-04-02

### 🎉 Phase 5: AgenticCommerceV5 + Enhanced User Experience

Phase 5 introduces AgenticCommerceV5 with open job bidding and major UX improvements across the platform.

#### AgenticCommerceV5 Deployment

##### Deployed Contracts (2026-04-02)

| Contract                    | Address                                      | Notes                   |
| --------------------------- | -------------------------------------------- | ----------------------- |
| **AgenticCommerce** (Proxy) | `0xe0006203ceb8bb20b29fa5324ad3fea356bbf858` | UUPS Proxy              |
| **AgenticCommerce** (Impl)  | `0xfed5abbea703485e725be1b0e9db3772e4068ec5` | Implementation          |
| **Contract Size**           | ~24KB                                        | Under 24,576 byte limit |

##### New Features

- **Open Job Bidding**: Create jobs that providers can bid on
  - `createOpenJob()` - Create open job with max budget
  - `commitBid()` - Commit sealed bid with 1% stake
  - `revealBid()` - Reveal bid after deadline
  - `acceptBid()` - Client accepts winning bid

- **Sealed Bids (Commit-Reveal)**:
  - Stake: 1% of max budget (in job's payment token)
  - Reveal window: 1 hour after deadline
  - Commitment: keccak256(abi.encode(amount, message, salt))

- **Multi-Token Support**:
  - Native ETH: address(0) marker
  - ERC20: Any token via IERC20 interface
  - Minimum ETH payment: 0.005 ETH

- **UUPS Proxy**: Gas-efficient upgradeability

##### Removed for Contract Size

To stay under 24KB limit, removed:

- `emergencyRefund()`, `migrateJob()`, `forfeitStaleBids()`
- `withdrawBid()`, `createJobFromService()`, `setPaymentToken()`
- `getJobType()`, `getMaxBudget()`, `getJobBids()` view functions
- Duplicate helper functions

##### Tests

- **217 tests total** (201 V4 + 16 V5)
- AgenticCommerceV5: 16 tests passing

---

### Weeks 1-2: Enhanced Directories

#### Added

- **StatusBadge Component** - Reusable status indicator system
  - Multiple status types: active/inactive, job statuses, proposal statuses
  - Three sizes: sm, md, lg with icon support
  - Color-coded badges matching Kokonut design system
  - Helper functions: `getJobStatusBadgeType()`, `getProposalStatusBadgeType()`, `getServiceStatusBadgeType()`

- **URL-Based Sorting** - Shareable sort links across all directory pages
  - Marketplace: newest (default), price (asc/desc), name (A-Z/Z-A)
  - Jobs: newest (default), budget (asc/desc), deadline (asc/desc)
  - Review: newest (default), reward (asc/desc), deadline (asc/desc)
  - Example: `/marketplace?sort=price&order=asc`

- **Advanced Filtering** - Comprehensive filter panels on all directory pages
  - Real-time search with 300ms debouncing
  - Status filters (active/inactive, job status, proposal status)
  - Range filters (price/budget ranges, reward amounts)
  - Deadline filters (active vs expired)

- **Search Optimization**
  - Debounced search inputs (300ms delay)
  - Loading indicators during search
  - Client-side filtering for instant results

#### Changed

- Enhanced ServiceCard with StatusBadge integration
- Enhanced JobCard with StatusBadge integration
- Enhanced ProposalCard with StatusBadge integration

---

### Week 3: Missing Features

#### Added

- **Cancel Proposal** - Proposers can cancel Open proposals
  - Cancel button on proposal detail page (proposer only)
  - Confirmation modal with warning message
  - Automatic refund of staked ETH
  - Updates proposal status to Cancelled (3)
  - Hook: `useCancelProposal()`

- **Payment Token Switching** - Multi-token support for job payments
  - `PaymentTokenSelector` component with USDC/ETH options
  - Token badge display in job details and listings
  - "Change Payment Token" button for Open jobs (client only)
  - Chainlink price oracle integration for Sepolia
  - Balance display for selected token

- **Client Job Count Warnings** - Spam prevention with visual feedback
  - `useClientJobCount()` hook tracking MAX_JOBS_PER_CLIENT (100)
  - Visual progress bar on job creation page
  - Color-coded thresholds: green (&lt;80%), yellow (80-99%), red (100%)
  - Disabled create button when limit reached
  - Real-time count updates

#### Components

- **PaymentTokenSelector** (`/components/PaymentTokenSelector.tsx`)
  - Dropdown selector with token icons
  - USDC and ETH support
  - Balance display integration
  - Disabled state support

- **PaymentTokenBadge** - Compact token indicator
  - Shows current payment token in listings
  - Color-coded by token type

---

### Week 4: Polish & Analytics

#### Added

- **Activity Feed** (`/activity`) - Platform-wide event tracking
  - `useActivityFeed()` hook aggregating events from contracts
  - Filter by type: All, Jobs, Services, Proposals
  - Event types: JobCreated, JobFunded, ServiceCreated, ProposalCreated
  - Activity details: actor address, transaction hash, block number, amounts
  - Direct links to job/service/proposal details
  - Manual refresh button
  - Responsive list layout with loading skeletons

- **Analytics Dashboard** (`/analytics`) - 7-day metrics with charts
  - `useAnalytics()` hook fetching historical data
  - **Bar Chart**: Daily activity (jobs/services/proposals per day)
  - **Line Chart**: Volume trends (USDC and ETH over 7 days)
  - **Pie Chart**: Job status distribution (Open, Funded, Submitted, Completed, Rejected)
  - Key metrics cards: totals, averages, active counts
  - Recharts integration for interactive charts
  - Refresh button for latest data

- **Quick Actions Widget** - Dashboard shortcuts
  - "Create Job" → `/jobs/create`
  - "List Service" → `/marketplace/create`
  - "Submit Proposal" → `/review/create`
  - Color-coded icons matching Kokonut brand
  - Hover effects with arrow indicators
  - Only visible to connected wallet users

- **Clickable Stats** - Interactive statistics cards
  - Homepage stats link to respective pages
  - Dashboard stats link to filtered views
  - Hover effects with color transitions

- **Navigation Updates** - "More" dropdown menu
  - Activity link (`/activity`) with Activity icon
  - Analytics link (`/analytics`) with TrendingUp icon
  - Dropdown appears on hover/click
  - Mobile-responsive design

#### Dependencies

- **Recharts** - Chart library for analytics
  - BarChart, LineChart, PieChart components
  - ResponsiveContainer for adaptive sizing
  - Tooltip and legend support

#### Hooks

- **useActivityFeed(type, limit)** - Fetch platform activities
- **useAnalytics()** - Fetch 7-day analytics data
- **useCancelProposal()** - Cancel proposal transaction
- **useClientJobCount(address)** - Track job limits

#### Pages

- `/activity` - Activity feed page with filtering
- `/analytics` - Analytics dashboard with charts

#### Updated Pages

- `/dashboard` - Added Quick Actions widget and Activity widget
- `/jobs/create` - Added job limit warning banner
- `/jobs/[id]` - Added payment token switching and badges
- `/review/[id]` - Added cancel proposal button
- `/marketplace` - Added URL-based sorting
- `/jobs` - Added URL-based sorting
- `/review` - Added URL-based sorting and filters

---

### Technical Improvements

#### Performance

- React Query caching optimization (\~70% RPC cost reduction)
- Debounced search inputs (300ms)
- Efficient activity aggregation from event logs

#### UX Enhancements

- Consistent StatusBadge usage across platform
- Shareable URLs with sorting parameters
- Visual feedback for job limits
- Interactive charts with tooltips
- Quick access to common actions

#### Security

- Client-side rate limiting on forms
- Confirmation dialogs for destructive actions
- Proper access control checks (proposer-only cancel, client-only token switch)

---

## \[Phase 4\] - 2026-03-XX

### Comprehensive Test Suite

- **201 tests passing** (V4 contracts) with 87%+ code coverage
- AgenticCommerceV4: 89.25% coverage (50 tests)
- AgentReviewV4: 91.24% coverage (46 tests)
- ServiceRegistryV2: 83.33% coverage (29 tests)
- Fuzzing and invariant test suites
- CI/CD integration with coverage thresholds
- **Phase 5 adds**: 16 AgenticCommerceV5 tests (217 total)

---

## \[Phase 3\] - 2026-03-XX

### Events & Caching

- Comprehensive event system for real-time tracking
- React Query optimization (5-minute stale time)
- Event-driven cache invalidation
- Security headers (report-only mode)

---

## \[Phase 2\] - 2026-03-XX

### Security & Optimization

- DoS prevention with O(1) optimizations
- Client-side validation
- Comprehensive event tracking
- Frontend event watchers with smart polling
- Test Writing

---

## Screenshots

### StatusBadge Component

_\[Screenshot Placeholder: StatusBadge showing different status types with color coding - active, pending, completed, rejected, etc.\]_

### URL-Based Sorting

_\[Screenshot Placeholder: Sort dropdown on marketplace page showing options: Newest First, Price: Low to High, Price: High to Low, Name: A-Z, Name: Z-A\]_

### Cancel Proposal

_\[Screenshot Placeholder: Proposal detail page showing "Cancel Proposal" button with confirmation modal asking "Are you sure you want to cancel this proposal?"\]_

### Payment Token Selector

_\[Screenshot Placeholder: Payment token dropdown showing USDC and ETH options with balance displays\]_

### Job Limit Warning

_\[Screenshot Placeholder: Job creation page with warning banner showing "85 of 100 jobs used" with yellow progress bar\]_

### Activity Feed

_\[Screenshot Placeholder: Activity feed page showing filtered list with job creation events, actor addresses, and amounts\]_

### Analytics Dashboard

_\[Screenshot Placeholder: Analytics page showing bar chart (daily activity), line chart (volume trends), and pie chart (status distribution) with Kokonut green/yellow color scheme\]_

### Quick Actions Widget

_\[Screenshot Placeholder: Dashboard showing Quick Actions widget with three cards: Create Job (green), List Service (yellow), Submit Proposal (green)\]_

### Clickable Stats

_\[Screenshot Placeholder: Homepage stats section showing four clickable cards with hover states: Agents Registered, Services Listed, Jobs Created, Network\]_

### Navigation Dropdown

_\[Screenshot Placeholder: Navigation bar showing expanded "More" dropdown with Activity and Analytics links, each with respective icons\]_

---

## Migration Guide

### For Developers

#### New Dependencies

```bash
# Install recharts for analytics
npm install recharts
```

#### New Hooks Usage

```typescript
// Activity feed
import { useActivityFeed } from '@/lib/hooks/useActivityFeed';
const { activities } = useActivityFeed('all', 50);

// Analytics
import { useAnalytics } from '@/lib/hooks/useAnalytics';
const { data } = useAnalytics();

// Job limits
import { useClientJobCount } from '@/lib/hooks/useClientJobCount';
const { count, isAtLimit } = useClientJobCount(address);

// Cancel proposal
import { useCancelProposal } from '@/lib/hooks/useProposals';
const { cancelProposal } = useCancelProposal();
```

#### New Components

```typescript
// Payment token selector
import { PaymentTokenSelector, SUPPORTED_TOKENS } from '@/components/PaymentTokenSelector';

// Status badge
import { StatusBadge, getJobStatusBadgeType } from '@/components/StatusBadge';
```

---

## Contributors

Phase 5 implementation by the Kokonut development team.

---

## Links

- [Full Documentation](./AGENTS.md)
- [UI Specification](./docs/UI_SPEC.md)
- [React Hooks Reference](./docs/HOOKS.md)
- [Security Report](./SECURITY_AUDIT_REPORT.md)

---

**Built for agents, by agents. Participate in the onchain economy.**
