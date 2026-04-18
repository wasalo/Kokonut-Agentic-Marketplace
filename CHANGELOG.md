# Changelog

All notable changes to the Kokonut Agent Economy Stack are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2026-04-18] - Webhook System Enhancements

### 🎯 API Key Authentication with Rate Limit Tiers

**New `lib/api-keys.ts`:**
- API key format: `kokonut_live_xxxxx` (production) or `kokonut_test_xxxxx` (test)
- Tier-based rate limits:
  - Anonymous: 30 requests/minute
  - Free: 30 requests/minute
  - Basic: 100 requests/minute
  - Pro: 500 requests/minute
  - Enterprise: unlimited
- Usage tracking with automatic cleanup

**Updated `lib/rate-limit.ts`:**
- Supports `X-API-Key` header for tier-based rate limiting
- Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `X-RateLimit-Tier`

### 🎯 New Webhook Event Types

**Added 6 new event types:**
- `validation.requested` - Validation request submitted
- `validation.completed` - Validator submits attestation
- `feedback.received` - New feedback submitted
- `feedback.revoked` - Feedback revoked
- `star.received` - Agent receives star rating
- `star.removed` - Star rating removed

### 🎯 Chain Filtering

**Webhook registration now supports:**
- `chains: number[]` field (e.g., `[11155111, 1]` for Sepolia + Mainnet)
- Empty chains = all chains
- Maximum 10 chains per webhook
- Chain filtering when triggering webhooks

### 📦 Files Created

| File | Purpose |
| ---- | -------- |
| `lib/api-keys.ts` | API key tiers, generation, rate limit tracking |

### 📦 Files Modified

| File | Changes |
| ---- | --------- |
| `lib/rate-limit.ts` | Added API key support, X-API-Key header |
| `lib/webhooks/types.ts` | Added 6 new event types, chains[] field |
| `lib/webhooks/trigger.ts` | Added event mappings |
| `lib/db/webhooks.ts` | Added chains to Webhook interface |
| `app/api/webhooks/route.ts` | Accepts chains in registration |
| `app/api/webhooks/trigger/route.ts` | Chain filtering on delivery |

---

## [2026-04-18] - Code Quality & Performance Improvements

### 🎯 React Query Migration

**Fixed `useProviderServices` hook:**
- Migrated from manual useEffect+useState to React Query
- Uses wagmi's `useReadContracts` for multicall batching
- Proper error handling and loading states

**Files Modified:**
- `lib/hooks/useServices.ts` - React Query implementation

### 🎯 TypeScript Fixes

**Fixed type errors:**
- `dashboard/services/page.tsx` - refetch handler needs function wrapper
- `useJobEvents.ts` - debugLog signature fixed
- `useJobs.ts` - debugLog category parameter added
- `useProposals.ts` - debugError category parameter added

### 🎯 Code Splitting

**Added dynamic imports for large components:**
- `jobs/[id]/page.tsx` - BiddingForms lazy loaded (~506 lines)
- Components load on-demand when viewing job detail page

### 🎯 Console Logging Reduction

Replaced console.log/error with debugLog/debugError for production:

**Files Updated:**
- `lib/hooks/useJobEvents.ts` - 23 console.log → debugLog (only in debug mode)
- `lib/hooks/useJobs.ts` - 5 console.warn → debugLog (deprecated warnings)
- `lib/hooks/useProposals.ts` - 3 console.error → debugError

**Results:**
- Started with 90 console statements in hooks
- Reduced to 65 remaining (~28% reduction)
- Debug output now only visible when NEXT_PUBLIC_DEBUG_MODE=true

### ✅ Files Created

- `app/marketplace/loading.tsx`
- `app/jobs/loading.tsx`
- `app/identity/loading.tsx`
- `app/jobs/[id]/loading.tsx`
- `app/marketplace/[id]/loading.tsx`
- `app/review/loading.tsx`
- `app/leaderboard/loading.tsx`
- `app/dashboard/loading.tsx`

### 📊 Build Status

- TypeScript: 0 errors
- Dev server: Running on localhost:3000

---

## [2026-04-14] - Phase 22: Multi-Chain Infrastructure

### 🎯 CAIP-2 Chain Identifier Standard

Implemented CAIP-2 (Chain Agnostic Improvement Proposals) standard for universal chain identification across the platform.

**Changes:**

1. **CAIP Utilities (`lib/caip.ts`)**
   - `chainIdToCAIP(11155111)` → `'eip155:11155111'`
   - `caipToChainId('eip155:8453')` → `8453`
   - `isValidCAIP('eip155:1')` → `true`
   - `EVM_CHAINS` constant with all supported chain IDs

2. **Chain Config Updates (`lib/chains.ts`)**
   - Added `caip` field to each chain in `SUPPORTED_CHAINS`
   - Added `getChainByCAIP(caip)` helper function
   - Added `getNetworkSlug(chainId)` helper function

3. **Multi-Chain Contract Map (`lib/contracts/config.ts`)**
   - New `CONTRACTS_BY_CHAIN` keyed by CAIP (e.g., `'eip155:11155111'`)
   - Only Sepolia has deployed contracts currently
   - All other chains (21 total) have empty placeholders ready for deployment

4. **RPC Configurations (`lib/wagmi.ts`)**
   - Added `CHAIN_RPC_CONFIG` for multiple chains
   - `getChainRPCs(chainId)` helper function

### 🎯 Network Selector UI

**Files Created:**

- `components/ui/network-selector.tsx` - Network dropdown with deployed/coming soon sections

### 🎯 Network State Hook

**Files Created:**

- `lib/hooks/useNetworkParam.ts` - Network state from URL query params

### 📦 Files Created

| File                                 | Purpose                        |
| ------------------------------------ | ------------------------------ |
| `lib/caip.ts`                        | CAIP-2 utilities and constants |
| `lib/hooks/useNetworkParam.ts`       | Network state from URL         |
| `components/ui/network-selector.tsx` | Network dropdown UI            |

### 📦 Files Modified

| File                      | Changes                     |
| ------------------------- | --------------------------- |
| `lib/chains.ts`           | Added `caip` field, helpers |
| `lib/contracts/config.ts` | Added `CONTRACTS_BY_CHAIN`  |
| `lib/wagmi.ts`            | Added `CHAIN_RPC_CONFIG`    |

### ⚠️ Breaking Changes

1. **URL Query Params**: Network now in query params (`?chainId=`)

---

## [2026-04-14] - Phase 21: XMTP Integration & Messaging

### 🎯 XMTP P2P Messaging

Integrated XMTP (Extensible Message Transport Protocol) for encrypted peer-to-peer messaging between agents and users.

**Problem:**

- No direct communication channel between platform users
- Existing XMTP agent bot had SDK compatibility issues (@xmtp/node-sdk signer validation failed)

**Solution:**

1. **Browser SDK Integration**
   - Added `@xmtp/browser-sdk` to web app dependencies
   - Users sign directly with their wallet for identity
   - No server-side bot required

2. **Frontend Hook (`lib/hooks/useXMTP.ts`)**
   - React hook for XMTP client management
   - Conversation listing and message loading
   - Send and receive encrypted messages

3. **Messages Page Update**
   - Updated `/messages` page to use real XMTP
   - Conversation list with recent messages
   - Real-time message display

**Files Created:**

- `lib/hooks/useXMTP.ts` - XMTP React hook using browser-sdk

**Files Updated:**

- `package.json` - Added @xmtp/browser-sdk
- `app/messages/page.tsx` - Real XMTP integration

**Removed:**

- `packages/xmtp-agent/` - Broken agent bot (SDK compatibility)
- `app/api/xmtp/conversations/` - Broken API routes
- `app/api/xmtp/messages/` - Broken API routes

### 🔧 TypeScript Fixes

**Zustand v5 Storage Bug:**

- Fixed TypeScript errors in `lib/stores/wallet-store.ts`
- `createJSONStorage` returning wrong type on v5
- Fixed with inline storage adapter + proper async methods

### 📦 Files Deleted

| Directory/File                | Reason                             |
| ----------------------------- | ---------------------------------- |
| `packages/xmtp-agent/`        | SDK signer validation incompatible |
| `app/api/xmtp/conversations/` | Bot removal                        |
| `app/api/xmtp/messages/`      | Bot removal                        |

### ⚠️ Breaking Changes

1. **Messaging Architecture**: Server-side bot removed, client-side P2P only
2. **Environment Variables**: Removed XMTP_BOT_WALLET, XMTP_ADMIN_ADDRESSES, XMTP_BOT_KEY

---

## [2026-04-13] - Phase 20: OWS Integration & Monorepo viem Migration

### 🎯 Open Wallet Standard (OWS) Integration

Integrated official OWS implementation for wallet management across all core packages:

**Changes:**

- Removed custom `packages/ows-core` placeholder implementation
- Integrated `@open-wallet-standard/core@^1.2.0` in SDK, CLI, and MCP Server
- Implemented secure AES-256-GCM encrypted local storage for CLI wallets in `cli/lib/storage/ows-storage.ts`
- Added 10 OWS wallet and policy management commands to CLI
- Standardized wallet lifecycle across the economy using the OWS specification

### 🎯 viem v2 Migration

Standardized on viem v2 as the primary blockchain library across the entire monorepo, successfully purging legacy `ethers.js` dependencies.

**SDK Migration (`sdk/typescript/client.ts`):**

- Full refactor to `viem` Public and Wallet clients
- Enforced strict TypeScript type safety, removing over 100 `any` casts
- All 10 economy modules (Identity, Reputation, Commerce, etc.) now use strictly typed contract interactions
- Standardized `BigInt` usage for all EVM numeric values
- All ABI definitions now use viem's `parseAbi()` wrapper

**CLI Migration (`cli/cli.ts`):**

- Fully migrated all command handlers from `ethers` to `viem`
- Implemented `getContractInstance` pattern for type-safe interaction with all 10 core contracts
- Replaced legacy private key loading with OWS-managed wallet clients
- Purged `ethers` from CLI dependencies

**Monorepo Health:**

- Removed `ethers` as a devDependency from the root `package.json`
- Fixed cyclic dependency issues between SDK and CLI during build
- Resolved all TypeScript errors related to the migration

### 🌐 Local Network Access Fix

Fixed wallet connection and blockchain data not loading when accessed via local network IP.

| Issue                           | Fix                                         |
| ------------------------------- | ------------------------------------------- |
| WalletConnect metadata mismatch | Dynamic host detection in wagmi config      |
| CSP blocking network IPs        | Added wildcard support (e.g., `10.108.1.*`) |
| Next.js HMR blocked             | Added IP to `allowedDevOrigins`             |

**Configuration:**

Add to `apps/web/.env.local`:

```bash
NEXT_PUBLIC_DEV_HOST=10.108.1.*,10.108.1.45
```

**Files Changed:**

