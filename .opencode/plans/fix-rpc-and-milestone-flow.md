# Fix RPC/ENS CORS Blocking & Milestone Flow

## Root Cause

The ENS resolution RPC (`https://eth.public-rpc.com`) is rate-limited and returns `429` with no CORS headers. Every `<Address>` component on the job detail page triggers an ENS reverse lookup → hits this RPC → gets blocked → wagmi's provider chain destabilizes → WalletConnect extension crashes → wallet signature prompts never appear.

**Chain of failures:**
1. Wagmi tries to resolve ENS names via mainnet RPC for `<Address>` components
2. `eth.public-rpc.com` returns 429 + no CORS headers → request blocked
3. The failed RPC pollutes wagmi's internal provider state
4. WalletConnect's message listener times out (`Promised response from onMessage listener went out of scope`)
5. MetaMask/WalletConnect can't process new signing requests
6. `handleAddMilestone()` is called → `writeContract()` → no wallet prompt appears → user sees nothing happen

## Phase 1: Fix Mainnet RPC

### 1a. Update `apps/web/lib/wagmi.ts`

Replace the broken mainnet transport:
```typescript
// Current (broken — CORS + rate limited):
// transport: http('https://eth.public-rpc.com'),

// Fix:
mainnet: http('https://rpc.ankr.com/eth'),
```

Ankr's free RPC supports CORS and has generous rate limits.

**Also**: Add `eth.merkle.io` as secondary fallback in the wagmi chain config if there's a multi-transport setup.

### 1b. Update CSP `connect-src` in middleware

If there's a CSP header being set in middleware or `next.config.js`, add `https://rpc.ankr.com` to the `connect-src` directive to prevent report-only warnings.

Search for `Content-Security-Policy` or `connect-src` in:
- `apps/web/next.config.js`
- `apps/web/middleware.ts`
- Any layout/server component that sets security headers

## Phase 2: Verify Milestone Flow

After the RPC fix, reload `/jobs/5` and test the full flow:

1. **Add milestones**: Fill description + amount → click "Add Milestone" → wallet prompt should appear
2. **Verify on-chain**: Check `getJobMilestones(5)` returns the added milestones
3. **Complete milestone**: Provider connects → clicks "Submit" with proof hash → wallet prompt
4. **Release milestone**: Client connects → clicks "Release Payment" → wallet prompt

If any step still fails despite the RPC fix, the `console.error` logging we added will catch the exact error.

## Phase 3: Stretch Goals (if time permits)

### 3a. Remove `usePublicClient` and `useWaitForTransactionReceipt` from page.tsx imports
These are likely unused since the extraction. Verify with TypeScript.

### 3b. Remove unused lucide icon imports
`Settings`, `Send`, `CheckSquare`, `XSquare` may still be used in the Actions card. Remove any that are truly unused.

### 3c. Add `useUnifiedAgentProfile` for provider name
Once the RPC is stable, we can add a subgraph lookup for the provider's agent name in the roles section.

## Files to Modify

| File | Change | Priority |
|------|--------|----------|
| `apps/web/lib/wagmi.ts` | Replace `eth.public-rpc.com` → `rpc.ankr.com` | **Critical** |
| `apps/web/next.config.js` or `middleware.ts` | Add `https://rpc.ankr.com` to CSP connect-src | Medium |
| `apps/web/app/jobs/[id]/page.tsx` | Remove unused imports (after confirming) | Low |
