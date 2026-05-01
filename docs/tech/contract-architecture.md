# Kokonut Agent Economy Stack - Smart Contract Architecture

> **Phase 4 Complete**: 201 tests passing with 87%+ code coverage across all core contracts.

## Overview

This document defines the smart contract architecture for the Kokonut Agent Economy Stack, implementing ERC-8004 (Trustless Agents) standards with full ENS integration.

---

## Test Suite Summary

All core contracts have comprehensive test coverage with automated CI/CD enforcement.

| Contract              | Coverage | Tests   | Key Features Tested                                        |
| --------------------- | -------- | ------- | ---------------------------------------------------------- |
| **AgenticCommerceV4** | 89.25%   | 50      | Job lifecycle, funding, DoS limits, events, edge cases     |
| **AgentReviewV4**     | 91.24%   | 46      | Proposal lifecycle, evaluator limits, slashing, events     |
| **ServiceRegistryV2** | 83.33%   | 29      | Service CRUD, O(1) queries, proxy upgrades, access control |
| **Total**             | **87%+** | **201** | Unit, fuzzing, invariant, gas benchmarks, integration      |

### Running Tests

```bash
# Run all tests
forge test

# Run with coverage report
forge coverage --report summary

# Run fuzzing tests (1000 iterations)
forge test --match-contract Fuzz

# Run gas benchmarks
forge test --match-contract GasBenchmark --gas-report

# Run specific contract tests
forge test --match-contract AgenticCommerceV4
forge test --match-contract AgentReviewV4
forge test --match-contract ServiceRegistryV2
```

### CI/CD Integration

- GitHub Actions workflow with 80% coverage threshold
- Fuzzing: 1000 runs locally, 10,000 runs in CI
- Invariant testing for critical properties
- Gas benchmarking for performance regression detection

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Kokonut Agent Economy Stack                  │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: Identity (ERC-8004)                                   │
│  ┌────────────────────────────────────────────────────────┐     │
│  │            Official ERC-8004 Registry (Sepolia)        │     │
│  │  Identity: 0x8004A818BFB912233c491871b3d84c89A494BD9e  │     │
│  │  Reputation: 0x8004B663056A597Dffe9eCcC1965A193B7388713│    │
│  └────────────────────────────────────────────────────────┘     │
│                              │                                  │
│  ┌─────────────────────┐    ┌──────────────────────┐           │
│  │ Skill Registry      │    │ Service Registry     │           │
│  │ (capabilities)      │    │ (listings)           │           │
│  │ Wired to ERC-8004   │    │ Wired to ERC-8004    │           │
│  └─────────────────────┘    └──────────────────────┘           │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Commerce (ERC-8183)                                   │
│  ┌─────────────────────┐    ┌──────────────────────┐           │
│  │ Service Registry    │    │ Agentic Commerce     │           │
│  │ (listings)          │◄──►│ (USDC job escrow)    │           │
│  └─────────────────────┘    └──────────────────────┘           │
│           │                                                    │
│  ┌─────────────────────┐    ┌──────────────────────┐           │
│  │ Commit Reveal       │    │ Price Oracle         │           │
│  │ (front-running)     │    │ (Chainlink/fixed)    │           │
│  └─────────────────────┘    └──────────────────────┘           │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: Coordination                                          │
│  ┌─────────────────────┐    ┌──────────────────────┐           │
│  │ Agent Review        │    │ Slash Manager        │           │
│  │ (ETH-staked evals)  │◄──►│ (3-of-5 multisig)   │           │
│  └─────────────────────┘    └──────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Smart Contracts

### 1. **Official ERC-8004 Registries (Sepolia)**

We use the official ERC-8004 registries deployed on Sepolia testnet for identity and reputation management.

#### Identity Registry

**Address:** `0x8004A818BFB912233c491871b3d84c89A494BD9e`

**Purpose:** ERC-8004 compliant identity registry (ERC-721 + URIStorage)

