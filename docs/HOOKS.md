# React Hooks - Kokonut Agent Economy Stack

This document describes the custom React hooks used in the Kokonut Agent Economy Stack frontend.

## Overview

The hooks are designed with **defensive programming** principles to prevent undefined errors during React's concurrent rendering and loading states.

## Core Principles

### 1. Always Return Defined Arrays

Hooks never return `undefined` for array data. Even during loading states, arrays are initialized as empty arrays:

```typescript
return {
  agents: [] as Agent[], // Always defined, never undefined
  isLoading: true,
  error: null,
};
```

### 2. Use `enabled` Flags

`useReadContracts` queries use the `enabled` flag to prevent execution when the contracts array is empty:

```typescript
useReadContracts({
  contracts: queries,
  query: {
    enabled: queries.length > 0, // Only run when we have queries
    retry: 2,
    staleTime: 30 * 1000,
  },
});
```

### 3. Defensive Page-Level Checks

Components use optional chaining as a safety net:

```typescript
// Safe array access
const count = services?.length ?? 0;
const total = (jobs ?? []).reduce((acc, job) => acc + job.budget, 0n);

// Safe method calls
const rating = (averageRating ?? 0).toFixed(1);
```

## Available Hooks

### Agent Hooks

#### `useAgentCount()`

Returns the total count of registered agents.

```typescript
const { count, isLoading, error, refetch } = useAgentCount();
```

#### `useAgents(start?: number, count?: number)`

Returns a paginated array of registered agents.

```typescript
const { agents, totalCount, isLoading, error, refetch } = useAgents();

// Returns: Agent[]
interface Agent {
  id: number;
  owner: `0x${string}`;
  agentURI: string;
  agentWallet: `0x${string}`;
  isActive: boolean;
  metadata: AgentMetadata8004 | null;
}
```

**Pagination Example:**

```typescript
const ITEMS_PER_PAGE = 12;
const [page, setPage] = useState(0);
const { agents, totalCount, isLoading } = useAgents(page * ITEMS_PER_PAGE, ITEMS_PER_PAGE);
const totalPages = Math.ceil((totalCount || 0) / ITEMS_PER_PAGE);
```

#### `useActiveAgentCount()`

Returns the count of active (non-inactive) agents.

```typescript
const { count, isLoading, error, refetch } = useActiveAgentCount();
```

### Identity Import Hooks

#### `useERC8004Agent(address: '0x${string}' | undefined)`

Checks if a wallet is registered on the official ERC-8004 registry and returns its latest identity via `resolveAgent()`. Single-call, instant lookup.

```typescript
import { useERC8004Agent } from '@/lib/hooks/useERC8004Agent';

const { isRegistered, agent, isLoading, error } = useERC8004Agent(address);

// Returns: ImportedAgent | null
interface ImportedAgent {
  agentId: bigint;
  owner: `0x${string}`;
  agentURI: string;
  isActive: boolean;
  metadata: AgentMetadata8004 | null;
}
```

**How it works:**

1. Calls `isAgent(address)` to check registration
2. Calls `resolveAgent(address)` to get latest agentId + agentURI
3. Decodes `agentURI` into `AgentMetadata8004`

#### `useAgentReputation(agentId: bigint | undefined)`

Get reputation from the official ERC-8004 reputation registry.

```typescript
import { useAgentReputation } from '@/lib/hooks/useReputation';

const { reputation, isLoading, error } = useAgentReputation(agentId);

// Returns: ReputationData
interface ReputationData {
  feedbackCount: number;
  cumulativeValue: number;
  valueDecimals: number;
  normalizedRating: number; // value / 10^decimals
}
```

**Usage:**

```typescript
const { agent } = useERC8004Agent(address);
const { reputation } = useAgentReputation(agent?.agentId);

// Display: `${reputation.feedbackCount} reviews, ${reputation.normalizedRating} rating`
```

**How it works:**

1. Queries `Registered(address indexed owner)` events from block 0
2. Deduplicates agentIds
3. Multicalls `getAgent(agentId)` + `ownerOf(agentId)` to verify current ownership
4. Filters to active agents still owned by the address
5. Decodes each `agentURI` into `AgentMetadata8004`

#### `useKokonutAgents(address: '0x${string}' | undefined)`

Same as `useERC8004Agents` but for the Kokonut registry. Used for bidirectional import/export.

```typescript
import { useKokonutAgents } from '@/lib/hooks/useERC8004Agent';

const { data: agents, isLoading, error } = useKokonutAgents(address);
```

**Bidirectional import logic:**

```typescript
const { data: erc8004Agents } = useERC8004Agents(address);
const { data: kokonutAgents } = useKokonutAgents(address);

const has8004 = (erc8004Agents ?? []).length > 0;
const hasKokonut = (kokonutAgents ?? []).length > 0;

if (has8004) {
  // Show ERC-8004 identities with checkboxes for multi-select import
}
if (hasKokonut) {
  // Show Kokonut identities with checkboxes for multi-select export
}
```

### Wallet Agent Management Hooks

