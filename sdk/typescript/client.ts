/**
 * Kokonut Agent SDK - Main Client
 * Type-safe client for interacting with the Kokonut Agent Economy Stack
 */

import { createPublicClient, createWalletClient, http, custom, type Address, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { EFPModule } from './efp';
import { SubgraphModule } from './subgraph';
import type {
  SDKConfig,
  NetworkName,
  ContractAddresses,
  AgentRegistrationParams,
  FeedbackParams,
  ReputationData,
  ServiceParams,
  Service,
  JobParams,
  Job,
  JobStatus,
  OpenJobParams,
  Bid,
  BidStatus,
  CommitBidParams,
  RevealBidParams,
  ProposalParams,
  ProposalStatus,
  EvaluationParams,
  Proposal,
  Evaluation,
  AgentMetadata,
  SDKEventName,
  SDKEventHandler,
  SDKEventMap,
  TransactionResult,
} from './types';
import { NETWORKS } from './types';

// ============================================================================
// Network Configurations (imported from types)
// ============================================================================

// ============================================================================
// ABIs (Minimal for SDK operations)
// ============================================================================

const IDENTITY_REGISTRY_ABI = parseAbi([
  'function register(string agentURI) external returns (uint256 agentId)',
  'function getAgent(uint256 agentId) external view returns (address owner, string memory agentURI, address agentWallet, bool isActive)',
  'function isAgent(address agentAddress) external view returns (bool)',
  'function getCurrentAgentId() external view returns (uint256)',
  'function setAgentURI(uint256 agentId, string calldata newURI) external',
  'function getMetadata(uint256 agentId, string calldata metadataKey) external view returns (bytes memory)',
  'function setMetadata(uint256 agentId, string calldata metadataKey, bytes calldata metadataValue) external',
  'function getAgentWallet(uint256 agentId) external view returns (address)',
  'function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes calldata signature) external',
  'function unsetAgentWallet(uint256 agentId) external',
  'event Registered(uint256 indexed agentId, string agentURI, address indexed owner)',
  'event AgentURIUpdated(uint256 indexed agentId, string newURI)',
  'event MetadataUpdated(uint256 indexed agentId, string key)',
  'event AgentWalletUpdated(uint256 indexed agentId, address indexed oldWallet, address indexed newWallet)',
] as const);

const LEGACY_REPUTATION_ABI = parseAbi([
  'function submitFeedback(address agent, uint256 taskId, int256 rating, string calldata metadataURI) external returns (uint256)',
  'function getAgentReputation(address agent) external view returns (int256 average, uint256 total, uint256 providers)',
] as const);

const SERVICE_REGISTRY_ABI = parseAbi([
  'function createService(uint256 agentId, string calldata name, string calldata description, string calldata metadataURI, uint256 price, address paymentToken) external returns (uint256 serviceId)',
  'function updateService(uint256 serviceId, string calldata name, string calldata description, string calldata metadataURI, uint256 price) external',
  'function deactivateService(uint256 serviceId) external',
  'function activateService(uint256 serviceId) external',
  'function getService(uint256 serviceId) external view returns ((uint256 id, address provider, uint256 agentId, string name, string description, string metadataURI, uint256 price, address paymentToken, bool isActive, uint256 createdAt))',
  'function getServices(uint256 start, uint256 count) external view returns (uint256[] memory)',
  'function getActiveServiceCount() external view returns (uint256)',
  'function getProviderServices(address provider) external view returns (uint256[] memory)',
  'function getServicesByAgent(uint256 agentId) external view returns (uint256[] memory)',
  'function getServiceCounter() external view returns (uint256)',
  'event ServiceCreated(uint256 indexed serviceId, address indexed provider, uint256 indexed agentId, string name, uint256 price)',
  'event ServiceUpdated(uint256 indexed serviceId)',
  'event ServiceDeactivated(uint256 indexed serviceId)',
  'event ServiceActivated(uint256 indexed serviceId)',
] as const);

const AGENTIC_COMMERCE_ABI = parseAbi([
  // V9 Functions
  'function createJob(address provider, uint256 budget, address paymentToken, uint256 serviceId, uint256 expiredAt, string calldata description, address evaluator, address hook, bool evaluatorFee, bool clientReview_, bool fundNow, uint256 fundAmount) external payable returns (uint256 jobId)',
  'function createJobV7(address provider, address evaluator, uint256 expiredAt, string calldata description, address hook, bool evaluatorFee, bool clientReview) external returns (uint256 jobId)',
  'function createJobWithRandomEvaluator(address provider, uint256 expiredAt, string calldata description, address hook, bool evaluatorFee, bool clientReview) external returns (uint256 jobId)',
  'function setBudget(uint256 jobId, uint256 amount) external',
  'function fund(uint256 jobId, uint256 expectedBudget) external payable',
  'function submit(uint256 jobId, bytes32 deliverable) external',
  'function complete(uint256 jobId, bytes32 reason) external',
  'function reject(uint256 jobId, bytes32 reason) external',
  'function claimRefund(uint256 jobId) external',
  'function refundExpired(uint256 jobId) external',
  'function completeAfterTimeout(uint256 jobId, bytes32 reason) external',
  'function setDisputeWindow(uint256 jobId, uint256 window) external',
  'function setNonResponsiveSlashBP(uint256 jobId, uint256 slashBP) external',
  'function approveByClient(uint256 jobId) external',
  'function finalizeByEvaluator(uint256 jobId, bytes32 reason) external',
  'function setPaymentToken(uint256 jobId, address paymentToken) external',
  // V9: Budget Limits
  'function getMinBudget(address token, uint8 decimals) external view returns (uint256)',
  'function setMinBudgetUsd(uint256 newMin) external',
  'function setMaxBudgetUsd(uint256 newMax) external',
  'function setMinBudgetOverride(address token, uint256 minAmount) external',
  'function setStablecoin(address token, bool isStable) external',
  'function setPriceOracle(address _priceOracle) external',
  'function maxBudgetUsd() external view returns (uint256)',
  // V9: Evaluator Pool
  'function registerAsEvaluator() external payable',
  'function unregisterAsEvaluator() external',
  'function cleanupStaleEvaluators() external returns (uint256 removedCount)',
  'function getEvaluatorPoolSize() external view returns (uint256)',
  'function finalizeRandomEvaluator(uint256 jobId, bytes32 salt) external',
  'function slashEvaluatorStake(address evaluator, string calldata reason) external',
  // View Functions
  'function getJob(uint256 jobId) external view returns ((uint256 id, address client, address provider, address evaluator, uint256 serviceId, address paymentToken, string description, uint256 budget, uint256 expiredAt, uint8 status, address hook, bytes32 deliverable))',
  'function jobCounter() external view returns (uint256)',
  'function getClientJobCount(address client) external view returns (uint256)',
  'function isEvaluatorFeeEnabled(uint256 jobId) external view returns (bool)',
  'function isEvaluator(address account) external view returns (bool)',
  'function evaluatorStakes(address evaluator) external view returns (uint256)',
  'function evaluatorCommits(uint256 jobId) external view returns (bytes32 commitHash, uint256 commitBlock, bool revealed)',
  'function jobCreationBlock(uint256 jobId) external view returns (uint256)',
  'function hasClientApproved(uint256 jobId) external view returns (bool)',
  'function isClientReviewRequired(uint256 jobId) external view returns (bool)',
  'function minBudgetUsd() external view returns (uint256)',
  'function minBudgetOverride(address token) external view returns (uint256)',
  'function isStablecoin(address token) external view returns (bool)',
  'function allowedTokens(address token) external view returns (bool)',
  'function priceOracle() external view returns (address)',
  'function paused() external view returns (bool)',
  // Admin Functions
  'function setPlatformTreasury(address treasury) external',
  'function setAdminRegistry(address _adminRegistry) external',
  'function setAllowedToken(address token, bool allowed) external',
  'function pause() external',
  'function unpause() external',
  // Events
  'event JobCreated(uint256 indexed jobId, address indexed client, address indexed provider, address evaluator, uint256 serviceId, uint256 expiredAt, bool evaluatorFee, bool clientReview, bool randomEvaluator)',
  'event BudgetSet(uint256 indexed jobId, uint256 amount)',
  'event JobFunded(uint256 indexed jobId, address indexed client, uint256 amount)',
  'event JobSubmitted(uint256 indexed jobId, address indexed provider, bytes32 deliverable)',
  'event JobCompleted(uint256 indexed jobId, address indexed by, address indexed provider, uint256 evaluatorFee)',
  'event PaymentReleased(uint256 indexed jobId, uint256 providerAmount, uint256 platformFee, uint256 evaluatorFee)',
  'event JobRejected(uint256 indexed jobId, address indexed rejector, bytes32 reason)',
  'event Refunded(uint256 indexed jobId, address indexed client, uint256 amount)',
  'event PermissionlessRefund(uint256 indexed jobId, address indexed client, address indexed caller, uint256 amount)',
  'event JobExpired(uint256 indexed jobId)',
  'event JobStatusChanged(uint256 indexed jobId, uint8 oldStatus, uint8 newStatus, address changedBy, uint256 timestamp)',
  'event DisputeWindowSet(uint256 indexed jobId, uint256 window)',
  'event NonResponsiveSlashSet(uint256 indexed jobId, uint256 slashBP)',
  'event EvaluatorSlashedForInactivity(uint256 indexed jobId, address indexed evaluator, uint256 slashAmount)',
  'event StaleEvaluatorsCleaned(uint256 removedCount)',
  'event EvaluatorSlashed(address indexed evaluator, uint256 stake, string reason)',
  'event PlatformTreasurySet(address indexed oldTreasury, address indexed newTreasury)',
  'event AdminRegistrySet(address indexed oldRegistry, address indexed newRegistry)',
  'event PriceOracleSet(address indexed oldOracle, address indexed newOracle)',
  'event MaxBudgetChanged(uint256 oldMax, uint256 newMax)',
] as const);

const AGENT_REVIEW_ABI = parseAbi([
  // V5 Functions (correct contract function names)
  'function createProposal(string calldata title, string calldata description, string calldata criteriaURI, uint256 reward, uint256 decisionDeadline) external payable returns (uint256 proposalId)',
  'function submitEvaluation(uint256 proposalId, int256 confidenceScore, string calldata reasoningURI) external payable',
  'function attestDecision(uint256 proposalId, address winningEvaluator) external',
  'function slashEvaluator(address evaluator, uint256 proposalId, string calldata reason) external',
  'function claimReward(uint256 proposalId) external',
  'function releaseStake(uint256 proposalId) external',
  'function cancelProposal(uint256 proposalId) external',
  'function getProposal(uint256 proposalId) external view returns ((uint256 id, address proposer, string title, string description, string criteriaURI, uint256 reward, uint8 status, uint256 createdAt, uint256 decisionDeadline, address winningEvaluator))',
  'function getEvaluation(uint256 proposalId, address evaluator) external view returns ((uint256 proposalId, address evaluator, int256 confidenceScore, string reasoningURI, uint256 stakeAmount, bool isFinal, bool rewardClaimed, bool stakeReleased, uint256 submittedAt, uint256 rewardAmount))',
  'function getProposalEvaluators(uint256 proposalId) external view returns (address[] memory)',
  'function getEvaluatorCount(uint256 proposalId) external view returns (uint256)',
  'function finalizeDecision(uint256 proposalId) external',
  'function calculateMedianScore(uint256 proposalId) external view returns (int256)',
  'function slashTreasury() external view returns (address)',
  // V5: Admin functions
  'function setSlashManager(address slashManager_) external',
  'function setAdminRegistry(address _adminRegistry) external',
  'function withdrawETH(address payable to, uint256 amount) external',
  'function getTotalLockedETH() external view returns (uint256 totalLocked)',
  // Events
  'event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title, uint256 reward)',
  'event EvaluationSubmitted(uint256 indexed proposalId, address indexed evaluator, int256 confidenceScore, uint256 stakeAmount)',
  'event DecisionAttested(uint256 indexed proposalId, address indexed attestor, address indexed winningEvaluator)',
  'event EvaluatorSlashed(address indexed evaluator, uint256 slashAmount, string reason)',
  'event RewardClaimed(uint256 indexed proposalId, address indexed evaluator, uint256 amount)',
  'event StakeReleased(uint256 indexed proposalId, address indexed evaluator, uint256 amount)',
  'event ProposalStatusChanged(uint256 indexed proposalId, uint8 indexed oldStatus, uint8 indexed newStatus, uint256 timestamp)',
  'event ProposalCancelledByProposer(uint256 indexed proposalId, address indexed proposer, uint256 refundAmount)',
  'event EvaluationFinalized(uint256 indexed proposalId, address indexed evaluator, bool isWinner)',
  'event SlashManagerSet(address indexed slashManager)',
  'event ETHWithdrawn(address indexed to, uint256 amount)',
] as const);

const USDC_ABI = parseAbi([
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
] as const);

const MILESTONE_ESCROW_ABI = parseAbi([
  // Initialization
  'function initialize(address initialOwner, address _agenticCommerce) external',
  // Configuration
  'function setAgenticCommerce(address _agenticCommerce) external',
  'function agenticCommerce() external view returns (address)',
  'function setArbiterFee(address token, uint256 fee) external',
  'function setArbiterStake(address token, uint256 stake) external',
  'function setSupportedToken(address token, bool supported) external',
  // Constants
  'function SLASH_PERCENT() external view returns (uint256)',
  'function MAX_MILESTONES_PER_JOB() external view returns (uint256)',
  'function ARBITER_RESPONSE_WINDOW() external view returns (uint256)',
  // Milestone Management
  'function enableMilestones(uint256 jobId, address client, address provider, address paymentToken, uint256 totalBudget) external',
  'function addMilestone(uint256 jobId, uint256 amount, string calldata description, uint256 dueDate) external',
  'function submitMilestone(uint256 jobId, uint256 milestoneIndex, bytes32 proofHash) external',
  'function releaseMilestone(uint256 jobId, uint256 milestoneIndex) external',
  'function getJobMilestones(uint256 jobId) external view returns ((string description, uint256 amount, uint256 dueDate, bool completed, bool released, bytes32 proofHash)[] memory)',
  'function getMilestoneCount(uint256 jobId) external view returns (uint256)',
  'function jobMilestones(uint256) external view returns (address client, address provider, address paymentToken, uint256 totalBudget, bool usesMilestones)',
  'function milestoneTotalAmount(uint256) external view returns (uint256)',
  // Arbiter System (V2: ERC20 staking)
  'function registerAsArbiter(address token, uint256 amount) external',
  'function unregisterAsArbiter() external',
  'function getArbiterStake(address arbiter) external view returns (uint256)',
  'function getArbiterStakeToken(address arbiter) external view returns (address)',
  'function getArbiters() external view returns (address[] memory)',
  'function arbiterPool(uint256) external view returns (address)',
  'function arbiterStakes(address) external view returns (uint256)',
  'function isRegisteredArbiter(address) external view returns (bool)',
  'function slashArbiter(address arbiter, string calldata reason) external',
  // Dispute System (V2: ERC20 fee)
  'function flagDispute(uint256 jobId, uint256 milestoneIndex) external',
  'function submitEvidence(uint256 jobId, bytes32 evidenceHash) external',
  'function resolveDispute(uint256 jobId, bool releaseToProvider) external',
  'function getDispute(uint256 jobId) external view returns (uint256 jobId, address flagger, address arbiter, uint256 flaggedAt, bool resolved, bool releaseToProvider, uint256 feePaid, uint256 milestoneIndex)',
  'function getActiveDisputes() external view returns (uint256[] memory)',
  // Events
  'event MilestoneEnabled(uint256 indexed jobId)',
  'event MilestoneAdded(uint256 indexed jobId, uint256 indexed milestoneIndex, string description, uint256 amount)',
  'event MilestoneCompleted(uint256 indexed jobId, uint256 indexed milestoneIndex, bytes32 proofHash)',
  'event MilestoneReleased(uint256 indexed jobId, uint256 indexed milestoneIndex, uint256 amount)',
  'event MilestoneNotReleased(uint256 indexed jobId, uint256 indexed milestoneIndex, string reason)',
  'event ArbiterRegistered(address indexed arbiter, address token, uint256 stake)',
  'event ArbiterUnregistered(address indexed arbiter, address token, uint256 refundedStake)',
  'event DisputeFlagged(uint256 indexed jobId, address indexed flagger, address token, uint256 fee)',
  'event EvidenceSubmitted(uint256 indexed jobId, address indexed submitter, bytes32 evidenceHash)',
  'event DisputeResolved(uint256 indexed jobId, bool releasedToProvider, address indexed arbiter, address token, uint256 arbiterFee)',
  'event ArbiterSlashed(address indexed arbiter, uint256 slashedAmount, string reason)',
  'event ArbiterAssigned(uint256 indexed jobId, address indexed arbiter)',
  'event AgenticCommerceSet(address indexed oldAddress, address indexed newAddress)',
  'event ArbiterFeeUpdated(address indexed token, uint256 newFee)',
  'event ArbiterStakeUpdated(address indexed token, uint256 newStake)',
  'event TokenSupportUpdated(address indexed token, bool supported)',
] as const);

// ============================================================================
// KokonutClient
// ============================================================================

export class KokonutClient {
  private wallet: any;
  private publicClient: any;
  private chain: any; // Keep as any if dynamic, or refine
  private network: NetworkName;
  private contracts: ContractAddresses;
  private eventHandlers: Map<SDKEventName, Set<SDKEventHandler>> = new Map();

  // Contract instances
  public identity: IdentityModule;
  public reputation: ReputationModule;
  public services: ServicesModule;
  public commerce: CommerceModule;
  public review: ReviewModule;
  public skills: SkillsModule;
  public priceOracle: PriceOracleModule;
  public commitReveal: CommitRevealModule;
  public slashManager: SlashManagerModule;
  public bidding: BiddingSystemModule;
  public milestones: MilestoneModule;
  public adminRegistry: AdminRegistryModule;
  public efp: EFPModule;
  public subgraph: SubgraphModule;


  constructor(config: SDKConfig) {
    this.network = config.network || 'sepolia';
    const networkConfig = NETWORKS[this.network];
    this.contracts = { ...networkConfig.contracts, ...config.contracts };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.chain = { id: networkConfig.chainId };

    const rpcUrl = config.rpcUrl || networkConfig.rpcUrl;

    if (typeof config.wallet === 'string') {
      const account = privateKeyToAccount(config.wallet as `0x${string}`);
      this.wallet = createWalletClient({
        account,
        chain: networkConfig as any,
        transport: http(rpcUrl),
      });
      this.publicClient = createPublicClient({
        chain: networkConfig as any,
        transport: http(rpcUrl),
      });
    } else {
      this.wallet = createWalletClient({
        account: config.wallet,
        chain: networkConfig as any,
        transport: http(rpcUrl),
      });
      this.publicClient = createPublicClient({
        chain: networkConfig as any,
        transport: http(rpcUrl),
      });
    }


    this.identity = new IdentityModule(this.wallet, this.publicClient, this.contracts);
    this.reputation = new ReputationModule(this.wallet, this.publicClient, this.contracts);
    this.services = new ServicesModule(this.wallet, this.publicClient, this.contracts);
    this.commerce = new CommerceModule(this.wallet, this.publicClient, this.contracts);
    this.review = new ReviewModule(this.wallet, this.publicClient, this.contracts);
    this.skills = new SkillsModule(this.wallet, this.publicClient, this.contracts);
    this.priceOracle = new PriceOracleModule(this.publicClient, this.contracts);
    this.commitReveal = new CommitRevealModule(this.wallet, this.publicClient, this.contracts);
    this.slashManager = new SlashManagerModule(this.wallet, this.publicClient, this.contracts);
    this.bidding = new BiddingSystemModule(this.wallet, this.publicClient, this.contracts);
    this.milestones = new MilestoneModule(this.wallet, this.publicClient, this.contracts);
    this.adminRegistry = new AdminRegistryModule(this.wallet, this.publicClient, this.contracts);
    this.efp = new EFPModule(this.wallet, this.publicClient, this.contracts);
    this.subgraph = new SubgraphModule();

    this.setupEventListeners();
  }

  get address(): Address {
    return this.wallet.account.address;
  }

  async getBalance(): Promise<bigint> {
    return this.publicClient.getBalance({ address: this.address });
  }

  async getUSDCBalance(): Promise<bigint> {
    const usdcAddress = this.contracts.usdc as Address;
    if (!usdcAddress) throw new Error('USDC contract address not found for this network');

    const abi = parseAbi(['function balanceOf(address) view returns (uint256)']);
    return (await this.publicClient.readContract({
      address: usdcAddress,
      abi,
      functionName: 'balanceOf',
      args: [this.address],
    } as any)) as unknown as bigint;
  }

  private setupEventListeners() {
    this.identity.on('AgentRegistered', data => this.emit('AgentRegistered', data));
    this.services.on('ServiceCreated', data => this.emit('ServiceCreated', data));
    this.commerce.on('JobCreated', data => this.emit('JobCreated', data));
    this.commerce.on('JobFunded', data => this.emit('JobFunded', data));
    this.commerce.on('JobSubmitted', data => this.emit('JobSubmitted', data));
    this.commerce.on('PaymentReleased', data => this.emit('PaymentReleased', data));
    this.review.on('ProposalCreated', data => this.emit('ProposalCreated', data));
    this.review.on('EvaluationSubmitted', data => this.emit('EvaluationSubmitted', data));
    this.review.on('DecisionAttested', data => this.emit('DecisionAttested', data));
  }

  on(event: SDKEventName, handler: SDKEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: SDKEventName, handler: SDKEventHandler): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  private emit(event: SDKEventName, data: unknown): void {
    this.eventHandlers.get(event)?.forEach(handler => handler(data as SDKEventMap[typeof event]));
  }


  get networkName(): NetworkName {
    return this.network;
  }

  get explorerUrl(): string {
    return NETWORKS[this.network].explorerUrl;
  }

}

// ============================================================================
// Identity Module
// ============================================================================

class IdentityModule {
  private wallet: ReturnType<typeof createWalletClient>;
  private publicClient: ReturnType<typeof createPublicClient>;
  private contracts: ContractAddresses;

  constructor(
    wallet: ReturnType<typeof createWalletClient>,
    publicClient: ReturnType<typeof createPublicClient>,
    contracts: ContractAddresses
  ) {
    this.wallet = wallet;
    this.publicClient = publicClient;
    this.contracts = contracts;
  }

  async register(params: AgentRegistrationParams): Promise<TransactionResult> {
    const metadata: AgentMetadata = {
      name: params.name,
      description: params.description,
      capabilities: params.capabilities,
      endpoints: params.endpoints,
      social: params.social,
      createdAt: new Date().toISOString(),
    };

    const metadataURI = this.encodeMetadata(metadata);
    const hash = await this.wallet.writeContract({
      address: this.contracts.erc8004Registry as Address,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'register',
      args: [metadataURI],
    } as any);


    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async getAgent(agentId: number | bigint): Promise<{
    owner: Address;
    agentURI: string;
    agentWallet: Address;
    isActive: boolean;
  }> {
    const agent = (await this.publicClient.readContract({
      address: this.contracts.erc8004Registry as Address,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'getAgent',
      args: [BigInt(agentId)],
    } as any)) as [Address, string, Address, boolean];

    return {
      owner: agent[0],
      agentURI: agent[1],
      agentWallet: agent[2],
      isActive: agent[3],
    };
  }

  async isAgent(address: Address): Promise<boolean> {
    const result = await this.publicClient.readContract({
      address: this.contracts.erc8004Registry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'isAgent',
      args: [address],
    } as any);
    return result as unknown as boolean;
  }

  async getAgentCount(): Promise<bigint> {
    const result = await this.publicClient.readContract({
      address: this.contracts.erc8004Registry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'getCurrentAgentId',
    } as any);
    return result as unknown as bigint;
  }

  async isRegistered(): Promise<boolean> {
    return this.isAgent(this.wallet.account.address);
  }

  async setAgentURI(agentId: number | bigint, newURI: string): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.erc8004Registry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'setAgentURI',
      args: [agentId, newURI],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async getMetadata(agentId: number | bigint, key: string): Promise<string> {
    const result = await this.publicClient.readContract({
      address: this.contracts.erc8004Registry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'getMetadata',
      args: [agentId, key],
    } as any);
    return Buffer.from(result as unknown as string).toString('utf8');
  }

  async setMetadata(
    agentId: number | bigint,
    key: string,
    value: string
  ): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.erc8004Registry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'setMetadata',
      args: [agentId, key, Buffer.from(value).toString('utf8')],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async getAgentWallet(agentId: number | bigint): Promise<Address> {
    const result = await this.publicClient.readContract({
      address: this.contracts.erc8004Registry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'getAgentWallet',
      args: [agentId],
    } as any);
    return result as unknown as Address;
  }

  async setAgentWallet(
    agentId: number | bigint,
    newWallet: Address,
    deadline: bigint,
    signature: `0x${string}`
  ): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.erc8004Registry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'setAgentWallet',
      args: [agentId, newWallet, deadline, signature],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async unsetAgentWallet(agentId: number | bigint): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.erc8004Registry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'unsetAgentWallet',
      args: [agentId],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  on<K extends 'AgentRegistered'>(event: K, handler: SDKEventHandler<SDKEventMap[K]>): void {
    // Event watching via watchContractEvent is not fully implemented
    // Use polling or WebSocket for production event handling
  }

  private encodeMetadata(data: AgentMetadata): string {
    const json = JSON.stringify(data);
    const base64 = Buffer.from(json).toString('base64');
    return `data:application/json;base64,${base64}`;
  }

  decodeMetadata(uri: string): AgentMetadata | null {
    try {
      if (uri.startsWith('data:')) {
        const parts = uri.split(',');
        if (parts.length === 2 && parts[0].includes('base64')) {
          return JSON.parse(Buffer.from(parts[1], 'base64').toString());
        }
      }
      return null;
    } catch {
      return null;
    }
  }
}

// ============================================================================
// Reputation Module
// ============================================================================

class ReputationModule {
  private wallet: ReturnType<typeof createWalletClient>;
  private publicClient: ReturnType<typeof createPublicClient>;
  private contracts: ContractAddresses;

  constructor(
    wallet: ReturnType<typeof createWalletClient>,
    publicClient: ReturnType<typeof createPublicClient>,
    contracts: ContractAddresses
  ) {
    this.wallet = wallet;
    this.publicClient = publicClient;
    this.contracts = contracts;
  }

  async submitFeedback(params: FeedbackParams): Promise<TransactionResult> {
    const metadataURI = params.comment || '';
    const hash = await this.wallet.writeContract({
      address: this.contracts.erc8004Reputation as Address,
      abi: LEGACY_REPUTATION_ABI,
      functionName: 'submitFeedback',
      args: [params.agent, BigInt(params.taskId || 0), params.rating, metadataURI],
    } as any);


    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async getReputation(agent: Address): Promise<ReputationData> {
    const result = (await this.publicClient.readContract({
      address: this.contracts.erc8004Reputation as Address,
      abi: LEGACY_REPUTATION_ABI,
      functionName: 'getAgentReputation',
      args: [agent],
    } as any)) as [bigint, bigint, bigint];
    const avgNum = Number(result[0]);
    return {
      averageRating: avgNum,
      totalFeedbacks: Number(result[1]),
      providers: Number(result[2]),
      score: avgNum / 10,
    };
  }
}

// ============================================================================
// Services Module
// ============================================================================

interface ServiceTuple {
  id: bigint;
  provider: Address;
  agentId: bigint;
  name: string;
  description: string;
  metadataURI: string;
  price: bigint;
  paymentToken: Address;
  isActive: boolean;
  createdAt: bigint;
}

class ServicesModule {
  private wallet: ReturnType<typeof createWalletClient>;
  private publicClient: ReturnType<typeof createPublicClient>;
  private contracts: ContractAddresses;

  constructor(
    wallet: ReturnType<typeof createWalletClient>,
    publicClient: ReturnType<typeof createPublicClient>,
    contracts: ContractAddresses
  ) {
    this.wallet = wallet;
    this.publicClient = publicClient;
    this.contracts = contracts;
  }

  async create(params: ServiceParams): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.serviceRegistry as Address,
      abi: SERVICE_REGISTRY_ABI,
      functionName: 'createService',
      args: [
        BigInt(params.agentId),
        params.name,
        params.description,
        params.metadataURI || '',
        BigInt(params.price),
        (params.paymentToken || this.contracts.usdc) as Address,
      ],
    } as any);


    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async getService(serviceId: number | bigint): Promise<Service> {
    const service = (await this.publicClient.readContract({
      address: this.contracts.serviceRegistry as Address,
      abi: SERVICE_REGISTRY_ABI,
      functionName: 'getService',
      args: [BigInt(serviceId)],
    } as any)) as ServiceTuple;
    return {
      id: service.id,
      provider: service.provider,
      agentId: service.agentId,
      name: service.name,
      description: service.description,
      metadataURI: service.metadataURI,
      price: service.price,
      paymentToken: service.paymentToken,
      isActive: service.isActive,
      createdAt: service.createdAt,
    };
  }

  async list(page = 0, pageSize = 20): Promise<Service[]> {
    const serviceIds = (await this.publicClient.readContract({
      address: this.contracts.serviceRegistry as Address,
      abi: SERVICE_REGISTRY_ABI,
      functionName: 'getServices',
      args: [BigInt(page * pageSize), BigInt(pageSize)],
    } as any)) as unknown as bigint[];

    if (serviceIds.length === 0) return [];

    const results = await Promise.all(serviceIds.map((id: bigint) => this.getService(id)));

    return results;
  }

  async getActiveCount(): Promise<number> {
    const result = await this.publicClient.readContract({
      address: this.contracts.serviceRegistry,
      abi: SERVICE_REGISTRY_ABI,
      functionName: 'getActiveServiceCount',
    } as any);
    return Number(result as unknown as bigint);
  }

  async getProviderServices(provider: Address): Promise<Service[]> {
    const serviceIds = (await this.publicClient.readContract({
      address: this.contracts.serviceRegistry,
      abi: SERVICE_REGISTRY_ABI,
      functionName: 'getProviderServices',
      args: [provider],
    } as any)) as unknown as bigint[];

    if (serviceIds.length === 0) return [];

    const results = await Promise.all(serviceIds.map((id: bigint) => this.getService(id)));

    return results;
  }

  async getServicesByAgent(agentId: bigint): Promise<Service[]> {
    const serviceIds = (await this.publicClient.readContract({
      address: this.contracts.serviceRegistry,
      abi: SERVICE_REGISTRY_ABI,
      functionName: 'getServicesByAgent',
      args: [agentId],
    } as any)) as unknown as bigint[];

    if (serviceIds.length === 0) return [];

    const results = await Promise.all(serviceIds.map((id: bigint) => this.getService(id)));

    return results;
  }

  async updateService(
    serviceId: bigint,
    name: string,
    description: string,
    metadataURI: string,
    price: bigint
  ): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.serviceRegistry,
      abi: SERVICE_REGISTRY_ABI,
      functionName: 'updateService',
      args: [serviceId, name, description, metadataURI, price],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async deactivateService(serviceId: bigint): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.serviceRegistry,
      abi: SERVICE_REGISTRY_ABI,
      functionName: 'deactivateService',
      args: [serviceId],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async activateService(serviceId: bigint): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.serviceRegistry,
      abi: SERVICE_REGISTRY_ABI,
      functionName: 'activateService',
      args: [serviceId],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async getServiceCounter(): Promise<number> {
    const result = await this.publicClient.readContract({
      address: this.contracts.serviceRegistry,
      abi: SERVICE_REGISTRY_ABI,
      functionName: 'getServiceCounter',
    } as any);
    return Number(result as unknown as bigint);
  }

  on<K extends 'ServiceCreated'>(event: K, handler: SDKEventHandler<SDKEventMap[K]>): void {
    // Event watching via watchContractEvent is not fully implemented
    // Use polling or WebSocket for production event handling
  }
}

// ============================================================================
// Commerce Module
// ============================================================================

interface JobTuple {
  id: bigint;
  client: Address;
  provider: Address;
  evaluator: Address;
  serviceId: bigint;
  paymentToken: Address;
  description: string;
  budget: bigint;
  maxBudget: bigint;
  expiredAt: bigint;
  status: JobStatus;
  hook: Address;
  deliverable: `0x${string}`;
  evaluatorFee: boolean;
}

interface BidTuple {
  bidder: Address;
  amount: bigint;
  message: string;
  status: BidStatus;
  committedAt: bigint;
  revealedAt: bigint;
}

class CommerceModule {
  private wallet: ReturnType<typeof createWalletClient>;
  private publicClient: ReturnType<typeof createPublicClient>;
  private contracts: ContractAddresses;

  constructor(
    wallet: ReturnType<typeof createWalletClient>,
    publicClient: ReturnType<typeof createPublicClient>,
    contracts: ContractAddresses
  ) {
    this.wallet = wallet;
    this.publicClient = publicClient;
    this.contracts = contracts;
  }

  async createJob(params: JobParams): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.agenticCommerce as Address,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'createJob',
      args: [
        params.provider as Address,
        (params.evaluator || params.provider) as Address,
        BigInt(params.expiredAt || Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60),
        params.description,
        (params.hook || '0x0000000000000000000000000000000000000000') as Address,
        params.evaluatorFee || false,
      ],
    } as any);


    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async setBudget(jobId: bigint, amount: bigint): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'setBudget',
      args: [jobId, amount],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async fundJob(jobId: number | bigint, amount?: bigint, expectedBudget?: bigint): Promise<TransactionResult> {
    if (amount) {
      const allowance = (await this.publicClient.readContract({
        address: this.contracts.usdc,
        abi: USDC_ABI,
        functionName: 'allowance',
        args: [this.wallet.account.address, this.contracts.agenticCommerce],
      } as any)) as unknown as bigint;

      if (allowance < amount) {
        await this.wallet.writeContract({
          address: this.contracts.usdc as Address,
          abi: USDC_ABI,
          functionName: 'approve',
          args: [this.contracts.agenticCommerce as Address, BigInt(2 ** 256 - 1)],
        } as any);
      }
    }

    const hash = await this.wallet.writeContract({
      address: this.contracts.agenticCommerce as Address,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'fund',
      args: [BigInt(jobId), expectedBudget || 0n],
    } as any);


    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async fundJobWithETH(jobId: number | bigint, value?: bigint, expectedBudget?: bigint): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'fund',
      args: [jobId, expectedBudget || 0n],
      value: value || 0n,
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async submitJob(jobId: number | bigint, deliverable: `0x${string}`): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'submit',
      args: [jobId, deliverable],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async completeJob(jobId: number | bigint, reason: `0x${string}`): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'complete',
      args: [jobId, reason],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async rejectJob(jobId: number | bigint, reason: `0x${string}`): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'reject',
      args: [jobId, reason],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async approveByClient(jobId: bigint): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'approveByClient',
      args: [jobId],
    } as any);
    return { hash, wait: () => this.publicClient.waitForTransactionReceipt({ hash }) };
  }

  async finalizeByEvaluator(jobId: bigint, reason: `0x${string}`): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'finalizeByEvaluator',
      args: [jobId, reason],
    } as any);
    return { hash, wait: () => this.publicClient.waitForTransactionReceipt({ hash }) };
  }

  async setPaymentToken(jobId: bigint, paymentToken: Address): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'setPaymentToken',
      args: [jobId, paymentToken],
    } as any);
    return { hash, wait: () => this.publicClient.waitForTransactionReceipt({ hash }) };
  }

  async registerAsEvaluator(): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'registerAsEvaluator',
      value: BigInt(0.01e18),
    } as any);
    return { hash, wait: () => this.publicClient.waitForTransactionReceipt({ hash }) };
  }

  async unregisterAsEvaluator(): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'unregisterAsEvaluator',
    } as any);
    return { hash, wait: () => this.publicClient.waitForTransactionReceipt({ hash }) };
  }

  async cleanupStaleEvaluators(): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'cleanupStaleEvaluators',
    } as any);
    return { hash, wait: () => this.publicClient.waitForTransactionReceipt({ hash }) };
  }

  async finalizeRandomEvaluator(jobId: bigint, salt: `0x${string}`): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'finalizeRandomEvaluator',
      args: [jobId, salt],
    } as any);
    return { hash, wait: () => this.publicClient.waitForTransactionReceipt({ hash }) };
  }

  async slashEvaluatorStake(evaluator: Address, reason: string): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'slashEvaluatorStake',
      args: [evaluator, reason],
    } as any);
    return { hash, wait: () => this.publicClient.waitForTransactionReceipt({ hash }) };
  }

  async getJob(jobId: number | bigint): Promise<Job> {
    const job = (await this.publicClient.readContract({
      address: this.contracts.agenticCommerce as Address,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'getJob',
      args: [BigInt(jobId)],
    } as any)) as JobTuple;

    return {
      id: job.id,
      client: job.client,
      provider: job.provider,
      evaluator: job.evaluator,
      serviceId: job.serviceId,
      description: job.description,
      budget: job.budget,
      maxBudget: job.maxBudget,
      expiredAt: job.expiredAt,
      status: job.status,
      hook: job.hook,
      deliverable: job.deliverable,
      evaluatorFee: job.evaluatorFee,
      paymentToken: job.paymentToken,
    };
  }

  async getClientJobCount(client: Address): Promise<number> {
    const result = await this.publicClient.readContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'getClientJobCount',
      args: [client],
    } as any);
    return Number(result as unknown as bigint);
  }

  async getUserBid(jobId: bigint, user: Address): Promise<Bid | null> {
    const bid = (await this.publicClient.readContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'getUserBid',
      args: [jobId, user],
    } as any)) as unknown as BidTuple;
    if (bid.bidder === '0x0000000000000000000000000000000000000000') {
      return null;
    }
    return {
      jobId,
      bidder: bid.bidder,
      amount: bid.amount,
      message: bid.message,
      status: bid.status,
      committedAt: bid.committedAt,
      revealedAt: bid.revealedAt,
    };
  }

  async jobBidCount(jobId: bigint): Promise<number> {
    const result = await this.publicClient.readContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'jobBidCount',
      args: [jobId],
    } as any);
    return Number(result as unknown as bigint);
  }

  async calculateStake(maxBudget: bigint): Promise<bigint> {
    const result = await this.publicClient.readContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'calculateStake',
      args: [maxBudget],
    } as any);
    return result as unknown as bigint;
  }

  async isEvaluatorFeeEnabled(jobId: bigint): Promise<boolean> {
    const result = await this.publicClient.readContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'isEvaluatorFeeEnabled',
      args: [jobId],
    } as any);
    return result as unknown as boolean;
  }

  async isEvaluator(address: Address): Promise<boolean> {
    const result = await this.publicClient.readContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'isEvaluator',
      args: [address],
    } as any);
    return result as unknown as boolean;
  }

  async getEvaluatorPoolSize(): Promise<number> {
    const result = await this.publicClient.readContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'getEvaluatorPoolSize',
    } as any);
    return Number(result as unknown as bigint);
  }

  async evaluatorStakes(evaluator: Address): Promise<bigint> {
    const result = await this.publicClient.readContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'evaluatorStakes',
      args: [evaluator],
    } as any);
    return result as unknown as bigint;
  }

  async hasClientApproved(jobId: bigint): Promise<boolean> {
    const result = await this.publicClient.readContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'hasClientApproved',
      args: [jobId],
    } as any);
    return result as unknown as boolean;
  }

  async isClientReviewRequired(jobId: bigint): Promise<boolean> {
    const result = await this.publicClient.readContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'isClientReviewRequired',
      args: [jobId],
    } as any);
    return result as unknown as boolean;
  }

  async getMinBudget(token: Address, decimals: number): Promise<bigint> {
    const result = await this.publicClient.readContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'getMinBudget',
      args: [token, decimals],
    } as any);
    return result as unknown as bigint;
  }

  async minBudgetUsd(): Promise<bigint> {
    const result = await this.publicClient.readContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'minBudgetUsd',
    } as any);
    return result as unknown as bigint;
  }

  async minBudgetOverride(token: Address): Promise<bigint> {
    const result = await this.publicClient.readContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'minBudgetOverride',
      args: [token],
    } as any);
    return result as unknown as bigint;
  }

  async isStablecoin(token: Address): Promise<boolean> {
    const result = await this.publicClient.readContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'isStablecoin',
      args: [token],
    } as any);
    return result as unknown as boolean;
  }

  async allowedTokens(token: Address): Promise<boolean> {
    const result = await this.publicClient.readContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'allowedTokens',
      args: [token],
    } as any);
    return result as unknown as boolean;
  }

  async priceOracle(): Promise<Address> {
    const result = await this.publicClient.readContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'priceOracle',
    } as any);
    return result as unknown as Address;
  }

  async maxBudgetUsd(): Promise<bigint> {
    const result = await this.publicClient.readContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'maxBudgetUsd',
    } as any);
    return result as unknown as bigint;
  }

  async paused(): Promise<boolean> {
    const result = await this.publicClient.readContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'paused',
    } as any);
    return result as unknown as boolean;
  }

  async totalStakesHeld(user: Address): Promise<bigint> {
    const result = await this.publicClient.readContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'totalStakesHeld',
      args: [user],
    } as any);
    return result as unknown as bigint;
  }

  async commitBid(jobId: bigint, amount: bigint, message: string): Promise<TransactionResult> {
    const stake = (amount * 100n) / 10000n;
    const commitHash = Buffer.from(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).crypto?.randomUUID?.().replace(/-/g, '') ||
        Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
    ).toString('hex');
    const hash = await this.wallet.writeContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'commitBid',
      args: [jobId, `0x${commitHash}` as `0x${string}`],
      value: stake,
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async revealBid(params: RevealBidParams): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'revealBid',
      args: [params.jobId, params.amount, params.message, params.salt],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async acceptBid(jobId: bigint, bidId: bigint): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'acceptBid',
      args: [jobId, bidId],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async withdrawStake(jobId: bigint): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'withdrawStake',
      args: [jobId],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async getMyJobs(): Promise<Job[]> {
    const jobIds = (await this.publicClient.readContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'getClientJobs',
      args: [this.wallet.account.address],
    } as any)) as unknown as bigint[];
    const jobs: Job[] = [];

    for (const id of jobIds) {
      try {
        const job = await this.getJob(id);
        jobs.push(job);
      } catch {
        // Skip invalid jobs
      }
    }

    return jobs;
  }

  async approveUSDC(spender: Address, amount: bigint): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.usdc,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [spender, amount],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async claimRefund(jobId: bigint): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'claimRefund',
      args: [jobId],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  on<K extends 'JobCreated' | 'JobFunded' | 'JobSubmitted' | 'PaymentReleased'>(
    event: K,
    handler: SDKEventHandler<SDKEventMap[K]>
  ): void {
    // Event watching via watchContractEvent is not fully implemented
    // Use polling or WebSocket for production event handling
  }
}

