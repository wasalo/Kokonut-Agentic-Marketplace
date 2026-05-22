/**
 * Kokonut Agent SDK - TypeScript Types
 * Type definitions for agent interactions with the Kokonut Agent Economy Stack
 */

import type { Address as viemAddress, PrivateKeyAccount } from 'viem';
import type { TransactionReceipt } from 'viem';
import type {
  AccountInfo,
  WalletInfo,
  SignResult,
  SendResult,
  ApiKeyResult,
} from '@open-wallet-standard/core';

// ============================================================================
// OWS Types (re-exported from official OWS package)
// ============================================================================

export type { AccountInfo, WalletInfo, SignResult, SendResult, ApiKeyResult };

export type OWSWallet = WalletInfo;
export type OWSSignResult = SignResult;
export type OWSSendResult = SendResult;
export type OWSApiKeyResult = ApiKeyResult;

export interface OWSWalletCreateOptions {
  name: string;
  passphrase?: string;
  words?: 128 | 256;
  vaultPath?: string;
}

export interface OWSWalletImportOptions {
  name: string;
  passphrase?: string;
  importType: 'mnemonic' | 'privateKey';
  value: string;
  vaultPath?: string;
}

export interface OWSBalance {
  native: bigint;
  erc20: Record<string, bigint>;
}

export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  contracts: ContractAddresses;
}

export interface ContractAddresses {
  // ERC-8004 Official Registries
  erc8004Registry: `0x${string}`;
  erc8004Reputation: `0x${string}`;
  // Kokonut Contracts
  skillRegistry: `0x${string}`;
  serviceRegistry: `0x${string}`;
  agenticCommerce: `0x${string}`;
  biddingSystem?: `0x${string}`; // Phase 11: Standalone bidding contract
  agentReview: `0x${string}`;
  priceOracle: `0x${string}`;
  commitReveal: `0x${string}`;
  slashManager: `0x${string}`;
  milestoneEscrow?: `0x${string}`; // Phase 29: MilestoneEscrowV2
  adminRegistry?: `0x${string}`; // Phase 28: AdminRegistry
  usdc: `0x${string}`;
}

export type NetworkName = 'sepolia' | 'mainnet';

export interface SDKConfig {
  wallet?: viemAddress | PrivateKeyAccount;
  network?: NetworkName;
  rpcUrl?: string;
  contracts?: Partial<ContractAddresses>;
  readOnly?: boolean;
}

// ============================================================================
// Agent Identity (ERC-8004)
// ============================================================================