#### `useWalletAgentsWithDetails(ownerAddress: '0x${string}' | undefined)`

Fetches all agents owned by a wallet with full metadata and Kokonut tag detection. Uses event logs and multicall for efficient fetching.

```typescript
import { useWalletAgentsWithDetails } from '@/lib/hooks/useWalletAgentsWithDetails';

const {
  agents, // AgentWithDetails[] - all agents owned by wallet
  taggedAgents, // AgentWithDetails[] - agents with source === 'kokonut-marketplace'
  untaggedAgents, // AgentWithDetails[] - agents without Kokonut tag
  isLoading, // boolean
  error, // Error | null
  refetch, // () => void
} = useWalletAgentsWithDetails(ownerAddress);
```

**Returns:**

| Property         | Type                 | Description                                                                |
| ---------------- | -------------------- | -------------------------------------------------------------------------- |
| `agents`         | `AgentWithDetails[]` | All agents owned by the wallet with decoded metadata                       |
| `taggedAgents`   | `AgentWithDetails[]` | Subset with `source === 'kokonut-marketplace'` (registered via Kokonut UI) |
| `untaggedAgents` | `AgentWithDetails[]` | Subset without Kokonut tag (registered elsewhere)                          |
| `isLoading`      | `boolean`            | Loading state                                                              |
| `error`          | `Error \| null`      | Error object if fetch failed                                               |
| `refetch`        | `() => void`         | Function to manually refetch data                                          |

**AgentWithDetails Interface:**

```typescript
interface AgentWithDetails {
  id: number; // Agent token ID
  owner: `0x${string}`; // Owner address
  agentURI: string; // Raw metadata URI
  metadata: AgentMetadata8004 | null; // Decoded metadata
  hasKokonutTag: boolean; // True if source === 'kokonut-marketplace'
}
```

**How it works:**

1. Uses `balanceOf()` to check agent count for the wallet
2. Queries `Registered` events from block 9,989,393 to find agent IDs owned by this address
3. Multicalls `tokenURI()` for each agent to fetch metadata URIs
4. Decodes metadata and checks for `source` field
5. Categorizes agents into `taggedAgents` (Kokonut-registered) and `untaggedAgents`

**Usage Example:**

```tsx
function DashboardAgentsPage() {
  const { address } = useAccount();
  const { agents, taggedAgents, isLoading, error, refetch } = useWalletAgentsWithDetails(address);

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} onRetry={refetch} />;

  return (
    <div>
      <h1>Your Agents ({agents.length})</h1>
      <p>Kokonut Registered: {taggedAgents.length}</p>
      {agents.map(agent => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}
```

### Service Hooks

#### `useServices(start?: number, count?: number)`

Returns a paginated list of services.

```typescript
const { services, isLoading, error, refetch } = useServices(0, 20);

// Returns: Service[]
interface Service {
  id: bigint;
  provider: `0x${string}`;
  name: string;
  description: string;
  metadataURI: string;
  price: bigint;
  paymentToken: `0x${string}`;
  isActive: boolean;
  createdAt: bigint;
}
```

#### `useActiveServiceCount()`

Returns the count of active services.

```typescript
const { count, isLoading, error, refetch } = useActiveServiceCount();
```

#### `useProviderServices(provider: '0x${string}' | undefined)`

Returns services created by a specific provider.

```typescript
const { services, isLoading, error, refetch } = useProviderServices(address);
```

### Job Hooks

#### `useJobCount()`

Returns the total count of jobs (next job ID).

```typescript
const { count, isLoading, error, refetch } = useJobCount();
```

#### `useJob(jobId: number | bigint | undefined)`

Returns details for a specific job.

```typescript
const { job, isLoading, error, refetch } = useJob(123);
```

#### `useJobs(start?: number, count?: number)`

Returns a paginated list of jobs.

```typescript
const { jobs, isLoading, error, refetch } = useJobs(0, 20);

// Returns: Job[]
interface Job {
  id: bigint;
  client: `0x${string}`;
  provider: `0x${string}`;
  evaluator: `0x${string}`;
  serviceId: bigint;
  paymentToken: `0x${string}`;
  description: string;
  budget: bigint;
  expiredAt: bigint;
  status: number;
  hook: `0x${string}`;
  deliverable: `0x${string}`;
}
```

#### `useUserJobs(user: '0x${string}' | undefined, role?: 'client' | 'provider' | 'evaluator' | 'all')`

Returns jobs filtered by user and role.

```typescript
// All jobs where user is client, provider, or evaluator
const { jobs, isLoading, error, refetch } = useUserJobs(address, 'all');

// Only jobs where user is the provider
const { jobs, isLoading, error, refetch } = useUserJobs(address, 'provider');
```

#### `useActiveJobCount()`

Returns count of active jobs (Open, Funded, or Submitted status).

```typescript
const { count, isLoading } = useActiveJobCount();
```

#### Job Status Constants