// ============================================================================
// Review Module
// ============================================================================

interface ProposalTuple {
  id: bigint;
  proposer: Address;
  title: string;
  description: string;
  criteriaURI: string;
  reward: bigint;
  status: ProposalStatus;
  createdAt: bigint;
  decisionDeadline: bigint;
  winningEvaluator: Address;
}

interface EvaluationTuple {
  proposalId: bigint;
  evaluator: Address;
  confidenceScore: bigint;
  reasoningURI: string;
  stakeAmount: bigint;
  isFinal: boolean;
  submittedAt: bigint;
}

class ReviewModule {
  private wallet: ReturnType<typeof createWalletClient>;
  private publicClient: ReturnType<typeof createPublicClient>;
  private contracts: ContractAddresses;

  constructor(
    wallet: ReturnType<typeof createWalletClient>,
    publicClient: ReturnType<typeof createPublicClient>,
    contracts: ContractAddresses
  ) {
    this.wallet = wallet;
    this.publicClient = publicClient;
    this.contracts = contracts;
  }

  async createProposal(params: ProposalParams): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.agentReview as Address,
      abi: AGENT_REVIEW_ABI,
      functionName: 'createProposal',
      args: [
        params.title,
        params.description,
        params.criteriaURI || '',
        BigInt(params.reward),
        BigInt(params.decisionDeadline),
      ],
    } as any);


    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async submitEvaluation(params: EvaluationParams): Promise<TransactionResult> {
    const minStake = 1000000000000000n; // 0.001 ETH
    const hash = await this.wallet.writeContract({
      address: this.contracts.agentReview as Address,
      abi: AGENT_REVIEW_ABI,
      functionName: 'submitEvaluation',
      args: [BigInt(params.proposalId), BigInt(params.confidenceScore), params.reasoningURI || ''],
      value: minStake,
    } as any);


    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async attestDecision(proposalId: number | bigint, winner: Address): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.agentReview as Address,
      abi: AGENT_REVIEW_ABI,
      functionName: 'attestDecision',
      args: [BigInt(proposalId), winner],
    } as any);


    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async getProposal(proposalId: number | bigint): Promise<Proposal> {
    const proposal = (await this.publicClient.readContract({
      address: this.contracts.agentReview as Address,
      abi: AGENT_REVIEW_ABI,
      functionName: 'getProposal',
      args: [BigInt(proposalId)],
    } as any)) as ProposalTuple;

    return {
      id: proposal.id,
      proposer: proposal.proposer,
      title: proposal.title,
      description: proposal.description,
      criteriaURI: proposal.criteriaURI,
      reward: proposal.reward,
      status: proposal.status,
      createdAt: proposal.createdAt,
      decisionDeadline: proposal.decisionDeadline,
      winningEvaluator: proposal.winningEvaluator,
    };
  }

  async getEvaluation(proposalId: number | bigint, evaluator: Address): Promise<Evaluation> {
    const eval_ = (await this.publicClient.readContract({
      address: this.contracts.agentReview as Address,
      abi: AGENT_REVIEW_ABI,
      functionName: 'getEvaluation',
      args: [BigInt(proposalId), evaluator],
    } as any)) as EvaluationTuple;

    return {
      proposalId: eval_.proposalId,
      evaluator: eval_.evaluator,
      confidenceScore: eval_.confidenceScore,
      reasoningURI: eval_.reasoningURI,
      stakeAmount: eval_.stakeAmount,
      isFinal: eval_.isFinal,
      submittedAt: eval_.submittedAt,
    };
  }

  async getProposalCount(): Promise<number> {
    const result = await this.publicClient.readContract({
      address: this.contracts.agentReview,
      abi: AGENT_REVIEW_ABI,
      functionName: 'getProposalCount',
    } as any);
    return Number(result as unknown as bigint);
  }

  async claimReward(proposalId: number | bigint): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.agentReview,
      abi: AGENT_REVIEW_ABI,
      functionName: 'claimReward',
      args: [proposalId],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async releaseStake(proposalId: number | bigint): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.agentReview,
      abi: AGENT_REVIEW_ABI,
      functionName: 'releaseStake',
      args: [proposalId],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async slashEvaluator(
    evaluator: Address,
    proposalId: number | bigint,
    reason: string
  ): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.agentReview,
      abi: AGENT_REVIEW_ABI,
      functionName: 'slashEvaluator',
      args: [evaluator, proposalId, reason],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async getProposalEvaluators(proposalId: number | bigint): Promise<Address[]> {
    const result = await this.publicClient.readContract({
      address: this.contracts.agentReview,
      abi: AGENT_REVIEW_ABI,
      functionName: 'getProposalEvaluators',
      args: [proposalId],
    } as any);
    return result as unknown as Address[];
  }

  async getEvaluatorCount(proposalId: number | bigint): Promise<number> {
    const result = await this.publicClient.readContract({
      address: this.contracts.agentReview,
      abi: AGENT_REVIEW_ABI,
      functionName: 'getEvaluatorCount',
      args: [proposalId],
    } as any);
    return Number(result as unknown as bigint);
  }

  async cancelProposal(proposalId: number | bigint): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.agentReview as Address,
      abi: AGENT_REVIEW_ABI,
      functionName: 'cancelProposal',
      args: [BigInt(proposalId)],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }


  async withdrawETH(to: Address, amount: bigint): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.agentReview as Address,
      abi: AGENT_REVIEW_ABI,
      functionName: 'withdrawETH',
      args: [to, amount],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }


  on<K extends 'ProposalCreated' | 'EvaluationSubmitted' | 'DecisionAttested'>(
    event: K,
    handler: SDKEventHandler<SDKEventMap[K]>
  ): void {
    // Event watching via watchContractEvent is not fully implemented
    // Use polling or WebSocket for production event handling
  }
}

