export interface OWSWallet {
  id: string;
  name: string;
  type: 'generated' | 'imported';
  address: string;
  chain: OWSChain;
  createdAt: number;
  lastUsedAt: number;
  policyId?: string;
  metadata?: Record<string, unknown>;
}

export type OWSChain = 'ethereum' | 'sepolia' | 'polygon' | 'arbitrum' | 'optimism' | 'bsc' | 'avalanche';

export interface OWSVault {
  id: string;
  encryptedSeed: string; // Base64 encoded encrypted seed
  salt: string; // Base64 encoded salt
  iv: string; // Base64 encoded IV
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface OWSWalletCreateOptions {
  name: string;
  chain: OWSChain;
  policyId?: string;
  passphrase: string;
}

export interface OWSWalletImportOptions {
  name: string;
  chain: OWSChain;
  policyId?: string;
  passphrase: string;
  importData: OWSImportData;
}

export type OWSImportData =
  | { type: 'seed'; seed: string }
  | { type: 'privateKey'; privateKey: string }
  | { type: 'json'; json: string; password: string };

export interface OWSPolicy {
  id: string;
  walletId: string;
  name: string;
  rules: OWSPolicyRule[];
  createdAt: number;
  updatedAt: number;
}

export type OWSPolicyRule =
  | OWSSpendingLimitRule
  | OWSChainRestrictionRule
  | OWSContractWhitelistRule
  | OWSTimeLockRule;

export interface OWSSpendingLimitRule {
  type: 'spending-limit';
  dailyLimit?: bigint; // In wei (USDC 6 decimals)
  perTransactionLimit?: bigint;
  monthlyLimit?: bigint;
}

export interface OWSChainRestrictionRule {
  type: 'chain-restriction';
  allowedChains: OWSChain[];
}

export interface OWSContractWhitelistRule {
  type: 'contract-whitelist';
  allowedContracts: `0x${string}`[];
}

export interface OWSTimeLockRule {
  type: 'time-lock';
  activeHoursStart?: number; // 0-23
  activeHoursEnd?: number; // 0-23
  activeDays?: number[]; // 0-6 (Sun-Sat)
}

export interface OWSPolicyTemplate {
  id: string;
  name: string;
  description: string;
  rules: OWSPolicyRule[];
}

export const OWS_POLICY_TEMPLATES: OWSPolicyTemplate[] = [
  {
    id: 'job-funding',
    name: 'Job Funding Wallet',
    description: 'For funding jobs on Kokonut - limited spending, Sepolia only, Kokonut contracts only',
    rules: [
      {
        type: 'spending-limit',
        dailyLimit: 50_000_000n, // 50 USDC
        perTransactionLimit: 25_000_000n, // 25 USDC
        monthlyLimit: 500_000_000n, // 500 USDC
      },
      {
        type: 'chain-restriction',
        allowedChains: ['sepolia'],
      },
      {
        type: 'contract-whitelist',
        allowedContracts: [
          '0x948d97EA7F0c49796fB576ADff375C900627568E', // AgenticCommerce
          '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // USDC
        ],
      },
    ],
  },
  {
    id: 'service-income',
    name: 'Service Income Wallet',
    description: 'For receiving service payments - no spending limits',
    rules: [
      {
        type: 'chain-restriction',
        allowedChains: ['sepolia', 'ethereum'],
      },
    ],
  },
  {
    id: 'treasury',
    name: 'Treasury Wallet',
    description: 'For treasury management - high limits, multi-sig ready',
    rules: [
      {
        type: 'chain-restriction',
        allowedChains: ['sepolia', 'ethereum', 'polygon', 'arbitrum'],
      },
    ],
  },
];

export interface OWSSignRequest {
  walletId: string;
  to: `0x${string}`;
  value?: bigint;
  data?: string;
  chain: OWSChain;
  metadata?: Record<string, unknown>;
}

export interface OWSSignResult {
  signature: string;
  transactionHash?: string;
}

export interface OWSBalance {
  native: bigint; // ETH/ MATIC etc
  erc20: Record<string, bigint>; // token address -> balance
}

export interface OWSCreateWalletResult {
  wallet: OWSWallet;
  seedPhrase: string; // Only returned once during creation
}

export interface OWSError {
  code: OWSErrorCode;
  message: string;
  details?: unknown;
}

export type OWSErrorCode =
  | 'INVALID_PASSPHRASE'
  | 'INVALID_SEED'
  | 'INVALID_PRIVATE_KEY'
  | 'INVALID_JSON'
  | 'WALLET_NOT_FOUND'
  | 'POLICY_DENIED'
  | 'ENCRYPTION_FAILED'
  | 'DECRYPTION_FAILED'
  | 'SIGNING_FAILED'
  | 'NETWORK_ERROR';

export const OWS_CHAIN_IDS: Record<OWSChain, number> = {
  ethereum: 1,
  sepolia: 11155111,
  polygon: 137,
  arbitrum: 42161,
  optimism: 10,
  bsc: 56,
  avalanche: 43114,
};

export const OWS_RPC_URLS: Record<OWSChain, string> = {
  ethereum: 'https://eth-mainnet.g.alchemy.com/v2/${API_KEY}',
  sepolia: 'https://eth-sepolia.g.alchemy.com/v2/${API_KEY}',
  polygon: 'https://polygon-mainnet.g.alchemy.com/v2/${API_KEY}',
  arbitrum: 'https://arb-mainnet.g.alchemy.com/v2/${API_KEY}',
  optimism: 'https://opt-mainnet.g.alchemy.com/v2/${API_KEY}',
  bsc: 'https://bsc-dataseed.binance.org',
  avalanche: 'https://api.avax.network/ext/bc/C/rpc',
};

export const OWS_EXPLORER_URLS: Record<OWSChain, string> = {
  ethereum: 'https://etherscan.io',
  sepolia: 'https://sepolia.etherscan.io',
  polygon: 'https://polygonscan.com',
  arbitrum: 'https://arbiscan.io',
  optimism: 'https://optimistic.etherscan.io',
  bsc: 'https://bscscan.com',
  avalanche: 'https://snowtrace.io',
};