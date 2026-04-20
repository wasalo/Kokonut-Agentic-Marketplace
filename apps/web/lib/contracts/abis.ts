import { parseAbi } from "viem";
 
export const AGENT_IDENTITY_REGISTRY_ABI = parseAbi([
  'function register() external returns (uint256 agentId)',
  'function register(string agentURI) external returns (uint256 agentId)',
  'function registerWithMetadata(string agentURI, (string metadataKey, bytes metadataValue)[] metadata) external returns (uint256 agentId)',
  'function getAgent(uint256 agentId) external view returns (address owner, string agentURI, address agentWallet, bool isActive)',
  'function isAgent(address agentAddress) external view returns (bool)',
  'function getCurrentAgentId() external view returns (uint256)',
  'function resolveAgent(uint256 agentId) external view returns (uint256 agentId, string agentURI)',
  'function setAgentURI(uint256 agentId, string newURI) external',
  'function getMetadata(uint256 agentId, string metadataKey) external view returns (bytes)',
  'function setMetadata(uint256 agentId, string metadataKey, bytes metadataValue) external',
  'function getAgentWallet(uint256 agentId) external view returns (address)',
  'function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes signature) external',
  'function unsetAgentWallet(uint256 agentId) external',
  'function balanceOf(address owner) external view returns (uint256)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
]);
 
 
export const SERVICE_REGISTRY_ABI = parseAbi([
  'function createService(uint256 agentId, string name, string description, string metadataURI, uint256 price, address paymentToken) external returns (uint256 serviceId)',
  'function createService(uint256 agentId, string name, string description, string metadataURI, uint256 price, address paymentToken, address paymentAddress) external returns (uint256 serviceId)',
  'function updateService(uint256 serviceId, string name, string description, string metadataURI, uint256 price) external',
  'function deactivateService(uint256 serviceId) external',
  'function activateService(uint256 serviceId) external',
  'function setPaymentAddress(uint256 serviceId, address paymentAddress) external',
  'function getService(uint256 serviceId) external view returns ((uint256 id, address provider, uint256 agentId, string name, string description, string metadataURI, uint256 price, address paymentToken, address paymentAddress, bool isActive, uint256 createdAt))',
  'function getServices(uint256 start, uint256 count) external view returns (uint256[] memory)',
  'function getActiveServiceCount() external view returns (uint256)',
  'function getProviderServices(address provider) external view returns (uint256[] memory)',
  'function getServicesByAgent(uint256 agentId) external view returns (uint256[] memory)',
  'function getServiceCounter() external view returns (uint256)',
]);
 

export const ADMIN_REGISTRY_ABI = parseAbi([
  'function initialize() external',
  'function setHalfLifeDays(uint256 halfLifeDays) external',
  'function getHalfLifeDays() external view returns (uint256)',
  'function setFeaturedAgent(uint256 agentId, bool isFeatured) external',
  'function getFeaturedAgents() external view returns (uint256[] memory)',
  'function setVerificationProvider(string provider, bool isActive) external',
  'function getVerificationProviders() external view returns (bool[] memory)',
  'function setSkillRule(string skillName, uint256 minRating, bool isActive) external',
  'function getSkillRules(string skillName) external view returns ((string skillName, uint256 minRating, bool isActive))',
  'function calculateDecayedRating(uint256 initialRating, uint256 timestamp) external view returns (uint256)',
  'function pause() external',
  'function unpause() external',
  'function paused() external view returns (bool)',
  'error Unauthorized()',
  'error AgentNotFound()',
  'error ProviderNotActive()',
  'error SkillRuleNotFound()',
]);
 
 
// === V5 Events (for useWatchContractEvents) ===
export const AGENTIC_COMMERCE_EVENTS = parseAbi([
  'event JobCreated(uint256 indexed jobId, address indexed client, address indexed provider, address evaluator, uint256 serviceId, uint256 expiredAt)',
  'event OpenJobCreated(uint256 indexed jobId, address indexed client, uint256 maxBudget, address evaluator, uint256 expiredAt)',
  'event ProviderSet(uint256 indexed jobId, address indexed provider)',
  'event BudgetSet(uint256 indexed jobId, uint256 amount)',
  'event JobFunded(uint256 indexed jobId, address indexed client, uint256 amount)',
  'event JobSubmitted(uint256 indexed jobId, address indexed provider, bytes32 deliverable)',
  'event JobCompleted(uint256 indexed jobId, address indexed evaluator, bytes32 reason)',
  'event JobRejected(uint256 indexed jobId, address indexed rejector, bytes32 reason)',
  'event JobExpired(uint256 indexed jobId)',
  'event PaymentReleased(uint256 indexed jobId, address indexed provider, uint256 amount)',
  'event Refunded(uint256 indexed jobId, address indexed client, uint256 amount)',
  'event JobStatusChanged(uint256 indexed jobId, uint8 indexed oldStatus, uint8 indexed newStatus, uint256 timestamp)',
  'event JobUpdated(uint256 indexed jobId, bytes32 indexed updateType, uint256 timestamp)',
  'event JobLimitExceeded(address indexed client, uint256 attemptedCount, uint256 maxAllowed)',
  'event DisputeWindowSet(uint256 indexed jobId, uint256 window)',
  'event NonResponsiveSlashSet(uint256 indexed jobId, uint256 slashBP)',
  'event EvaluatorSlashedForInactivity(uint256 indexed jobId, address indexed evaluator, uint256 slashAmount)',
  'event BidCommitted(uint256 indexed jobId, address indexed bidder, uint256 stakeAmount, bytes32 commitHash)',
  'event BidRevealed(uint256 indexed jobId, address indexed bidder, uint256 proposedAmount, string message)',
  'event BidAccepted(uint256 indexed jobId, address indexed bidder, uint256 bidId, uint256 acceptedAmount)',
  'event StakesReturned(uint256 indexed jobId, address indexed recipient, uint256 amount)',
]);