// ============================================================================
// AgentSkillRegistry Module
// ============================================================================

interface Skill {
  id: bigint;
  agentId: bigint;
  name: string;
  version: string;
  description: string;
  endpoint: string;
  domains: string[];
  isActive: boolean;
  registeredBy: Address;
  registeredAt: bigint;
}

const AGENT_SKILL_REGISTRY_ABI = parseAbi([
  'function registerSkill(uint256 agentId, string calldata name, string calldata version, string calldata description, string calldata endpoint, string[] calldata domains) external returns (uint256 skillId)',
  'function updateSkill(uint256 skillId, string calldata name, string calldata version, string calldata description, string calldata endpoint, string[] calldata domains) external',
  'function getAgentSkills(uint256 agentId) external view returns (uint256[] memory)',
  'function getSkill(uint256 skillId) external view returns ((uint256 agentId, string name, string version, string description, string endpoint, string[] domains, bool isActive, address registeredBy, uint256 registeredAt))',
  'function getSkillData(uint256 skillId) external view returns ((uint256 id, uint256 agentId, string name, string version, string description, string endpoint, string[] domains, bool isActive, address registeredBy, uint256 registeredAt))',
  'function deactivateSkill(uint256 skillId) external',
  'function getTotalSkillCount() external view returns (uint256)',
  'function getAgentSkillCount(uint256 agentId) external view returns (uint256)',
  'function findSkillsByDomain(string calldata domain) external view returns (uint256[] memory)',
  'event SkillRegistered(uint256 indexed agentId, uint256 indexed skillId, string name, string version, address indexed registeredBy)',
  'event SkillUpdated(uint256 indexed skillId, string name, string version)',
  'event SkillDeactivated(uint256 indexed skillId, address indexed deactivatedBy)',
]);