```typescript
import { JobStatus, getJobStatusLabel, getJobStatusColor } from '@/lib/hooks/useJobs';

// Status values
JobStatus.Open; // 0
JobStatus.Funded; // 1
JobStatus.Submitted; // 2
JobStatus.Completed; // 3
JobStatus.Rejected; // 4
JobStatus.Expired; // 5

// Helper functions
const label = getJobStatusLabel(job.status); // "Open", "Funded", etc.
const color = getJobStatusColor(job.status); // "default", "primary", "warning", "success", "danger"
```

#### `useCompleteAfterTimeout()`

Write hook to complete a job after the timeout period (7 days after submission) if the evaluator hasn't responded.

```typescript
const { completeAfterTimeout, hash, isPending, error, reset } = useCompleteAfterTimeout();

// Usage:
completeAfterTimeout(jobId); // bigint

// Use case: When evaluator is non-responsive after 7 days from submission
```

#### `useRefundExpired()`

Write hook to trigger a refund for an expired job - permissionless function. Anyone can call this to trigger a refund for jobs past their expiration date.

```typescript
const { refundExpired, hash, isPending, error, reset } = useRefundExpired();

// Usage:
refundExpired(jobId); // bigint

// Use case: Client didn't respond within 7 days after provider submitted
```

#### `useCreateJobWithRandomEvaluator()`

Write hook to create a job with a randomly selected evaluator from the registered evaluator pool.

```typescript
const { createJobWithRandomEvaluator, hash, isPending, error, reset } =
  useCreateJobWithRandomEvaluator();

// Usage:
createJobWithRandomEvaluator(
  provider, // `0x${string}`
  expiredAt, // bigint - Unix timestamp
  description, // string
  paymentToken, // `0x${string}` - default: ETH (0x0)
  evaluatorFee // boolean - whether to pay evaluator fee
);
```

#### `useRegisterAsEvaluator()`

Write hook to register as an evaluator to be eligible for random evaluator selection.

```typescript
const { registerAsEvaluator, hash, isPending, error, reset } = useRegisterAsEvaluator();

// Usage:
registerAsEvaluator();
```

#### `useUnregisterAsEvaluator()`

Write hook to unregister as an evaluator.

```typescript
const { unregisterAsEvaluator, hash, isPending, error, reset } = useUnregisterAsEvaluator();

// Usage:
unregisterAsEvaluator();
```

### Proposal Hooks

#### `useProposals(start?: number, count?: number)`

Returns a paginated list of proposals.

```typescript
const { proposals, isLoading, error, refetch } = useProposals(0, 20);

// Returns: Proposal[]
interface Proposal {
  id: bigint;
  proposer: `0x${string}`;
  title: string;
  description: string;
  criteriaURI: string;
  reward: bigint;
  status: number;
  createdAt: bigint;
  decisionDeadline: bigint;
  winningEvaluator: `0x${string}`;
}
```

### Reputation Hooks

#### `useAgentReputation(agent: '0x${string}' | undefined)`

Returns reputation data for a specific agent.

```typescript
const { reputation, isLoading, error, refetch } = useAgentReputation(address);

// Returns: ReputationData
interface ReputationData {
  averageRating: number;
  totalFeedbacks: number;
  providers: number;
}
```

#### `useGlobalReputation()`

Returns aggregated reputation data across all agents.

```typescript
const { totalAgents, totalFeedbacks, averageRating, isLoading, error, refetch } =
  useGlobalReputation();
```

### Skills Hooks

#### `useAgentSkills(agentId: bigint | undefined)`

Returns skill IDs for a specific agent.

```typescript
const { skillIds, isLoading, error, refetch } = useAgentSkills(agentId);
// skillIds: bigint[] | undefined
```

#### `useSkill(skillId: bigint | undefined)`

Returns details for a specific skill.

```typescript
const { skill, isLoading, error, refetch } = useSkill(skillId);

// Returns: Skill | undefined
interface Skill {
  agentId: bigint;
  name: string;
  version: string;
  description: string;
  endpoint: string;
  domains: string[];
  isActive: boolean;
  registeredBy: `0x${string}`;
  registeredAt: bigint;
}
```

#### `useRegisterSkill()`

Write hook to register a new skill.

```typescript
const { registerSkill, hash, isPending, error, reset } = useRegisterSkill();

// Usage:
registerSkill(
  agentId, // bigint
  name, // string
  version, // string
  description, // string
  endpoint, // string
  domains // string[]
);
```

#### `useDeactivateSkill()`

Write hook to deactivate a skill.

```typescript
const { deactivateSkill, hash, isPending, error, reset } = useDeactivateSkill();

// Usage:
deactivateSkill(skillId); // bigint
```

### Proposal Hooks (AgentReview Contract Integration)

These hooks provide complete contract integration with the AgentReview contract for creating, evaluating, and managing proposals.

#### `useProposalCount()`

Returns the total count of proposals.

```typescript
const { count, isLoading, error, refetch } = useProposalCount();

// Returns: number (total proposal count)
```

#### `useReviewStats()`

Fetches comprehensive proposal statistics from the AgentReview contract.