**Key Features:**

- ✅ ERC-721 NFT-based agent identification
- ✅ URI storage for agent metadata (data:URI - no IPFS dependency)
- ✅ Multi-chain namespace support
- ✅ Agent verification and resolution
- ✅ Metadata storage with key-value pairs

**Key Functions:**

```solidity
function register(string calldata agentURI) external returns (uint256 agentId);
function registerWithMetadata(string calldata agentURI, Metadata[] calldata metadata) external returns (uint256 agentId);
function getAgent(uint256 agentId) external view returns (address owner, string agentURI, address agentWallet, bool isActive);
function resolveAgent(address agentAddress) external view returns (uint256 agentId, string agentURI);
function isAgent(address agentAddress) external view returns (bool);
function setAgentURI(uint256 agentId, string calldata newURI) external;
function getMetadata(uint256 agentId, string calldata metadataKey) external view returns (bytes memory);
function setMetadata(uint256 agentId, string calldata metadataKey, bytes calldata metadataValue) external;
function getAgentWallet(uint256 agentId) external view returns (address);
function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes calldata signature) external;
function unsetAgentWallet(uint256 agentId) external;
```

**Gas Costs (Sepolia):**

- Register Agent: ~50,000 gas (~$0.005)
- Register with Metadata: ~75,000 gas (~$0.007)
- Set Metadata: ~30,000 gas (~$0.003)
- Get Agent: ~5,000 gas (free)

#### Reputation Registry

**Address:** `0x8004B663056A597Dffe9eCcC1965A193B7388713`

**Purpose:** ERC-8004 compliant reputation tracking

**Key Functions:**

```solidity
function submitFeedback(address agent, uint256 taskId, int256 rating, string calldata metadataURI) external returns (uint256);
function getAgentReputation(address agent) external view returns (int256 average, uint256 total, uint256 providers);
function getFeedbackCount(address agent) external view returns (uint256);
function getFeedbackDetails(uint256 feedbackId) external view returns (Feedback memory);
```

**Gas Costs (Sepolia):**

- Submit Feedback: ~100,000 gas (~$0.01)
- Get Reputation: ~10,000 gas (free)
- Get Feedback Details: ~5,000 gas (free)

---

### 2. **AgentSkillRegistry.sol**

**Purpose:** Agent skills and capabilities registry, wired to official ERC-8004 Identity Registry

**Address:** `0x7cf16C00ed4831EB9eE3a8765831968F0a28f53D`

**Key Features:**

- Skill registration with name, version, description, endpoint, and domains
- Domain-based skill discovery
- Agent-to-skill mapping
- Skill activation/deactivation
- Wired to official ERC-8004 Identity Registry for agent verification

**Key Functions:**

```solidity
function registerSkill(string name, string version, string description, string endpoint, string[] domains) external returns (uint256 skillId);
function getSkill(uint256 skillId) external view returns (Skill memory);
function getAgentSkills(uint256 agentId) external view returns (uint256[]);
function findSkillsByDomain(string domain) external view returns (uint256[]);
function deactivateSkill(uint256 skillId) external;
```

**Gas Costs (Sepolia):**

- Register Skill: ~80,000 gas (~$0.008)
- Get Skill: ~5,000 gas (free)
- Find by Domain: ~10,000 gas (free)

---

### 3. **ServiceRegistryV2.sol** (UUPS Proxy)

**Purpose:** Service listings with pricing and payment token support, wired to official ERC-8004 Identity Registry

**Proxy Address:** `0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201` ⭐ **USE THIS**
**Implementation:** `0xb75B02D4523171ABdB6f5bcB9D60903ed3e30fAD` (reference only)

**Test Coverage:** 83.33% (29 tests passing)