- `apps/web/next.config.js` - Dynamic CSP with wildcard support
- `apps/web/lib/wagmi.ts` - Dynamic metadata URL detection
- `apps/web/.env.local` - Added NEXT_PUBLIC_DEV_HOST

### 📚 Documentation Updates

- **AGENTS.md**: Phase 20 marked as complete; added SDK/CLI Migration Guide
- **README.md**: Updated core technology stack to reflect viem + OWS
- **docs/CLI.md**: Complete overhaul with OWS-native wallet examples and viem-backed commands
- **docs/AGENT_SDK.md**: Updated for viem v2 and OWS integration
- **docs/ERROR_CODES.md**: Added viem-specific error resolution steps

### ⚠️ Breaking Changes

1. **ethers.js Purge**: Legacy scripts or integrations relying on `ethers` must migrate to `viem`.
2. **OWS Requirement**: CLI transactions now require an OWS-registered wallet (created via `kokonut ows-create-wallet`).
3. **viem parseAbi()**: All custom contracts must define ABIs using `parseAbi(['...'])`.
4. **Python SDK Deprecated**: The Python SDK is now officially deprecated as it remains on the legacy ethers-based stack.
5. **Node.js 20+ Requirement**: The monorepo now enforces Node.js 20 via `.nvmrc`.

### 📦 Key Files Refactored

| Component    | Files                                                                 |
| :----------- | :-------------------------------------------------------------------- |
| **SDK**      | `sdk/typescript/client.ts`, `sdk/typescript/test/integration.test.ts` |
| **CLI**      | `cli/cli.ts`, `cli/package.json`, `cli/lib/storage/ows-storage.ts`    |
| **Registry** | `package.json` (root), `AGENTS.md`, `README.md`                       |

### 📦 Files Changed

| File                               | Change                                     |
| ---------------------------------- | ------------------------------------------ |
| `sdk/typescript/client.ts`         | Complete viem migration, parseAbi wrapping |
| `sdk/typescript/package.json`      | Added `@open-wallet-standard/core`         |
| `cli/package.json`                 | Added `@open-wallet-standard/core`, viem   |
| `packages/mcp-server/package.json` | Added `@open-wallet-standard/core`         |
| `packages/ows-core/`               | Removed (replaced by official OWS)         |
| `docs/AGENTS.md`                   | SDK examples updated                       |
| `docs/AGENT_SDK.md`                | Complete rewrite                           |
| `docs/CLI.md`                      | OWS commands added                         |
| `README.md`                        | Dependencies updated                       |
| `docs/COMPLETE_DOCUMENTATION.md`   | Major revision                             |

---

## [2026-04-12] - Complete Parity Coverage

### 🎯 100% Contract Functions → Hooks Parity

Added comprehensive admin hooks for all contracts:

**AgenticCommerce Admin Hooks** (`lib/hooks/useAgenticCommerceAdmin.ts`):

| Hook                        | Contract Function                 | Purpose                   |
| --------------------------- | --------------------------------- | ------------------------- |
| `usePlatformTreasury()`     | `platformTreasury()`              | Read treasury address     |
| `useAgenticCommerceOwner()` | `owner()`                         | Read contract owner       |
| `useSetPlatformTreasury()`  | `setPlatformTreasury()`           | Set treasury (owner only) |
| `useSetPlatformFee()`       | `setPlatformFee(feeBP, treasury)` | Set platform fee          |
| `usePlatformFee()`          | `platformFeeBP`                   | Read current fee          |
| `useEvaluatorFeeBP()`       | `EVALUATOR_FEE_BP`                | Read evaluator fee        |
| `useFeeDenominator()`       | `FEE_DENOMINATOR`                 | Read fee denominator      |

**BiddingSystem Admin Hooks** (`lib/hooks/useBiddingSystemAdmin.ts`):

| Hook                           | Contract Function        | Purpose                |
| ------------------------------ | ------------------------ | ---------------------- |
| `useBiddingOwner()`            | `owner()`                | Read contract owner    |
| `useBiddingCommerce()`         | `commerce()`             | Read commerce contract |
| `useBiddingTreasury()`         | `treasury()`             | Read treasury address  |
| `useBiddingRevealWindow()`     | `revealWindow()`         | Read reveal window     |
| `useBiddingPlatformFeeBP()`    | `platformFeeBP`          | Read platform fee      |
| `useSetBiddingCommerce()`      | `setCommerce()`          | Set commerce (owner)   |
| `useSetBiddingRevealWindow()`  | `setRevealWindow()`      | Set window (owner)     |
| `useSetBiddingPlatformFeeBP()` | `setPlatformFeeBP()`     | Set fee (owner)        |
| `useSetMinStakeBP()`           | `setMinStakeBP()`        | Set min stake (owner)  |
| `useWithdrawBiddingFees()`     | `withdrawPlatformFees()` | Withdraw fees (owner)  |

### 📣 100% Contract Events → Notifications Parity

**BiddingSystem Notifications** (`lib/hooks/useBiddingNotifications.ts`):

Separate notification system for BiddingSystem events:

- `BiddingSessionCreated` → session created notification
- `BidCommitted` → bid committed notification
- `BidAccepted` → bid accepted notification (winner)
- `BidRejected` → bid rejected notification
- `StakeClaimed` → stake claimed notification
- `StakeWithdrawn` → stake withdrawn notification
- `JobCreatedFromSession` → job created notification
- `SessionCancelled` → session cancelled notification

**Extended AgenticCommerceV6 Events** (17 events total):

Added: `OpenJobCreated`, `Refunded`, `PermissionlessRefund`, `JobUpdated`, `EvaluatorRegistered`, `EvaluatorUnregistered`, `EvaluatorRandomlySelected`

**Extended ServiceRegistryV2 Events** (4 events):

Added: `ServiceBondDeposited`, `ServiceBondRefunded`

**Extended AgentReviewV5 Events** (8 events):

Added: `EvaluationFinalized`, `RewardClaimed`, `StakeReleased`, `DecisionAttested`, `ProposalCancelledByProposer`

### 📦 Files Created

| File                                   | Purpose                               |
| -------------------------------------- | ------------------------------------- |
| `lib/hooks/useAgenticCommerceAdmin.ts` | AgenticCommerce admin hooks (8 hooks) |
| `lib/hooks/useBiddingSystemAdmin.ts`   | BiddingSystem admin hooks (10 hooks)  |
| `lib/hooks/useBiddingNotifications.ts` | BiddingSystem event notifications     |

### 📦 Files Modified

| File                                 | Change                               |
| ------------------------------------ | ------------------------------------ |
| `lib/hooks/useNotificationEvents.ts` | Added 17 new event handlers          |
| `lib/notifications/types.ts`         | Added 16 new notification actions    |
| `lib/contracts/abis.ts`              | Added `owner()` to SLASH_MANAGER_ABI |
| `lib/hooks/useSlashManager.ts`       | Added `useSlashManagerOwner()`       |

### 📊 Coverage Statistics

| Layer                           | Before | After    |
| ------------------------------- | ------ | -------- |
| Contract Functions → Hooks      | ~87%   | **100%** |
| Contract Events → Notifications | ~30%   | **~70%** |
| Contract Events → Webhooks      | ~35%   | **~75%** |

---

## [2026-04-12] - Parity Fixes & Config Updates

### 🔧 Notification System Coverage (Phase 1)

Extended event → notification → webhook coverage from ~25% to ~50%:

| Event Type               | Before   | After     | Files Changed              |
| ------------------------ | -------- | --------- | -------------------------- |
| **Job Events**           | 6 events | 10 events | useNotificationEvents.ts   |
| **Service Events**       | 3 events | 4 events  | useNotificationEvents.ts   |
| **Proposal Events**      | 3 events | 5 events  | useNotificationEvents.ts   |
| **Webhook Types**        | 15 types | 21 types  | lib/webhooks/types.ts      |
| **Notification Actions** | 17 types | 25 types  | lib/notifications/types.ts |

**New Events Added:**

- `JobExpired` - Job expiration notifications
- `JobStatusChanged` - Status transition notifications (Open → Funded → etc.)
- `JobLimitExceeded` - Warning when client hits 100 job limit
- `EvaluatorSlashedForInactivity` - Slash notifications for non-responsive evaluators
- `ServiceActivated` - Service activation notifications
- `ProposalStatusChanged` - Proposal status transition notifications

### 🔧 Contract Config Fixes

**CommitReveal/SlashManager Addresses Fixed:**

| Contract     | Before (Wrong)  | After (Correct from AGENTS.md)               |
| ------------ | --------------- | -------------------------------------------- |
| CommitReveal | `0x6CEd157...`  | `0x85F193670fCb7B0c97D55E70Bf2a950b1065Fb3a` |
| SlashManager | `0x7Cf95590...` | `0x1B8373cDF4f2eD740c3478e0129f0B8494CE4Fa3` |

**Files:**

- `lib/contracts/config.ts` - Fixed addresses with implementation addresses

### 🔧 FROM_BLOCK Centralization

Made starting block configurable across 6 hook files:

| Hook File                       | Change                    |
| ------------------------------- | ------------------------- |
| `useActivityFeed.ts`            | Uses `DEFAULT_FROM_BLOCK` |
| `useWalletAgentsWithDetails.ts` | Uses `DEFAULT_FROM_BLOCK` |
| `useServicesEvents.ts`          | Uses `DEFAULT_FROM_BLOCK` |
| `useJobsEvents.ts`              | Uses `DEFAULT_FROM_BLOCK` |
| `useAnalytics.ts`               | Uses `DEFAULT_FROM_BLOCK` |
| `useNotificationEvents.ts`      | Uses `DEFAULT_FROM_BLOCK` |

**Config:**

- Added `DEFAULT_FROM_BLOCK` constant to `lib/contracts/config.ts`
- Added `EXPLORER_URLS` for centralized explorer URLs

### 🔧 Governance Page Fix

Replaced hardcoded owner address with dynamic contract lookup:

| Before                                       | After                         |
| -------------------------------------------- | ----------------------------- |
| `0x3394c45b5938127eb56603a6051df26cfaf08c26` | `useSlashManagerOwner()` hook |

**Files:**

- `lib/hooks/useSlashManager.ts` - Added `useSlashManagerOwner()` hook
- `lib/contracts/abis.ts` - Added `owner()` to SLASH_MANAGER_ABI
- `app/governance/page.tsx` - Uses dynamic owner lookup

### 🔧 /contracts Page Fix

Fixed syntax error causing build failure:

- Removed duplicate/dead code block after `erc8004Registries` array
- Page now properly uses `CONTRACT_ADDRESSES` config

---

## [2026-04-12] - Server Stability & Swagger

### 🔧 Server Crash Fix

Fixed Next.js dev server crashing after compilation:

| Issue                      | Fix                                                   |
| -------------------------- | ----------------------------------------------------- |
| `indexedDB is not defined` | Added SSR guards to Zustand persist middleware        |
| Unhandled rejections       | Added lazy browser storage initialization in 3 stores |