class SkillsModule {
  private wallet: ReturnType<typeof createWalletClient>;
  private publicClient: ReturnType<typeof createPublicClient>;
  private contracts: ContractAddresses;

  constructor(
    wallet: ReturnType<typeof createWalletClient>,
    publicClient: ReturnType<typeof createPublicClient>,
    contracts: ContractAddresses
  ) {
    this.wallet = wallet;
    this.publicClient = publicClient;
    this.contracts = contracts;
  }

  async registerSkill(
    agentId: bigint,
    name: string,
    version: string,
    description: string,
    endpoint: string,
    domains: string[]
  ): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.skillRegistry as Address,
      abi: AGENT_SKILL_REGISTRY_ABI,
      functionName: 'registerSkill',
      args: [BigInt(agentId), name, version, description, endpoint, domains],
    } as any);


    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async getAgentSkills(agentId: bigint): Promise<bigint[]> {
    const result = await this.publicClient.readContract({
      address: this.contracts.skillRegistry as Address,
      abi: AGENT_SKILL_REGISTRY_ABI,
      functionName: 'getAgentSkills',
      args: [BigInt(agentId)],
    } as any);
    return result as bigint[];
  }


  async getSkill(skillId: bigint): Promise<Skill> {
    const skill = (await this.publicClient.readContract({
      address: this.contracts.skillRegistry as Address,
      abi: AGENT_SKILL_REGISTRY_ABI,
      functionName: 'getSkill',
      args: [BigInt(skillId)],
    } as any)) as [
      bigint,
      string,
      string,
      string,
      string,
      string[],
      boolean,
      Address,
      bigint,
    ];

    return {
      id: skillId,
      agentId: skill[0],
      name: skill[1],
      version: skill[2],
      description: skill[3],
      endpoint: skill[4],
      domains: skill[5],
      isActive: skill[6],
      registeredBy: skill[7],
      registeredAt: skill[8],
    };
  }

  async getSkillData(skillId: bigint): Promise<Skill & { id: bigint }> {
    const skill = (await this.publicClient.readContract({
      address: this.contracts.skillRegistry,
      abi: AGENT_SKILL_REGISTRY_ABI,
      functionName: 'getSkillData',
      args: [skillId],
    } as any)) as unknown as Skill & { id: bigint };
    return skill;
  }

  async updateSkill(
    skillId: bigint,
    name: string,
    version: string,
    description: string,
    endpoint: string,
    domains: string[]
  ): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.skillRegistry,
      abi: AGENT_SKILL_REGISTRY_ABI,
      functionName: 'updateSkill',
      args: [skillId, name, version, description, endpoint, domains],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async getTotalSkillCount(): Promise<number> {
    const result = await this.publicClient.readContract({
      address: this.contracts.skillRegistry,
      abi: AGENT_SKILL_REGISTRY_ABI,
      functionName: 'getTotalSkillCount',
    } as any);
    return Number(result as unknown as bigint);
  }

  async getAgentSkillCount(agentId: bigint): Promise<number> {
    const result = await this.publicClient.readContract({
      address: this.contracts.skillRegistry,
      abi: AGENT_SKILL_REGISTRY_ABI,
      functionName: 'getAgentSkillCount',
      args: [agentId],
    } as any);
    return Number(result as unknown as bigint);
  }

  async findSkillsByDomain(domain: string): Promise<bigint[]> {
    const result = await this.publicClient.readContract({
      address: this.contracts.skillRegistry as Address,
      abi: AGENT_SKILL_REGISTRY_ABI,
      functionName: 'findSkillsByDomain',
      args: [domain],
    } as any);
    return result as bigint[];
  }


  async deactivateSkill(skillId: bigint): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.skillRegistry as Address,
      abi: AGENT_SKILL_REGISTRY_ABI,
      functionName: 'deactivateSkill',
      args: [BigInt(skillId)],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

}

