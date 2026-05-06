# Simplify Milestone Flow

## Problem
The current milestone flow requires 3 steps and 2 separate transaction prompts after job creation. The `enableMilestones()` call is a separate contract action that requires the user to navigate to the detail page, see a modal, and sign a second transaction. This is confusing and fragile.

## New Flow
```
Create job (milestones ON)
  → createJob() tx
  → tx confirms
  → enableMilestones() tx (automatic, no navigation)
  → tx confirms
  → redirect to /jobs/[id]
  → MilestoneSection shows Add form directly
```

## Changes

### File 1: `apps/web/app/jobs/create/create-job-content.tsx`
**Chain enableMilestones after createJob confirms:**

Remove localStorage flag approach. Instead, after createJob confirms:
- If `useMilestones` is true → call `enableMilestones()` on MilestoneEscrow
- Show "Enabling milestones..." as the submit phase
- Wait for enableMilestones to confirm → redirect to `/jobs/[id]`

Add `useEnableMilestones()` hook import and usage:
```typescript
import { useEnableMilestones } from '@/lib/hooks/useMilestoneEscrow';

// In component:
const { enableMilestones, isPending: isEnablePending, isSuccess: isEnableSuccess } = useEnableMilestones();
const milestoneJobId = useRef<bigint | null>(null);

// After createJob confirms, fire enableMilestones:
useEffect(() => {
  if (isConfirmed && txHash && jobCounter && useMilestones && !isEnablePending && !isEnableSuccess) {
    const newJobId = jobCounter;
    milestoneJobId.current = newJobId;
    // Set submit phase so UI shows "Enabling milestones..."
    setSubmitPhase('enabling');
    enableMilestones(
      newJobId,
      address as `0x${string}`,
      provider,
      paymentTokenAddress,
      budgetAmount
    );
  }
}, [isConfirmed, txHash, jobCounter, useMilestones, enableMilestones, ...]);

// After enableMilestones confirms, redirect:
useEffect(() => {
  if (isEnableSuccess && milestoneJobId.current) {
    router.push(`/jobs/${milestoneJobId.current}`);
  }
}, [isEnableSuccess, milestoneJobId, router]);
```

Remove the `localStorage.setItem('pending_milestone_job', 'true')` call.

### File 2: `apps/web/components/MilestoneSection.tsx`
**Remove all "Enable Milestones" logic:**

The `details?.usesMilestones` branch should be simplified:
- If `usesMilestones` is false → return null (show nothing)
- If `usesMilestones` is true → show the Add form + milestone list

```typescript
// Simplified: if milestones not enabled, show nothing
if (!details?.usesMilestones) {
  return null;
}
```

Remove:
- `useEnableMilestones()` import and hook call
- `isEnablePending`, `isEnableSuccess`, `enableError` state
- `handleEnableMilestones()` function
- The entire `if (!details?.usesMilestones) { ... }` card UI with enable button
- The `useEffect` auto-open (no longer needed — form is always shown when enabled)
- Auto-open `useEffect` (the "Add" button is enough since user consciously enabled milestones)

Keep:
- The milestone list rendering
- The Add form (with standard `<input>` elements — already fixed)
- The complete/submit/release/dispute flows
- The `onRefetch` usage

### File 3: `apps/web/app/jobs/[id]/page.tsx`
**Remove the milestone prompt modal:**

Remove:
- `showMilestonePrompt` state
- `handleEnableMilestones()` callback
- The `useEffect` that checks localStorage for `pending_milestone_job`
- The `ConfirmModal` for milestone prompt (lines ~1060-1085)
- `useEnableMilestones()` hook (no longer needed — milestone flow is handled during creation)

Keep:
- The `<MilestoneSection>` component render
- `isClient`/`isProvider` derivation (still needed for MilestoneSection)

## Summary of Removed Boilerplate

| Item | Why Removed |
|---|---|
| `localStorage.setItem('pending_milestone_job')` | No longer needed — enableMilestones fires immediately after createJob |
| `localStorage.getItem('pending_milestone_job')` check in page.tsx | Same reason |
| `localStorage.setItem('milestone_setup_{id}', 'done')` | Same reason |
| `showMilestonePrompt` + `ConfirmModal` | User no longer needs to click "Enable Milestones" separately |
| `handleEnableMilestones` | Replaced by auto-fire in create-job-content |
| `useEnableMilestones()` in MilestoneSection | MilestoneSection only shows Add form, no enable button needed |
| "Enable Milestones" UI in MilestoneSection | Shows nothing if milestones not enabled |
| `isEnableSuccess` → refetch effects | No longer needed — milestones are already enabled on arrival |
| `setMilestoneSetupDone` | Dead code (already removed) |

## Files to Modify

| File | Change |
|---|---|
| `create-job-content.tsx` | Add auto-fire enableMilestones after createJob confirms |
| `MilestoneSection.tsx` | Remove all enable logic, show Add form directly when enabled |
| `page.tsx` (detail) | Remove prompt modal, localStorage checks, enable hooks |