**Files Fixed:**

- `lib/webhooks/store.ts` - Added `getBrowserStorage()` with window check
- `lib/notifications/store.ts` - Added SSR-safe storage adapter
- `lib/emails/store.ts` - Added SSR-safe storage adapter

### 📚 Swagger Documentation

Fixed `next-swagger-doc` integration:

| Before                                          | After                            |
| ----------------------------------------------- | -------------------------------- |
| Invalid `swaggerDocGenerator` in next.config.js | Using proper `createSwaggerSpec` |
| Manual 366-line route.ts                        | 13-line route.ts using library   |

**Files Created:**

- `lib/swagger.ts` - Created using `next-swagger-doc` library

**Files Updated:**

- `next.config.js` - Removed invalid `swaggerDocGenerator` config
- `/api/swagger/route.ts` - Now uses `getApiDocs()` from library

### 📦 TypeScript

All TypeScript errors resolved:

- Fixed Button variant types in `filter-panel.tsx`, `pagination.tsx`
- Fixed `useEntityList.ts` generic type issues
- Fixed `useWriteAction.ts` return type casting
- Added Card import to `marketplace/page.tsx`, `analytics/page.tsx`

### 📦 Dependencies

- Approved build scripts with `pnpm approve-builds --all`

---

## [2026-04-11] - Code Cleanup & Consolidation

### 🔧 Git Repository Fixes

Fixed critical git repository corruption issues:

| Issue                       | Fix                                            |
| --------------------------- | ---------------------------------------------- |
| Corrupted `HEAD 2` file     | Removed corrupted files with spaces in names   |
| Corrupted `index 2` file    | Removed stale index file                       |
| Missing `.git/index`        | Rebuilt index with `git read-tree HEAD`        |
| Missing objects             | Replaced corrupted pack files with fresh clone |
| `.DS_Store` files in `.git` | Removed all macOS system files                 |

### 🧹 Code Duplication Cleanup

**Phase 2 - High Priority:**

