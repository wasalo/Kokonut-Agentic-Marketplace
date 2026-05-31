import { parseAbi } from "viem";
 

export const SERVICE_REGISTRY_ABI = parseAbi([
  'function createService(uint256 agentId, string name, string description, string metadataURI, uint256 price, address paymentToken) external payable returns (uint256 serviceId)',
  'function createService(uint256 agentId, string name, string description, string metadataURI, uint256 price, address paymentToken, address paymentAddress) external payable returns (uint256 serviceId)',
  'function updateService(uint256 serviceId, string name, string description, string metadataURI, uint256 price) external',
  'function deactivateService(uint256 serviceId) external',
  'function activateService(uint256 serviceId) external',
  'function setPaymentAddress(uint256 serviceId, address paymentAddress) external',
  'function getService(uint256 serviceId) external view returns ((uint256 id, address provider, address paymentAddress, uint256 agentId, string name, string description, string metadataURI, uint256 price, address paymentToken, bool isActive, uint256 createdAt))',
  'function getServices(uint256 start, uint256 count) external view returns (uint256[] memory)',
  'function getActiveServiceCount() external view returns (uint256)',
  'function getProviderServices(address provider) external view returns (uint256[] memory)',
  'function getServicesByAgent(uint256 agentId) external view returns (uint256[] memory)',
  'function getServiceCounter() external view returns (uint256)',
  'function withdrawServiceBond(uint256 serviceId) external',
  'function getServiceBond(uint256 serviceId) external view returns (uint256)',
  'function deactivatedAt(uint256 serviceId) external view returns (uint256)',
]);
 

export const ADMIN_REGISTRY_ABI = parseAbi([
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
  'event JobCreated(uint256 indexed jobId, address indexed client, address provider, uint256 budget, uint256 expiredAt, bool evaluatorFee, bool clientReview, bool randomEvaluator)',
  'event BudgetSet(uint256 indexed jobId, uint256 amount)',
  'event JobFunded(uint256 indexed jobId, address indexed client, uint256 amount)',
  'event JobSubmitted(uint256 indexed jobId, address indexed provider, bytes32 deliverable)',
  'event JobCompleted(uint256 indexed jobId, address indexed by, address indexed provider, uint256 evaluatorFee)',
  'event JobRejected(uint256 indexed jobId, address indexed rejector, bytes32 reason)',
  'event JobExpired(uint256 indexed jobId)',
  'event PaymentReleased(uint256 indexed jobId, uint256 providerAmount, uint256 platformFee, uint256 evaluatorFee)',
  'event Refunded(uint256 indexed jobId, address indexed client, uint256 amount)',
  'event PermissionlessRefund(uint256 indexed jobId, address indexed client, address indexed caller, uint256 amount)',
  'event JobStatusChanged(uint256 indexed jobId, uint8 oldStatus, uint8 newStatus, address changedBy, uint256 timestamp)',
  'event JobLimitExceeded(address indexed client, uint256 attemptedCount, uint256 maxAllowed)',
  'event DisputeWindowSet(uint256 indexed jobId, uint256 window)',
  'event NonResponsiveSlashSet(uint256 indexed jobId, uint256 slashBP)',
  'event EvaluatorSlashedForInactivity(uint256 indexed jobId, address indexed evaluator, uint256 slashAmount)',
  'event StaleEvaluatorsCleaned(uint256 removedCount)',
  'event EvaluatorSlashed(address indexed evaluator, uint256 stake, string reason)',
  'event PlatformTreasurySet(address indexed oldTreasury, address indexed newTreasury)',
  'event AdminRegistrySet(address indexed oldRegistry, address indexed newRegistry)',
  'event PriceOracleSet(address indexed oldOracle, address indexed newOracle)',
  'event MaxBudgetChanged(uint256 oldMax, uint256 newMax)',
]);