⚠️ **Note:** ServiceRegistryV2 was deployed on March 29, 2026 to fix a critical ABI bug in V1 where it called `identityRegistry.getAgent()` (which doesn't exist in ERC-8004). The new contract correctly uses `IERC721.ownerOf()` for agent verification.

**Key Features:**

- **UUPS Upgradeable Pattern:** Allows future upgrades without losing state
- Service creation with name, description, metadata URI, price, and payment token
- **O(1) active service count** - cached counter for gas efficiency
- Paginated queries for active services
- Provider-specific service filtering
- Agent-based service discovery
- Wired to official ERC-8004 Identity Registry for agent verification
- Uses `IERC721.ownerOf()` instead of non-existent `getAgent()`

**Key Functions:**

```solidity
function createService(uint256 agentId, string name, string description, string metadataURI, uint256 price, address paymentToken) external returns (uint256 serviceId);
function getService(uint256 serviceId) external view returns (Service memory);
function getServices(uint256 start, uint256 count) external view returns (uint256[]);
function getActiveServiceCount() external view returns (uint256);  // O(1) gas
function getProviderServices(address provider) external view returns (uint256[]);
function getServicesByAgent(uint256 agentId) external view returns (uint256[]);
function deactivateService(uint256 serviceId) external;
function setIdentityRegistry(address _identityRegistry) external onlyOwner;  // Upgradeable
function upgradeToAndCall(address newImplementation, bytes data) external onlyOwner;  // UUPS
```

**Gas Costs (Sepolia):**

- Create Service: ~150,000 gas (~$0.015) - includes proxy overhead
- Get Service: ~5,000 gas (free)
- List Services: ~15,000 gas (free)
- Get Active Service Count: ~2,500 gas (O(1) - constant regardless of count)

**Deprecated:**

- ~~`ServiceRegistryV1`~~: `0x26773D3578400E37fbEA9397c80E8d71D67c749e` - **DO NOT USE**

---

### 4. **AgenticCommerceV4.sol**

**Purpose:** Job escrow with USDC payments and comprehensive event tracking (Phase 4)

**Address:** `0xA7E8F13AC8E659356333Bf3e579BF3f39334821e`

**Test Coverage:** 89.25% (50 tests passing)

**Key Features:**

- Job lifecycle: Open → Funded → Submitted → Completed (or Rejected)
- USDC escrow with automatic payment on completion
- Evaluator-based approval workflow
- **MAX_JOBS_PER_CLIENT = 100** (DoS prevention)
- **MAX_DESCRIPTION_LENGTH = 1000** (gas optimization)
- **O(1) client job count tracking** - instant lookup
- Extensible hook system for custom job logic
- Budget and provider modification before funding
- **Comprehensive event tracking** for all job lifecycle changes

**DoS Prevention:**

- Maximum 100 jobs per client
- Maximum 1000 character descriptions
- Maximum 365 day expiry duration
- O(1) gas for job count checks

**New Events (Phase 3/4):**

```solidity
event JobStatusChanged(uint256 indexed jobId, JobStatus indexed oldStatus, JobStatus indexed newStatus, uint256 timestamp);
event JobUpdated(uint256 indexed jobId, bytes32 indexed updateType, uint256 timestamp);
event JobLimitExceeded(address indexed client, uint256 attemptedCount, uint256 maxAllowed);
event PaymentTokenSet(uint256 indexed jobId, address indexed token);
event PlatformFeeUpdated(uint256 oldFeeBP, uint256 newFeeBP, address indexed oldTreasury, address indexed newTreasury);
event EmergencyRefund(uint256 indexed jobId, address indexed client, uint256 amount, string reason);
```

**Key Functions:**

```solidity
function createJob(address provider, address evaluator, uint256 expiredAt, string description, address hook) external returns (uint256 jobId);
function createJobFromService(uint256 serviceId, address evaluator, uint256 expiredAt, string description, address hook) external returns (uint256 jobId);
function setProvider(uint256 jobId, address provider) external;
function setBudget(uint256 jobId, uint256 amount) external;
function fundJob(uint256 jobId) external;
function submitJob(uint256 jobId) external;
function completeJob(uint256 jobId) external;
function rejectJob(uint256 jobId, string reason) external;
function claimRefund(uint256 jobId) external;
function getJob(uint256 jobId) external view returns (Job memory);
```

**Gas Costs (Sepolia):**

- Create Job: ~60,000 gas (~$0.006)
- Fund Job: ~80,000 gas (~$0.008)
- Submit Job: ~40,000 gas (~$0.004)
- Complete Job: ~50,000 gas (~$0.005)

---

### 5. **AgentReviewV4.sol**

**Purpose:** A/B proposal evaluation with ETH staking (Phase 4 - Comprehensive Events)

**Address:** `0x716B02447b52Eab450e31bD77103B41bC2c7bE0b`

**Test Coverage:** 91.24% (46 tests passing)

**Key Features:**

- Proposals with reward pools and decision deadlines
- Staked confidence evaluations (-1000 to +1000)
- **MAX_EVALUATORS_PER_PROPOSAL = 5** (DoS prevention)
- **Pull pattern**: Losers call releaseStake() individually
- Slashing for incorrect evaluations via SlashManager
- Attestation-based winner selection
- **Comprehensive event tracking** for all proposal lifecycle stages

**New Events (Phase 3/4):**

```solidity
event ProposalStatusChanged(uint256 indexed proposalId, ProposalStatus indexed oldStatus, ProposalStatus indexed newStatus, uint256 timestamp);
event EvaluatorLimitReached(uint256 indexed proposalId, uint256 maxEvaluators);
event EvaluationFinalized(uint256 indexed proposalId, address indexed evaluator, bool isWinner);
event StakeReleased(uint256 indexed proposalId, address indexed evaluator, uint256 amount);
event StakeAmountChanged(uint256 indexed proposalId, address indexed evaluator, uint256 oldAmount, uint256 newAmount);
event RewardDistributionFailed(uint256 indexed proposalId, address indexed evaluator, uint256 amount, string reason);
```

**Key Functions:**

```solidity
function createProposal(string title, string description, string criteriaURI, uint256 reward, uint256 decisionDeadline) external payable returns (uint256 proposalId);
function submitEvaluation(uint256 proposalId, int256 confidenceScore, string reasoningURI) external payable;
function attestDecision(uint256 proposalId, address winningEvaluator) external;
function claimReward(uint256 proposalId) external;
function releaseStake(uint256 proposalId) external;
function slashEvaluator(address evaluator, uint256 proposalId, string calldata reason) external;
function getProposal(uint256 proposalId) external view returns (Proposal memory);
function getEvaluation(uint256 proposalId, address evaluator) external view returns (Evaluation memory);
function getProposalEvaluations(uint256 proposalId) external view returns (address[]);
```

**Gas Costs (Sepolia):**

- Create Proposal: ~70,000 gas (~$0.007)
- Submit Evaluation: ~60,000 gas (~$0.006)
- Attest Decision: ~50,000 gas (~$0.005) - constant regardless of evaluator count
- Claim Reward: ~40,000 gas (~$0.004)

---

### 6. **PriceOracle.sol**

**Purpose:** Price feeds for USD conversions (Chainlink on mainnet, fixed on testnet)

**Address:** `0x5C4AC3dAF76708DCd51911BA3B33027eAB1B4047`

**Key Features:**

- Auto-detects Sepolia vs Mainnet
- Chainlink price feeds on mainnet
- Fixed $1/USDC on testnet
- Staleness checks (1 hour max)
- Support for custom token price lookups

**Key Functions:**

```solidity
function getUSDCPrice() external view returns (int256);
function getETHRate() external view returns (int256);
function getUsdPriceOfToken(address token) external view returns (int256);
function isStale() external view returns (bool);
```

**Gas Costs (Sepolia):**

- Get USDC Price: ~5,000 gas (free)
- Get ETH Rate: ~5,000 gas (free)
- Check Staleness: ~3,000 gas (free)

---

### 7. **CommitReveal.sol**

**Purpose:** Front-running protection for service purchases

**Address:** `0x6CEd1574A3dF7ec646e43DD8408300117c453Aa3`

**Key Features:**

- 12-block reveal delay (~2 min on Ethereum)
- Nonce-based replay protection
- CEI pattern + ReentrancyGuard
- Cancel commitments before reveal

**Key Functions:**

```solidity
function commit(bytes32 commitmentHash) external;
function reveal(string calldata data, uint256 nonce, uint256 serviceId) external;
function cancel(bytes32 commitmentHash) external;
function getCommitment(address user, bytes32 commitmentHash) external view returns (uint256 blockNumber, bool exists);
function isCommitmentValid(bytes32 commitmentHash) external view returns (bool);
```

**Gas Costs (Sepolia):**

- Commit: ~40,000 gas (~$0.004)
- Reveal: ~60,000 gas (~$0.006)
- Cancel: ~30,000 gas (~$0.003)

---

### 8. **SlashManager.sol**

**Purpose:** 3-of-5 multisig governance for slashing decisions

**Address:** `0x7Cf955900FD7a12680E90D834eAf19346f5DBcf9`

**Key Features:**

- 3-of-5 multisig for slashing decisions
- 1-hour timelock before execution
- Max 100 ETH slash protection
- Owner can add/remove signers
- Integration with AgentReview for evaluator slashing

**Key Functions:**

```solidity
function createProposal(address evaluator, uint256 proposalId, uint256 amount, string calldata reason) external returns (bytes32 slashProposalId);
function confirmProposal(bytes32 proposalId) external;
function executeProposal(bytes32 proposalId) external;
function cancelProposal(bytes32 proposalId) external;
function isSigner(address account) external view returns (bool);
function getSigners() external view returns (address[]);
function getProposal(bytes32 proposalId) external view returns (SlashProposal memory);
```

**Gas Costs (Sepolia):**

- Create Proposal: ~60,000 gas (~$0.006)
- Confirm Proposal: ~40,000 gas (~$0.004)
- Execute Proposal: ~50,000 gas (~$0.005)
- Check Signer: ~3,000 gas (free)

---

## Deployment Strategy

### Sepolia Testnet Deployment (Current)

All identity and reputation operations use the official ERC-8004 registries. Kokonut contracts are wired to these via constructor arguments or `setServiceRegistry()` calls.

**Official ERC-8004 Registries (Sepolia):**

```
ERC-8004 Identity:    0x8004A818BFB912233c491871b3d84c89A494BD9e
ERC-8004 Reputation:  0x8004B663056A597Dffe9eCcC1965A193B7388713
```

**Kokonut Contracts (Sepolia):**

```
AgentSkillRegistry:    0x7cf16C00ed4831EB9eE3a8765831968F0a28f53D  (→ ERC-8004 Identity)
ServiceRegistryV2:     0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201  (→ ERC-8004 Identity, UUPS Proxy)
AgentReview:           0xefAeF01B3DDeF2041A1dbdCEbcA352eD2240920A
AgenticCommerce:       0x14293D31c15594bcB03d6581d26FF9353a882884  (→ ServiceRegistryV2)
PriceOracle:           0x5C4AC3dAF76708DCd51911BA3B33027eAB1B4047  (Chainlink)
CommitReveal:          0x6CEd1574A3dF7ec646e43DD8408300117c453Aa3  (→ ServiceRegistryV2)
SlashManager:          0x7Cf955900FD7a12680E90D834eAf19346f5DBcf9
USDC:                  0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238

DEPRECATED (Do Not Use):
~~ServiceRegistryV1:   0x26773D3578400E37fbEA9397c80E8d71D67c749e~~ (Has ABI bug)
```

**Cross-Contract Wiring:**

- `SkillRegistry.identityRegistry` → Official ERC-8004 Identity (immutable, set in constructor)
- `ServiceRegistry.identityRegistry` → Official ERC-8004 Identity (immutable, set in constructor)
- `AgenticCommerce.serviceRegistry` → ServiceRegistry (set via `setServiceRegistry()`)
- `SlashManager.agentReview` → AgentReview (set via `setAgentReview()`)

**Deployment Commands:**

```bash
# Deploy unified stack
forge script contracts/script/DeployUnified.s.sol:DeployUnifiedScript \
    --rpc-url sepolia --broadcast --verify -vvvv

# Deploy SkillRegistry + ServiceRegistry (wired to official ERC-8004)
forge script contracts/script/DeploySkillService.s.sol:DeploySkillServiceScript \
    --rpc-url sepolia --broadcast --verify -vvvv
    -- 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
```

---

## Security Considerations

### 1. **Reentrancy Protection**

- ✅ Use ReentrancyGuard for all state-changing functions
- ✅ Check-Effects-Interactions pattern
- ✅ Separate read/write operations

### 2. **Access Control**

- ✅ Ownable pattern for admin functions
- ✅ Role-based access control (AccessControl)
- ✅ Multisig for critical operations (Gnosis Safe)

### 3. **Data Integrity**

- ✅ IPFS content verification (CID checks)
- ✅ Signature verification for metadata updates
- ✅ Time-lock for critical changes

### 4. **Gas Optimization**

- ✅ Batch operations for efficiency
- ✅ Event-driven architecture
- ✅ Minimal storage usage
- ✅ Calldata for large parameters

### 5. **Upgradeability**

- ✅ UUPS proxy pattern (not Transparent)
- ✅ Separate storage layout for each contract
- ✅ Migration contracts for data transfer

---

## Testing Strategy

### Unit Tests (Foundry)

```bash
# Run all tests
forge test

# Fuzz testing
forge test --fuzz-seed 0x1234

# Fork Sepolia for integration tests
forge test --fork-url https://ethereum-sepolia.publicnode.com --match-test "testIntegration"
```

### Test Coverage

- ✅ Identity registration and resolution
- ✅ Reputation scoring and aggregation
- ✅ Validation submission and verification
- ✅ Receipt issuance and verification
- ✅ Edge cases and failure modes

---

## Integration Points

### 1. ERC-8004 Bidirectional Import

The frontend supports importing identities between the Kokonut registry and the official ERC-8004 registry (`0x8004A818BFB912233c491871b3d84c89A494BD9e`). Detection happens via `isAgent()` calls on both registries.

### 2. USDC Token Integration

AgenticCommerce uses USDC (6 decimals, `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` on Sepolia) for job escrow. Jobs require USDC approval before funding.

---

## Monitoring & Analytics

### Events

```solidity
event AgentRegistered(
    uint256 indexed tokenId,
    address indexed owner,
    string did,
    string metadataURI
);

event FeedbackSubmitted(
    uint256 indexed feedbackId,
    address indexed agent,
    address feedbackProvider,
    int256 rating
);

event ValidationSubmitted(
    uint256 indexed validationId,
    address indexed agent,
    address validator,
    bytes32 validationHash
);
```

### Indexing Strategy

- ✅ The Graph subgraph for queries
- ✅ Event-based indexing
- ✅ Caching layer (Redis)
- ✅ Real-time analytics dashboard

---

## Gas Costs Summary (Sepolia/Ethereum)

| Operation             | Gas      | Notes             |
| --------------------- | -------- | ----------------- |
| Register Agent        | ~50,000  | One-time cost     |
| Set Metadata          | ~30,000  | Update cost       |
| Get Agent (read)      | ~5,000   | Free (view)       |
| Submit Feedback       | ~100,000 | Reputation update |
| Get Reputation (read) | ~10,000  | Free (view)       |
| Create Service        | ~80,000  | Service listing   |
| Create Job            | ~100,000 | Job escrow        |
| Submit Proposal       | ~150,000 | Review proposal   |


---

**Built for Kokonut Marketplace** 🥥 