// ============================================================================
// PriceOracle Module
// ============================================================================

const PRICE_ORACLE_ABI = parseAbi([
  'function getUsdPriceOfToken(address token) external view returns (int256)',
  'function getTokenAmountForUsd(uint256 usdAmount, address token) external view returns (uint256)',
  'function isStale(address token) external view returns (bool)',
  'function priceFeeds(address token) external view returns (address)',
  'function feedDecimals(address token) external view returns (uint8)',
  'function isStablecoin(address token) external view returns (bool)',
  'function ethPriceFeed() external view returns (address)',
  'function ethFeedDecimals() external view returns (uint8)',
]);

class PriceOracleModule {
  private publicClient: ReturnType<typeof createPublicClient>;
  private contracts: ContractAddresses;

  constructor(publicClient: ReturnType<typeof createPublicClient>, contracts: ContractAddresses) {
    this.publicClient = publicClient;
    this.contracts = contracts;
  }

  async getUsdPriceOfToken(token: Address): Promise<bigint> {
    const result = await this.publicClient.readContract({
      address: this.contracts.priceOracle as Address,
      abi: PRICE_ORACLE_ABI,
      functionName: 'getUsdPriceOfToken',
      args: [token],
    } as any);
    return BigInt(result as string);
  }

  async getTokenAmountForUsd(usdAmount: bigint, token: Address): Promise<bigint> {
    const result = await this.publicClient.readContract({
      address: this.contracts.priceOracle as Address,
      abi: PRICE_ORACLE_ABI,
      functionName: 'getTokenAmountForUsd',
      args: [usdAmount, token],
    } as any);
    return BigInt(result as string);
  }

