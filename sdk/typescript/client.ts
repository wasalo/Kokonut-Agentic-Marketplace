/**
 * Kokonut Agent SDK - Main Client
 * Type-safe client for interacting with the Kokonut Agent Economy Stack
 */

import { ethers } from 'ethers';
import { createPublicClient, http, type Address as ViemAddress } from 'viem';
import { mainnet, sepolia } from 'viem/chains';
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
  EvaluationParams,
  Proposal,
  Evaluation,
  AgentMetadata,
  SDKEventName,
  SDKEventHandler,
  SDKEventMap,
  TransactionResult,
  Address,
} from './types';
import { NETWORKS } from './types';

// ============================================================================
// Network Configurations (imported from types)
// ============================================================================

// ============================================================================
// ABIs (Minimal for SDK operations)
// ============================================================================

const IDENTITY_REGISTRY_ABI = [
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
] as const;

const LEGACY_REPUTATION_ABI = [
  'function submitFeedback(address agent, uint256 taskId, int256 rating, string calldata metadataURI) external returns (uint256)',
  'function getAgentReputation(address agent) external view returns (int256 average, uint256 total, uint256 providers)',
] as const;

const SERVICE_REGISTRY_ABI = [
  'function createService(uint256 agentId, string calldata name, string calldata description, string calldata metadataURI, uint256 price, address paymentToken) external returns (uint256 serviceId)',
  'function updateService(uint256 serviceId, string calldata name, string calldata description, string calldata metadataURI, uint256 price) external',
  'function deactivateService(uint256 serviceId) external',
  'function activateService(uint256 serviceId) external',
  'function getService(uint256 serviceId) external view returns (tuple(uint256 id, address provider, uint256 agentId, string name, string description, string metadataURI, uint256 price, address paymentToken, bool isActive, uint256 createdAt))',
  'function getServices(uint256 start, uint256 count) external view returns (uint256[] memory)',
  'function getActiveServiceCount() external view returns (uint256)',
  'function getProviderServices(address provider) external view returns (uint256[] memory)',
  'function getServicesByAgent(uint256 agentId) external view returns (uint256[] memory)',
  'function getServiceCounter() external view returns (uint256)',
  'event ServiceCreated(uint256 indexed serviceId, address indexed provider, uint256 indexed agentId, string name, uint256 price)',
  'event ServiceUpdated(uint256 indexed serviceId)',
  'event ServiceDeactivated(uint256 indexed serviceId)',
  'event ServiceActivated(uint256 indexed serviceId)',
] as const;

const AGENTIC_COMMERCE_ABI = [
  // V6 Functions (using correct contract names)
  'function createJob(address provider, address evaluator, uint256 expiredAt, string calldata description, address hook, bool evaluatorFee) external returns (uint256 jobId)',
  // NOTE: createOpenJob is DISABLED in V6.1 - use BiddingSystem for bidding instead
  'function setProvider(uint256 jobId, address provider) external',
  'function setBudget(uint256 jobId, uint256 amount) external',
  'function fund(uint256 jobId) external payable',
  'function submit(uint256 jobId, bytes32 deliverable) external',
  'function complete(uint256 jobId, bytes32 reason) external',
  'function reject(uint256 jobId, bytes32 reason) external',
  'function claimRefund(uint256 jobId) external',
  // V5: Timeout completion for unresponsive evaluators
  'function completeAfterTimeout(uint256 jobId, bytes32 reason) external',
  'function setDisputeWindow(uint256 jobId, uint256 window) external',
  'function setNonResponsiveSlashBP(uint256 jobId, uint256 slashBP) external',
  // Bidding Functions - DISABLED in V6.1 (moved to BiddingSystem)
  // Use this.bidding.commitBid(), this.bidding.revealBid(), etc. instead
  // 'function commitBid(uint256 jobId, bytes32 commitHash) external payable', // DISABLED
  // 'function revealBid(uint256 jobId, uint256 amount, string calldata message, bytes32 salt) external', // DISABLED
  // 'function acceptBid(uint256 jobId, uint256 bidId) external', // DISABLED
  // 'function withdrawStake(uint256 jobId) external', // DISABLED
  // View Functions
  'function getJob(uint256 jobId) external view returns (tuple(uint256 id, address client, address provider, address evaluator, uint256 serviceId, address paymentToken, string description, uint256 budget, uint256 expiredAt, uint8 status, address hook, bytes32 deliverable))',
  'function jobCounter() external view returns (uint256)',
  'function getClientJobCount(address client) external view returns (uint256)',
  // NOTE: getUserBid, jobBidCount are DISABLED in V6.1 - use BiddingSystem instead
  'function isEvaluatorFeeEnabled(uint256 jobId) external view returns (bool)',
  // Admin Functions
  'function setPlatformTreasury(address treasury) external',
  // Events
  'event JobCreated(uint256 indexed jobId, address indexed client, address indexed provider, address evaluator, uint256 serviceId, uint256 expiredAt)',
  'event OpenJobCreated(uint256 indexed jobId, address indexed client, uint256 maxBudget, address evaluator, uint256 expiredAt)',
  'event ProviderSet(uint256 indexed jobId, address indexed provider)',
  'event BudgetSet(uint256 indexed jobId, uint256 amount)',
  'event JobFunded(uint256 indexed jobId, address indexed client, uint256 amount)',
  'event JobSubmitted(uint256 indexed jobId, address indexed provider, bytes32 deliverable)',
  'event JobCompleted(uint256 indexed jobId, address indexed evaluator, bytes32 reason, uint256 evaluatorFee)',
  'event PaymentReleased(uint256 indexed jobId, address indexed provider, uint256 amount)',
  'event JobRejected(uint256 indexed jobId, address indexed rejector, bytes32 reason)',
  'event Refunded(uint256 indexed jobId, address indexed client, uint256 amount)',
  'event JobExpired(uint256 indexed jobId)',
  'event JobStatusChanged(uint256 indexed jobId, uint8 indexed oldStatus, uint8 indexed newStatus, uint256 timestamp)',
  'event DisputeWindowSet(uint256 indexed jobId, uint256 window)',
  'event NonResponsiveSlashSet(uint256 indexed jobId, uint256 slashBP)',
  'event EvaluatorSlashedForInactivity(uint256 indexed jobId, address indexed evaluator, uint256 slashAmount)',
  // Bidding Events
  'event BidCommitted(uint256 indexed jobId, address indexed bidder, uint256 stakeAmount, bytes32 commitHash)',
  'event BidRevealed(uint256 indexed jobId, address indexed bidder, uint256 proposedAmount, string message)',
  'event BidAccepted(uint256 indexed jobId, address indexed bidder, uint256 bidId, uint256 acceptedAmount)',
  'event BidWithdrawn(uint256 indexed jobId, address indexed bidder, uint256 stakeReturned)',
] as const;