```typescript
const { stats, isLoading, error, refetch } = useReviewStats();

// Returns:
interface ReviewStats {
  totalProposals: number;
  activeProposals: number;
  completedProposals: number;
  totalRewards: bigint;
  totalEvaluations: number;
}

// Usage:
const { stats } = useReviewStats();
console.log(`Active: ${stats.activeProposals}`);
console.log(`Completed: ${stats.completedProposals}`);
console.log(`Total Rewards: ${Number(stats.totalRewards) / 1e18} ETH`);
console.log(`Total Evaluations: ${stats.totalEvaluations}`);
```

**How it works:**

1. Fetches proposal count
2. Uses multicall to fetch all proposals
3. Calculates active/completed counts
4. Fetches evaluations for each proposal via separate multicall
5. Sums up evaluator counts

#### `useProposals(offset?: number, limit?: number)`

Returns a paginated list of proposals.

```typescript
const { proposals, totalCount, isLoading, error, refetch } = useProposals(0, 20);

// Returns: Proposal[]
interface Proposal {
  id: bigint;
  proposer: `0x${string}`;
  title: string;
  description: string;
  criteriaURI: string;
  reward: bigint;
  status: number; // 0=Open, 1=UnderReview, 2=Decided, 3=Cancelled
  createdAt: bigint;
  decisionDeadline: bigint;
  winningEvaluator: `0x${string}`;
}

// Usage:
const { proposals, totalCount } = useProposals(0, 10);
proposals.forEach(p => console.log(p.title, p.reward));
```

#### `useProposal(id: bigint | undefined)`

Returns details for a specific proposal.

```typescript
const { proposal, isLoading, error, refetch } = useProposal(1n);

// Usage:
const { proposal } = useProposal(proposalId);
if (proposal) {
  console.log(proposal.title, proposal.status);
}
```

#### `useCreateProposal()`

Write hook to create a new evaluation proposal with ETH reward staking.

```typescript
const { createProposal, hash, isPending, error, reset } = useCreateProposal();

// Usage:
createProposal(
  title, // string
  description, // string
  criteriaURI, // string
  reward, // bigint (ETH amount - must send equal ETH value)
  decisionDeadline // bigint (Unix timestamp)
);

// Example:
createProposal(
  'Agent Evaluation',
  'Evaluate trading agent performance',
  'ipfs://criteria-hash',
  ethers.parseEther('0.1'), // 0.1 ETH reward
  BigInt(Math.floor(Date.now() / 1000) + 86400) // 24 hours deadline
);
```

#### `useSubmitEvaluation()`

Write hook to submit an evaluation for a proposal with ETH staking.

```typescript
const { submitEvaluation, hash, isPending, error, reset } = useSubmitEvaluation();

// Usage:
submitEvaluation(
  proposalId, // bigint
  confidenceScore, // bigint (-100 to 100)
  reasoningURI, // string (IPFS/HTTPS URI with reasoning)
  stakeAmount // bigint (ETH amount to stake)
);

// Example:
submitEvaluation(
  1n,
  85n, // 85% confidence
  'ipfs://reasoning-hash',
  ethers.parseEther('0.05') // 0.05 ETH stake
);
```

#### `useAttestDecision()`

Write hook to attest the final decision for a proposal.

```typescript
const { attestDecision, hash, isPending, error, reset } = useAttestDecision();

// Usage:
attestDecision(
  proposalId, // bigint
  winningEvaluator // `0x${string}` - address of winning evaluator
);
```

#### `useClaimReward()`

Write hook to claim rewards from a decided proposal.

```typescript
const { claimReward, hash, isPending, error, reset } = useClaimReward();

// Usage:
claimReward(proposalId); // bigint
```

#### `useReleaseStake()`

Write hook to release stake from an evaluation.

```typescript
const { releaseStake, hash, isPending, error, reset } = useReleaseStake();

// Usage:
releaseStake(proposalId); // bigint
```

#### `useProposalEvaluations(proposalId: bigint | undefined)`

Returns all evaluations for a specific proposal.

```typescript
const { evaluators, isLoading, error, refetch } = useProposalEvaluations(1n);

// Returns: `0x${string}`[] (array of evaluator addresses)

// Usage:
const { evaluators } = useProposalEvaluations(proposalId);
console.log(`${evaluators.length} evaluators submitted`);
evaluators.forEach(addr => console.log(addr));
```

#### `useEvaluation(proposalId: bigint | undefined, evaluator: \`0x${string}\` | undefined)`

Returns details for a specific evaluation.

```typescript
const { evaluation, isLoading, error, refetch } = useEvaluation(1n, evaluatorAddress);

// Returns:
interface Evaluation {
  proposalId: bigint;
  evaluator: `0x${string}`;
  confidenceScore: bigint;
  reasoningURI: string;
  stakeAmount: bigint;
  isFinal: boolean;
  submittedAt: bigint;
}

// Usage:
const { evaluation } = useEvaluation(proposalId, evaluatorAddress);
if (evaluation) {
  console.log(`Confidence: ${evaluation.confidenceScore}%`);
  console.log(`Stake: ${Number(evaluation.stakeAmount) / 1e18} ETH`);
}
```

#### Proposal Status Constants