  async isStale(token: Address): Promise<boolean> {
    const result = await this.publicClient.readContract({
      address: this.contracts.priceOracle as Address,
      abi: PRICE_ORACLE_ABI,
      functionName: 'isStale',
      args: [token],
    } as any);
    return result as boolean;
  }

  async getFeedDecimals(token: Address): Promise<number> {
    const result = await this.publicClient.readContract({
      address: this.contracts.priceOracle as Address,
      abi: PRICE_ORACLE_ABI,
      functionName: 'feedDecimals',
      args: [token],
    } as any);
    return Number(result);
  }

}

// ============================================================================
// CommitReveal Module
// ============================================================================

const COMMIT_REVEAL_ABI = parseAbi([
  'function commit(bytes32 commitment) external',
  'function reveal(string calldata data, uint256 nonce, uint256 serviceId) external',
  'function getCommitment(address user, uint256 nonce) external view returns (bytes32)',
]);

class CommitRevealModule {
  private wallet: ReturnType<typeof createWalletClient>;
  private publicClient: ReturnType<typeof createPublicClient>;
  private contracts: ContractAddresses;

  constructor(
    wallet: ReturnType<typeof createWalletClient>,
    publicClient: ReturnType<typeof createPublicClient>,
    contracts: ContractAddresses
  ) {
    this.wallet = wallet;
    this.publicClient = publicClient;
    this.contracts = contracts;
  }

  async commit(commitment: string): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.commitReveal,
      abi: COMMIT_REVEAL_ABI,
      functionName: 'commit',
      args: [commitment],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async reveal(data: string, nonce: bigint, serviceId: bigint): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.commitReveal,
      abi: COMMIT_REVEAL_ABI,
      functionName: 'reveal',
      args: [data, nonce, serviceId],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async getCommitment(user: Address, nonce: bigint): Promise<string> {
    const result = await this.publicClient.readContract({
      address: this.contracts.commitReveal as Address,
      abi: COMMIT_REVEAL_ABI,
      functionName: 'getCommitment',
      args: [user, BigInt(nonce)],
    } as any);
    return result as string;
  }

}

// ============================================================================
// SlashManager Module
// ============================================================================

interface SlashProposal {
  evaluator: Address;
  amount: bigint;
  reason: string;
  confirmations: number;
  execAfter: bigint;
  isExecuted: boolean;
}

