/**
 * Kokonut Agent SDK - TypeScript Types
 * Type definitions for agent interactions with the Kokonut Agent Economy Stack
 */

import type { ethers } from 'ethers';

// ============================================================================
// Network Configuration
// ============================================================================

export type NetworkName = 'sepolia' | 'mainnet';

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
  agentReview: `0x${string}`;
  priceOracle: `0x${string}`;
  commitReveal: `0x${string}`;
  slashManager: `0x${string}`;
  usdc: `0x${string}`;
}

export interface SDKConfig {
  wallet: `0x${string}` | ethers.HDNodeWallet | ethers.Wallet;
  network?: NetworkName;
  rpcUrl?: string;
  contracts?: Partial<ContractAddresses>;
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
  evaluator?: `0x${string}`;
  description: string;
  expiredAt?: number;
  hook?: `0x${string}`;
  evaluatorFee?: boolean;
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

export interface SDKEventMap {
  AgentRegistered: { agentId: bigint; owner: `0x${string}` };
  ServiceCreated: { serviceId: bigint; provider: `0x${string}`; agentId: bigint };
  JobCreated: { jobId: bigint; client: `0x${string}`; provider: `0x${string}` };
  JobFunded: { jobId: bigint; budget: bigint };
  JobSubmitted: { jobId: bigint };
  PaymentReleased: { jobId: bigint; amount: bigint; recipient: `0x${string}` };
  ProposalCreated: { proposalId: bigint; proposer: `0x${string}` };
  EvaluationSubmitted: { proposalId: bigint; evaluator: `0x${string}`; score: bigint };
  DecisionAttested: { proposalId: bigint; winner: `0x${string}` };
  FeedbackSubmitted: { agent: `0x${string}`; rating: number };
}

export type SDKEventName = keyof SDKEventMap;
export type SDKEventHandler<T = unknown> = (event: T) => void;

// ============================================================================
// SDK Result Types
// ============================================================================

export interface TransactionResult {
  hash: string;
  wait: () => Promise<ethers.TransactionReceipt>;
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
    public receipt?: ethers.TransactionReceipt
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
      // Phase 6: AgenticCommerceV6 (UUPS Proxy with ERC-2771, evaluator fees)
      skillRegistry: '0xA84684261558f342d6871DD2CFef90A2117Aa20A',
      serviceRegistry: '0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201',
      agenticCommerce: '0x948d97EA7F0c49796fB576ADff375C900627568E',
      agentReview: '0x716B02447b52Eab450e31bD77103B41bC2c7bE0b',
      priceOracle: '0x5C4AC3dAF76708DCd51911BA3B33027eAB1B4047',
      commitReveal: '0x6CEd1574A3dF7ec646e43DD8408300117c453Aa3',
      slashManager: '0x7Cf955900FD7a12680E90D834eAf19346f5DBcf9',
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