```typescript
import {
  ProposalStatus,
  getProposalStatusLabel,
  getProposalStatusColor,
} from '@/lib/hooks/useProposals';

// Status enum
ProposalStatus.Open; // 0
ProposalStatus.UnderReview; // 1
ProposalStatus.Decided; // 2
ProposalStatus.Cancelled; // 3

// Helper functions
getProposalStatusLabel(0); // 'Open'
getProposalStatusLabel(1); // 'Under Review'
getProposalStatusLabel(2); // 'Decided'
getProposalStatusLabel(3); // 'Cancelled'

getProposalStatusColor(0); // 'success'
getProposalStatusColor(1); // 'warning'
getProposalStatusColor(2); // 'primary'
getProposalStatusColor(3); // 'danger'
```

### Token Hooks

#### `useUSDC()`

Hook for USDC token operations including balance checking and approvals.

```typescript
const { balance, allowance, approve, isApproving, hash, error } = useUSDC();

// Check balance
const formattedBalance = balance ? Number(balance) / 1e6 : 0;

// Approve spender
approve(
  spenderAddress, // `0x${string}` - e.g., AgenticCommerce contract
  amount // bigint - amount to approve
);
```

**Use Case:** Required for the two-step job funding flow:

1. Check USDC balance
2. Approve AgenticCommerce contract
3. Fund job

### Price Oracle Hooks

#### `useUSDCPrice()`

Returns the current USDC price in USD for display purposes.

```typescript
const { priceInUsd, isLoading, error } = useUSDCPrice();

// Convert USDC amount to USD
const usdcAmount = Number(service.price) / 1e6;
const usdValue = priceInUsd ? usdcAmount * (Number(priceInUsd) / 1e8) : null;

// Display: `${usdcAmount.toFixed(2)} USDC (~$${usdValue.toFixed(2)} USD)`
```

### Service Management Hooks

#### `useUpdateService()`

Write hook to update an existing service (provider only).

```typescript
const { updateService, hash, isPending, error, reset } = useUpdateService();

// Usage:
updateService(
  serviceId, // bigint
  name, // string
  description, // string
  metadataURI, // string
  price // bigint (in USDC smallest units)
);
```

#### `useDeactivateService()`

Write hook to deactivate a service (provider only, irreversible).

```typescript
const { deactivateService, hash, isPending, error, reset } = useDeactivateService();

// Usage:
deactivateService(serviceId); // bigint
```

### Governance Hooks

#### `useSlashManager()`

Collection of hooks for SlashManager governance operations.

```typescript
// Check if address is a signer
const { isSigner, isLoading } = useIsSigner(address);

// Get all slash proposals
const { proposals, isLoading } = useSlashProposals();

// Get specific slash proposal
const { proposal, isLoading } = useSlashProposal(proposalId);

// Create slash proposal (owner only)
const { createSlashProposal, hash, isPending } = useCreateSlashProposal();
createSlashProposal(
  evaluator, // `0x${string}`
  proposalId, // bigint
  amount, // bigint (in wei)
  reason // string
);

// Confirm slash proposal (signer only)
const { confirmSlashProposal, hash, isPending } = useConfirmSlashProposal();
confirmSlashProposal(slashProposalId); // bigint

// Execute slash proposal (signer only, after timelock)
const { executeSlashProposal, hash, isPending } = useExecuteSlashProposal();
executeSlashProposal(slashProposalId); // bigint
```

### Commit-Reveal Hooks

#### `useCommitReveal()`

Hooks for front-running protection using commit-reveal scheme.

```typescript
// Commit a hash
const { commit, hash, isPending } = useCommit();
commit(commitHash); // `0x${string}` - keccak256 hash of (value + secret)

// Reveal committed value
const { reveal, hash, isPending } = useReveal();
reveal(
  value, // string - original value
  secret // string - secret used in commit
);

// Get commit data
const { commitData, isLoading } = useGetCommit(address);
// Returns: { commitHash, blockNumber, isRevealed }

// Check if in reveal window (12 block delay)
const { canReveal, blocksRemaining } = useCanReveal(address);
```

**Use Case:** Protect sensitive operations from front-running by:

1. Generate secret locally
2. Commit hash of (value + secret)
3. Wait 12+ blocks
4. Reveal value and secret for verification

### Activity & Analytics Hooks

#### `useActivityFeed(type, limit)`

Fetches platform-wide activity from job, service, and proposal events.

```typescript
import { useActivityFeed, ActivityType } from '@/lib/hooks/useActivityFeed';

const {
  activities, // Activity[] - filtered activities
  groupedActivities, // Record<string, Activity[]> - grouped by date
  isLoading, // boolean
  error, // Error | null
  refetch, // () => void
} = useActivityFeed(
  'all', // type: 'all' | 'job' | 'service' | 'proposal'
  50 // limit: number of activities to fetch
);

// Activity interface
interface Activity {
  id: string;
  type: ActivityType;
  action: string;
  timestamp: bigint;
  actor: `0x${string}`;
  details: {
    title?: string;
    description?: string;
    amount?: string;
    currency?: string;
    targetId?: string;
  };
  blockNumber: bigint;
  transactionHash: `0x${string}`;
}
```