export const AGENTIC_COMMERCE_ABI = parseAbi([
  'function FEE_DENOMINATOR() external view returns (uint256)',
  'function EVALUATOR_FEE_BP() external view returns (uint256)',
  'function MIN_EXPIRY_DURATION() external view returns (uint256)',
  'function MAX_EXPIRY_DURATION() external view returns (uint256)',
  'function MAX_JOBS_PER_CLIENT() external view returns (uint256)',
  'function MAX_DESCRIPTION_LENGTH() external view returns (uint256)',
  'function MIN_BUDGET() external view returns (uint256)',
  'function MAX_BUDGET() external view returns (uint256)',
  'function MIN_ETH_PAYMENT() external view returns (uint256)',
  'function DEFAULT_DISPUTE_WINDOW() external view returns (uint256)',
  'function jobCounter() external view returns (uint256)',
  'function initialize(address treasury_) external',
  'function createJob(address provider, address evaluator, uint256 expiredAt, string description, address hook, bool evaluatorFee) external returns (uint256 jobId)',
  'function createJobFromService(uint256 serviceId, address evaluator, uint256 expiredAt, string description, address hook, bool evaluatorFee) external returns (uint256 jobId)',
  'function createJobWithRandomEvaluator(address provider, uint256 expiredAt, string description, address hook, bool evaluatorFee) external returns (uint256 jobId)',
  // V7: createJob with client review flag
  'function createJob(address provider, address evaluator, uint256 expiredAt, string description, address hook, bool evaluatorFee, bool clientReview) external returns (uint256 jobId)',
  'function createJobWithRandomEvaluator(address provider, uint256 expiredAt, string description, address hook, bool evaluatorFee, bool clientReview) external returns (uint256 jobId)',
  'function fund(uint256 jobId, uint256 expectedBudget) external payable',
  'function submit(uint256 jobId, bytes32 deliverable) external',
  'function complete(uint256 jobId, bytes32 reason) external',
  'function completeAfterTimeout(uint256 jobId, bytes32 reason) external',
  'function reject(uint256 jobId, bytes32 reason) external',
  'function claimRefund(uint256 jobId) external',
  'function refundExpired(uint256 jobId) external',
  'function getJob(uint256 jobId) external view returns ((uint256 id, address client, address provider, address evaluator, uint256 serviceId, address paymentToken, string description, uint256 budget, uint256 expiredAt, uint8 status, address hook, bytes32 deliverable))',
  'function getClientJobCount(address client) external view returns (uint256)',
  'function registerAsEvaluator() external',
  'function unregisterAsEvaluator() external',
  'function getEvaluatorPoolSize() external view returns (uint256)',
  'function isEvaluator(address account) external view returns (bool)',
  'function pause() external',
  'function unpause() external',
  'function paused() external view returns (bool)',
  // V7: Client Review Flow
  'function approveByClient(uint256 jobId) external',
  'function finalizeByEvaluator(uint256 jobId, bytes32 reason) external',
  'function hasClientApproved(uint256 jobId) external view returns (bool)',
  'function isClientReviewRequired(uint256 jobId) external view returns (bool)',
]);

