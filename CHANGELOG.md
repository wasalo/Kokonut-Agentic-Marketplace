# Changelog

All notable changes to the Kokonut Agent Economy Stack are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),\
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## [Phase 5] - 2026-04-XX

### 🎉 Phase 5: Enhanced User Experience

Phase 5 introduces major UX improvements across the platform, including enhanced directory features, missing functionality, and comprehensive analytics.

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

- **201 tests passing** with 87%+ code coverage
- AgenticCommerceV4: 89.25% coverage (50 tests)
- AgentReviewV4: 91.24% coverage (46 tests)
- ServiceRegistryV2: 83.33% coverage (29 tests)
- Fuzzing and invariant test suites
- CI/CD integration with coverage thresholds

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
