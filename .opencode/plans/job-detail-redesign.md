# Job Detail Page Redesign + Milestone Bug Fixes

## Phase 1: On-Chain Fixes (2 transactions on MilestoneEscrowV2 proxy)

### 1a. Call `setSupportedToken(0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238, true)`
Allow USDC as payment token for milestones.

### 1b. Call `setSupportedToken(0x0000000000000000000000000000000000000000, true)`
Allow ETH as payment token for milestones.

**Owner wallet:** `0x3394C45b5938127EB56603A6051dF26CFAF08C26`
**Proxy:** `0xd4Fdc345b1c6aF1B4Cc84339bcB251B33527Eb45`

## Phase 2: Milestone Bug Fixes (3 component-level fixes)

### 2a. Fix milestone prompt status gate
**File:** `apps/web/app/jobs/[id]/page.tsx` line 157
Change:
```typescript
if (clientIsMe && job.status === JobStatus.Open && job.budget > 0n) {
```
To:
```typescript
if (clientIsMe && (job.status === JobStatus.Open || job.status === JobStatus.Funded) && job.budget > 0n) {
```

### 2b. Fix false positive "Milestones enabled!" for non-clients
**File:** `apps/web/components/MilestoneSection.tsx` lines 125-161
Change the conditional logic to:
```typescript
if (!details?.usesMilestones) {
    return (
      <Card ...>
        {isClient ? (
          <><p>Enable milestones...</p><button /></>
        ) : (
          <p className="text-sm text-default-500">Milestones not enabled for this job.</p>
        )}
      </Card>
    );
}
```

### 2c. Remove unused import `useEnableJobMilestones` from detail page
**File:** `apps/web/app/jobs/[id]/page.tsx` line 51

Remove `useEnableJobMilestones` from the `useJobs` import list (already using `useEnableMilestones` from `useMilestoneEscrow`).

Remove unused `milestoneSetupDone` state (line 149) — set but never read.

## Phase 3: Job Detail Page Component Extraction

### New directory: `apps/web/components/jobs/`

Create these 13 component files, extracting sections from the monolithic page.tsx:

| # | File | Extracts from page.tsx | Est. Lines |
|---|------|----------------------|------------|
| 1 | `JobHeader.tsx` | Title row, copy-link, status badge, service link, budget/deadline, roles grid (lines 483-590) | ~110 |
| 2 | `JobWarnings.tsx` | Evaluator fee, hook address, client=evaluator, provider=evaluator warnings (lines 593-647) | ~55 |
| 3 | `TransactionStatusCard.tsx` | Transaction step + error display (lines 650-662) | ~15 |
| 4 | `BalanceCard.tsx` | Balance display + insufficient warning (lines 665-709) | ~45 |
| 5 | `JobActions.tsx` | **Large** — all status/role action buttons (lines 712-1027) | ~315 |
| 6 | `AiEvaluationPanel.tsx` | AI evaluate button + results (lines 893-940) | ~50 |
| 7 | `SubmitDeliverableForm.tsx` | Fulfillment textarea + submit (lines 796-831) | ~35 |
| 8 | `BiddingSectionClient.tsx` | Bid overview + accept (client view, lines 1037-1095) | ~60 |
| 9 | `JobSettingsCard.tsx` | Budget update form (lines 1098-1131) | ~35 |
| 10 | `DeliverableDisplay.tsx` | Deliverable hash (lines 1134-1143) | ~10 |
| 11 | `PaymentTokenSetupModal.tsx` | Token selection modal (lines 1152-1212) | ~60 |
| 12 | `FeedbackCard.tsx` | **Move from inline** feedback submission (lines 1254-1346) | ~95 |
| 13 | `BiddingSectionForProvider.tsx` | **Move from inline** provider bidding (lines 1348-1437) | ~90 |

### Refactored page.tsx structure (~200 lines):

```tsx
export default function JobDetailPage({ params }) {
  const { id } = use(params);
  const jobId = BigInt(id);
  const { address, isConnected } = useAccount();
  const { job, isLoading, error, refetch } = useJob(jobId);
  const { service } = useService(job?.serviceId);

  useWatchJob(jobId);

  // Derived state
  const isClient = job && address && job.client === address;
  const isProvider = job && address && job.provider === address;
  const isEvaluator = job && address && job.evaluator === address;
  const isOpen = job && (job.status === JobStatus.Open || job.status === JobStatus.Funded);

  if (isLoading) return <JobSkeleton />;
  if (!job) return <JobNotFound />;

  return (
    <div className="container mx-auto px-3 md:px-4 py-6 md:py-8">
      <NextLink href="/jobs"><ArrowLeft /> Back to Jobs</NextLink>
      <div className="max-w-2xl mx-auto space-y-6">
        <JobHeader job={job} service={service} />
        <JobWarnings job={job} isClient={isClient} address={address} />
        <TransactionStatusCard ... />
        <ErrorDisplay error={currentError} />
        <BalanceCard job={job} isClient={isClient} />
        <JobActions job={job} isClient={isClient} isProvider={isProvider} isEvaluator={isEvaluator} ... />
        {isOpen && <BiddingSectionForProvider job={job} address={address} refetch={refetch} />}
        {isOpen && isClient && <BiddingSectionClient job={job} ... />}
        <JobSettingsCard job={job} isClient={isClient} ... />
        <DeliverableDisplay job={job} />
        {feedbackEligible && <FeedbackCard agentId={service.agentId} jobId={job.id} />}
        {showPaymentTokenModal && <PaymentTokenSetupModal ... />}
        {showMilestonePrompt && <ConfirmModal title="Enable Milestones?" ... />}
        <MilestoneSection jobId={jobId} client={job.client} provider={job.provider} ... />
      </div>
    </div>
  );
}
```

## Phase 4: UI/UX Improvements

### 4a. Consistent StatusBadge component
Replace the inline status badge (lines 497-511) with the reusable `<StatusBadge>` component from `@/components/StatusBadge`.

### 4b. MilestoneSection moved higher in layout
Move the MilestoneSection closer to the job header (above the actions card) so the milestone enable/add flow is more discoverable.

### 4c. Use subgraph for provider agent name
In the roles grid, show the provider's agent name (via `useUnifiedAgentProfile`) next to their address.

### 4d. Reduce redundant state
Remove `milestoneSetupDone` (dead code). Remove `showFulfillmentInput` (can derive from `fulfillmentText.length > 0`).

## Implementation Order

1. Phase 1 (on-chain) — quick
2. Phase 2 (bug fixes) — quick, unblocks milestone flow
3. Phase 4 (UI improvements) — medium, improves UX immediately
4. Phase 3 (component extraction) — large, structural refactor

Each phase is independently deployable and tested.