export const AGENT_REVIEW_ABI = parseAbi([
  'function createProposal(string title, string description, string criteriaURI, uint256 reward, uint256 decisionDeadline) external payable returns (uint256 proposalId)',
  'function getProposal(uint256 proposalId) external view returns ((uint256 id, address proposer, string title, string description, string criteriaURI, uint256 reward, uint8 status, uint256 createdAt, uint256 decisionDeadline, address winningEvaluator))',
  'function submitEvaluation(uint256 proposalId, int256 confidenceScore, string reasoningURI) external payable',
  'function attestDecision(uint256 proposalId, address winningEvaluator) external',
  'function getProposalEvaluations(uint256 proposalId) external view returns (address[] memory)',
  'function getEvaluation(uint256 proposalId, address evaluator) external view returns ((uint256 proposalId, address evaluator, int256 confidenceScore, string reasoningURI, uint256 stakeAmount, bool isFinal, uint256 submittedAt))',
  'function getProposalCount() external view returns (uint256)',
  'function claimReward(uint256 proposalId) external',
  'function releaseStake(uint256 proposalId) external',
  'function cancelProposal(uint256 proposalId) external',
  'function slashEvaluator(address evaluator, uint256 proposalId, string reason) external',
  'function getEvaluatorCount(uint256 proposalId) external view returns (uint256)',
  'function finalizeDecision(uint256 proposalId) external',
  'function calculateMedianScore(uint256 proposalId) external view returns (int256)',
  'function slashTreasury() external view returns (address)',
]);

export const AGENT_SKILL_REGISTRY_ABI = parseAbi([
  'function registerSkill(uint256 agentId, string name, string version, string description, string endpoint, string[] domains) external returns (uint256 skillId)',
  'function getAgentSkills(uint256 agentId) external view returns (uint256[] memory)',
  'function getSkill(uint256 skillId) external view returns ((uint256 agentId, string name, string version, string description, string endpoint, string[] domains, bool isActive, address registeredBy, uint256 registeredAt))',
  'function getSkillData(uint256 skillId) external view returns ((uint256 agentId, string name, string version, string description, string endpoint, string[] domains, bool isActive, address registeredBy, uint256 registeredAt))',
  'function updateSkill(uint256 skillId, string name, string version, string description, string endpoint, string[] domains) external',
  'function deactivateSkill(uint256 skillId) external',
  'function findSkillsByDomain(string domain) external view returns (uint256[] memory)',
]);


// ERC-8004 Reputation Registry ABI
export const ERC8004_REPUTATION_ABI = parseAbi([
  'function getAgentReputation(address agent) external view returns (int256 average, uint256 total, uint256 providers)',
  'function getFeedbackCount(address agent) external view returns (uint256)',
  'function getFeedbackDetails(uint256 feedbackId) external view returns ((address agent, uint256 taskId, int256 rating, string metadataURI, uint256 timestamp))',
  'function submitFeedback(address agent, uint256 taskId, int256 rating, string metadataURI) external returns (uint256)',
]);


// Price Oracle ABI
export const PRICE_ORACLE_ABI = parseAbi([
  'function getUSDCPrice() external view returns (int256)',
  'function getETHRate() external view returns (int256)',
  'function isStale() external view returns (bool)',
  'function getUsdPriceOfToken(address token) external view returns (int256)',
]);


// ERC20 Token ABI (for USDC)
export const ERC20_ABI = parseAbi([
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function name() external view returns (string)',
]);


// Commit Reveal ABI
export const COMMIT_REVEAL_ABI = parseAbi([
  'function commit(bytes32 commitmentHash) external',
  'function reveal(string data, uint256 nonce, uint256 serviceId) external',
  'function cancel(bytes32 commitmentHash) external',
  'function getCommitment(address user, bytes32 commitmentHash) external view returns ((uint256 blockNumber, bool exists))',
  'function isCommitmentValid(bytes32 commitmentHash) external view returns (bool)',
  'function REVEAL_DELAY() external view returns (uint256)',
]);