**Features:**

- Aggregates events from AgenticCommerce, ServiceRegistry, and AgentReview contracts
- Supports filtering by activity type
- Groups activities by block range for display
- Includes transaction hashes for verification

**Usage Example:**

```tsx
function ActivityList() {
  const { activities, isLoading } = useActivityFeed('all', 20);

  if (isLoading) return <Skeleton />;

  return (
    <div>
      {activities.map(activity => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
}
```

#### `useAnalytics()`

Fetches 7-day analytics data for charts and metrics.

```typescript
import { useAnalytics } from '@/lib/hooks/useAnalytics';

const {
  data, // AnalyticsData | null
  isLoading, // boolean
  error, // Error | null
  refetch, // () => void
} = useAnalytics();

// Data structure
interface AnalyticsData {
  dailyStats: DailyStats[]; // Last 7 days of data
  totals: {
    totalJobs: number;
    totalServices: number;
    totalProposals: number;
    totalVolumeUSDC: number;
    totalVolumeETH: number;
    activeJobs: number;
    activeServices: number;
  };
  statusDistribution: {
    open: number;
    funded: number;
    submitted: number;
    completed: number;
    rejected: number;
  };
}
```

**Chart Integration:**

```tsx
import { BarChart, Bar, LineChart, Line, PieChart, Pie } from 'recharts';

function AnalyticsDashboard() {
  const { data } = useAnalytics();

  return (
    <>
      {/* Daily Activity Bar Chart */}
      <BarChart data={data?.dailyStats}>
        <Bar dataKey="jobs" fill="#009F4D" />
        <Bar dataKey="services" fill="#FFCD00" />
        <Bar dataKey="proposals" fill="#00c853" />
      </BarChart>

      {/* Volume Line Chart */}
      <LineChart data={data?.dailyStats}>
        <Line type="monotone" dataKey="volumeUSDC" stroke="#009F4D" />
        <Line type="monotone" dataKey="volumeETH" stroke="#FFCD00" />
      </LineChart>
    </>
  );
}
```

#### `useFinalizeDecision()`

Write hook to finalize a proposal decision after the grace period (7 days after decision deadline). Permissionless - anyone can call after the grace period expires.

```typescript
const { finalizeDecision, hash, isPending, error, reset } = useFinalizeDecision();

// Usage:
finalizeDecision(proposalId); // bigint

// Use case: After 7-day grace period, finalize using median evaluator's decision
```

#### `useCalculateMedianScore(proposalId: bigint | undefined)`

Read hook to calculate the median confidence score from all evaluators.

```typescript
const { medianScore, isLoading, error, refetch } = useCalculateMedianScore(proposalId);

// Returns: bigint - median confidence score
```

#### `useSlashTreasury()`

Read hook to get the slash treasury address.

```typescript
const { treasury, isLoading, error, refetch } = useSlashTreasury();

// Returns: `0x${string}` - treasury address for slashed funds

// Example:
const { treasury } = useSlashTreasury();
console.log(`Slash treasury: ${treasury}`);
```

## Client Job Management Hooks

Tracks job creation limits for spam prevention (MAX_JOBS_PER_CLIENT = 100).

```typescript
import { useClientJobCount, MAX_JOBS_PER_CLIENT } from '@/lib/hooks/useClientJobCount';

const {
  count, // number - current job count
  isLoading, // boolean
  error, // Error | null
  refetch, // () => void
  remainingJobs, // number - jobs remaining until limit
  isAtLimit, // boolean - true if count >= 100
  isNearLimit, // boolean - true if count >= 80
  percentageUsed, // number - percentage of limit used (0-100)
} = useClientJobCount(address);
```

**Usage Example:**

```tsx
function JobCreationForm() {
  const { address } = useAccount();
  const { count, isAtLimit, isNearLimit, percentageUsed } = useClientJobCount(address);

  return (
    <div>
      {/* Warning Banner */}
      {isNearLimit && (
        <div className={`p-4 rounded ${isAtLimit ? 'bg-red-100' : 'bg-yellow-100'}`}>
          <p>
            Job Limit: {count} / {MAX_JOBS_PER_CLIENT}
          </p>
          <div className="w-full bg-gray-200 rounded">
            <div className="bg-blue-600 h-2 rounded" style={{ width: `${percentageUsed}%` }} />
          </div>
          {isAtLimit && <p>You have reached the maximum job limit.</p>}
        </div>
      )}

      <button disabled={isAtLimit}>{isAtLimit ? 'Job Limit Reached' : 'Create Job'}</button>
    </div>
  );
}
```

## Proposal Management Hooks

#### `useCancelProposal()`

Write hook to cancel an Open proposal and refund staked ETH.

```typescript
const { cancelProposal, hash, isPending, error, reset } = useCancelProposal();

// Usage:
cancelProposal(proposalId); // bigint
```

**Requirements:**

- Caller must be the proposer
- Proposal status must be Open (0)
- Refunds full staked reward amount automatically