const AGENT_REVIEW_ABI = [
  // V5 Functions (correct contract function names)
  'function createProposal(string calldata title, string calldata description, string calldata criteriaURI, uint256 reward, uint256 decisionDeadline) external payable returns (uint256 proposalId)',
  'function submitEvaluation(uint256 proposalId, int256 confidenceScore, string calldata reasoningURI) external payable',
  'function attestDecision(uint256 proposalId, address winningEvaluator) external',
  'function slashEvaluator(address evaluator, uint256 proposalId, string calldata reason) external',
  'function claimReward(uint256 proposalId) external',
  'function releaseStake(uint256 proposalId) external',
  'function cancelProposal(uint256 proposalId) external',
  'function getProposal(uint256 proposalId) external view returns (tuple(uint256 id, address proposer, string title, string description, string criteriaURI, uint256 reward, uint8 status, uint256 createdAt, uint256 decisionDeadline, address winningEvaluator))',
  'function getEvaluation(uint256 proposalId, address evaluator) external view returns (tuple(uint256 proposalId, address evaluator, int256 confidenceScore, string reasoningURI, uint256 stakeAmount, bool isFinal, bool rewardClaimed, bool stakeReleased, uint256 submittedAt, uint256 rewardAmount))',
  'function getProposalEvaluators(uint256 proposalId) external view returns (address[] memory)',
  // V5: Admin functions
  'function setSlashManager(address slashManager_) external',
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
] as const;

const USDC_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
] as const;

// ============================================================================
// KokonutClient
// ============================================================================

export class KokonutClient {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private network: NetworkName;
  private contracts: ContractAddresses;
  private eventHandlers: Map<SDKEventName, Set<SDKEventHandler>> = new Map();

  // M5 Fix: Viem public client for multicall (read operations)
  private viemClient: ReturnType<typeof createPublicClient>;

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
  public bidding: BiddingSystemModule; // Phase 11: Standalone bidding

  constructor(config: SDKConfig) {
    // Setup network
    this.network = config.network || 'sepolia';
    const networkConfig = NETWORKS[this.network];
    this.contracts = { ...networkConfig.contracts, ...config.contracts };

    // Setup provider and wallet
    const rpcUrl = config.rpcUrl || networkConfig.rpcUrl;
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    // M5 Fix: Create viem client for multicall
    const chain = this.network === 'mainnet' ? mainnet : sepolia;
    this.viemClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    if (typeof config.wallet === 'string') {
      this.wallet = new ethers.Wallet(config.wallet, this.provider);
    } else {
      this.wallet = config.wallet as ethers.Wallet;
      if (this.wallet.provider === undefined) {
        this.wallet = this.wallet.connect(this.provider);
      }
    }

    // Initialize modules
    this.identity = new IdentityModule(this.wallet, this.contracts);
    this.reputation = new ReputationModule(this.wallet, this.contracts);
    this.services = new ServicesModule(this.wallet, this.contracts, this.viemClient);
    this.commerce = new CommerceModule(this.wallet, this.contracts);
    this.review = new ReviewModule(this.wallet, this.contracts);
    this.skills = new SkillsModule(this.wallet, this.contracts);
    this.priceOracle = new PriceOracleModule(this.provider, this.contracts);
    this.commitReveal = new CommitRevealModule(this.wallet, this.contracts);
    this.slashManager = new SlashManagerModule(this.wallet, this.contracts);
    this.bidding = new BiddingSystemModule(this.wallet, this.contracts);

    // Setup event listeners
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen to contract events and forward to handlers
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

  // Event emitter methods
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

  // Utility methods
  get address(): Address {
    return this.wallet.address as Address;
  }

  get networkName(): NetworkName {
    return this.network;
  }

  get explorerUrl(): string {
    return NETWORKS[this.network].explorerUrl;
  }

  async getBalance(): Promise<bigint> {
    return this.provider.getBalance(this.wallet.address);
  }

  async getUSDCBalance(): Promise<bigint> {
    const usdc = new ethers.Contract(this.contracts.usdc, USDC_ABI, this.provider);
    return usdc.balanceOf(this.wallet.address) as Promise<bigint>;
  }
}

// ============================================================================
// Identity Module
// ============================================================================

class IdentityModule {
  private wallet: ethers.Wallet;
  private contracts: ContractAddresses;

  constructor(wallet: ethers.Wallet, contracts: ContractAddresses) {
    this.wallet = wallet;
    this.contracts = contracts;
  }