// Slash Manager ABI
export const SLASH_MANAGER_ABI = parseAbi([
  'function isSigner(address) external view returns (bool)',
  'function getSigners() external view returns (address[] memory)',
  'function requiredConfirmations() external view returns (uint256)',
  'function getProposal(bytes32) external view returns ((address evaluator, uint256 proposalId, uint256 amount, string reason, uint256 confirmations, uint256 execAfter, bool isExecuted))',
  'function createProposal(address evaluator, uint256 proposalId, uint256 amount, string reason) external returns (bytes32)',
  'function confirmProposal(bytes32 proposalId) external',
  'function executeProposal(bytes32 proposalId) external',
  'function cancelProposal(bytes32 proposalId) external',
  'function executionDelay() external view returns (uint256)',
  'function maxSlashAmount() external view returns (uint256)',
  'function owner() external view returns (address)',
]);


// Chainlink Aggregator ABI (for reading price feeds)
export const CHAINLINK_AGGREGATOR_ABI = parseAbi([
  'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() external view returns (uint8)',
  'function description() external view returns (string)',
]);


// =============================================================================
// BIDDING SYSTEM ABI (Phase 11)
// Standalone commit-reveal bidding contract
// =============================================================================

export const BIDDING_SYSTEM_ABI = parseAbi([
  'function SessionStatus() external view returns (uint8 Active, uint8 BiddingClosed, uint8 WinnerSelected, uint8 JobCreated, uint8 Completed, uint8 Cancelled)',
  'function owner() external view returns (address)',
  'function commerce() external view returns (address)',
  'function treasury() external view returns (address)',
  'function revealWindow() external view returns (uint256)',
  'function platformFeeBP() external view returns (uint256)',
  'function sessionCounter() external view returns (uint256)',
  'function getSession(uint256 sessionId) external view returns ((uint256 id, address creator, address evaluator, uint256 maxBudget, uint256 deadline, uint256 revealWindowEnd, bytes metadata, uint256 serviceId, uint256 jobId, address winner, uint256 winningBidId, bool jobCreated, uint8 status))',
  'function getBid(uint256 sessionId, uint256 bidId) external view returns ((uint256 bidId, address bidder, uint256 proposedAmount, uint256 stake, string message, bytes32 commitHash, bool revealed, bool accepted, bool stakeWithdrawn, uint256 timestamp))',
  'function getUserBid(uint256 sessionId, address user) external view returns ((uint256 bidId, address bidder, uint256 proposedAmount, uint256 stake, string message, bytes32 commitHash, bool revealed, bool accepted, bool stakeWithdrawn, uint256 timestamp))',
  'function getSessionCount(uint256 sessionId) external view returns (uint256)',
  'function calculateStake(uint256 maxBudget) external pure returns (uint256)',
  'function createBiddingSession(address evaluator, uint256 maxBudget, uint256 deadline, bytes metadata, uint256 serviceId) external payable returns (uint256 sessionId)',
  'function commitBid(uint256 sessionId, bytes32 commitHash) external payable',
  'function revealBid(uint256 sessionId, uint256 amount, string message, bytes32 salt) external',
  'function acceptBid(uint256 sessionId, uint256 bidId) external',
  'function rejectBid(uint256 sessionId, uint256 bidId, string reason) external',
  'function withdrawStake(uint256 sessionId) external',
  'function claimStake(uint256 sessionId) external',
  'function createJobAndFund(uint256 sessionId, uint256 jobExpiredAt, string description) external payable returns (uint256 jobId)',
  'function cancelSession(uint256 sessionId) external',
  'function extendRevealWindow(uint256 sessionId, uint256 additionalSeconds) external',
  'function setCommerce(address commerce_) external',
  'function setServiceRegistry(address registry_) external',
  'function setRevealWindow(uint256 window_) external',
  'function setMinStakeBP(uint256 basisPoints_) external',
  'function setPlatformFeeBP(uint256 basisPoints_) external',
  'function withdrawPlatformFees(address to, uint256 amount) external',
  'function upgradeTo(address newImplementation) external',
]);