export interface AgentMetadata {
  name: string;
  description?: string;
  capabilities?: string[];
  endpoints?: {
    https?: string;
    wss?: string;
    grpc?: string;
  };
  pricing?: {
    currency: string;
    amount: string;
    interval?: string;
  };
  images?: {
    logo?: string;
    banner?: string;
  };
  social?: {
    twitter?: string;
    github?: string;
    telegram?: string;
    discord?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Agent {
  id: bigint;
  owner: `0x${string}`;
  agentURI: string;
  agentWallet: `0x${string}`;
  isActive: boolean;
}

export interface AgentRegistrationParams {
  name: string;
  description?: string;
  capabilities?: string[];
  endpoints?: AgentMetadata['endpoints'];
  social?: AgentMetadata['social'];
  metadata?: Record<string, string>;
}

// ============================================================================
// Reputation
// ============================================================================

export interface ReputationData {
  averageRating: number;
  totalFeedbacks: number;
  providers: number;
  score: number; // percentage 0-100
}

export interface FeedbackParams {
  agent: `0x${string}`;
  taskId?: number;
  rating: number; // 0-1000
  comment?: string;
  metadata?: Record<string, string>;
}

// ============================================================================
// Services
// ============================================================================

export interface Service {
  id: bigint;
  provider: `0x${string}`;
  agentId: bigint;
  name: string;
  description: string;
  metadataURI: string;
  price: bigint;
  paymentToken: `0x${string}`;
  isActive: boolean;
  createdAt: bigint;
}

export interface ServiceParams {
  agentId: bigint;
  name: string;
  description: string;
  metadataURI?: string;
  price: bigint;
  paymentToken?: `0x${string}`;
}

// ============================================================================
// Commerce / Jobs
// ============================================================================

export enum JobStatus {
  Open = 0,
  Funded = 1,
  Submitted = 2,
  Completed = 3,
  Rejected = 4,
  Expired = 5,
}

export enum BidStatus {
  None = 0,
  Committed = 1,
  Revealed = 2,
  Accepted = 3,
  Forfeited = 4,
}

export interface Job {
  id: bigint;
  client: `0x${string}`;
  provider: `0x${string}`;
  evaluator: `0x${string}`;
  serviceId: bigint;
  description: string;
  budget: bigint;
  maxBudget: bigint;
  expiredAt: bigint;
  status: JobStatus;
  hook: `0x${string}`;
  deliverable: `0x${string}`;
  evaluatorFee: boolean;
  paymentToken: `0x${string}`;
}

export interface JobParams {
  provider: `0x${string}`;
  budget?: bigint;
  paymentToken?: `0x${string}`;
  serviceId?: bigint;
  description: string;
  expiredAt?: number;
  evaluator?: `0x${string}`;
  hook?: `0x${string}`;
  evaluatorFee?: boolean;
  clientReview?: boolean;
  fundNow?: boolean;
  fundAmount?: bigint;
}

export interface OpenJobParams {
  evaluator: `0x${string}`;
  maxBudget: bigint;
  description: string;
  expiredAt?: number;
  hook?: `0x${string}`;
  evaluatorFee?: boolean;
  paymentToken?: `0x${string}`;
}

export interface Bid {
  jobId: bigint;
  bidder: `0x${string}`;
  amount: bigint;
  message: string;
  status: BidStatus;
  committedAt: bigint;
  revealedAt: bigint;
}

export interface CommitBidParams {
  jobId: bigint;
  amount: bigint;
  message: string;
}

export interface RevealBidParams {
  jobId: bigint;
  amount: bigint;
  message: string;
  salt: `0x${string}`;
}

// ============================================================================
// Agent Review (A/B Evaluation)
// ============================================================================

export enum ProposalStatus {
  Open = 0,
  UnderReview = 1,
  Decided = 2,
  Cancelled = 3,
}

export interface Proposal {
  id: bigint;
  proposer: `0x${string}`;
  title: string;
  description: string;
  criteriaURI: string;
  reward: bigint;
  status: ProposalStatus;
  createdAt: bigint;
  decisionDeadline: bigint;
  winningEvaluator: `0x${string}`;
}

export interface Evaluation {
  proposalId: bigint;
  evaluator: `0x${string}`;
  confidenceScore: bigint;
  reasoningURI: string;
  stakeAmount: bigint;
  isFinal: boolean;
  submittedAt: bigint;
}

export interface ProposalParams {
  title: string;
  description: string;
  criteriaURI?: string;
  reward: bigint;
  decisionDeadline: number;
}

export interface EvaluationParams {
  proposalId: number | bigint;
  confidenceScore: number; // -1000 to +1000
  reasoningURI?: string;
}

// ============================================================================
// SDK Events
// ============================================================================

// ============================================================================
// EFP (Ethereum Follow Protocol) Types
// ============================================================================

export interface EfpStats {
  followers_count: string;
  following_count: string;
}

export interface EfpFollower {
  efp_list_nft_token_id: string;
  address: string;
  tags: string[];
  is_following: boolean;
  is_blocked: boolean;
  is_muted: boolean;
}

export interface EfpFollowState {
  is_following: boolean;
  is_blocked: boolean;
  is_muted: boolean;
  is_followed_back: boolean;
}

export interface SDKEventMap {
  AgentRegistered: { agentId: bigint; owner: Address; agentURI: string };
  ServiceCreated: { serviceId: bigint; provider: Address; name: string };
  JobCreated: { jobId: bigint; client: Address; provider: Address };
  JobFunded: { jobId: bigint; client: Address; amount: bigint };
  JobSubmitted: { jobId: bigint; provider: Address; deliverable: string };
  PaymentReleased: { jobId: bigint; providerAmount: bigint };
  ProposalCreated: { proposalId: bigint; proposer: Address };
  EvaluationSubmitted: { proposalId: bigint; evaluator: Address; score: bigint };
  DecisionAttested: { proposalId: bigint; winner: Address };
}

export type SDKEventName = keyof SDKEventMap;
export type SDKEventHandler<T = unknown> = (event: T) => void;

// ============================================================================
// SDK Result Types
// ============================================================================

export interface TransactionResult {
  hash: string;
  wait: () => Promise<TransactionReceipt>;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// Error Types
// ============================================================================

export class SDKError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SDKError';
  }
}

export class NetworkError extends SDKError {
  constructor(
    message: string,
    public rpcUrl?: string
  ) {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

export class ContractError extends SDKError {
  constructor(
    message: string,
    public contract?: string,
    public method?: string
  ) {
    super(message, 'CONTRACT_ERROR');
    this.name = 'ContractError';
  }
}

export class TransactionError extends SDKError {
  constructor(
    message: string,
    public hash?: string,
    public receipt?: TransactionReceipt
  ) {
    super(message, 'TRANSACTION_ERROR');
    this.name = 'TransactionError';
  }
}

// ============================================================================
// Utility Types
// ============================================================================

export type Address = `0x${string}`;

export interface USDCDenomination {
  raw: bigint;
  formatted: number;
}

export function parseUSDC(amount: bigint): USDCDenomination {
  return {
    raw: amount,
    formatted: Number(amount) / 1e6,
  };
}

export function formatUSDC(amount: number): bigint {
  return BigInt(Math.round(amount * 1e6));
}

// ============================================================================
// Network Configurations
// ============================================================================

export const NETWORKS: Record<NetworkName, NetworkConfig> = {
  sepolia: {
    name: 'Sepolia Testnet',
    chainId: 11155111,
    rpcUrl: 'https://ethereum-sepolia.publicnode.com',
    explorerUrl: 'https://sepolia.etherscan.io',
    contracts: {
      // ERC-8004 Official Registries
      erc8004Registry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
      erc8004Reputation: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
      // Phase 29: AgenticCommerceV9 (Multi-Token Configurable Minimums)
      skillRegistry: '0xA84684261558f342d6871DD2CFef90A2117Aa20A',
      serviceRegistry: '0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201',
      agenticCommerce: '0x3a1Bc03cC84040A282F6bf238b917D8351499239',
      // Phase 11: BiddingSystem (Standalone commit-reveal bidding)
      biddingSystem: '0x4D7F38C6A9DE5De44A7B789962B7A2B06bFE8fd6',
      agentReview: '0x5CDb592Fd37749bF87448FBf5725D1Cd986dd1Cb', // AgentReviewV5
      priceOracle: '0x32fD2A54B722D2048A052fD0456004483a683aFE', // PriceOracleV2
      commitReveal: '0x85F193670fCb7B0c97D55E70Bf2a950b1065Fb3a',
      slashManager: '0x1B8373cDF4f2eD740c3478e0129f0B8494CE4Fa3',
      milestoneEscrow: '0xd4Fdc345b1c6aF1B4Cc84339bcB251B33527Eb45', // MilestoneEscrowV2
      adminRegistry: '0xC81C864CEAb6231ad764cf9867e031D8b6dee41d', // AdminRegistry Phase 29e UUPS proxy
      usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    },
  },
  mainnet: {
    name: 'Ethereum Mainnet',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
    contracts: {
      // Mainnet deployment required
      erc8004Registry: '0x0000000000000000000000000000000000000000',
      erc8004Reputation: '0x0000000000000000000000000000000000000000',
      skillRegistry: '0x0000000000000000000000000000000000000000',
      serviceRegistry: '0x0000000000000000000000000000000000000000',
      agenticCommerce: '0x0000000000000000000000000000000000000000',
      agentReview: '0x0000000000000000000000000000000000000000',
      priceOracle: '0x0000000000000000000000000000000000000000',
      commitReveal: '0x0000000000000000000000000000000000000000',
      slashManager: '0x0000000000000000000000000000000000000000',
      usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    },
  },
};