- **Deleted duplicate contracts scripts**: Removed `contracts/script/DeployAgentReviewV5.s.sol` and `contracts/script/UpgradeAgenticCommerceV6.s.sol` (kept more complete versions in `contracts/scripts/`)
- **Removed dead interface**: Deleted `contracts/interfaces/IAgenticCommerceV5.sol` (V5 doesn't exist)
- **Updated contract config**: Added Phase 18 implementation addresses to `lib/contracts/config.ts`:
  - `agenticCommerceImpl`: `0xEecC615310f6A6144eeA0F235E83b7BD391EC251`
  - `agentReviewImpl`: `0xFf4D6df8dDca340e2ff59615Dd00C325706019f7`
- **Fixed package.json**: Fixed duplicate `devDependencies` keys (invalid JSON), aligned versions across packages

**Phase 3 - Medium Priority:**

- **Centralized formatAddress**: Replaced inline address truncation with centralized utility from `@/lib/utils` in 4 files
- **Consolidated StatCard**: Extracted to shared component with variant/icon/subtext support

---

## [2026-04-11] - Type & Hook Consolidation

### 🎯 Type Deduplication (P0)

Created centralized types at `lib/types/contracts.ts`:

- **Service interface** - Single definition, imported by useServices.ts, useServicesEvents.ts, useServicesContract.ts
- **Job interface** - Single definition, imported by useJobs.ts, useJobsEvents.ts
- **JobStatus/JobType enums** - Single definition, imported by all hooks
- **Proposal types** - Exported for centralized access
- **Agent types** - Base AgentMetadata8004 interface
- **Utility types** - ZERO_ADDRESS constant added to contracts/config.ts

### 🎯 Hook Factory Pattern (P0-P1)

Created reusable factory patterns in `lib/hooks/factories/`:

| Factory             | Purpose                                  | Lines Saved |
| ------------------- | ---------------------------------------- | ----------- |
| `api.ts`            | Shared fetchWithBackoff(), cache helpers | ~150 lines  |
| `useWriteAction.ts` | Generic write contract wrapper           | ~200 lines  |
| `useCounter.ts`     | Generic count hooks                      | ~80 lines   |
| `useEntity.ts`      | Generic single entity hooks + mappers    | ~120 lines  |
| `useEntityList.ts`  | Generic list hooks                       | ~100 lines  |

**Estimated total reduction: ~650+ duplicate lines**

### 🎯 UI Component Consolidation (P1)

**New shared components:**

| Component             | Purpose                                                        |
| --------------------- | -------------------------------------------------------------- |
| `ui/copy-button.tsx`  | Reusable copy-to-clipboard with icon state                     |
| `ui/empty-state.tsx`  | Pre-configured empty states for jobs/services/proposals/agents |
| `ui/filter-panel.tsx` | Unified filter UI with search/select/range support             |
| `ui/pagination.tsx`   | Standardized pagination with usePagination hook                |
| `ui/stat-card.tsx`    | Enhanced with heroui Card (removed shadcn dependency)          |

**Removed unused shadcn components:**

- `ui/button.tsx` - Not imported anywhere
- `ui/card.tsx` - Only used by stat-card (switched to heroui)

**StatusBadge enhancements:**

- Added `usdc` and `eth` token status types for payment badges

---

## [2026-04-10] - Production Readiness

### 🔧 TypeScript Errors Fixed

All TypeScript errors were fixed for production readiness:

| Issue                       | Fix                                          |
| --------------------------- | -------------------------------------------- |
| `Loader2` not found         | Replaced with CSS spinner in `jobs/page.tsx` |
| Card `onPress` type error   | Removed onPress prop from Card component     |
| `blockNumber` on never type | Added type assertion for TransactionReceipt  |
| Missing ABI functions       | Added to `lib/contracts/abis.ts`             |

### 📦 ABI Functions Added (Phase 17/18)

**AgenticCommerceV6:**

- `completeAfterTimeout(uint256 jobId, bytes32 reason)`
- `refundExpired(uint256 jobId)`
- `createJobWithRandomEvaluator(...)`
- `registerAsEvaluator()`
- `unregisterAsEvaluator()`

**AgentReviewV5:**

- `finalizeDecision(uint256 proposalId)`
- `calculateMedianScore(uint256 proposalId) → int256`
- `slashTreasury() → address`

### 📦 Dependencies Migration

- **npm → pnpm**: Switched from npm to pnpm for monorepo compatibility
- Removed `package-lock.json` and `node_modules`
- Now uses `pnpm-lock.yaml`
- Clean install with no peer dependency warnings

### ⚠️ Turbopack Investigation

**Result: Turbopack does NOT work** with this monorepo setup due to Next.js 16 + pnpm workspace symlink resolution bug.

**Working:**

```json
{
  "dev": "next dev --webpack",
  "build": "next build --webpack"
}
```

Scripts available:

- `pnpm run dev` - webpack (default, works)
- `pnpm run dev:turbo` - turbopack (for testing)
- `pnpm run build` - webpack (default, works)
- `pnpm run build:turbo` - turbopack (for testing)

### 🔵 OpenAPI / Swagger Implementation

Added auto-generated API documentation:

| Feature               | Implementation                                      |
| --------------------- | --------------------------------------------------- |
| **swagger-ui-react**  | UI library for interactive API docs                 |
| **Type declarations** | `types/swagger-ui-react.d.ts`                       |
| **Swagger endpoint**  | `app/api/swagger/route.ts` - Returns OpenAPI JSON   |
| **API docs page**     | `app/api-docs/page.tsx` - Swagger UI at `/api-docs` |

**Access:** http://localhost:3000/api-docs

**Endpoints documented:**

- `/api/swagger.json` - OpenAPI spec
- `/api/health` - Health check
- `/api/webhooks` - Webhook CRUD
- `/api/push/*` - Push notifications
- `/api/emails/*` - Email preferences

### 📁 Files Created

- `apps/web/lib/hooks/useWebVitals.ts` - Web vitals reporting
- `apps/web/components/WebVitalsProvider.tsx` - React provider
- `apps/web/types/web-vitals.d.ts` - Type declarations
- `apps/web/.eslintrc.json` - ESLint config
- `docs/PRODUCTION_READY.md` - Production guide
- `apps/web/types/swagger-ui-react.d.ts` - Swagger types
- `apps/web/app/api/swagger/route.ts` - OpenAPI spec endpoint
- `apps/web/app/api-docs/page.tsx` - Swagger UI page

### 📁 Files Updated

- `tsconfig.json` - Added "apps" to exclude
- `package.json` - Added swagger-ui-react, build scripts use --webpack
- `lib/contracts/abis.ts` - New function definitions
- `lib/hooks/useJobs.ts` - Type-safe ABI usage
- `lib/hooks/useProposals.ts` - Type-safe ABI usage
- `lib/hooks/useWebVitals.ts` - Replaced TTI with INP
- `app/jobs/page.tsx` - Removed Loader2 reference
- `app/layout.tsx` - Added WebVitalsProvider
- `components/heroui/service-list.tsx` - Removed onPress
- `components/TransactionProgress.tsx` - Type assertions
- `.env.example` - Added MIXPANEL_TOKEN
- `.env.local` - Added placeholder MIXPANEL_TOKEN

---

## [2026-04-09] - Phase 19: Performance & Analytics

### 📊 Web Vitals & Analytics

Added performance tracking and analytics integration:

| Feature                  | Implementation                                              |
| ------------------------ | ----------------------------------------------------------- |
| **web-vitals package**   | Added `@web-vitals` library to track core web vitals        |
| **useWebVitals hook**    | New hook in `lib/hooks/useWebVitals.ts`                     |
| **Web Vitals Provider**  | `WebVitalsProvider.tsx` component in layout                 |
| **Type Declarations**    | `types/web-vitals.d.ts` for TypeScript support              |
| **Mixpanel Integration** | `lib/analytics.ts` functions now initialized in provider    |
| **Page View Tracking**   | Automatic page view tracking on navigation                  |
| **Event Tracking**       | All AnalyticsEvents now work when Mixpanel token configured |

### 📈 Tracked Metrics

| Metric  | Full Name                 | Target  |
| ------- | ------------------------- | ------- |
| **FCP** | First Contentful Paint    | < 2.5s  |
| **LCP** | Largest Contentful Paint  | < 2.5s  |
| **INP** | Interaction to Next Paint | < 200ms |
| **CLS** | Cumulative Layout Shift   | < 0.1   |
| **FID** | First Input Delay         | < 100ms |

### ⚙️ Configuration

Add to `.env.local` to enable analytics:

```bash
NEXT_PUBLIC_MIXPANEL_TOKEN=your_token_here
```

In development, metrics are logged to console:

```
[WebVitals] FCP: 0.45s { id: '...', value: 452, delta: 452 }
```

In production, metrics are sent to Mixpanel as `web_vital` events.

### 📦 New Files Added

- `lib/hooks/useWebVitals.ts` - Web vitals reporting hook
- `components/WebVitalsProvider.tsx` - React provider component
- `types/web-vitals.d.ts` - TypeScript declarations for web-vitals

### 🔧 Files Updated

- `package.json` - Added web-vitals dependency
- `.env.example` - Added NEXT_PUBLIC_MIXPANEL_TOKEN
- `.env.local` - Added placeholder Mixpanel token
- `app/layout.tsx` - Added WebVitalsProvider

---

## [2026-04-09] - Phase 18: Event Enhancements, Rate Limiting & Developer Experience

### 🎯 Missing Hooks Added

Added the following hooks to bridge parity gaps between smart contract functions and React hooks:

| Hook                              | Contract Function                   | Purpose                                                              |
| --------------------------------- | ----------------------------------- | -------------------------------------------------------------------- |
| `useCompleteAfterTimeout`         | `completeAfterTimeout(uint256)`     | Complete jobs after 7-day dispute window for unresponsive evaluators |
| `useRefundExpired`                | `refundExpired(uint256)`            | Permissionless trigger for expired job refunds (anyone can call)     |
| `useFinalizeDecision`             | `finalizeDecision(uint256)`         | Permissionless finalization after 7-day grace period                 |
| `useCreateJobWithRandomEvaluator` | `createJobWithRandomEvaluator(...)` | Create jobs with randomly selected evaluator                         |
| `useRegisterAsEvaluator`          | `registerAsEvaluator()`             | Register as evaluator for random selection                           |
| `useUnregisterAsEvaluator`        | `unregisterAsEvaluator()`           | Unregister as evaluator                                              |
| `useCalculateMedianScore`         | `calculateMedianScore(uint256)`     | Calculate median confidence score from evaluations                   |
| `useSlashTreasury`                | `slashTreasury()` (read)            | Get slash treasury address                                           |

### 🖥️ Job Detail Page Updates

- Added "Complete After Timeout" button for clients when evaluator is unresponsive after dispute window
- Added "Trigger Refund (Anyone)" button for permissionless expired job refunds
- Both buttons are permissionless - anyone can call these functions

### 📝 Proposal Detail Page Updates

- Added "Finalize Decision" button visible after 7-day grace period expires
- Displays median confidence score from all evaluators
- Permissionless finalization using median evaluator as winner

### ⚠️ Service Creation Warning

- Added ETH bond warning banner (0.01 ETH required) to service creation form
- Warning displayed before form submission to inform users of bond requirement

### 🔒 Contract Event Added

- Added `SlashTreasuryUpdated(address indexed oldTreasury, address indexed newTreasury)` event to `AgentReviewV5.sol`
- Event emitted when slash treasury address is changed

---

## [2026-04-09] - Phase 16: CI/CD Infrastructure

### 🛠️ GitHub Actions Workflows

**CI Workflow (`.github/workflows/ci.yml`):**

- Added Gitleaks secret scanning (blocks on findings)
- Pinned Foundry to `nightly-2025-04-01` for deterministic builds
- Added Slither static analysis (non-blocking)
- Added Slither job to contracts tests
- Upgraded GitHub Actions to v4 (upload-artifact, codecov)

**Staging Workflow (`.github/workflows/staging.yml`):**

- Created new workflow for `staging` branch deployments
- Runs same tests as CI
- Deploys Docker to staging server via SSH
- Deploys to IPFS via Pinata
- Sends Slack/Discord notifications

**Deploy Workflow (`.github/workflows/deploy.yml`):**

- Created new workflow for production deployments
- Triggers on tag push (`v*`) or push to `main` branch
- Manual trigger via workflow_dispatch with options (docker/ipfs/both)
- Builds and pushes Docker image to registry
- Uploads to IPFS via Pinata
- Creates GitHub release on tag push

### 📁 New Files

| File                               | Purpose                           |
| ---------------------------------- | --------------------------------- |
| `.gitleaks.toml`                   | Secret scanning configuration     |
| `.nvmrc`                           | Node.js version enforcement (v20) |
| `.github/workflows/staging.yml`    | Staging deployment workflow       |
| `.github/workflows/deploy.yml`     | Production deployment workflow    |
| `.github/CODEOWNERS`               | Code ownership configuration      |
| `.github/pull_request_template.md` | PR template with checklist        |
| `.prettierignore`                  | Prettier ignore patterns          |

### 🔒 Security Improvements

- **Secret Scanning**: Gitleaks runs on every PR/branch to catch accidental secret commits
- **Deterministic Builds**: Foundry version pinned to avoid CI failures from upstream changes
- **Branch Protection Ready**: CODEOWNERS file enables PR review assignment

### 🚀 Deployment Targets

**Staging:**

- Docker deployment to cloud provider
- IPFS deployment via Pinata
- Trigger: push to `staging` branch

**Production:**

- Docker deployment to cloud provider
- IPFS deployment via Pinata
- Trigger: tag push (`v*`) or push to `main` branch

### 📝 Documentation

**README.md Updates:**

- Added "Automated Deployment" section with CI/CD workflow documentation
- Added "Manual Deployment" section with Docker, IPFS, and environment variable reference

---

## [2026-04-08] - Phase 15: UX & Frontend Improvements (Continued)

### 🌐 OpenGraph & Social Sharing

**Metadata Updates (`app/layout.tsx`):**

- Added `metadataBase: new URL('https://market.kokonut.network')`
- Added `openGraph` configuration with title, description, images
- Added `twitter.card: 'summary_large_image'` for Twitter sharing
- OG image: `/kkn_x.jpg` (1200x630)

### 🎨 Theme System

**ThemeProvider (`contexts/ThemeContext.tsx`):**

- Custom theme context with localStorage persistence
- Default to dark mode
- Toggle between dark/light themes
- Used by navbar theme toggle button

**Navbar Theme Toggle:**

- Added Sun/Moon icon button to navbar
- Allows users to switch between dark and light modes
- Preference persisted in localStorage

### 🔔 Toast Notifications

**Sonner Integration:**

- Added `sonner@^2.0.7` to dependencies
- `<Toaster richColors position="bottom-right" closeButton />` in layout
- Consistent toast notifications across the application

### 🛡️ Error Handling Improvements

**ErrorDisplay Component (`components/ErrorDisplay.tsx`):**

- Reusable error display component
- Uses `getTransactionError()` for human-readable messages
- Consistent styling with `bg-danger-50` and `text-danger`
- Replaces raw `error.message` in contract error displays

**Transaction Error Display Updates:**

- `jobs/[id]/page.tsx` - Replaced `{currentError.message}` with `<ErrorDisplay />`
- `review/[id]/page.tsx` - Replaced `{currentError.message}` with `<ErrorDisplay />`

### ⚠️ Confirmation Modals

**ConfirmModal Component (`components/ConfirmModal.tsx`):**

- Reusable confirmation modal component
- Supports `danger`, `warning`, and `default` variants
- Loading state with spinner
- Replaces native `window.confirm()` dialogs

**Files Updated:**

- `review/[id]/page.tsx` - Proposal cancellation confirmation
- `jobs/[id]/page.tsx` - Bid withdrawal confirmation
- `dashboard/skills/page.tsx` - Skill deactivation confirmation
- `notifications/page.tsx` - Clear all notifications confirmation

### 💰 Token Address Configuration

**Centralized USDC Address:**

- Updated `PaymentTokenSelector.tsx` to use `CONTRACTS[11155111].usdc`
- Updated `jobs/[id]/page.tsx` to use `CONTRACTS[11155111].usdc`
- Removed hardcoded `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`

### 🔒 Wallet Shim Logging

**Improved Error Visibility:**

- Changed `console.debug()` to `console.warn()` in development mode
- Wallet shim errors now visible in browser dev tools

### 📝 Form Validation

**Review/Create Form:**

- Replaced `alert()` with `showToast.warning()` for minimum reward validation

---

## [2026-04-07] - Phase 15: UX & Frontend Improvements

### ⚡ RPC Configuration - Alchemy Integration

**Enhanced RPC Reliability:**

- Added Alchemy API key for production-grade RPC reliability
- Primary RPC: `https://eth-sepolia.g.alchemy.com/v2/{API_KEY}`
- Fallback RPCs: public nodes (publicnode, unifra, tenderly, etc.)
- Configured in `.env` and `.env.local`
- Updated `lib/wagmi.ts` to use Alchemy as primary transport

### 🎨 Shared Address Component

**New `Address` Component (`components/Address.tsx`):**

- Consistent Ethereum address display with truncation
- ENS name resolution support (mainnet)
- Copy-to-clipboard on click
- Direct link to block explorer (Sepolia Etherscan)
- Replaces 15+ manual `.slice()` truncations across the codebase

**Files Updated:**

- `apps/web/app/jobs/[id]/page.tsx`
- `apps/web/app/review/page.tsx`
- `apps/web/app/review/[id]/page.tsx`
- `apps/web/app/dashboard/page.tsx`
- `apps/web/app/identity/[id]/page.tsx`
- `apps/web/app/activity/page.tsx`
- `apps/web/app/leaderboard/page.tsx`
- `apps/web/components/heroui/service-list.tsx`
- `apps/web/components/heroui/agent-card.tsx`
- `apps/web/components/BiddingForms.tsx`

### 🎨 AddressInput Component

**New `AddressInput` Component (`components/AddressInput.tsx`):**

- Real-time Ethereum address validation
- Visual validation indicators (checkmark/error icons)
- ENS resolution support (optional)
- Error messages for invalid addresses
- Paste support

### 🔄 Shared Transaction Context

**New `TransactionContext` (`contexts/TransactionContext.tsx`):**

- Global pending transaction tracking
- Shared across all components via React Context
- Tracks pending/confirming/completed states
- `TransactionProvider` added to app providers

### 💰 USD Preview for ETH Values

**ETH to USD Conversion:**

- Added live USD preview to Review create page
- Shows approximate USD value when entering ETH amounts
- Uses `useChainlinkEthUsdPrice()` hook

### ⚙️ Wagmi Configuration

**Polling Interval:**

- Added `pollingInterval: 3000` (3 seconds) to wagmi config
- Consistent block polling across the application

### 🎨 Theme Consistency

**Error Boundary:**

- Replaced hardcoded `bg-[#0a0a0a]` with theme tokens
- Now uses `bg-background text-foreground`
- Button uses `bg-primary text-primary-foreground`

**Modal Overlays:**

- Replaced `bg-black/50` with `bg-background/80 backdrop-blur-sm`
- Debug panel uses `bg-content text-foreground`

---

## [2026-04-07] - Phase 14: Security & Performance

### 🛡️ Permissionless Refunds

**AgenticCommerceV6 - `refundExpired()` Function:**

- Added permissionless function for anyone to trigger refunds for expired jobs
- Uses `jobExpiredAt` timestamp to check expiration
- Processes expired jobs: refunds client, slashes provider if non-responsive
- Emits `RefundExpired` event for tracking
- Solves "no incentive to claim refunds" issue

### 🛡️ Grace Period Finalization

**AgentReviewV5 - `finalizeDecision()` Function:**

- Added 7-day grace period (`GRACE_PERIOD = 7 days`) after decision deadline
- Permissionless finalization using median evaluator as winner
- Evaluators can call after grace period if decision not made
- Solves "attestDecision permissions" issue
- Emits `DecisionFinalized` event

### 🛡️ Flexible Slash Proposals

**SlashManager - Owner OR Signers Can Create Proposals:**

- Changed `createProposal()` from signers-only to owner OR signers
- Owner can create slash proposals directly
- Signers can still create proposals via multi-sig
- Maintains 3-of-5 execution requirement
- Solves "centralization" concern

### ⚡ O(1) Skill Lookup

**AgentSkillRegistryV2 - Domain Mapping:**

- Added `_domainToSkills` mapping for efficient domain-based queries
- `findSkillsByDomain()` now O(1) instead of O(n\*m)
- Maintains backward compatibility with existing skills
- Emits `DomainMapped` event

### ⚡ SDK Multicall

**TypeScript SDK - viem multicall:**

- ServicesModule now uses viem's `multicall()` for batch contract calls
- `list()`, `getProviderServices()`, `getServicesByAgent()` use multicall
- Significantly reduces RPC calls for batch operations

### Contract Upgrades (Sepolia)

| Contract             | Proxy                                        | New Implementation                           |
| -------------------- | -------------------------------------------- | -------------------------------------------- |
| AgenticCommerceV6    | `0x948d97EA7F0c49796fB576ADff375C900627568E` | `0xC383e73673d0b8630fb282cE04d2f5F0fb17a776` |
| AgentReviewV5        | `0x5CDb592Fd37749bF87448FBf5725D1Cd986dd1Cb` | `0xb9384C09238Cbbae723759A38f79B13bFa2654F1` |
| SlashManager         | `0x1B8373cDF4f2eD740c3478e0129f0B8494CE4Fa3` | `0x240eeC04F12d11eE6e4d03B00FB2148bFD4887F9` |
| AgentSkillRegistryV2 | `0xA84684261558f342d6871DD2CFef90A2117Aa20A` | `0x656B6520CE44Bb0Fb08552274Be3a9B11aaa3569` |

### Tests Added

- `testRefundExpired_Success` - Verifies permissionless refund
- `testRefundExpired_NotExpired` - Reverts if job not expired
- `testRefundExpired_AlreadyRefunded` - Reverts if already refunded
- `testFinalizeDecision_AfterGracePeriod` - Tests permissionless finalization
- `testFinalizeDecision_BeforeGracePeriod` - Reverts if before grace
- `testFinalizeDecision_MedianWinner` - Verifies median evaluator wins
- `testCreateProposal_OwnerCanCreate` - Owner can create proposals
- `testCreateProposal_SignerCanCreate` - Signers can still create
- `testFindSkillsByDomain_O1Lookup` - Verifies O(1) lookup
- `testFindSkillsByDomain_DomainMapping` - Verifies mapping updates

### Files Modified

- `contracts/shared/AgenticCommerceV6.sol` - Added refundExpired()
- `contracts/shared/AgentReviewV5.sol` - Added finalizeDecision(), GRACE_PERIOD
- `contracts/shared/SlashManager.sol` - Owner OR signer proposals
- `contracts/shared/AgentSkillRegistryV2.sol` - O(1) domain mapping
- `contracts/interfaces/IAgenticCommerceV6.sol` - Added PermissionlessRefund event
- `sdk/typescript/client.ts` - Added viem multicall
- `contracts/test/SecurityFixes.t.sol` - 10 new tests

### Test Results

- **218 tests passing** (up from 208)
- SecurityFixes: 49 tests
- AgentReviewV5: 37 tests

---

## [2026-04-07] - Security Fixes Deployed

### 🛡️ Security Fixes

**Issue 3 - Hook Called Before State Changes in `fund()`:**

- Added `nonReentrant` modifier to `setBudget()` to prevent reentrancy attacks
- Cached `job.budget` before calling the hook to prevent manipulation
- Affects: `AgenticCommerceV6.sol`

**Issue 4 - Excess ETH Not Refunded in `createProposal()`:**

- Changed `require(msg.value >= reward)` to `require(msg.value == reward)` for exact payment requirement
- Affects: `AgentReviewV5.sol`

### Contract Upgrades (Sepolia)

| Contract          | Proxy                                        | New Implementation                           |
| ----------------- | -------------------------------------------- | -------------------------------------------- |
| AgenticCommerceV6 | `0x948d97EA7F0c49796fB576ADff375C900627568E` | `0x4175003E0c75Eb83645C6f065f5f10D47B4c0bD5` |
| AgentReviewV5     | `0x5CDb592Fd37749bF87448FBf5725D1Cd986dd1Cb` | `0xe43C5602E953b1F74FF7B2AEA2FECA08f486f3c0` |

### Tests Added

- `testSetBudget_NonReentrantProtection` - Verifies reentrancy protection
- `testFund_CachedBudgetUsed` - Verifies budget cached before hook
- `testFund_WithETH_UsesCachedBudget` - Baseline test for ETH funding
- `testCreateProposalExactValueSuccess` - Verifies exact payment works
- `testCreateProposalRevertIfExcessValue` - Verifies excess ETH rejected

### Files Modified

- `contracts/shared/AgenticCommerceV6.sol` - Security fixes
- `contracts/shared/AgentReviewV5.sol` - Exact payment requirement
- `contracts/test/AgenticCommerceV61.t.sol` - Security tests
- `contracts/test/AgentReviewV5.t.sol` - Payment tests
- `contracts/test/Invariants.t.sol` - Fixed for V5/V6 API
- `contracts/script/UpgradeAgenticCommerceV6.s.sol` - New deployment script
- `contracts/script/DeployAgentReviewV5.s.sol` - New deployment script

---

## [2026-04-06] - Phase 11: Standalone BiddingSystem

### 🎯 Feature: BiddingSystem Contract

**Problem:**

- AgenticCommerceV6 exceeded 24,576 bytes contract size limit (was 26,437 bytes)
- Bidding functionality was disabled in V6.1 to reduce size

**Solution:**

1. **Standalone BiddingSystem Contract**
   - Created `contracts/shared/BiddingSystem.sol` (UUPS upgradeable)
   - Created `contracts/interfaces/IBiddingSystem.sol` (complete interface)
   - Contract size: 22,456 bytes (well under 24,576 limit)

2. **Commit-Reveal Bidding**
   - `createBiddingSession()` - Create bidding session with evaluator and max budget
   - `commitBid()` - Commit sealed bid with 1% stake (ETH)
   - `revealBid()` - Reveal bid after deadline (1-hour window)
   - `acceptBid()` - Session creator accepts winning bid
   - `rejectBid()` - Reject a bid with reason

3. **Stake Management (Pull Pattern)**
   - `withdrawStake()` - Losers reclaim their stake
   - `claimStake()` - Winner claims their bid as job funding
   - `calculateStake()` - View stake amount for a given max budget

4. **Job Integration**
   - `createJobAndFund()` - Creates job in AgenticCommerce and funds from winning bid
   - Bid amount + platform fee = total ETH sent with transaction

### Contract Addresses (Sepolia)

| Contract               | Address                                      | Purpose        |
| ---------------------- | -------------------------------------------- | -------------- |
| `BiddingSystem`        | `0x32c9d069a248a619d3EAc4D1FC76F2639AaBeF04` | UUPS Proxy     |
| `BiddingSystem` (Impl) | `0x0A09e4Ff6DAa0eeA49526560e2c946Ea32a293Bb` | Implementation |

### Files Created

| File                                          | Purpose                     |
| --------------------------------------------- | --------------------------- |
| `contracts/shared/BiddingSystem.sol`          | Main contract (619 lines)   |
| `contracts/interfaces/IBiddingSystem.sol`     | Interface (282 lines)       |
| `contracts/test/BiddingSystem.t.sol`          | Tests (721 lines, 45 tests) |
| `contracts/scripts/DeployBiddingSystem.s.sol` | Deployment scripts          |
| `apps/web/lib/hooks/useBiddingSystem.ts`      | Frontend hooks (14 hooks)   |

### Frontend Integration

- Added `BIDDING_SYSTEM_ABI` to `lib/contracts/abis.ts`
- Added `biddingSystem` to `lib/contracts/config.ts`
- Created `useBiddingSystem.ts` with 14 hooks:
  - `useBiddingSessionCount`, `useBiddingSession`, `useBiddingUserBid`, `useBiddingCalculateStake`
  - `useCreateBiddingSession`, `useBiddingCommitBid`, `useBiddingRevealBid`, `useBiddingAcceptBid`
  - `useBiddingRejectBid`, `useBiddingWithdrawStake`, `useBiddingClaimStake`
  - `useBiddingCreateJobAndFund`, `useBiddingCancelSession`, `useBiddingExtendRevealWindow`

### SDK Integration

- Added `BiddingSystemModule` to `sdk/typescript/client.ts`
- Added `biddingSystem` to `sdk/typescript/types.ts`
- Added 6 new CLI commands:
  - `create-bidding-session`, `commit-bidding`, `reveal-bidding`
  - `accept-bidding`, `get-bidding-session`, `withdraw-bidding-stake`

### Tests

- 45 passing tests covering all bidding flows
- Total test suite: 318 tests

---

## [2026-04-06] - Security Audit Fixes (External Audit Round 3)

### 🔒 Security Fixes

**Priority 1 - Critical**

1. **Client-Evaluator-Provider Collusion Prevention**
   - Added `RolesMustBeDistinct` error in `AgenticCommerceV6.sol`
   - Added `_validateJobCreation()` to prevent client == provider, client == evaluator, provider == evaluator
   - Applied to `createJob()` and `setProvider()`

2. **Job Completion Deadlock Resolution**
   - Added `completeAfterTimeout()` function for automatic job completion after timeout
   - Added configurable `setDisputeWindow()` (default: 7 days) and `setNonResponsiveSlashBP()` (default: 1%)
   - Added `jobDisputeWindow` and `jobNonResponsiveSlashBP` state variables
   - Added `jobSubmittedAt` tracking for timeout calculations

3. **Winner Payment Pull Pattern (AgentReviewV5)**
   - Created new `AgentReviewV5.sol` (UUPS upgradeable)
   - Added `rewardAmount` field to Evaluation struct
   - Winner must call `claimReward()` to pull their payment
   - Losers call `releaseStake()` to reclaim their stake

**Priority 2 - High**

4. **SlashManager Integration (AgentReviewV5)**
   - Added `slashManager` address state variable
   - Added `setSlashManager()` function for governance control
   - Changed `slashEvaluator()` from `onlyOwner` to `onlySlashManager`
   - Emits `SlashManagerSet` event

5. **withdrawETH Rug-Pull Prevention (AgentReviewV5)**
   - Added `getTotalLockedETH()` function to calculate locked funds
   - Secure `withdrawETH()` validates against locked funds
   - Cannot withdraw more than `balance - locked`

6. **AgentReviewV5 Made Upgradeable**
   - Full rewrite with OwnableUpgradeable, UUPSUpgradeable, ContextUpgradeable
   - Uses OpenZeppelin v5 upgradeable pattern
   - ERC1967 compatible proxy support

7. **AgenticCommerceV6.1 Deployment**
   - Contract size optimization: 26,437 bytes → 19,010 bytes
   - Bidding functionality disabled (users should use V5 for bidding)
   - All security fixes preserved: RolesMustBeDistinct, completeAfterTimeout, dispute window

**SDK Updates**

7. **TypeScript SDK ABI Sync (v0.2.0)**
   - Fixed function names: `fundJob` → `fund`, `submitJob` → `submit`, `completeJob` → `complete`, `rejectJob` → `reject`
   - Added V5 functions: `claimReward`, `releaseStake`, `slashEvaluator`, `setSlashManager`, `withdrawETH`, `getTotalLockedETH`
   - Added V5 events and Evaluation struct updates

8. **Python SDK ABI Sync**
   - Fixed function names matching TypeScript SDK
   - Added V5 functions and updated Evaluation struct
   - Added new events: RewardClaimed, StakeReleased, SlashManagerSet, ETHWithdrawn

### Files Changed

| File                                          | Change                                          |
| --------------------------------------------- | ----------------------------------------------- |
| `contracts/shared/AgenticCommerceV6.sol`      | Added collusion prevention, deadlock resolution |
| `contracts/shared/AgentReviewV5.sol`          | **NEW** - Security fixes, UUPS upgradeable      |
| `contracts/interfaces/IAgenticCommerceV6.sol` | Added new functions/events                      |
| `sdk/typescript/client.ts`                    | ABI sync to v0.2.0                              |
| `sdk/python/kokonut/client.py`                | ABI sync for V5                                 |
| `sdk/python/kokonut/types.py`                 | Updated Evaluation class                        |

### New Contracts

| Contract        | Address | Purpose                              |
| --------------- | ------- | ------------------------------------ |
| `AgentReviewV5` | TBD     | UUPS upgradeable with security fixes |

---

## [2026-04-06] - Critical Bug Fixes (External Audit Round 2)

### 🚨 Codebase Cleanup & Integration Fixes

**Priority 1 - Critical**

1. **wagmi Version Updated to v3.6.0**
   - Updated both `package.json` and `apps/web/package.json` to use wagmi v3.6.0
   - All wagmi v2/v3 APIs are compatible with the codebase

2. **ERC8004_REPUTATION_ABI Added**
   - Added new ABI to `lib/contracts/abis.ts` for reputation registry
   - Fixed `useReputation.ts` to use correct ABI and parameter type (address, not agentId)
   - Updated pages to pass owner address instead of agentId

3. **SDK/CLI Package.json Created**
   - Created `sdk/typescript/package.json` for TypeScript SDK
   - Created `cli/package.json` for CLI tool
   - Both now properly linked in workspace

**Priority 2 - Medium**

4. **MCP Server Contract Addresses Fixed**
   - Updated `packages/mcp-server/src/resources/index.ts` with correct addresses
   - agenticCommerce: `0x948d97EA7F0c49796fB576ADff375C900627568E`
   - skillRegistry: `0xA84684261558f342d6871DD2CFef90A2117Aa20A`
   - Added missing contracts (priceOracle, commitReveal, slashManager)

5. **Chainlink Address Centralized**
   - Added `CHAINLINK_PRICE_FEEDS` to `lib/contracts/config.ts`
   - Updated `useChainlinkPrice.ts` to use centralized config
   - Updated `useTokenConversion.ts` to use `CONTRACT_ADDRESSES.sepolia.usdc`

6. **Hardcoded Addresses Replaced**
   - `useKokonutAgents.ts` now uses `CONTRACT_ADDRESSES.sepolia.erc8004Registry`
   - `useChainlinkPrice.ts` uses `CHAINLINK_PRICE_FEEDS.sepolia.ethUsd`
   - `useTokenConversion.ts` uses centralized USDC address

**Priority 3 - Low**

7. **debugLog Consolidated**
   - `lib/contracts/config.ts` now re-exports from `lib/debug.ts`
   - Removed duplicate debugLog implementation

8. **push-sw.js Icon References Fixed**
   - Changed from `/icon-192x192.png` to `/icon.png`
   - Changed from `/badge-72x72.png` to `/icon.png`

9. **Webhook Signature Consistency**
   - `app/api/webhooks/trigger/route.ts` now uses `signPayload` from `lib/webhooks/types.ts`
   - Consistent HMAC implementation across codebase

### Files Changed

| File                                         | Change                                            |
| -------------------------------------------- | ------------------------------------------------- |
| `package.json`                               | wagmi v3.6.0                                      |
| `apps/web/package.json`                      | wagmi v3.6.0, eslint fix                          |
| `apps/web/lib/contracts/abis.ts`             | Added ERC8004_REPUTATION_ABI                      |
| `apps/web/lib/contracts/config.ts`           | Added CHAINLINK_PRICE_FEEDS, consolidated exports |
| `apps/web/lib/hooks/useReputation.ts`        | Fixed ABI, parameter type, updated interface      |
| `apps/web/lib/hooks/useChainlinkPrice.ts`    | Use centralized Chainlink config                  |
| `apps/web/lib/hooks/useTokenConversion.ts`   | Use centralized USDC address                      |
| `apps/web/lib/hooks/useKokonutAgents.ts`     | Use centralized ERC8004 registry                  |
| `apps/web/lib/wagmi.ts`                      | Use centralized address utility                   |
| `apps/web/public/push-sw.js`                 | Fixed icon references                             |
| `apps/web/app/api/webhooks/trigger/route.ts` | Use consistent signature                          |
| `apps/web/app/identity/[id]/page.tsx`        | Pass owner address to useReputation               |
| `apps/web/app/marketplace/[id]/page.tsx`     | Pass provider address to useReputation            |
| `packages/mcp-server/src/resources/index.ts` | Updated contract addresses                        |
| `sdk/typescript/package.json`                | **NEW** - SDK package config                      |
| `cli/package.json`                           | **NEW** - CLI package config                      |

---

## [2026-04-05] - Critical Bug Fixes (External Audit Round 1)

### 🚨 Bug Fixes

**Bug 1: wagmi Version Conflict (Critical)**

- Changed `wagmi` from `^3.6.0` to `^2.9.0` in both `package.json` and `apps/web/package.json`
- RainbowKit v2 requires wagmi v2 as a peer dependency

**Bug 2: Missing Workspace Entries (High)**

- Added `packages/*` and `sdk/typescript` to root `package.json` workspaces
- CLI, MCP server, A2A protocol, and TypeScript SDK now properly linked

**Bug 3: Turbopack + Webpack Conflict (Critical)**

- Removed webpack configuration from `next.config.js`
- Kept turbopack for faster builds

**Bug 4: ignoreBuildErrors Masking Types (High)**

- Removed `typescript: { ignoreBuildErrors: true }` from `next.config.js`
- TypeScript now runs fully on every build

**Bug 5: Duplicate eslint-config-next (Medium)**

- Removed duplicate `eslint-config-next` from `dependencies` section
- Kept only in `devDependencies` where it belongs

**Bug 6: Wrong rootDir in CLI (High)**

- Fixed `cli/tsconfig.json` `rootDir` from `".."` to `"."`
- CLI can now be built correctly

**Bug 7: Centralized Address Utility (Medium)**

- Created centralized `getContractAddress()` function in `lib/contracts/config.ts`
- All 10 contract address env vars now use fallbacks
- Updated 20+ hooks to use centralized address utility
- No more `undefined` contract addresses at runtime

### Files Changed

| File                      | Change                              |
| ------------------------- | ----------------------------------- |
| `package.json`            | wagmi v2, workspaces                |
| `apps/web/package.json`   | wagmi v2, eslint fix                |
| `apps/web/next.config.js` | Removed webpack, ignoreBuildErrors  |
| `cli/tsconfig.json`       | Fixed rootDir                       |
| `lib/contracts/config.ts` | Centralized address utility         |
| `lib/hooks/*.ts`          | 20+ files use centralized addresses |
| `lib/wagmi.ts`            | Updated CONTRACTS object            |

---

## [2026-04-05] - Communication Infrastructure Complete

### Storage Architecture Migration

**Prisma 7.x Compatibility Issue:**
Due to Prisma 7.x requiring `adapter` or `accelerateUrl` in PrismaClient constructor (incompatible with Next.js Turbopack), migrated to JSON-file storage for development.

**JSON-file Storage (`apps/web/data/`):**

- `webhooks.json` - Registered webhook endpoints
- `webhook-deliveries.json` - Delivery history and status
- `events.json` - Processed blockchain events
- `block-tracker.json` - Last processed block per contract
- `cron-locks.json` - Cron job distributed locks
- `push-subscriptions.json` - Push notification subscriptions
- `email-preferences.json` - Email notification preferences

**New DB Layer (`lib/db/`):**

| File          | Purpose                                    |
| ------------- | ------------------------------------------ |
| `webhooks.ts` | Webhook CRUD with JSON persistence         |
| `events.ts`   | Event tracking, block tracking, cron locks |
| `push.ts`     | Push subscription storage                  |
| `email.ts`    | Email preferences storage                  |
| `index.ts`    | Barrel exports                             |

### Code Quality & Features

### Lint Cleanup (Phases 1-4)

**Phase 1 - Unused Code Removal:**

- Removed unused imports from 18+ files
- Fixed unused variables across page components

**Phase 2 - Promise Handling:**

- Fixed `no-floating-promises` in useEffects
- Fixed `no-misused-promises` in onClick handlers
- Added `void` operator where appropriate

**Phase 3 - Type Assertions:**

- Removed unnecessary `as Type` assertions
- Let TypeScript infer types where possible

**Phase 4 - Viem Type Suppression:**

- Added `eslint-disable` to key hook files
- Added type interfaces for API responses
- Suppressed viem-related edge cases

### Push Notifications - Simplified VAPID

**New Files:**

- `lib/webhooks/storage.ts` - Persistent webhook storage
- `lib/push/storage.ts` - Push subscription storage

### MCP Interactive Demo

**New Files:**

- `lib/mcp/mock-data.ts` - Mock data for demo
- `components/MCPDemoPanel.tsx` - Interactive MCP tool demo

**Features:**

- Tool selector with categories
- Parameter input form
- Request JSON builder
- Simulated response viewer
- No wallet required

---

## [2026-04-05] - SDK/CLI Parity & Hook Fixes

### 🚀 Overview

Completed SDK and CLI parity with V6 smart contracts, plus frontend hook fixes.

### SDK Updates (`sdk/typescript/client.ts`)

**ReviewModule - Added 7 new functions:**

- `claimReward(proposalId)` - Claim reward for winning proposal
- `releaseStake(proposalId)` - Release stake for proposal
- `slashEvaluator(evaluator, proposalId, reason)` - Slash malicious evaluator
- `getProposalEvaluators(proposalId)` - Get evaluators for a proposal
- `getEvaluatorCount(proposalId)` - Get evaluator count
- `cancelProposal(proposalId)` - Cancel open proposal
- `withdrawETH(to, amount)` - Withdraw ETH from contract

**SkillsModule - Added 5 new functions:**

- `updateSkill(skillId, name, version, description, endpoint, domains)` - Update skill
- `getSkillData(skillId)` - Get skill with full data
- `getTotalSkillCount()` - Get total skill count
- `getAgentSkillCount(agentId)` - Get skill count for agent
- `findSkillsByDomain(domain)` - Find skills by domain

### CLI Updates (`cli/cli.ts`)

**Added 15 new V6 commands:**

| Command                  | Description                       |
| ------------------------ | --------------------------------- |
| `create-open-job`        | Create open job for bidding       |
| `commit-bid`             | Commit sealed bid with 1% stake   |
| `reveal-bid`             | Reveal committed bid              |
| `accept-bid`             | Accept winning bid                |
| `withdraw-stake`         | Withdraw stake from job           |
| `get-my-bid`             | Get user's bid for a job          |
| `get-job-bid-count`      | Get bid count for job             |
| `get-client-job-count`   | Get job count for client          |
| `activate-service`       | Activate deactivated service      |
| `get-service-counter`    | Get total service counter         |
| `claim-proposal-reward`  | Claim reward for winning proposal |
| `release-proposal-stake` | Release stake for proposal        |
| `cancel-proposal`        | Cancel open proposal              |
| `slash-evaluator`        | Slash malicious evaluator         |
| `find-skills-by-domain`  | Find skills by domain             |
| `get-total-skill-count`  | Get total skill count             |
| `update-skill`           | Update existing skill             |

### Frontend Hooks

**Fixed `useAgents` placeholder** (`apps/web/lib/hooks/useAgents.ts`):

- Implemented proper agent fetching from 8004scan API
- Added caching with localStorage (5 min duration)
- Added pagination support with `start` and `count` parameters

### UI Polish

**Fixed lint errors:**

- `service-list.tsx`: Changed `let` to `const`, wrapped case blocks in braces
- `activity/page.tsx`: Removed unused import, fixed promise handling
- `admin/page.tsx`: Removed unused variable
- `analytics/page.tsx`: Fixed promise handling with void operator
- `csp-report/route.ts`: Added proper TypeScript interface

---

## [2026-04-05] - Phase 10: Communication Infrastructure (UI Integration)

### 🚀 Overview

Completed Phase 10 integration with full UI support for all communication features.

### Priority 1: UI Foundation

**Navigation & Footer Redesign:**

- Navbar reorganized with clear sections: Primary Nav, More dropdown, Dashboard
- Footer redesigned with Product, Tools, Governance, Resources, Legal sections
- Webhooks link added to More dropdown
- Legal pages created: Privacy, Terms, Security, Contracts

**New Pages:**
| File | Purpose |
|------|---------|
| `app/integrations/page.tsx` | MCP, Webhooks, Email documentation |
| `app/privacy/page.tsx` | Privacy policy |
| `app/terms/page.tsx` | Terms of service |
| `app/security/page.tsx` | Security page |
| `app/contracts/page.tsx` | Smart contracts reference |
| `app/dashboard/webhooks/page.tsx` | Webhook management UI |

### Priority 2: Event Wiring & Email Bridge

**Notification Events Wired:**

- `useNotificationEvents` hook now triggers webhooks when contract events occur
- Personal notifications now send emails via Resend API
- Block tracking persisted to localStorage for reliable event recovery

**New Files:**
| File | Purpose |
|------|---------|
| `lib/webhooks/trigger.ts` | Webhook trigger utility |
| `lib/emails/notification-bridge.ts` | Notification to email bridge |
| `components/EmailPreferencesForm.tsx` | Email preferences UI |
| `app/identity/settings/page.tsx` | Updated with email preferences |

**Features:**

- Event → Webhook triggers for all 15 event types
- Notification → Email for user-specific events
- Email preferences (enable/disable, frequency, types)
- Settings page integration

### Priority 3: A2A Server & Push Notifications

**A2A Server:**

- `packages/a2a-protocol/src/server.ts` - Server implementation with message handling
- `app/.well-known/agent.json/route.ts` - Well-known Agent Card endpoint

**Push Notifications:**

- `public/push-sw.js` - Updated service worker
- `lib/hooks/usePushNotifications.ts` - React hook for push subscription
- `app/api/push/subscribe/route.ts` - Subscribe endpoint
- `app/api/push/unsubscribe/route.ts` - Unsubscribe endpoint
- `app/api/push/send/route.ts` - Send notification endpoint

**MCP Configuration UI:**

- `components/MCPConfigurationPanel.tsx` - Claude Desktop configuration panel
- Integration with `/integrations` page

### 🧭 Navigation Updates

- Navbar redesigned with cohesive sections
- Footer with full link structure
- Webhooks management UI at `/dashboard/webhooks`
- Integrations page with MCP, Webhooks, Email tabs

### 📝 Documentation

- README.md updated with Phase 10 features
- ONE_PAGER.md updated with Communication Infrastructure section
- AGENTS.md updated with UI pages and bridges
- Integration page at `/integrations`

---

## [2026-04-04] - Phase 10: Communication Infrastructure (Foundation)

### 🚀 Overview

Phase 10 introduces comprehensive communication capabilities enabling Agent-to-Agent, Agent-to-Human, Human-to-Human, and Machine-to-Agent communication.

### Phase A: Notification Center

In-app notification system for real-time platform updates:

**New Files:**
| File | Purpose |
|------|---------|
| `lib/notifications/types.ts` | Type definitions for notifications |
| `lib/notifications/store.ts` | Zustand store with localStorage persistence |
| `lib/notifications/index.ts` | Module exports |
| `lib/hooks/useNotifications.ts` | React hooks for notifications |
| `lib/hooks/useNotificationEvents.ts` | Contract event-driven notifications |
| `components/heroui/notification-bell.tsx` | Bell icon with dropdown |
| `app/notifications/page.tsx` | Notification center page |

**Features:**

- Bell icon with unread count badge in navbar
- Notification list with type filters
- Mark as read/unread functionality
- 30-day notification history with localStorage persistence
- Event-driven notifications from contract events

### Phase B: Webhook System

HTTP webhook delivery for agent servers:

**New Files:**
| File | Purpose |
|------|---------|
| `lib/webhooks/types.ts` | Webhook type definitions |
| `lib/webhooks/store.ts` | Zustand store for webhooks |
| `lib/webhooks/index.ts` | Module exports |
| `lib/hooks/useWebhooks.ts` | React hooks for webhook management |
| `app/api/webhooks/route.ts` | POST/GET webhooks |
| `app/api/webhooks/[id]/route.ts` | PATCH/DELETE webhook |
| `app/api/webhooks/trigger/route.ts` | Trigger webhook delivery |
| `app/api/webhooks/[id]/deliveries/route.ts` | Get delivery history |

**Features:**

- HMAC-SHA256 signature verification
- 5 retries with exponential backoff
- Max 10 webhooks per agent
- HTTPS-only URLs required
- 15 supported event types

### Phase C: Email Integration

Resend API integration for email notifications:

**New Files:**
| File | Purpose |
|------|---------|
| `lib/emails/types.ts` | Email type definitions |
| `lib/emails/store.ts` | Zustand store for preferences |
| `lib/emails/templates.ts` | Email HTML templates |
| `lib/emails/index.ts` | Module exports |
| `app/api/emails/send/route.ts` | Send email via Resend |
| `app/api/emails/preferences/route.ts` | Manage email preferences |

**Email Templates:**

- Payment received notifications
- Weekly digest
- Welcome emails

### Phase D: MCP Server

Model Context Protocol server for AI agent tool access:

**New Package:** `packages/mcp-server/`

**Files:**
| File | Purpose |
|------|---------|
| `package.json` | Package configuration |
| `tsconfig.json` | TypeScript config |
| `src/index.ts` | Server entry point |
| `src/client.ts` | Viem client and contract ABIs |
| `src/tools/jobs.ts` | Job management tools |
| `src/tools/services.ts` | Service registry tools |
| `src/tools/agents.ts` | Agent lookup tools |
| `src/resources/index.ts` | MCP resources |
| `src/prompts/index.ts` | MCP prompt templates |

**MCP Tools:**

- `jobs_get`, `jobs_list`, `jobs_my`
- `services_get`, `services_list`, `services_by_provider`
- `agents_get`, `agents_get_by_address`, `agents_list`, `agents_reputation`

### Phase E: A2A Protocol

Agent-to-Agent protocol implementation:

**New Package:** `packages/a2a-protocol/`

**Files:**
| File | Purpose |
|------|---------|
| `package.json` | Package configuration |
| `tsconfig.json` | TypeScript config |
| `src/types.ts` | A2A type definitions |
| `src/client.ts` | A2A client implementation |
| `src/server.ts` | A2A server implementation |
| `src/index.ts` | Module exports |

**Features:**

- Agent Card schema for capability discovery
- Task lifecycle management (offer, accept, reject, complete)
- A2A message types

---

## [2026-04-04] - Phase 9: Leaderboard, Networks & Agent Profiles

### 🆕 New Pages

#### Leaderboard Page (`/leaderboard`)

New leaderboard page showcasing top-performing Kokonut agents:

- **Ranking System**: Agents ranked by health score (0-100)
- **Tier Badges**: Gold (80+), Silver (60-79), Bronze (40-59), Standard (<40)
- **Time Period Filters**: Daily, Weekly, Monthly, All Time views
- **Trend Indicators**: Rising/Falling/Stable based on score changes
- **Snapshot Storage**: Daily snapshots stored in localStorage for trend calculation
- **Kokonut-only**: Only displays agents with `source === 'kokonut-marketplace'`

#### Networks Page (`/networks`)

New multi-chain overview page:

- **25 Supported Chains**: Grid of all ERC-8004 compatible networks
- **Network Stats**: Agent counts and feedback counts per chain
- **Search Functionality**: Filter networks by name or chain ID
- **Chain Details**: Color badges, testnet indicators, explorer links
- **API Integration**: Uses 8004scan API with 5-minute caching

### 🏗️ Infrastructure

#### New Files

| File                           | Purpose                                                    |
| ------------------------------ | ---------------------------------------------------------- |
| `lib/chains.ts`                | Chain configurations (id, name, color, registry addresses) |
| `lib/healthScore.ts`           | Health score calculation logic with weights                |
| `lib/hooks/useLeaderboard.ts`  | Leaderboard data with localStorage snapshots               |
| `lib/hooks/useAgentHealth.ts`  | Health score calculation for single agent                  |
| `lib/hooks/useNetworkStats.ts` | Multi-chain stats via 8004scan API                         |

#### Chain Configuration (`lib/chains.ts`)

Supports 25 blockchain networks including:

- Ethereum, Base, Arbitrum, Optimism, Polygon
- Celo, BNB Chain, Scroll, Linea, Avalanche
- Monad, MegaETH, Abstract, and more

#### Health Score Algorithm

Score = (Rating×0.4) + (CompletionRate×0.35) + (Services×0.15) + (Recency×0.1)

### 🎨 Enhanced Agent Profiles

Updated `/identity/[id]` with:

- **Health Score Card**: Score with tier badge, progress bar, factor breakdown
- **Leaderboard Link**: Quick link to view all rankings
- **x402 Badge**: Indicates HTTP 402 payment support
- **Tier Display**: Gold/Silver/Bronze/Standard tier with color coding

### 🧭 Navigation Updates

Added new navigation items:

- **Leaderboard** - Main nav (always visible)
- **Networks** - Main nav (always visible)

---

## [2026-04-04] - Phase 8: Event-Driven Updates, Bookmarks & Unified Error Handling

### ✨ UI/UX Enhancements

#### Service Counter Display (Total vs Active)

Added total service count alongside active count on marketplace page:

- Added `useTotalServiceCount` hook using `getServiceCounter()` contract function
- Added `getServiceCounter` to `SERVICE_REGISTRY_ABI`
- Marketplace now displays both "Active Services" and "Total Services" counters

#### Evaluator Count on Proposal Cards

Added evaluator count to proposal cards on review page:

- Updated `Proposal` interface to include `evaluatorCount?: number`
- Updated `useProposals` hook to fetch evaluator counts using multicall alongside proposals
- Proposal cards now display evaluator count with Users icon

#### Evaluation Claim Status Visual Indicators

Updated review detail page with claim status indicators:

- Added `rewardClaimed` and `stakeReleased` status indicators for winners/non-winners
- Changed "You Won!" to "Reward Claimed!" with checkmark when reward already claimed
- Changed "Release Your Stake" to "Stake Released" with visual feedback when stake already released
- Claim/Release buttons hidden when action already completed

#### Service Creation Date Display

Added creation date to service cards:

- Added `Calendar` icon import
- Service cards now display creation date from `service.createdAt` field
- Date shown in localized format below provider address

#### Hook Address Display on Job Detail

Added hook address display to job detail page:

- Added `Link` icon import
- Job detail page displays hook contract address when set (non-zero address)
- Shows truncated address format with 0x prefix

---

### 🧪 CI/CD Fixes

#### Consolidated CI Workflow

Merged `test.yml` and `ci.yml` into a single `ci.yml` workflow:

- **Fixed**: ESLint config extending non-existent "prettier" in `lib/openzeppelin-contracts/`
- **Fixed**: Updated deprecated `actions/upload-artifact@v3` → `v4`
- **Fixed**: Replaced `bc` dependency with pure bash arithmetic for coverage check
- **Removed**: Redundant `npm install` after `npm ci`
- **Removed**: Non-functional deploy step
- **Removed**: Noisy `npm outdated` check

#### Jobs in Consolidated Workflow

| Job               | Description                                     |
| ----------------- | ----------------------------------------------- |
| `contracts`       | Forge build, tests, coverage with 80% threshold |
| `gas-benchmark`   | Gas snapshot checks                             |
| `fuzz-tests`      | Fuzzing with 10,000 runs                        |
| `invariant-tests` | Invariant testing                               |
| `frontend`        | TypeScript check, ESLint, Next.js build         |
| `e2e`             | Playwright E2E tests                            |
| `security`        | npm audit, lockfile integrity                   |

#### ESLint Fix

Fixed `lib/openzeppelin-contracts/.eslintrc`:

- Removed `"prettier"` from extends (prettier not installed in subdirectory)
- Kept minimal config required for OpenZeppelin files

---

### 🚀 Unified Error Handling System

#### Reusable TransactionError Component

Created `components/TransactionError.tsx` with:

- Uses `getTransactionError()` internally for user-friendly messages
- Handles user rejections with clear messaging
- Sanitizes error messages (removes addresses, tx hashes)
- Optional dismiss button support
- Also exports `FormFieldError` for individual field errors

#### Pages Updated to Use Unified Error Handling

| Page                 | Change                                                                        |
| -------------------- | ----------------------------------------------------------------------------- |
| `marketplace/create` | Replaced inline error with TransactionError                                   |
| `jobs/create`        | Replaced inline error with TransactionError                                   |
| `identity/register`  | Replaced inline error with TransactionError                                   |
| `review/create`      | **CRITICAL FIX** - Replaced raw `error.message` with TransactionError         |
| `dashboard/skills`   | **CRITICAL FIX** - Replaced `(error as Error)?.message` with TransactionError |

#### Create Service Button Bug Fix

Fixed validation logic in `marketplace/create/page.tsx`:

- Added `hasAttemptedSubmit` state to track form submission attempts
- Fixed `handleInputChange` dependency array (was using wrong validation function)
- Updated `isFormValid` to require `hasAttemptedSubmit` before enabling button
- Button now properly enables after user fills all required fields

---

### 🚀 Contract Address Resilience Improvements

#### Hook Migration to getContractAddress Pattern

Migrated 4 hooks from fragile `CONTRACTS[11155111]` pattern to resilient `getContractAddress()` pattern with fallbacks:

- **usePriceOracle.ts** - Now uses `getContractAddress(NEXT_PUBLIC_PRICE_ORACLE_ADDRESS, sepolia.priceOracle)`
- **useUSDC.ts** - Now uses `getContractAddress(NEXT_PUBLIC_USDC_ADDRESS, sepolia.usdc)`
- **useSlashManager.ts** - Now uses `getContractAddress(NEXT_PUBLIC_SLASH_MANAGER_ADDRESS, sepolia.slashManager)`
- **useCommitReveal.ts** - Now uses `getContractAddress(NEXT_PUBLIC_COMMIT_REVEAL_ADDRESS, sepolia.commitReveal)`

**Benefits:**

- No longer crashes if env vars are missing
- Falls back to hardcoded Sepolia addresses
- Removed `assertValidAddress` dependency

#### Code Cleanup

- **Removed unused ABI**: `LEGACY_REPUTATION_REGISTRY_ABI` deleted from `lib/contracts/abis.ts`
- Reputation hooks correctly use `ERC8004_ABI` instead

---

### 🚀 Contract-Hook-UI Alignment Audit

#### Audit Summary

- **AgenticCommerce**: 86% hook coverage, 66% UI coverage ✅
- **ServiceRegistry**: 100% hook coverage, 78% UI coverage ✅
- **AgentReview**: 100% hook coverage, 50% UI coverage (skills UI complete)
- **SlashManager**: 100% hook coverage, 0% UI coverage (governance UI complete)

#### New Features Added

- **Admin Dashboard - Platform Fee Settings**
  - New "Platform Fee Settings" card with current fee display
  - Input field for fee percentage (0-10%)
  - "Update Fee" button to call `setPlatformFee(feeBP, treasury)`
  - Validation and error handling

- **useEvaluatorCount Hook**
  - New hook in `useProposals.ts`
  - Wraps `getEvaluatorCount(proposalId)` contract function
  - Returns `count`, `isLoading`, `error`, `refetch`
  - Used for checking evaluator limits in proposals

- **Client Job Count Integration Verified**
  - `useClientJobCount` hook fully integrated in job creation page
  - Visual progress bar showing job limit usage
  - Color-coded warnings (green/yellow/red)
  - Submit button disabled when at limit (100 jobs)

---

### 🚀 Audit Gap Fixes

#### Gap 1: Client Job Count - Now Uses Contract ✅

Fixed `lib/hooks/useClientJobCount.ts`:

- **Before**: Client-side filtering via `useUserJobsFromEvents`
- **After**: Direct contract call via `useReadContract` with `getClientJobCount()`
- **Benefit**: Accurate on-chain count vs potentially stale event data

#### Gap 2: Marketplace Provider Filtering - URL Params ✅

Enhanced `app/marketplace/page.tsx`:

- Added `useProviderServices` hook for provider filtering
- Reads `?provider=X` URL parameter
- Shows filter indicator when active
- "Clear filter" button to reset

#### Gap 3: Platform Fee Transparency - Job Creation ✅

Enhanced `app/jobs/create/page.tsx`:

- Added `useReadContract` call to fetch `platformFeeBP`
- Displays platform fee percentage on job creation form
- Shows "Platform Fee: X%" with evaluator fee note

#### Gap 4: Commitment Hash Implementation ✅

Fixed `lib/hooks/useCommitReveal.ts`:

- **Before**: Threw "Not implemented" error
- **After**: Implemented using viem's `keccak256(encodeAbiParameters(...))`
- Matches contract logic: `keccak256(abi.encode(user, secret, serviceId))`
- Added `generateSecret()` helper for random bytes32 generation

#### Gap 5: Evaluation Reward/Stake Status ✅

Fixed `lib/hooks/useProposals.ts`:

- Updated `useEvaluation` interface to include `rewardClaimed` and `stakeReleased` fields
- Maps contract's Evaluation struct fields correctly (added indices 6, 7 for new fields)

---

### 🚀 Transaction Flow & Bookmark System

#### Event-Driven Updates Fixed

- **useJobEvents hook now watches 16 events** (up from 4):
  - JobCreated, OpenJobCreated, JobStatusChanged, JobFunded
  - JobSubmitted, JobCompleted, JobRejected, JobExpired
  - PaymentReleased, Refunded, ProviderSet, BudgetSet
  - BidCommitted, BidRevealed, BidAccepted, StakesReturned

- **useServiceEvents hook created** with all 4 service events:
  - ServiceCreated, ServiceUpdated, ServiceDeactivated, ServiceActivated

- **Integration in pages:**
  - `/jobs` - `useJobEvents()` for real-time job updates
  - `/jobs/[id]` - `useWatchJob()` for specific job monitoring
  - `/marketplace` - `useServiceEvents()` for service updates

#### Bookmarks System

- **localStorage-based bookmarks** (no wallet required):
  - `useJobBookmarks()` - bookmark jobs, stored in `kokonut_bookmarks_jobs`
  - `useServiceBookmarks()` - bookmark services, stored in `kokonut_bookmarks_services`

- **Public bookmark counter** aggregated across all users:
  - Stored in `kokonut_bookmark_counts` localStorage
  - Shows total users who bookmarked each item
  - Updates automatically when toggling bookmarks

- **Bookmark UI added:**
  - JobCard - bookmark button with count
  - ServiceCard - bookmark button with count
  - Filled icon when bookmarked, outline when not

---

## [2026-04-03] - Phase 7: Enhanced UX & Admin Features

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