  private get contract() {
    return new ethers.Contract(this.contracts.erc8004Registry, IDENTITY_REGISTRY_ABI, this.wallet);
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
    const tx = await this.contract.register(metadataURI);

    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async getAgent(agentId: number | bigint): Promise<{
    owner: Address;
    agentURI: string;
    agentWallet: Address;
    isActive: boolean;
  }> {
    const agent = await this.contract.getAgent(agentId);
    return {
      owner: agent[0] as Address,
      agentURI: agent[1],
      agentWallet: agent[2] as Address,
      isActive: agent[3],
    };
  }

  async isAgent(address: Address): Promise<boolean> {
    return this.contract.isAgent(address);
  }

  async getAgentCount(): Promise<bigint> {
    return this.contract.getCurrentAgentId();
  }

  async isRegistered(): Promise<boolean> {
    return this.isAgent(this.wallet.address as Address);
  }

  async setAgentURI(agentId: number | bigint, newURI: string): Promise<TransactionResult> {
    const tx = await this.contract.setAgentURI(agentId, newURI);
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async getMetadata(agentId: number | bigint, key: string): Promise<string> {
    const result = await this.contract.getMetadata(agentId, key);
    return ethers.toUtf8String(result);
  }

  async setMetadata(
    agentId: number | bigint,
    key: string,
    value: string
  ): Promise<TransactionResult> {
    const tx = await this.contract.setMetadata(agentId, key, ethers.toUtf8Bytes(value));
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async getAgentWallet(agentId: number | bigint): Promise<Address> {
    return (await this.contract.getAgentWallet(agentId)) as Address;
  }

  async setAgentWallet(
    agentId: number | bigint,
    newWallet: Address,
    deadline: bigint,
    signature: `0x${string}`
  ): Promise<TransactionResult> {
    const tx = await this.contract.setAgentWallet(agentId, newWallet, deadline, signature);
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async unsetAgentWallet(agentId: number | bigint): Promise<TransactionResult> {
    const tx = await this.contract.unsetAgentWallet(agentId);
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  on<K extends 'AgentRegistered'>(event: K, handler: SDKEventHandler<SDKEventMap[K]>): void {
    this.contract.on(event, (agentId, _agentURI, owner) => {
      handler({ agentId, owner: owner as Address });
    });
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
  private wallet: ethers.Wallet;
  private contracts: ContractAddresses;

  constructor(wallet: ethers.Wallet, contracts: ContractAddresses) {
    this.wallet = wallet;
    this.contracts = contracts;
  }

  private get contract() {
    return new ethers.Contract(
      this.contracts.erc8004Reputation,
      LEGACY_REPUTATION_ABI,
      this.wallet
    );
  }

  async submitFeedback(params: FeedbackParams): Promise<TransactionResult> {
    const metadataURI = params.comment || '';
    const tx = await this.contract.submitFeedback(
      params.agent,
      params.taskId || 0,
      params.rating,
      metadataURI
    );

    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async getReputation(agent: Address): Promise<ReputationData> {
    const [avg, total, providers] = await this.contract.getAgentReputation(agent);
    const avgNum = Number(avg);
    return {
      averageRating: avgNum,
      totalFeedbacks: Number(total),
      providers: Number(providers),
      score: avgNum / 10, // Convert to percentage
    };
  }
}

// ============================================================================
// Services Module
// ============================================================================

class ServicesModule {
  private wallet: ethers.Wallet;
  private contracts: ContractAddresses;
  private viemClient: ReturnType<typeof createPublicClient>;

  constructor(
    wallet: ethers.Wallet,
    contracts: ContractAddresses,
    viemClient: ReturnType<typeof createPublicClient>
  ) {
    this.wallet = wallet;
    this.contracts = contracts;
    this.viemClient = viemClient;
  }

  private get contract() {
    return new ethers.Contract(this.contracts.serviceRegistry, SERVICE_REGISTRY_ABI, this.wallet);
  }

  async create(params: ServiceParams): Promise<TransactionResult> {
    const tx = await this.contract.createService(
      params.agentId,
      params.name,
      params.description,
      params.metadataURI || '',
      params.price,
      params.paymentToken || this.contracts.usdc
    );

    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async getService(serviceId: number | bigint): Promise<Service> {
    const service = await this.contract.getService(serviceId);
    return {
      id: service.id,
      provider: service.provider as Address,
      agentId: service.agentId,
      name: service.name,
      description: service.description,
      metadataURI: service.metadataURI,
      price: service.price,
      paymentToken: service.paymentToken as Address,
      isActive: service.isActive,
      createdAt: service.createdAt,
    };
  }

  /**
   * M5 Fix: Use multicall instead of N+1 queries
   */
  async list(page = 0, pageSize = 20): Promise<Service[]> {
    const serviceIds = await this.contract.getServices(page * pageSize, pageSize);

    if (serviceIds.length === 0) return [];

    // M5 Fix: Use viem multicall for batch fetching
    const calls = serviceIds.map((id: bigint) => ({
      address: this.contracts.serviceRegistry as ViemAddress,
      abi: SERVICE_REGISTRY_ABI,
      functionName: 'getService',
      args: [id],
    }));

    const results = await this.viemClient.multicall({ contracts: calls });
    const services: Service[] = [];

    for (const result of results) {
      if (result.status === 'success') {
        const service = result.result as {
          id: bigint;
          provider: string;
          agentId: bigint;
          name: string;
          description: string;
          metadataURI: string;
          price: bigint;
          paymentToken: string;
          isActive: boolean;
          createdAt: bigint;
        };
        services.push({
          id: service.id,
          provider: service.provider as Address,
          agentId: service.agentId,
          name: service.name,
          description: service.description,
          metadataURI: service.metadataURI,
          price: service.price,
          paymentToken: service.paymentToken as Address,
          isActive: service.isActive,
          createdAt: service.createdAt,
        });
      }
    }

    return services;
  }

  async getActiveCount(): Promise<number> {
    return Number(await this.contract.getActiveServiceCount());
  }

  /**
   * M5 Fix: Use multicall instead of N+1 queries
   */
  async getProviderServices(provider: Address): Promise<Service[]> {
    const serviceIds = await this.contract.getProviderServices(provider);

    if (serviceIds.length === 0) return [];

    // M5 Fix: Use viem multicall for batch fetching
    const calls = serviceIds.map((id: bigint) => ({
      address: this.contracts.serviceRegistry as ViemAddress,
      abi: SERVICE_REGISTRY_ABI,
      functionName: 'getService',
      args: [id],
    }));

    const results = await this.viemClient.multicall({ contracts: calls });
    const services: Service[] = [];

    for (const result of results) {
      if (result.status === 'success') {
        const service = result.result as {
          id: bigint;
          provider: string;
          agentId: bigint;
          name: string;
          description: string;
          metadataURI: string;
          price: bigint;
          paymentToken: string;
          isActive: boolean;
          createdAt: bigint;
        };
        services.push({
          id: service.id,
          provider: service.provider as Address,
          agentId: service.agentId,
          name: service.name,
          description: service.description,
          metadataURI: service.metadataURI,
          price: service.price,
          paymentToken: service.paymentToken as Address,
          isActive: service.isActive,
          createdAt: service.createdAt,
        });
      }
    }

    return services;
  }

  /**
   * M5 Fix: Use multicall instead of N+1 queries
   */
  async getServicesByAgent(agentId: bigint): Promise<Service[]> {
    const serviceIds = await this.contract.getServicesByAgent(agentId);

    if (serviceIds.length === 0) return [];

    // M5 Fix: Use viem multicall for batch fetching
    const calls = serviceIds.map((id: bigint) => ({
      address: this.contracts.serviceRegistry as ViemAddress,
      abi: SERVICE_REGISTRY_ABI,
      functionName: 'getService',
      args: [id],
    }));

    const results = await this.viemClient.multicall({ contracts: calls });
    const services: Service[] = [];

    for (const result of results) {
      if (result.status === 'success') {
        const service = result.result as {
          id: bigint;
          provider: string;
          agentId: bigint;
          name: string;
          description: string;
          metadataURI: string;
          price: bigint;
          paymentToken: string;
          isActive: boolean;
          createdAt: bigint;
        };
        services.push({
          id: service.id,
          provider: service.provider as Address,
          agentId: service.agentId,
          name: service.name,
          description: service.description,
          metadataURI: service.metadataURI,
          price: service.price,
          paymentToken: service.paymentToken as Address,
          isActive: service.isActive,
          createdAt: service.createdAt,
        });
      }
    }

    return services;
  }

  async updateService(
    serviceId: bigint,
    name: string,
    description: string,
    metadataURI: string,
    price: bigint
  ): Promise<TransactionResult> {
    const tx = await this.contract.updateService(serviceId, name, description, metadataURI, price);
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async deactivateService(serviceId: bigint): Promise<TransactionResult> {
    const tx = await this.contract.deactivateService(serviceId);
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async activateService(serviceId: bigint): Promise<TransactionResult> {
    const tx = await this.contract.activateService(serviceId);
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async getServiceCounter(): Promise<number> {
    return Number(await this.contract.getServiceCounter());
  }

  on<K extends 'ServiceCreated'>(event: K, handler: SDKEventHandler<SDKEventMap[K]>): void {
    this.contract.on(event, (serviceId, provider, agentId) => {
      handler({ serviceId, provider: provider as Address, agentId });
    });
  }
}

// ============================================================================
// Commerce Module
// ============================================================================

class CommerceModule {
  private wallet: ethers.Wallet;
  private contracts: ContractAddresses;
  private usdc: ethers.Contract;

  constructor(wallet: ethers.Wallet, contracts: ContractAddresses) {
    this.wallet = wallet;
    this.contracts = contracts;
    this.usdc = new ethers.Contract(contracts.usdc, USDC_ABI, wallet);
  }

  private get contract() {
    return new ethers.Contract(this.contracts.agenticCommerce, AGENTIC_COMMERCE_ABI, this.wallet);
  }

  async createJob(params: JobParams): Promise<TransactionResult> {
    const tx = await this.contract.createJob(
      params.provider,
      params.evaluator || params.provider,
      params.expiredAt || Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
      params.description,
      params.hook || '0x0000000000000000000000000000000000000000',
      params.evaluatorFee || false
    );

    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async createOpenJob(params: OpenJobParams): Promise<TransactionResult> {
    const tx = await this.contract.createOpenJob(
      params.maxBudget,
      params.evaluator || '0x0000000000000000000000000000000000000000',
      params.expiredAt || Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      params.description,
      params.paymentToken || this.contracts.usdc,
      params.evaluatorFee || false
    );

    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async createJobFromService(
    serviceId: bigint,
    evaluator: Address,
    expiredAt: bigint,
    description: string,
    hook: Address,
    evaluatorFee: boolean
  ): Promise<TransactionResult> {
    const tx = await this.contract.createJobFromService(
      serviceId,
      evaluator,
      expiredAt,
      description,
      hook,
      evaluatorFee
    );
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async setProvider(jobId: bigint, provider: Address): Promise<TransactionResult> {
    const tx = await this.contract.setProvider(jobId, provider);
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async setBudget(jobId: bigint, amount: bigint): Promise<TransactionResult> {
    const tx = await this.contract.setBudget(jobId, amount);
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async fundJob(jobId: number | bigint, amount?: bigint): Promise<TransactionResult> {
    // Approve USDC first if amount is provided
    if (amount) {
      const allowance = (await this.usdc.allowance(
        this.wallet.address,
        this.contracts.agenticCommerce
      )) as bigint;

      if (allowance < amount) {
        const approveTx = await this.usdc.approve(
          this.contracts.agenticCommerce,
          ethers.MaxUint256
        );
        await approveTx.wait();
      }
    }

    const tx = await this.contract.fund(jobId);
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async fundJobWithETH(jobId: number | bigint, value?: bigint): Promise<TransactionResult> {
    const tx = await this.contract.fund(jobId, { value: value || 0 });
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async submitJob(jobId: number | bigint, deliverable: `0x${string}`): Promise<TransactionResult> {
    const tx = await this.contract.submit(jobId, deliverable);
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async completeJob(jobId: number | bigint, reason: `0x${string}`): Promise<TransactionResult> {
    const tx = await this.contract.complete(jobId, reason);
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async rejectJob(jobId: number | bigint, reason: `0x${string}`): Promise<TransactionResult> {
    const tx = await this.contract.reject(jobId, reason);
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async getJob(jobId: number | bigint): Promise<Job> {
    const job = await this.contract.getJob(jobId);
    return {
      id: job.id,
      client: job.client as Address,
      provider: job.provider as Address,
      evaluator: job.evaluator as Address,
      serviceId: job.serviceId,
      description: job.description,
      budget: job.budget,
      maxBudget: job.maxBudget,
      expiredAt: job.expiredAt,
      status: job.status as JobStatus,
      hook: job.hook as Address,
      deliverable: job.deliverable as `0x${string}`,
      evaluatorFee: job.evaluatorFee,
      paymentToken: job.paymentToken as Address,
    };
  }

  async getClientJobCount(client: Address): Promise<number> {
    return Number(await this.contract.getClientJobCount(client));
  }

  async getUserBid(jobId: bigint, user: Address): Promise<Bid | null> {
    const bid = await this.contract.getUserBid(jobId, user);
    if (bid.bidder === '0x0000000000000000000000000000000000000000') {
      return null;
    }
    return {
      jobId,
      bidder: bid.bidder as Address,
      amount: bid.amount,
      message: bid.message,
      status: bid.status as BidStatus,
      committedAt: bid.committedAt,
      revealedAt: bid.revealedAt,
    };
  }

  async jobBidCount(jobId: bigint): Promise<number> {
    return Number(await this.contract.jobBidCount(jobId));
  }

  async calculateStake(maxBudget: bigint): Promise<bigint> {
    return this.contract.calculateStake(maxBudget);
  }

  async isEvaluatorFeeEnabled(jobId: bigint): Promise<boolean> {
    return this.contract.isEvaluatorFeeEnabled(jobId);
  }

  async totalStakesHeld(user: Address): Promise<bigint> {
    return this.contract.totalStakesHeld(user);
  }

  // V6 Bidding Functions
  async commitBid(jobId: bigint, amount: bigint, message: string): Promise<TransactionResult> {
    // Calculate stake (1% of amount)
    const stake = (amount * 100n) / 10000n; // 1% = 100/10000
    const commitHash = ethers.solidityPackedKeccak256(
      ['uint256', 'string', 'bytes32'],
      [amount, message, ethers.randomBytes(32)]
    );

    const tx = await this.contract.commitBid(jobId, commitHash, { value: stake });
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async revealBid(params: RevealBidParams): Promise<TransactionResult> {
    const tx = await this.contract.revealBid(
      params.jobId,
      params.amount,
      params.message,
      params.salt
    );
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async acceptBid(jobId: bigint, bidId: bigint): Promise<TransactionResult> {
    const tx = await this.contract.acceptBid(jobId, bidId);
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async withdrawStake(jobId: bigint): Promise<TransactionResult> {
    const tx = await this.contract.withdrawStake(jobId);
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async getMyJobs(): Promise<Job[]> {
    const jobIds = await this.contract.getClientJobs(this.wallet.address);
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
    const tx = await this.usdc.approve(spender, amount);
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async claimRefund(jobId: bigint): Promise<TransactionResult> {
    const tx = await this.contract.claimRefund(jobId);
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  on<K extends 'JobCreated' | 'JobFunded' | 'JobSubmitted' | 'PaymentReleased'>(
    event: K,
    handler: SDKEventHandler<SDKEventMap[K]>
  ): void {
    this.contract.on(event, (...args: unknown[]) => {
      // Map event data based on type
      if (event === 'JobCreated') {
        handler({
          jobId: args[0] as bigint,
          client: args[1] as Address,
          provider: args[2] as Address,
        } as SDKEventMap[K]);
      } else if (event === 'JobFunded') {
        handler({ jobId: args[0] as bigint, budget: args[1] as bigint } as SDKEventMap[K]);
      } else if (event === 'JobSubmitted') {
        handler({ jobId: args[0] as bigint } as SDKEventMap[K]);
      } else if (event === 'PaymentReleased') {
        handler({
          jobId: args[0] as bigint,
          amount: args[1] as bigint,
          recipient: args[2] as Address,
        } as SDKEventMap[K]);
      }
    });
  }
}

// ============================================================================
// Review Module
// ============================================================================

class ReviewModule {
  private wallet: ethers.Wallet;
  private contracts: ContractAddresses;

  constructor(wallet: ethers.Wallet, contracts: ContractAddresses) {
    this.wallet = wallet;
    this.contracts = contracts;
  }

  private get contract() {
    return new ethers.Contract(this.contracts.agentReview, AGENT_REVIEW_ABI, this.wallet);
  }

  async createProposal(params: ProposalParams): Promise<TransactionResult> {
    const tx = await this.contract.createProposal(
      params.title,
      params.description,
      params.criteriaURI || '',
      params.reward,
      params.decisionDeadline
    );

    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async submitEvaluation(params: EvaluationParams): Promise<TransactionResult> {
    const minStake = ethers.parseEther('0.001');
    const tx = await this.contract.submitEvaluation(
      params.proposalId,
      params.confidenceScore,
      params.reasoningURI || '',
      { value: minStake }
    );

    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async attestDecision(proposalId: number | bigint, winner: Address): Promise<TransactionResult> {
    const tx = await this.contract.attestDecision(proposalId, winner);
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async getProposal(proposalId: number | bigint): Promise<Proposal> {
    const proposal = await this.contract.getProposal(proposalId);
    return {
      id: proposal.id,
      proposer: proposal.proposer as Address,
      title: proposal.title,
      description: proposal.description,
      criteriaURI: proposal.criteriaURI,
      reward: proposal.reward,
      status: proposal.status,
      createdAt: proposal.createdAt,
      decisionDeadline: proposal.decisionDeadline,
      winningEvaluator: proposal.winningEvaluator as Address,
    };
  }

  async getEvaluation(proposalId: number | bigint, evaluator: Address): Promise<Evaluation> {
    const eval_ = await this.contract.getEvaluation(proposalId, evaluator);
    return {
      proposalId: eval_.proposalId,
      evaluator: eval_.evaluator as Address,
      confidenceScore: eval_.confidenceScore,
      reasoningURI: eval_.reasoningURI,
      stakeAmount: eval_.stakeAmount,
      isFinal: eval_.isFinal,
      submittedAt: eval_.submittedAt,
    };
  }

  async getProposalCount(): Promise<number> {
    return Number(await this.contract.getProposalCount());
  }

  async claimReward(proposalId: number | bigint): Promise<TransactionResult> {
    const tx = await this.contract.claimReward(proposalId);
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async releaseStake(proposalId: number | bigint): Promise<TransactionResult> {
    const tx = await this.contract.releaseStake(proposalId);
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async slashEvaluator(
    evaluator: Address,
    proposalId: number | bigint,
    reason: string
  ): Promise<TransactionResult> {
    const tx = await this.contract.slashEvaluator(evaluator, proposalId, reason);
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async getProposalEvaluators(proposalId: number | bigint): Promise<Address[]> {
    return (await this.contract.getProposalEvaluators(proposalId)) as Address[];
  }

  async getEvaluatorCount(proposalId: number | bigint): Promise<number> {
    return Number(await this.contract.getEvaluatorCount(proposalId));
  }

  async cancelProposal(proposalId: number | bigint): Promise<TransactionResult> {
    const tx = await this.contract.cancelProposal(proposalId);
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async withdrawETH(to: Address, amount: bigint): Promise<TransactionResult> {
    const tx = await this.contract.withdrawETH(to, amount);
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  on<K extends 'ProposalCreated' | 'EvaluationSubmitted' | 'DecisionAttested'>(
    event: K,
    handler: SDKEventHandler<SDKEventMap[K]>
  ): void {
    this.contract.on(event, (...args: unknown[]) => {
      if (event === 'ProposalCreated') {
        handler({ proposalId: args[0] as bigint, proposer: args[1] as Address } as SDKEventMap[K]);
      } else if (event === 'EvaluationSubmitted') {
        handler({
          proposalId: args[0] as bigint,
          evaluator: args[1] as Address,
          score: args[2] as bigint,
        } as SDKEventMap[K]);
      } else if (event === 'DecisionAttested') {
        handler({ proposalId: args[0] as bigint, winner: args[1] as Address } as SDKEventMap[K]);
      }
    });
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

const AGENT_SKILL_REGISTRY_ABI = [
  'function registerSkill(uint256 agentId, string calldata name, string calldata version, string calldata description, string calldata endpoint, string[] calldata domains) external returns (uint256 skillId)',
  'function updateSkill(uint256 skillId, string calldata name, string calldata version, string calldata description, string calldata endpoint, string[] calldata domains) external',
  'function getAgentSkills(uint256 agentId) external view returns (uint256[] memory)',
  'function getSkill(uint256 skillId) external view returns (tuple(uint256 agentId, string name, string version, string description, string endpoint, string[] domains, bool isActive, address registeredBy, uint256 registeredAt))',
  'function getSkillData(uint256 skillId) external view returns (tuple(uint256 id, uint256 agentId, string name, string version, string description, string endpoint, string[] domains, bool isActive, address registeredBy, uint256 registeredAt))',
  'function deactivateSkill(uint256 skillId) external',
  'function getTotalSkillCount() external view returns (uint256)',
  'function getAgentSkillCount(uint256 agentId) external view returns (uint256)',
  'function findSkillsByDomain(string calldata domain) external view returns (uint256[] memory)',
  'event SkillRegistered(uint256 indexed agentId, uint256 indexed skillId, string name, string version, address indexed registeredBy)',
  'event SkillUpdated(uint256 indexed skillId, string name, string version)',
  'event SkillDeactivated(uint256 indexed skillId, address indexed deactivatedBy)',
] as const;

class SkillsModule {
  private wallet: ethers.Wallet;
  private contracts: ContractAddresses;

  constructor(wallet: ethers.Wallet, contracts: ContractAddresses) {
    this.wallet = wallet;
    this.contracts = contracts;
  }

  private get contract() {
    return new ethers.Contract(this.contracts.skillRegistry, AGENT_SKILL_REGISTRY_ABI, this.wallet);
  }

  async registerSkill(
    agentId: bigint,
    name: string,
    version: string,
    description: string,
    endpoint: string,
    domains: string[]
  ): Promise<TransactionResult> {
    const tx = await this.contract.registerSkill(
      agentId,
      name,
      version,
      description,
      endpoint,
      domains
    );
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async getAgentSkills(agentId: bigint): Promise<bigint[]> {
    return this.contract.getAgentSkills(agentId);
  }

  async getSkill(skillId: bigint): Promise<Skill> {
    const skill = await this.contract.getSkill(skillId);
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
    const skill = await this.contract.getSkillData(skillId);
    return {
      id: skill.id,
      agentId: skill.agentId,
      name: skill.name,
      version: skill.version,
      description: skill.description,
      endpoint: skill.endpoint,
      domains: skill.domains,
      isActive: skill.isActive,
      registeredBy: skill.registeredBy,
      registeredAt: skill.registeredAt,
    };
  }

  async updateSkill(
    skillId: bigint,
    name: string,
    version: string,
    description: string,
    endpoint: string,
    domains: string[]
  ): Promise<TransactionResult> {
    const tx = await this.contract.updateSkill(
      skillId,
      name,
      version,
      description,
      endpoint,
      domains
    );
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async getTotalSkillCount(): Promise<number> {
    return Number(await this.contract.getTotalSkillCount());
  }

  async getAgentSkillCount(agentId: bigint): Promise<number> {
    return Number(await this.contract.getAgentSkillCount(agentId));
  }

  async findSkillsByDomain(domain: string): Promise<bigint[]> {
    return this.contract.findSkillsByDomain(domain);
  }

  async deactivateSkill(skillId: bigint): Promise<TransactionResult> {
    const tx = await this.contract.deactivateSkill(skillId);
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }
}

// ============================================================================
// PriceOracle Module
// ============================================================================

const PRICE_ORACLE_ABI = [
  'function getUSDCPrice() external view returns (uint256)',
  'function getETHRate() external view returns (uint256)',
  'function isStale() external view returns (bool)',
] as const;

class PriceOracleModule {
  private provider: ethers.JsonRpcProvider;
  private contracts: ContractAddresses;

  constructor(provider: ethers.JsonRpcProvider, contracts: ContractAddresses) {
    this.provider = provider;
    this.contracts = contracts;
  }

  private get contract() {
    return new ethers.Contract(this.contracts.priceOracle, PRICE_ORACLE_ABI, this.provider);
  }

  async getUSDCPrice(): Promise<bigint> {
    return this.contract.getUSDCPrice();
  }

  async getETHRate(): Promise<bigint> {
    return this.contract.getETHRate();
  }

  async isStale(): Promise<boolean> {
    return this.contract.isStale();
  }
}

// ============================================================================
// CommitReveal Module
// ============================================================================

const COMMIT_REVEAL_ABI = [
  'function commit(bytes32 commitment) external',
  'function reveal(string calldata data, uint256 nonce, uint256 serviceId) external',
  'function getCommitment(address user, uint256 nonce) external view returns (bytes32)',
] as const;

class CommitRevealModule {
  private wallet: ethers.Wallet;
  private contracts: ContractAddresses;

  constructor(wallet: ethers.Wallet, contracts: ContractAddresses) {
    this.wallet = wallet;
    this.contracts = contracts;
  }

  private get contract() {
    return new ethers.Contract(this.contracts.commitReveal, COMMIT_REVEAL_ABI, this.wallet);
  }

  async commit(commitment: string): Promise<TransactionResult> {
    const tx = await this.contract.commit(commitment);
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async reveal(data: string, nonce: bigint, serviceId: bigint): Promise<TransactionResult> {
    const tx = await this.contract.reveal(data, nonce, serviceId);
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async getCommitment(user: Address, nonce: bigint): Promise<string> {
    return this.contract.getCommitment(user, nonce);
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

const SLASH_MANAGER_ABI = [
  'function createProposal(address evaluator, uint256 proposalId, uint256 amount, string calldata reason) external returns (bytes32)',
  'function confirmProposal(bytes32 proposalId) external',
  'function executeProposal(bytes32 proposalId) external',
  'function cancelProposal(bytes32 proposalId) external',
  'function getProposal(bytes32 proposalId) external view returns (address evaluator, uint256 amount, string reason, uint256 confirmations, uint256 execAfter, bool isExecuted)',
  'function isSigner(address account) external view returns (bool)',
] as const;

class SlashManagerModule {
  private wallet: ethers.Wallet;
  private contracts: ContractAddresses;

  constructor(wallet: ethers.Wallet, contracts: ContractAddresses) {
    this.wallet = wallet;
    this.contracts = contracts;
  }

  private get contract() {
    return new ethers.Contract(this.contracts.slashManager, SLASH_MANAGER_ABI, this.wallet);
  }

  async createProposal(
    evaluator: Address,
    proposalId: bigint,
    amount: bigint,
    reason: string
  ): Promise<TransactionResult> {
    const tx = await this.contract.createProposal(evaluator, proposalId, amount, reason);
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async confirmProposal(proposalId: string): Promise<TransactionResult> {
    const tx = await this.contract.confirmProposal(proposalId);
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async executeProposal(proposalId: string): Promise<TransactionResult> {
    const tx = await this.contract.executeProposal(proposalId);
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async cancelProposal(proposalId: string): Promise<TransactionResult> {
    const tx = await this.contract.cancelProposal(proposalId);
    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async getProposal(proposalId: string): Promise<SlashProposal> {
    const proposal = await this.contract.getProposal(proposalId);
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
    return this.contract.isSigner(account);
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

const BIDDING_SYSTEM_ABI = [
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
  'function getSession(uint256 sessionId) external view returns (tuple(uint256 id, address creator, address evaluator, uint256 maxBudget, uint256 deadline, uint256 revealWindowEnd, bytes metadata, uint256 serviceId, uint256 jobId, address winner, uint256 winningBidId, bool jobCreated, uint8 status))',
  'function getUserBid(uint256 sessionId, address user) external view returns (tuple(uint256 bidId, address bidder, uint256 proposedAmount, uint256 stake, string message, bytes32 commitHash, bool revealed, bool accepted, bool stakeWithdrawn, uint256 timestamp))',
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
] as const;

class BiddingSystemModule {
  private wallet: ethers.Wallet;
  private contracts: ContractAddresses;

  constructor(wallet: ethers.Wallet, contracts: ContractAddresses) {
    this.wallet = wallet;
    this.contracts = contracts;
  }

  private get contract() {
    return new ethers.Contract(this.contracts.biddingSystem!, BIDDING_SYSTEM_ABI, this.wallet);
  }

  async createSession(params: {
    evaluator: Address;
    maxBudget: bigint;
    deadline: bigint;
    metadata?: string;
    serviceId?: bigint;
  }): Promise<TransactionResult & { sessionId: bigint }> {
    const stake = (params.maxBudget * 100n) / 10000n; // 1% stake
    const tx = await this.contract.createBiddingSession(
      params.evaluator,
      params.maxBudget,
      params.deadline,
      params.metadata || '0x',
      params.serviceId || 0,
      { value: stake }
    );
    const receipt = await tx.wait();

    // Parse session ID from event
    const iface = new ethers.Interface(BIDDING_SYSTEM_ABI);
    const log = receipt.logs.find((l: ethers.Log) => {
      try {
        const parsed = iface.parseLog(l);
        return parsed?.name === 'BiddingSessionCreated';
      } catch {
        return false;
      }
    });

    let sessionId = 0n;
    if (log) {
      const parsed = iface.parseLog(log);
      sessionId = parsed?.args[0] as bigint;
    }

    return {
      hash: tx.hash,
      wait: () => tx.wait(),
      sessionId,
    };
  }

  async commitBid(params: {
    sessionId: bigint;
    amount: bigint;
    message: string;
    salt?: string;
  }): Promise<TransactionResult> {
    // Create commitment hash
    const salt = params.salt || ethers.randomBytes(32).toString();
    const commitHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256', 'string', 'bytes32'],
        [params.amount, params.message, salt]
      )
    );

    const stake = (params.amount * 100n) / 10000n; // 1% stake
    const tx = await this.contract.commitBid(params.sessionId, commitHash, { value: stake });

    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async revealBid(params: {
    sessionId: bigint;
    amount: bigint;
    message: string;
    salt: string;
  }): Promise<TransactionResult> {
    const tx = await this.contract.revealBid(
      params.sessionId,
      params.amount,
      params.message,
      params.salt
    );

    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async acceptBid(params: { sessionId: bigint; bidId: bigint }): Promise<TransactionResult> {
    const tx = await this.contract.acceptBid(params.sessionId, params.bidId);

    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async rejectBid(params: {
    sessionId: bigint;
    bidId: bigint;
    reason: string;
  }): Promise<TransactionResult> {
    const tx = await this.contract.rejectBid(params.sessionId, params.bidId, params.reason);

    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async withdrawStake(sessionId: bigint): Promise<TransactionResult> {
    const tx = await this.contract.withdrawStake(sessionId);

    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async claimStake(sessionId: bigint): Promise<TransactionResult> {
    const tx = await this.contract.claimStake(sessionId);

    return {
      hash: tx.hash,
      wait: () => tx.wait(),
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
      : (params.bidAmount * 100n) / 10000n; // 1% default
    const totalPayment = params.bidAmount + platformFee;

    const tx = await this.contract.createJobAndFund(
      params.sessionId,
      params.jobExpiredAt,
      params.description,
      { value: totalPayment }
    );
    const receipt = await tx.wait();

    // Parse job ID from event
    const iface = new ethers.Interface(BIDDING_SYSTEM_ABI);
    const log = receipt.logs.find((l: ethers.Log) => {
      try {
        const parsed = iface.parseLog(l);
        return parsed?.name === 'JobCreatedFromSession';
      } catch {
        return false;
      }
    });

    let jobId = 0n;
    if (log) {
      const parsed = iface.parseLog(log);
      jobId = parsed?.args[1] as bigint;
    }

    return {
      hash: tx.hash,
      wait: () => tx.wait(),
      jobId,
    };
  }

  async cancelSession(sessionId: bigint): Promise<TransactionResult> {
    const tx = await this.contract.cancelSession(sessionId);

    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async extendRevealWindow(params: {
    sessionId: bigint;
    additionalSeconds: bigint;
  }): Promise<TransactionResult> {
    const tx = await this.contract.extendRevealWindow(params.sessionId, params.additionalSeconds);

    return {
      hash: tx.hash,
      wait: () => tx.wait(),
    };
  }

  async getSession(sessionId: bigint): Promise<BiddingSession | null> {
    try {
      const session = await this.contract.getSession(sessionId);
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
      const bid = await this.contract.getUserBid(sessionId, user);
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
    return Number(await this.contract.sessionCounter());
  }

  calculateStake(maxBudget: bigint): bigint {
    return (maxBudget * 100n) / 10000n; // 1% stake
  }
}

// ============================================================================
// Exports
// ============================================================================

export { NETWORKS } from './types';
export * from './types';