const SLASH_MANAGER_ABI = parseAbi([
  'function createProposal(address evaluator, uint256 proposalId, uint256 amount, string calldata reason) external returns (bytes32)',
  'function confirmProposal(bytes32 proposalId) external',
  'function executeProposal(bytes32 proposalId) external',
  'function cancelProposal(bytes32 proposalId) external',
  'function getProposal(bytes32 proposalId) external view returns (address evaluator, uint256 amount, string reason, uint256 confirmations, uint256 execAfter, bool isExecuted)',
  'function isSigner(address account) external view returns (bool)',
]);

class SlashManagerModule {
  private wallet: ReturnType<typeof createWalletClient>;
  private publicClient: ReturnType<typeof createPublicClient>;
  private contracts: ContractAddresses;

  constructor(
    wallet: ReturnType<typeof createWalletClient>,
    publicClient: ReturnType<typeof createPublicClient>,
    contracts: ContractAddresses
  ) {
    this.wallet = wallet;
    this.publicClient = publicClient;
    this.contracts = contracts;
  }

  async createProposal(
    evaluator: Address,
    proposalId: bigint,
    amount: bigint,
    reason: string
  ): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.slashManager,
      abi: SLASH_MANAGER_ABI,
      functionName: 'createProposal',
      args: [evaluator, proposalId, amount, reason],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async confirmProposal(proposalId: string): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.slashManager,
      abi: SLASH_MANAGER_ABI,
      functionName: 'confirmProposal',
      args: [proposalId],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async executeProposal(proposalId: string): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.slashManager,
      abi: SLASH_MANAGER_ABI,
      functionName: 'executeProposal',
      args: [proposalId],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async cancelProposal(proposalId: string): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.slashManager,
      abi: SLASH_MANAGER_ABI,
      functionName: 'cancelProposal',
      args: [proposalId],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async getProposal(proposalId: string): Promise<SlashProposal> {
    const proposal = (await this.publicClient.readContract({
      address: this.contracts.slashManager,
      abi: SLASH_MANAGER_ABI,
      functionName: 'getProposal',
      args: [proposalId],
    } as any)) as unknown as [Address, bigint, string, bigint, bigint, boolean];
    return {
      evaluator: proposal[0],
      amount: proposal[1],
      reason: proposal[2],
      confirmations: Number(proposal[3]),
      execAfter: proposal[4],
      isExecuted: proposal[5],
    };
  }

  async isSigner(account: Address): Promise<boolean> {
    const result = await this.publicClient.readContract({
      address: this.contracts.slashManager as Address,
      abi: SLASH_MANAGER_ABI,
      functionName: 'isSigner',
      args: [account],
    } as any);
    return result as boolean;
  }
}


// ============================================================================
// BiddingSystem Module (Phase 11)
// ============================================================================

interface BiddingSession {
  id: bigint;
  creator: Address;
  evaluator: Address;
  maxBudget: bigint;
  deadline: bigint;
  revealWindowEnd: bigint;
  metadata: string;
  serviceId: bigint;
  jobId: bigint;
  winner: Address;
  winningBidId: bigint;
  jobCreated: boolean;
  status: number;
}

interface BidInfo {
  bidId: bigint;
  bidder: Address;
  proposedAmount: bigint;
  stake: bigint;
  message: string;
  commitHash: string;
  revealed: boolean;
  accepted: boolean;
  stakeWithdrawn: boolean;
  timestamp: bigint;
}

const BIDDING_SYSTEM_ABI = parseAbi([
  'function createBiddingSession(address evaluator, uint256 maxBudget, uint256 deadline, bytes calldata metadata, uint256 serviceId) external payable returns (uint256 sessionId)',
  'function commitBid(uint256 sessionId, bytes32 commitHash) external payable',
  'function revealBid(uint256 sessionId, uint256 amount, string calldata message, bytes32 salt) external',
  'function acceptBid(uint256 sessionId, uint256 bidId) external',
  'function rejectBid(uint256 sessionId, uint256 bidId, string calldata reason) external',
  'function withdrawStake(uint256 sessionId) external',
  'function claimStake(uint256 sessionId) external',
  'function createJobAndFund(uint256 sessionId, uint256 jobExpiredAt, string calldata description) external payable returns (uint256 jobId)',
  'function cancelSession(uint256 sessionId) external',
  'function extendRevealWindow(uint256 sessionId, uint256 additionalSeconds) external',
  'function getSession(uint256 sessionId) external view returns ((uint256 id, address creator, address evaluator, uint256 maxBudget, uint256 deadline, uint256 revealWindowEnd, bytes metadata, uint256 serviceId, uint256 jobId, address winner, uint256 winningBidId, bool jobCreated, uint8 status))',
  'function getUserBid(uint256 sessionId, address user) external view returns ((uint256 bidId, address bidder, uint256 proposedAmount, uint256 stake, string message, bytes32 commitHash, bool revealed, bool accepted, bool stakeWithdrawn, uint256 timestamp))',
  'function sessionCounter() external view returns (uint256)',
  'function calculateStake(uint256 maxBudget) external pure returns (uint256)',
  'function commerce() external view returns (address)',
  'function treasury() external view returns (address)',
  'function owner() external view returns (address)',
  'event BiddingSessionCreated(uint256 indexed sessionId, address indexed creator, address indexed evaluator, uint256 maxBudget, uint256 deadline, uint256 serviceId)',
  'event BidCommitted(uint256 indexed sessionId, address indexed bidder, bytes32 commitHash, uint256 stakeAmount)',
  'event BidRevealed(uint256 indexed sessionId, address indexed bidder, uint256 proposedAmount, string message)',
  'event BidAccepted(uint256 indexed sessionId, address indexed winner, uint256 amount, uint256 bidId)',
  'event StakeWithdrawn(uint256 indexed sessionId, address indexed bidder, uint256 amount)',
  'event StakeClaimed(uint256 indexed sessionId, address indexed winner, uint256 amount)',
  'event JobCreatedFromSession(uint256 indexed sessionId, uint256 indexed jobId, address indexed winner, uint256 amount)',
  'event SessionCancelled(uint256 indexed sessionId, address indexed canceller)',
] as const);

class BiddingSystemModule {
  private wallet: ReturnType<typeof createWalletClient>;
  private publicClient: ReturnType<typeof createPublicClient>;
  private contracts: ContractAddresses;

  constructor(
    wallet: ReturnType<typeof createWalletClient>,
    publicClient: ReturnType<typeof createPublicClient>,
    contracts: ContractAddresses
  ) {
    this.wallet = wallet;
    this.publicClient = publicClient;
    this.contracts = contracts;
  }

  async createSession(params: {
    evaluator: Address;
    maxBudget: bigint;
    deadline: bigint;
    metadata?: string;
    serviceId?: bigint;
  }): Promise<TransactionResult & { sessionId: bigint }> {
    const stake = (params.maxBudget * 100n) / 10000n;
    const hash = await this.wallet.writeContract({
      address: this.contracts.biddingSystem! as Address,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'createBiddingSession',
      args: [
        params.evaluator as Address,
        params.maxBudget,
        params.deadline,
        (params.metadata || '0x') as `0x${string}`,
        params.serviceId || 0n,
      ],
      value: stake,
    } as any);

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    let sessionId = 0n;
    for (const log of receipt.logs) {
      try {
        const parsed = this.publicClient.readContract({
          address: this.contracts.biddingSystem!,
          abi: BIDDING_SYSTEM_ABI,
          functionName: 'parseLog',
          args: [log],
        } as any);
        if ((parsed as { name?: string }).name === 'BiddingSessionCreated') {
          sessionId = (parsed as { args?: [bigint] }).args?.[0] || 0n;
          break;
        }
      } catch {
        continue;
      }
    }

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
      sessionId,
    };
  }

  async commitBid(params: {
    sessionId: bigint;
    amount: bigint;
    message: string;
    salt?: string;
  }): Promise<TransactionResult> {
    const salt =
      params.salt ||
      Buffer.from(Array.from({ length: 32 }, () => Math.floor(Math.random() * 256))).toString(
        'hex'
      );
    const commitHash = `0x${Buffer.from(salt).toString('hex')}`;
    const stake = (params.amount * 100n) / 10000n;

    const hash = await this.wallet.writeContract({
      address: this.contracts.biddingSystem! as Address,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'commitBid',
      args: [params.sessionId, commitHash as `0x${string}`],
      value: stake,
    } as any);


    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async revealBid(params: {
    sessionId: bigint;
    amount: bigint;
    message: string;
    salt: string;
  }): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.biddingSystem! as Address,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'revealBid',
      args: [params.sessionId, params.amount, params.message, params.salt as `0x${string}`],
    } as any);


    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async acceptBid(params: { sessionId: bigint; bidId: bigint }): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.biddingSystem!,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'acceptBid',
      args: [params.sessionId, params.bidId],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async rejectBid(params: {
    sessionId: bigint;
    bidId: bigint;
    reason: string;
  }): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.biddingSystem!,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'rejectBid',
      args: [params.sessionId, params.bidId, params.reason],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async withdrawStake(sessionId: bigint): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.biddingSystem!,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'withdrawStake',
      args: [sessionId],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async claimStake(sessionId: bigint): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.biddingSystem!,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'claimStake',
      args: [sessionId],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async createJobAndFund(params: {
    sessionId: bigint;
    jobExpiredAt: bigint;
    description: string;
    bidAmount: bigint;
    platformFeeBP?: number;
  }): Promise<TransactionResult & { jobId: bigint }> {
    const platformFee = params.platformFeeBP
      ? (params.bidAmount * BigInt(params.platformFeeBP)) / 10000n
      : (params.bidAmount * 100n) / 10000n;
    const totalPayment = params.bidAmount + platformFee;

    const hash = await this.wallet.writeContract({
      address: this.contracts.biddingSystem! as Address,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'createJobAndFund',
      args: [params.sessionId, params.jobExpiredAt, params.description],
      value: totalPayment,
    } as any);

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    let jobId = 0n;
    for (const log of receipt.logs) {
      try {
        const parsed = this.publicClient.readContract({
          address: this.contracts.biddingSystem!,
          abi: BIDDING_SYSTEM_ABI,
          functionName: 'parseLog',
          args: [log],
        } as any);
        if ((parsed as { name?: string }).name === 'JobCreatedFromSession') {
          jobId = (parsed as { args?: [bigint, bigint] }).args?.[1] || 0n;
          break;
        }
      } catch {
        continue;
      }
    }

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
      jobId,
    };
  }

  async cancelSession(sessionId: bigint): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.biddingSystem!,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'cancelSession',
      args: [sessionId],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async extendRevealWindow(params: {
    sessionId: bigint;
    additionalSeconds: bigint;
  }): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.biddingSystem!,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'extendRevealWindow',
      args: [params.sessionId, params.additionalSeconds],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async getSession(sessionId: bigint): Promise<BiddingSession | null> {
    try {
      const session = (await this.publicClient.readContract({
        address: this.contracts.biddingSystem! as Address,
        abi: BIDDING_SYSTEM_ABI,
        functionName: 'getSession',
        args: [BigInt(sessionId)],
      } as any)) as [

        bigint,
        Address,
        Address,
        bigint,
        bigint,
        bigint,
        string,
        bigint,
        bigint,
        Address,
        bigint,
        boolean,
        number,
      ];
      return {
        id: session[0],
        creator: session[1],
        evaluator: session[2],
        maxBudget: session[3],
        deadline: session[4],
        revealWindowEnd: session[5],
        metadata: session[6],
        serviceId: session[7],
        jobId: session[8],
        winner: session[9],
        winningBidId: session[10],
        jobCreated: session[11],
        status: Number(session[12]),
      };
    } catch {
      return null;
    }
  }

  async getUserBid(sessionId: bigint, user: Address): Promise<BidInfo | null> {
    try {
      const bid = (await this.publicClient.readContract({
        address: this.contracts.biddingSystem! as Address,
        abi: BIDDING_SYSTEM_ABI,
        functionName: 'getUserBid',
        args: [BigInt(sessionId), user],
      } as any)) as [

        bigint,
        Address,
        bigint,
        bigint,
        string,
        string,
        boolean,
        boolean,
        boolean,
        bigint,
      ];
      return {
        bidId: bid[0],
        bidder: bid[1],
        proposedAmount: bid[2],
        stake: bid[3],
        message: bid[4],
        commitHash: bid[5],
        revealed: bid[6],
        accepted: bid[7],
        stakeWithdrawn: bid[8],
        timestamp: bid[9],
      };
    } catch {
      return null;
    }
  }

  async getSessionCount(): Promise<number> {
    const result = await this.publicClient.readContract({
      address: this.contracts.biddingSystem! as Address,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'sessionCounter',
    } as any);
    return Number(result as bigint);
  }


  calculateStake(maxBudget: bigint): bigint {
    return (maxBudget * 100n) / 10000n;
  }
}