**Usage Example:**

```tsx
function ProposalActions({ proposal, isProposer }) {
  const { cancelProposal, isPending } = useCancelProposal();

  const handleCancel = () => {
    if (confirm('Cancel this proposal? Staked ETH will be refunded.')) {
      cancelProposal(proposal.id);
    }
  };

  if (isProposer && proposal.status === 0) {
    return (
      <button onClick={handleCancel} disabled={isPending}>
        {isPending ? 'Cancelling...' : 'Cancel Proposal'}
      </button>
    );
  }
}
```

## Kokonut Filtering Hooks

#### `useKokonutAgents(page, itemsPerPage, showAll)`

Fetches and filters agents to show only those registered via Kokonut UI.

```typescript
import { useKokonutAgents } from '@/lib/hooks/useKokonutAgents';

const {
  agents, // KokonutAgent[] - filtered agents
  totalCount, // number - count of Kokonut agents
  isLoading, // boolean - initial loading
  isScanning, // boolean - currently scanning/filtering
  scannedCount, // number - agents checked so far
  totalToScan, // number - total agents in registry
  error, // Error | null
  refetch, // () => void - clear cache and rescan
} = useKokonutAgents(
  0, // page number
  12, // items per page
  false // showAll - if true, returns all agents
);

// Agent interface includes source field
interface KokonutAgent {
  id: number;
  owner: `0x${string}`;
  agentURI: string;
  agentWallet: `0x${string}`;
  isActive: boolean;
  metadata: AgentMetadata8004 | null;
  source: string | null; // 'kokonut-marketplace' or null
}
```

**Features:**

- Fetches agents in batches of 20 for optimal performance
- Automatically filters by `source === 'kokonut-marketplace'`
- Caches results for 15 minutes in localStorage
- Shows scanning progress while filtering
- Supports pagination and "Show All" modes

#### `useKokonutStats()`

Calculates statistics for only Kokonut-registered agents.

```typescript
import { useKokonutStats } from '@/lib/hooks/useKokonutStats';

const {
  totalAgents, // number - Kokonut agent count
  activeAgents, // number - Active Kokonut agents
  totalReviews, // number - Total reviews for Kokonut agents
  averageRating, // number - Average rating (0-5)
  isLoading, // boolean
  error, // Error | null
} = useKokonutStats();
```

**Use in Stats Display:**

```tsx
function StatsSection() {
  const { totalAgents, activeAgents, totalReviews, averageRating, isLoading } = useKokonutStats();

  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard label="Kokonut Agents" value={totalAgents} isLoading={isLoading} />
      <StatCard label="Active" value={activeAgents} isLoading={isLoading} />
      <StatCard label="Reviews" value={totalReviews} isLoading={isLoading} />
      <StatCard label="Avg Rating" value={averageRating.toFixed(1)} isLoading={isLoading} />
    </div>
  );
}
```

**How it works:**

1. Fetches all Kokonut agents using `useKokonutAgents`
2. Counts total and active agents
3. Queries reputation registry for each agent
4. Aggregates review counts and calculates average rating

## Common Patterns

### Safe Array Access

```tsx
// Count with fallback
const count = services?.length ?? 0;

// Reduce with empty array fallback
const total = (jobs ?? []).reduce((acc, job) => acc + job.budget, 0n);
```

### Loading States

```tsx
// Safe loading check
return isLoading ? <Skeleton /> : <DataList data={data ?? []} />;
```

### Conditional Rendering

```tsx
// Safe length check
{
  (services?.length ?? 0) > 0 ? <ServiceList services={services} /> : <EmptyState />;
}
```

### Method Calls with Fallbacks

```tsx
// Safe toFixed
const rating = (averageRating ?? 0).toFixed(1);

// Safe string conversion
const count = (totalCount ?? 0).toString();
```

### Contract Address Configuration

All hooks now use centralized contract configuration with automatic fallbacks:

```typescript
import { CONTRACT_ADDRESSES, getContractAddress } from '@/lib/contracts/config';

// Uses environment variable if available, otherwise uses hardcoded fallback
const ERC8004_ADDRESS = getContractAddress(
  process.env.NEXT_PUBLIC_8004_REGISTRY_ADDRESS,
  CONTRACT_ADDRESSES.sepolia.erc8004Registry
);
```

**Available Contracts:**

- `erc8004Registry` - Official ERC-8004 Identity Registry
- `erc8004Reputation` - Official ERC-8004 Reputation Registry
- `serviceRegistry` - Kokonut Service Registry
- `agenticCommerce` - Job escrow contract
- `agentReview` - Review/Proposal system
- `skillRegistry` - Agent skills registry
- `priceOracle` - Chainlink price feeds
- `commitReveal` - Front-running protection
- `slashManager` - Governance/slashing
- `usdc` - USDC token contract

### Viewport Pagination Hook

Responsive pagination that adapts to screen size:

```typescript
import { useViewportPagination, usePagination } from '@/lib/hooks/useViewportPagination';

function MyList() {
  // Get responsive items per page
  const { itemsPerPage, isMobile, isTablet, isDesktop } = useViewportPagination();

  // Manage pagination state with Show All support
  const [{ page, showAll }, { setPage, toggleShowAll, resetPagination }] = usePagination(itemsPerPage);

  // Calculate fetch parameters
  const start = page * itemsPerPage;
  const count = showAll ? 1000 : itemsPerPage; // Fetch more when showing all

  const { data } = useFetchData(start, count);

  return (
    <>
      <Button onPress={toggleShowAll}>
        {showAll ? 'Show Paginated' : 'Show All'}
      </Button>

      {!showAll && (
        <Pagination
          page={page}
          onChange={setPage}
          total={Math.ceil(totalCount / itemsPerPage)}
        />
      )}
    </>
  );
}
```

**Viewport Breakpoints:**

- Mobile: `< 640px` → 6 items per page
- Tablet: `640px - 1024px` → 8 items per page
- Desktop: `> 1024px` → 12 items per page

### Debug Logging

Enable debug logging to trace contract calls:

```typescript
import { debugLog, DEBUG } from '@/lib/contracts/config';

// In your hook/component
debugLog('contracts', 'Fetching data', { address, functionName });
// Console: [CONTRACTS] Fetching data { address: "0x...", functionName: "getAgent" }

debugLog('errors', 'Transaction failed', error);
// Console: [ERRORS] Transaction failed Error: ...
```

**Configuration:**

```typescript
// lib/contracts/config.ts
export const DEBUG = {
  contracts: true, // Log contract calls
  errors: true, // Log errors
  data: false, // Log data transformations
};
```

## Troubleshooting

### "can't access property 'length', n is undefined"

This error occurs when accessing `.length` on a potentially undefined value. This was addressed in a previous fix by:

1. Using optional chaining: `data?.length ?? 0`
2. Using empty array fallback: `(data ?? []).length`
3. Ensuring hooks always return defined arrays (by design)
4. **CRITICAL**: Avoiding conditional early returns BEFORE wagmi hooks - React hooks must be called unconditionally

### Root Causes (Resolved)

The following issues were fixed in the marketplace and dashboard pages:

1. **Hooks Order Violations**: Custom hooks had conditional early returns that skipped calling `useReadContracts` in certain conditions. This violated React's Rules of Hooks when pages used multiple hooks simultaneously. Fixed by removing all conditional early returns from hooks.

2. **NaN from Undefined Counts**: When `useJobs` or `useProposals` hooks were called with undefined count values (before the initial contract read completed), `Math.min(start + count, undefined)` returned NaN, causing iteration errors. Fixed by using `totalCount ?? 0` in all calculations.

3. **Data Mapping Failures**: The `mapServiceData`, `mapAgentData`, and `mapProposalData` functions destructured data without validating it was an array with expected length. Fixed by adding `Array.isArray(data) && data.length >= N` guards.

### "t is not iterable"

This error occurs when trying to iterate over undefined. Fix by:

1. Using empty array fallback: `(data ?? []).forEach(...)`
2. Using map with fallback: `(data ?? []).map(...)`

## Architecture Notes

- All hooks use **wagmi's `useReadContract` and `useReadContracts`** for blockchain reads
- Hooks are **SSR-safe** - they handle server-side rendering gracefully
- **Retries** are configured (2 retries) for resilience against RPC failures
- **Stale time** is set to 30 seconds to reduce unnecessary re-fetches
- Hooks are **tree-shakeable** - only import what you need

## Caching Strategy

The frontend uses Next.js caching headers configured in `next.config.js`:

| Path Pattern                  | Cache-Control                 | Description                         |
| ----------------------------- | ----------------------------- | ----------------------------------- |
| `/_next/static/:path*`        | `max-age=0, must-revalidate`  | Always revalidate main static files |
| `/_next/static/chunks/:path*` | `immutable, max-age=31536000` | Immutable chunks - cache forever    |
| `/_next/static/css/:path*`    | `immutable, max-age=31536000` | Immutable CSS - cache forever       |
| `/_next/static/media/:path*`  | `immutable, max-age=31536000` | Immutable media - cache forever     |

### Why This Matters

1. **No more stale chunk errors**: After rebuilds, browsers fetch fresh chunks automatically
2. **Optimal caching**: Immutable assets (chunks, CSS, images) are cached indefinitely
3. **Unique build IDs**: Each deployment generates a unique build ID

### Troubleshooting Cache Issues

If you see chunk loading errors like:

```
Loading chunk XXXX failed. (error: http://localhost:3000/_next/static/chunks/...)
```

**Solution:**

```bash
# 1. Clear Next.js cache
rm -rf apps/web/.next
rm -rf apps/web/node_modules/.cache

# 2. Rebuild
cd apps/web && pnpm run build

# 3. Restart server
pkill -f "next start"
cd apps/web && pnpm start
```

### Development vs Production Caching

| Environment                 | Behavior                                |
| --------------------------- | --------------------------------------- |
| Development (`pnpm run dev`) | No caching - hot reload for all changes |
| Production (`pnpm start`)    | Smart caching with unique build IDs     |