// =============================================================================
// MILESTONE ESCROW ABI (Phase 24)
// Milestone-based payments and dispute resolution
// =============================================================================

export const MILESTONE_ESCROW_ABI = parseAbi([
  // Initialization
  'function initialize(address initialOwner, address _agenticCommerce) external',

  // Configuration
  'function setAgenticCommerce(address _agenticCommerce) external',
  'function agenticCommerce() external view returns (address)',
  'function owner() external view returns (address)',

  // Constants
  'function ARBITER_STAKE() external view returns (uint256)',
  'function ARBITER_FEE() external view returns (uint256)',
  'function SLASH_PERCENT() external view returns (uint256)',
  'function MAX_MILESTONES_PER_JOB() external view returns (uint256)',
  'function ARBITER_RESPONSE_WINDOW() external view returns (uint256)',

  // Milestone Management
  'function enableMilestones(uint256 jobId, address provider, address paymentToken, uint256 totalBudget) external',
  'function addMilestone(uint256 jobId, string description, uint256 amount, uint256 dueDate) external',
  'function completeMilestone(uint256 jobId, uint256 milestoneIndex, bytes32 proofHash) external',
  'function releaseMilestone(uint256 jobId, uint256 milestoneIndex) external',
  'function getJobMilestones(uint256 jobId) external view returns ((string description, uint256 amount, uint256 dueDate, bool completed, bool released, bytes32 proofHash)[] memory)',
  'function getMilestoneCount(uint256 jobId) external view returns (uint256)',
  'function jobMilestones(uint256) external view returns (address client, address provider, address paymentToken, uint256 totalBudget, bool usesMilestones)',

  // Arbiter System
  'function registerAsArbiter() external payable',
  'function unregisterAsArbiter() external',
  'function getArbiterStake(address arbiter) external view returns (uint256)',
  'function isArbiter(address account) external view returns (bool)',
  'function getArbiterCount() external view returns (uint256)',
  'function arbiterPool(uint256) external view returns (address)',
  'function arbiterStakes(address) external view returns (uint256)',
  'function isRegisteredArbiter(address) external view returns (bool)',

  // Dispute System
  'function flagDispute(uint256 jobId) external payable',
  'function submitEvidence(uint256 jobId, bytes32 evidenceHash) external',
  'function resolveDispute(uint256 jobId, bool releaseToProvider) external',
  'function getDispute(uint256 jobId) external view returns (uint256 jobId, address flaggler, address arbiter, uint256 flaggedAt, bool resolved, bool releaseToProvider)',
  'function getActiveDisputes() external view returns (uint256[] memory)',
  'function disputes(uint256) external view returns (uint256 jobId, address flaggler, address arbiter, uint256 flaggedAt, bool resolved, bool releaseToProvider)',

  // Upgradeable
  'function upgradeTo(address newImplementation) external',
]);

// MilestoneEscrow Events
export const MILESTONE_ESCROW_EVENTS = parseAbi([
  'event MilestoneEnabled(uint256 indexed jobId)',
  'event MilestoneAdded(uint256 indexed jobId, uint256 indexed milestoneIndex, string description, uint256 amount)',
  'event MilestoneCompleted(uint256 indexed jobId, uint256 indexed milestoneIndex, bytes32 proofHash)',
  'event MilestoneReleased(uint256 indexed jobId, uint256 indexed milestoneIndex, uint256 amount)',
  'event MilestoneAutoReleased(uint256 indexed jobId, uint256 indexed milestoneIndex, uint256 amount)',
  'event ArbiterRegistered(address indexed arbiter, uint256 stake)',
  'event ArbiterUnregistered(address indexed arbiter, uint256 refundedStake)',
  'event DisputeFlagged(uint256 indexed jobId, address indexed flaggler, uint256 fee)',
  'event EvidenceSubmitted(uint256 indexed jobId, address indexed submitter, bytes32 evidenceHash)',
  'event DisputeResolved(uint256 indexed jobId, bool releasedToProvider, address indexed arbiter, uint256 arbiterFee)',
  'event ArbiterSlashed(address indexed arbiter, uint256 slashedAmount, string reason)',
  'event ArbiterAssigned(uint256 indexed jobId, address indexed arbiter)',
  'event AgenticCommerceSet(address indexed oldAddress, address indexed newAddress)',
]);

