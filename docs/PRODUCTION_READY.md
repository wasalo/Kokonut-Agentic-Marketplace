# Production Readiness Guide

> Last updated: 2026-04-10 | Phase 19 Complete - Production Ready

## Build Status

| Check           | Status  | Notes                           |
| --------------- | ------- | ------------------------------- |
| TypeScript      | ✅ Pass | 0 errors                        |
| pnpm install    | ✅ Pass | Clean install, no peer warnings |
| ESLint config   | ✅ Pass | Next.js core-web-vitals         |
| ABIs updated    | ✅ Pass | All Phase 17 functions included |
| webpack build   | ✅ Pass | Works reliably                  |
| turbopack build | ❌ Fail | Next.js 16 + pnpm monorepo bug  |

---

## Pre-Production Checklist

### 1. Dependencies

```bash
# Use pnpm (not npm) for monorepo compatibility
cd apps/web
pnpm install
```

### 2. Environment Variables

Ensure these are set in `.env.local`:

```bash
# Required
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Optional - for analytics
NEXT_PUBLIC_MIXPANEL_TOKEN=your_token
```

### 3. Build Verification

```bash
# TypeScript check
cd apps/web && npx tsc --noEmit

# Dev server (webpack - required!)
cd apps/web && pnpm run dev

# Production build (webpack - required!)
cd apps/web && pnpm run build
```

---

## Build Commands

### Available Scripts

| Command                | Bundler   | Status             |
| ---------------------- | --------- | ------------------ |
| `pnpm run dev`         | webpack   | ✅ Works (default) |
| `pnpm run dev:turbo`   | turbopack | ❌ Broken          |
| `pnpm run build`       | webpack   | ✅ Works (default) |
| `pnpm run build:turbo` | turbopack | ❌ Broken          |

### ⚠️ Turbopack Not Supported

Due to a **Next.js 16 + pnpm monorepo bug**, turbopack does not work with this project. The issue is related to pnpm workspace symlink resolution when turbopack tries to detect the project root.

**Always use webpack mode:**

- `pnpm run dev` (not `pnpm run dev:turbo`)
- `pnpm run build` (not `pnpm run build:turbo`)

### TypeScript Errors Fixed

| Issue                       | Fix                                         |
| --------------------------- | ------------------------------------------- |
| `Loader2` not found         | Replaced with CSS spinner in jobs/page.tsx  |
| Card `onPress` type error   | Removed onPress prop from Card component    |
| `blockNumber` on never type | Added type assertion for TransactionReceipt |
| Missing ABI functions       | Added to `lib/contracts/abis.ts`            |

### ABI Functions Added (Phase 17/18)

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

### npm to pnpm Migration

- Removed `package-lock.json` and `node_modules`
- Now uses `pnpm-lock.yaml`
- Build command: `pnpm run build --webpack` (uses webpack, not turbopack)

---

## Deployment Commands

### Local Development

```bash
# Start dev server (uses webpack)
cd apps/web
pnpm run dev

# Start dev server (uses turbopack - faster)
cd apps/web
pnpm run dev:turbo
```

### Production Build

```bash
cd apps/web

# Build with webpack (recommended for monorepo)
pnpm run build

# Or with explicit webpack flag
next build --webpack
```

### Docker Build

```bash
# Build Docker image
docker build -t kokonut-web:latest ./apps/web

# Run container
docker run -p 3000:3000 kokonut-web:latest
```

---

## Performance & Analytics

### Web Vitals Tracking

The app now tracks:

- **FCP** (First Contentful Paint) - Target: < 2.5s
- **LCP** (Largest Contentful Paint) - Target: < 2.5s
- **TTI** (Time to Interactive) - Target: < 2.5s
- **CLS** (Cumulative Layout Shift) - Target: < 0.1
- **FID** (First Input Delay) - Target: < 100ms

In development: Logs to console `[WebVitals]`
In production: Sends to Mixpanel as `web_vital` events

### Mixpanel Setup

1. Get token from https://mixpanel.com
2. Add to `.env.local`:
   ```
   NEXT_PUBLIC_MIXPANEL_TOKEN=your_token_here
   ```
3. Events tracked automatically:
   - Page views
   - Wallet connects/disconnects
   - Transaction submissions
   - Web vitals

---

## Contract Addresses (Sepolia)

Ensure these match your `.env.local`:

```
AgenticCommerceV6:    0xEecC615310f6A6144eeA0F235E83b7BD391EC251
AgentReviewV5:       0xFf4D6df8dDca340e2ff59615Dd00C325706019f7
ServiceRegistryV2:   0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201
AgentSkillRegistryV2: 0xA84684261558f342d6871DD2CFef90A2117Aa20A
USDC:                 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
ERC-8004 Identity:    0x8004A818BFB912233c491871b3d84c89A494BD9e
ERC-8004 Reputation:  0x8004B663056A597Dffe9eCcC1965A193B7388713
```

---

## Troubleshooting

### Build Timeout

The webpack build can take 5+ minutes. This is normal for the monorepo size. Use `--webpack` flag explicitly:

```bash
next build --webpack
```

### ESLint Issues

ESLint config now uses Next.js recommended settings. If issues persist:

```bash
# Clear cache and re-lint
cd apps/web
rm -rf .next
pnpm run lint
```

### Missing peer dependencies

Run pnpm install with auto-install:

```bash
pnpm config set auto-install-peers true
pnpm install
```
