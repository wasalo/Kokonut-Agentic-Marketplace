# Milestone Feature Rewrite Plan

## Bug Inventory (from deep exploration)

| # | Severity | Bug | File | Fix |
|---|---|---|---|---|
| 1 | **HIGH** | **RPC fails** — `eth-mainnet.g.alchemy.com/v2/demo` rate-limited, ENS resolution fails, wagmi provider destabilizes, wallet prompts never appear | `wagmi.ts` line 27 | Remove `demo` fallback, keep `rpc.ankr.com/eth` only |
| 2 | **HIGH** | **`flagger` typo** — Hook interface uses `flaggler` (double g) but contract returns `flagger`. `dispute?.flaggler` is ALWAYS undefined → "Dispute Active" UI never renders | `useMilestoneEscrow.ts` line 30 | Change to `flagger` |
| 3 | **HIGH** | **No refetch after add/complete/release** — Only `isEnableSuccess` triggers `refetchMilestones()`. After adding a milestone, user sees stale data until 30s refresh | `MilestoneSection.tsx` | Add `useEffect` for `isAddMilestoneSuccess`, `isCompleteMilestoneSuccess`, `isReleaseMilestoneSuccess` |
| 4 | **MED** | **Try/catch dead code** — `writeContract()` is fire-and-forget, doesn't throw. Catch blocks never fire | `MilestoneSection.tsx` | Remove try/catch, rely on `writeError` + `<ErrorDisplay>` (already done) |
| 5 | **MED** | **Subgraph blocked by CSP** — `api.studio.thegraph.com` not in `connect-src` | `next.config.js` | Add to CSP |
| 6 | **LOW** | **Duplicate `useEnableMilestones`** — Both page.tsx and MilestoneSection create independent instances | `page.tsx` + `MilestoneSection.tsx` | Consolidate to page level only |
| 7 | **LOW** | **`onRefetch` never used** — Props pass it but component ignores it | `MilestoneSection.tsx` line 38 | Call `onRefetch` after operations |
| 8 | **LOW** | **`setMilestoneSetupDone` dead code** — Set but never read | `page.tsx` line 157 | Remove |

## Phase 1: RPC Fix (the critical blocker)

### 1a. Remove Alchemy demo fallback in `wagmi.ts`
```typescript
// Current:
fallbacks: [
  'https://eth-mainnet.g.alchemy.com/v2/demo',  // REMOVE — rate-limited, no CORS
  'https://rpc.ankr.com/eth',
],

// Fixed:
fallbacks: [
  'https://rpc.ankr.com/eth',
],
```

### 1b. Add subgraph + EFP endpoints to CSP in `next.config.js`
Add `https://api.studio.thegraph.com` and `https://data.ethfollow.xyz` to the `connect-src` directive to stop CSP warnings that clutter the console.

## Phase 2: Milestone Bug Fixes

### 2a. Fix `flagger` typo in `useMilestoneEscrow.ts`
```typescript
// Line 30:
export interface Dispute {
  flaggler: string;  // WRONG → should be: flagger
```
Change to `flagger` (single g).

### 2b. Fix `handleAddMilestone` — no refetch after success
Add `isSuccess` tracking to the add milestone hook destructuring and a `useEffect` in MilestoneSection:

```typescript
const {
  addMilestone,
  isPending: isAddMilestonePending,
  isSuccess: isAddMilestoneSuccess,
  writeError: addMilestoneError,
} = useAddMilestone();
```

Add `useEffect`:
```typescript
useEffect(() => {
  if (isAddMilestoneSuccess) {
    refetchMilestones();
  }
}, [isAddMilestoneSuccess, refetchMilestones]);
```

Same for `completeMilestone` and `releaseMilestone`.

### 2c. Fix `onRefetch` usage
Call `onRefetch()` (if provided) after all milestone operations:
```typescript
useEffect(() => {
  if (isAddMilestoneSuccess) {
    refetchMilestones();
    onRefetch?.();
  }
}, [isAddMilestoneSuccess, refetchMilestones, onRefetch]);
```

Same for complete and release.

### 2d. Remove duplicate `useEnableMilestones`
Keep the instance in `page.tsx` only. Pass `isEnableSuccess` and `enableMilestones` as callbacks to MilestoneSection.

Remove `useEnableMilestones` from MilestoneSection imports. Instead, add `onEnableSuccess` callback to its props and call it from the page-level handler.

### 2e. Remove dead code
Remove `setMilestoneSetupDone` from page.tsx (line 157).

## Phase 3: Testing

After all fixes:
1. Reload `/jobs/5` — no more CSP/ENS errors in console
2. Click "Add Milestone" — wallet prompt appears
3. Sign tx — milestone appears in list without manual reload
4. Provider submits — milestone shows "Awaiting Release"
5. Client releases — milestone shows "Released"

## Files to Modify

| File | Changes |
|------|---------|
| `apps/web/lib/wagmi.ts` | Remove Alchemy demo fallback from mainnet RPCs |
| `apps/web/next.config.js` | Add subgraph + EFP to CSP connect-src |
| `apps/web/lib/hooks/useMilestoneEscrow.ts` | Fix `flaggler` → `flagger` in `Dispute` interface |
| `apps/web/components/MilestoneSection.tsx` | Add refetch effects for add/complete/release, fix `onRefetch` usage, remove duplicate hook |
| `apps/web/app/jobs/[id]/page.tsx` | Consolidate `useEnableMilestones`, remove dead state |
| `CHANGELOG.md` | Document fixes |