// ============================================================================
// MilestoneModule - Phase 24: Milestone payments and dispute resolution
// ============================================================================

interface Milestone {
  description: string;
  amount: bigint;
  dueDate: bigint;
  completed: boolean;
  released: boolean;
  proofHash: string;
}

interface JobMilestones {
  client: Address;
  provider: Address;
  paymentToken: Address;
  totalBudget: bigint;
  usesMilestones: boolean;
}

interface Dispute {
  jobId: bigint;
  flaggler: Address;
  arbiter: Address;
  flaggedAt: bigint;
  resolved: boolean;
  releaseToProvider: boolean;
  feePaid: bigint;
  milestoneIndex: bigint;
}

class MilestoneModule {
  private wallet: any;
  private publicClient: any;
  private contracts: ContractAddresses;

  constructor(wallet: any, publicClient: any, contracts: ContractAddresses) {
    this.wallet = wallet;
    this.publicClient = publicClient;
    this.contracts = contracts;
  }

  private get address(): Address {
    return this.wallet.account.address;
  }

  async enableMilestones(params: {
    jobId: bigint;
    client: Address;
    provider: Address;
    paymentToken: Address;
    totalBudget: bigint;
  }): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.milestoneEscrow! as Address,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'enableMilestones',
      args: [params.jobId, params.client, params.provider, params.paymentToken, params.totalBudget],
    } as any);
    return { hash, wait: () => this.publicClient.waitForTransactionReceipt({ hash }) };
  }

  async addMilestone(params: {
    jobId: bigint;
    amount: bigint;
    description: string;
    dueDate: bigint;
  }): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.milestoneEscrow! as Address,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'addMilestone',
      args: [params.jobId, params.amount, params.description, params.dueDate],
    } as any);
    return { hash, wait: () => this.publicClient.waitForTransactionReceipt({ hash }) };
  }

  async completeMilestone(params: {
    jobId: bigint;
    milestoneIndex: bigint;
    proofHash: string;
  }): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.milestoneEscrow! as Address,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'completeMilestone',
      args: [params.jobId, params.milestoneIndex, params.proofHash as `0x${string}`],
    } as any);
    return { hash, wait: () => this.publicClient.waitForTransactionReceipt({ hash }) };
  }

  async releaseMilestone(params: { jobId: bigint; milestoneIndex: bigint }): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.milestoneEscrow! as Address,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'releaseMilestone',
      args: [params.jobId, params.milestoneIndex],
    } as any);
    return { hash, wait: () => this.publicClient.waitForTransactionReceipt({ hash }) };
  }

  async getJobMilestones(jobId: bigint): Promise<Milestone[]> {
    return (await this.publicClient.readContract({
      address: this.contracts.milestoneEscrow! as Address,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'getJobMilestones',
      args: [jobId],
    } as any)) as unknown as Milestone[];
  }

  async getJobMilestonesDetails(jobId: bigint): Promise<JobMilestones | null> {
    try {
      return (await this.publicClient.readContract({
        address: this.contracts.milestoneEscrow! as Address,
        abi: MILESTONE_ESCROW_ABI,
        functionName: 'jobMilestones',
        args: [jobId],
      } as any)) as unknown as JobMilestones;
    } catch {
      return null;
    }
  }

  async registerAsArbiter(token: Address, amount: bigint): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.milestoneEscrow! as Address,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'registerAsArbiter',
      args: [token, amount],
    } as any);
    return { hash, wait: () => this.publicClient.waitForTransactionReceipt({ hash }) };
  }

  async unregisterAsArbiter(): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.milestoneEscrow! as Address,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'unregisterAsArbiter',
    } as any);
    return { hash, wait: () => this.publicClient.waitForTransactionReceipt({ hash }) };
  }

  async isArbiter(address: Address): Promise<boolean> {
    return (await this.publicClient.readContract({
      address: this.contracts.milestoneEscrow! as Address,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'isArbiter',
      args: [address],
    } as any)) as unknown as boolean;
  }

  async getArbiterStake(arbiter: Address): Promise<bigint> {
    return (await this.publicClient.readContract({
      address: this.contracts.milestoneEscrow! as Address,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'getArbiterStake',
      args: [arbiter],
    } as any)) as unknown as bigint;
  }

  async getArbiterCount(): Promise<number> {
    return Number(await this.publicClient.readContract({
      address: this.contracts.milestoneEscrow! as Address,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'getArbiterCount',
    } as unknown as object));
  }

  async flagDispute(jobId: bigint, milestoneIndex: bigint): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.milestoneEscrow! as Address,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'flagDispute',
      args: [jobId, milestoneIndex],
    } as any);
    return { hash, wait: () => this.publicClient.waitForTransactionReceipt({ hash }) };
  }

  async submitEvidence(params: { jobId: bigint; evidenceHash: string }): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.milestoneEscrow! as Address,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'submitEvidence',
      args: [params.jobId, params.evidenceHash as `0x${string}`],
    } as any);
    return { hash, wait: () => this.publicClient.waitForTransactionReceipt({ hash }) };
  }

  async resolveDispute(params: { jobId: bigint; releaseToProvider: boolean }): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.milestoneEscrow! as Address,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'resolveDispute',
      args: [params.jobId, params.releaseToProvider],
    } as any);
    return { hash, wait: () => this.publicClient.waitForTransactionReceipt({ hash }) };
  }

  async getDispute(jobId: bigint): Promise<Dispute | null> {
    try {
      return (await this.publicClient.readContract({
        address: this.contracts.milestoneEscrow! as Address,
        abi: MILESTONE_ESCROW_ABI,
        functionName: 'getDispute',
        args: [jobId],
      } as any)) as unknown as Dispute;
    } catch {
      return null;
    }
  }

  async getActiveDisputes(): Promise<bigint[]> {
    return (await this.publicClient.readContract({
      address: this.contracts.milestoneEscrow! as Address,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'getActiveDisputes',
    } as any)) as unknown as bigint[];
  }
}


class AdminRegistryModule {
  private wallet: any;
  private publicClient: any;
  private contracts: ContractAddresses;

  constructor(wallet: any, publicClient: any, contracts: ContractAddresses) {
    this.wallet = wallet;
    this.publicClient = publicClient;
    this.contracts = contracts;
  }

  private get address(): Address {
    return this.wallet.account.address;
  }

  async setSlashManager(slashManager: Address): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.adminRegistry! as Address,
      abi: parseAbi([
        'function setSlashManager(address _slashManager) external',
      ]),
      functionName: 'setSlashManager',
      args: [slashManager],
    } as any);
    return { hash, wait: () => this.publicClient.waitForTransactionReceipt({ hash }) };
  }

  async getSlashManager(): Promise<Address> {
    return (await this.publicClient.readContract({
      address: this.contracts.adminRegistry! as Address,
      abi: parseAbi([
        'function slashManager() external view returns (address)',
      ]),
      functionName: 'slashManager',
    } as any)) as unknown as Address;
  }
}

// ============================================================================
// Exports
// ============================================================================

export { NETWORKS } from './types';
export * from './types';
export { EFPModule } from './efp';