export const AGENTIC_COMMERCE_ABI = parseAbi([
  'function FEE_DENOMINATOR() external view returns (uint256)',
  'function EVALUATOR_FEE_BP() external view returns (uint256)',
  'function MIN_EXPIRY_DURATION() external view returns (uint256)',
  'function MAX_EXPIRY_DURATION() external view returns (uint256)',
  'function MAX_JOBS_PER_CLIENT() external view returns (uint256)',
  'function MAX_DESCRIPTION_LENGTH() external view returns (uint256)',
  'function MIN_BUDGET() external view returns (uint256)',
  'function MAX_BUDGET_USD() external view returns (uint256)',
  'function MIN_ETH_PAYMENT() external view returns (uint256)',
  'function maxBudgetUsd() external view returns (uint256)',
  'function DEFAULT_DISPUTE_WINDOW() external view returns (uint256)',
  'function jobCounter() external view returns (uint256)',
  'function initialize(address treasury_) external',
  // V7: createJob with client review flag (6 params)
  'function createJobWithRandomEvaluator(address provider, uint256 expiredAt, string description, address hook, bool evaluatorFee, bool clientReview) external returns (uint256 jobId)',
  // V8: createJob with budget, paymentToken, serviceId, and optional immediate funding
  'function createJob(address provider, uint256 budget, address paymentToken, uint256 serviceId, uint256 expiredAt, string description, address evaluator, address hook, bool evaluatorFee, bool clientReview, bool fundNow, uint256 fundAmount) external payable returns (uint256 jobId)',
  // V8: createJobV7 for backward compatibility
  'function createJobV7(address provider, address evaluator, uint256 expiredAt, string description, address hook, bool evaluatorFee, bool clientReview) external returns (uint256 jobId)',
  'function fund(uint256 jobId, uint256 expectedBudget) external payable',
  'function submit(uint256 jobId, bytes32 deliverable) external',
  'function completeAfterTimeout(uint256 jobId, bytes32 reason) external',
  'function reject(uint256 jobId, bytes32 reason) external',
  'function claimRefund(uint256 jobId) external',
  'function refundExpired(uint256 jobId) external',
  'function setBudget(uint256 jobId, uint256 amount) external',
  'function setPaymentToken(uint256 jobId, address paymentToken) external',
  'function setDisputeWindow(uint256 jobId, uint256 window) external',
  'function setNonResponsiveSlashBP(uint256 jobId, uint256 slashBP) external',
  'function jobs(uint256) external view returns (uint256 id, address client, address provider, address evaluator, uint256 serviceId, address paymentToken, string description, uint256 budget, uint256 expiredAt, uint8 status, address hook, bytes32 deliverable)',
  'function getClientJobCount(address client) external view returns (uint256)',
  'function registerAsEvaluator() external payable',
  'function unregisterAsEvaluator() external',
  'function slashEvaluatorStake(address evaluator, string calldata reason) external',
  'function cleanupStaleEvaluators(uint256 maxIterations) external returns (uint256 removedCount)',
  'function finalizeRandomEvaluator(uint256 jobId) external',
  'function getEvaluatorPoolSize() external view returns (uint256)',
  'function evaluatorStakes(address evaluator) external view returns (uint256)',
  'function evaluatorCommits(uint256 jobId) external view returns (bytes32 commitHash, uint256 commitBlock, bool revealed)',
  'function jobCreationBlock(uint256 jobId) external view returns (uint256)',
  'function isRegisteredEvaluator(address) external view returns (bool)',
  'function pause() external',
  'function unpause() external',
  'function paused() external view returns (bool)',
  // V7: Client Review Flow
  'function approveByClient(uint256 jobId) external',
  'function finalizeByEvaluator(uint256 jobId, bytes32 reason) external',
  'function hasClientApproved(uint256 jobId) external view returns (bool)',
  'function isClientReviewRequired(uint256 jobId) external view returns (bool)',
  // V9: Multi-token minimum budget
  'function minBudgetUsd() external view returns (uint256)',
  'function minBudgetOverride(address token) external view returns (uint256)',
  'function isStablecoin(address token) external view returns (bool)',
  'function getMinBudget(address token, uint8 decimals) external view returns (uint256)',
  'function setMinBudgetUsd(uint256 newMin) external',
  'function setMaxBudgetUsd(uint256 newMax) external',
  'function setMinBudgetOverride(address token, uint256 minAmount) external',
  'function setStablecoin(address token, bool isStable) external',
  'function setPriceOracle(address _priceOracle) external',
  'function priceOracle() external view returns (address)',
  'function setAllowedToken(address token, bool allowed) external',
  'function allowedTokens(address token) external view returns (bool)',
  'function owner() external view returns (address)',
  'function platformTreasury() external view returns (address)',
  'function setPlatformTreasury(address _treasury) external',
  'function adminRegistry() external view returns (address)',
  'function setAdminRegistry(address _registry) external',
  'function minEvaluatorStake() external view returns (uint256)',
  'function setMinEvaluatorStake(uint256 newStake) external',
  'function authorizedJobCreators(address creator) external view returns (bool)',
  'function setAuthorizedJobCreator(address creator, bool authorized) external',
  'function serviceRegistry() external view returns (address)',
  'function setServiceRegistry(address _serviceRegistry) external',
  'function createJobForClient(address client, address provider, uint256 budget, address paymentToken, uint256 serviceId, uint256 expiredAt, string description, address evaluator, address hook, bool evaluatorFee, bool clientReview, bool fundNow, uint256 fundAmount) external payable returns (uint256 jobId)',
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


// Price Oracle ABI
export const PRICE_ORACLE_ABI = parseAbi([
  'function getUsdPriceOfToken(address token) external view returns (int256)',
  'function getTokenAmountForUsd(uint256 usdAmount, address token) external view returns (uint256)',
  'function isStale(address token) external view returns (bool)',
  'function priceFeeds(address token) external view returns (address)',
  'function feedDecimals(address token) external view returns (uint8)',
  'function isStablecoin(address token) external view returns (bool)',
  'function ethPriceFeed() external view returns (address)',
  'function ethFeedDecimals() external view returns (uint8)',
  'function setPriceFeed(address token, address feed, uint8 decimals) external',
  'function removePriceFeed(address token) external',
  'function setStablecoin(address token, bool isStable) external',
  'function setEthPriceFeed(address feed, uint8 decimals) external',
  // Events
  'event PriceUpdated(address indexed token, int256 price, uint256 timestamp)',
  'event PriceFeedRegistered(address indexed token, address indexed feed, uint8 decimals)',
  'event PriceFeedRemoved(address indexed token)',
  'event StablecoinStatusChanged(address indexed token, bool isStable)',
  'event FallbackPriceUsed(address indexed token, int256 price)',
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
  'function getCommitment(address user, bytes32 commitmentHash) external view returns ((bytes32 commitmentHash, address user, uint256 commitBlock, uint256 serviceId, bool revealed, bool executed, bool cancelled))',
  'function isCommitmentValid(bytes32 commitmentHash) external view returns (bool)',
  'function REVEAL_DELAY() external view returns (uint256)',
]);


// Slash Manager ABI
export const SLASH_MANAGER_ABI = parseAbi([
  'function isSigner(address) external view returns (bool)',
  'function getSigners() external view returns (address[] memory)',
  'function requiredConfirmations() external view returns (uint256)',
  'function getProposal(bytes32) external view returns ((address evaluator, uint256 proposalId, uint256 amount, string reason, uint256 createdAt, uint256 executeAfter, uint256 confirmations, bool executed))',
  'function createProposal(address evaluator, uint256 proposalId, uint256 amount, string reason) external returns (bytes32)',
  'function confirmProposal(bytes32 proposalId) external',
  'function executeSlash(bytes32 proposalId) external',
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
  'function owner() external view returns (address)',
  'function commerce() external view returns (address)',
  'function treasury() external view returns (address)',
  'function revealWindow() external view returns (uint256)',
  'function platformFeeBP() external view returns (uint256)',
  'function sessionCounter() external view returns (uint256)',
  'function getSession(uint256 sessionId) external view returns ((uint256 id, address creator, address evaluator, uint256 maxBudget, uint256 deadline, uint256 revealWindowEnd, bytes metadata, uint256 serviceId, uint256 jobId, address winner, uint256 winningBidId, bool jobCreated, uint8 status, bool useRandomEvaluator, address paymentToken))',
  'function getBid(uint256 sessionId, uint256 bidId) external view returns ((uint256 bidId, address bidder, uint256 proposedAmount, uint256 stake, string message, bytes32 commitHash, bool revealed, bool accepted, bool rejected, bool stakeWithdrawn, uint256 timestamp))',
  'function getUserBid(uint256 sessionId, address user) external view returns ((uint256 bidId, address bidder, uint256 proposedAmount, uint256 stake, string message, bytes32 commitHash, bool revealed, bool accepted, bool rejected, bool stakeWithdrawn, uint256 timestamp))',
  'function getRevealedBids(uint256 sessionId) external view returns ((uint256 bidId, address bidder, uint256 proposedAmount, uint256 stake, string message, bytes32 commitHash, bool revealed, bool accepted, bool rejected, bool stakeWithdrawn, uint256 timestamp)[] memory)',
  'function getSessionCount() external view returns (uint256)',
  'function calculateStake(uint256 maxBudget) external pure returns (uint256)',
  'function createBiddingSession(address evaluator, uint256 maxBudget, uint256 deadline, bytes metadata, uint256 serviceId, address paymentToken) external payable returns (uint256 sessionId)',
  'function commitBid(uint256 sessionId, bytes32 commitHash) external payable',
  'function revealBid(uint256 sessionId, uint256 amount, string message, bytes32 salt) external',
  'function acceptBid(uint256 sessionId, uint256 bidId) external',
  'function rejectBid(uint256 sessionId, uint256 bidId, string reason) external',
  'function withdrawCreatorStake(uint256 sessionId) external',
  'function withdrawStake(uint256 sessionId) external',

  'function completeSession(uint256 sessionId) external',
  'function createJobAndFund(uint256 sessionId, uint256 jobExpiredAt, string description) external payable returns (uint256 jobId)',
  'function cancelSession(uint256 sessionId) external',
  'function extendRevealWindow(uint256 sessionId, uint256 additionalSeconds) external',
  'function setCommerce(address commerce_) external',
  'function setRevealWindow(uint256 window_) external',
  'function setPlatformFeeBP(uint256 basisPoints_) external',
  'function setAdminRegistry(address) external',
  'function setTreasury(address) external',
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
  'function setArbiterFee(address token, uint256 fee) external',
  'function setArbiterStake(address token, uint256 stake) external',
  'function setSupportedToken(address token, bool supported) external',

  // Constants
  'function SLASH_PERCENT() external view returns (uint256)',
  'function MAX_MILESTONES_PER_JOB() external view returns (uint256)',
  'function ARBITER_RESPONSE_WINDOW() external view returns (uint256)',

  // Milestone Management
  'function enableMilestones(uint256 jobId, address client, address provider, address paymentToken, uint256 totalBudget) external',
  'function addMilestone(uint256 jobId, uint256 amount, string description, uint256 dueDate) external',
  'function fundMilestones(uint256 jobId, uint256 amount) external payable',
  'function submitMilestone(uint256 jobId, uint256 milestoneIndex, bytes32 proofHash) external',
  'function releaseMilestone(uint256 jobId, uint256 milestoneIndex) external',
  'function getJobMilestones(uint256 jobId) external view returns ((string description, uint256 amount, uint256 dueDate, bool completed, bool released, bytes32 proofHash)[] memory)',
  'function jobMilestones(uint256) external view returns (address client, address provider, address paymentToken, uint256 totalBudget, bool usesMilestones)',
  'function milestoneEscrowBalance(uint256 jobId) external view returns (uint256)',
  'function milestoneTotalAmount(uint256) external view returns (uint256)',

  // Arbiter System (V2: token staking, address(0) for native)
  'function registerAsArbiter(address token, uint256 amount) external payable',
  'function unregisterAsArbiter() external',
  'function getArbiterStake(address arbiter) external view returns (uint256)',
  'function getArbiterStakeToken(address arbiter) external view returns (address)',
  'function getArbiters() external view returns (address[] memory)',
  'function arbiterPool(uint256) external view returns (address)',
  'function arbiterStakes(address) external view returns (uint256)',
  'function isRegisteredArbiter(address) external view returns (bool)',
  'function slashArbiter(address arbiter, string calldata reason) external',
  'function withdrawToken(address token, uint256 amount) external',

  // Dispute System (V2: payment-token fee, address(0) for native)
  'function flagDispute(uint256 jobId, uint256 milestoneIndex) external payable',
  'function submitEvidence(uint256 jobId, bytes32 evidenceHash) external',
  'function resolveDispute(uint256 jobId, bool releaseToProvider) external',
  'function getDispute(uint256 jobId) external view returns (uint256 jobId, address flagger, address arbiter, uint256 flaggedAt, bool resolved, bool releaseToProvider, uint256 feePaid, uint256 milestoneIndex)',
  'function getActiveDisputes() external view returns (uint256[] memory)',
  'function disputes(uint256) external view returns (uint256 jobId, address flagger, address arbiter, uint256 flaggedAt, bool resolved, bool releaseToProvider, uint256 feePaid, uint256 milestoneIndex)',

  // Upgradeable
  'function upgradeTo(address newImplementation) external',
]);

// AdminRegistry - Bad Actor Blacklist
// =============================================================================

export const ADMIN_REGISTRY_BLACKLIST_ABI = parseAbi([
  // Blacklist functions
  'function blacklistAgent(uint256 agentId, string calldata reason) external',
  'function unblacklistAgent(uint256 agentId) external',
  'function blacklistWallet(address wallet, string calldata reason) external',
  'function unblacklistWallet(address wallet) external',
  'function isAgentBlacklistedActive(uint256 agentId) external view returns (bool)',
  'function isWalletBlacklistedActive(address wallet) external view returns (bool)',
  'function getAgentBlacklistEntry(uint256 agentId) external view returns ((bool isBlacklisted, uint256 blacklistedAt, uint256 activationAt, string reason, address blacklistedBy, bool autoSlashed))',
  'function getWalletBlacklistEntry(address wallet) external view returns ((bool isBlacklisted, uint256 blacklistedAt, uint256 activationAt, string reason, address blacklistedBy, bool autoSlashed))',
  'function getAllBlacklistedAgents() external view returns (uint256[])',
  'function getAllBlacklistedWallets() external view returns (address[])',
  'function getBlacklistedAgentCount() external view returns (uint256)',
  'function getBlacklistedWalletCount() external view returns (uint256)',
  'function blacklistedAgents(uint256) external view returns (bool isBlacklisted, uint256 blacklistedAt, uint256 activationAt, string reason, address blacklistedBy, bool autoSlashed)',
  'function blacklistedWallets(address) external view returns (bool isBlacklisted, uint256 blacklistedAt, uint256 activationAt, string reason, address blacklistedBy, bool autoSlashed)',

  // VULN-01: SlashManager access control
  'function setSlashManager(address _slashManager) external',
  'function slashManager() external view returns (address)',
  'function agentBlacklistIndex(uint256 agentId) external view returns (uint256)',
  'function slashAndBlacklistAgent(uint256 agentId, string calldata reason) external',

  // Existing functions
  'function setHalfLifeDays(uint256 _halfLifeDays) external',
  'function setFeaturedAgent(uint256 agentId, bool isFeatured) external',
  'function setVerificationProvider(string provider, bool isActive) external',
  'function pause() external',
  'function unpause() external',
  'function owner() external view returns (address)',

  'error NotSlashManager()',
]);
