import { PublicClient, createPublicClient, http, formatUnits } from 'viem';
import { sepolia } from 'viem/chains';

const RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com';

export const publicClient: PublicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
});

export const CONTRACTS = {
  erc8004Registry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
  erc8004Reputation: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  serviceRegistry: '0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201',
  agenticCommerce: '0xA7E8F13AC8E659356333Bf3e579BF3f39334821e',
  agentReview: '0x716B02447b52Eab450e31bD77103B41bC2c7bE0b',
  skillRegistry: '0x7cf16C00ed4831EB9eE3a8765831968F0a28f53D',
  usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
};

export const AGENTIC_COMMERCE_ABI = [
  {
    name: 'getJob',
    type: 'function',
    inputs: [{ name: 'jobId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'client', type: 'address' },
          { name: 'provider', type: 'address' },
          { name: 'evaluator', type: 'address' },
          { name: 'description', type: 'string' },
          { name: 'budget', type: 'uint256' },
          { name: 'expiredAt', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'hook', type: 'address' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    name: 'getCurrentJobId',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'getClientJobs',
    type: 'function',
    inputs: [{ name: 'client', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    name: 'getProviderJobs',
    type: 'function',
    inputs: [{ name: 'provider', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
  },
] as const;

export const SERVICE_REGISTRY_ABI = [
  {
    name: 'getService',
    type: 'function',
    inputs: [{ name: 'serviceId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'provider', type: 'address' },
          { name: 'agentId', type: 'uint256' },
          { name: 'name', type: 'string' },
          { name: 'description', type: 'string' },
          { name: 'metadataURI', type: 'string' },
          { name: 'price', type: 'uint256' },
          { name: 'paymentToken', type: 'address' },
          { name: 'isActive', type: 'bool' },
          { name: 'createdAt', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    name: 'getActiveServiceCount',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'getServices',
    type: 'function',
    inputs: [
      { name: 'start', type: 'uint256' },
      { name: 'count', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    name: 'getProviderServices',
    type: 'function',
    inputs: [{ name: 'provider', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
  },
] as const;

export const IDENTITY_REGISTRY_ABI = [
  {
    name: 'getAgent',
    type: 'function',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [
      { name: 'owner', type: 'address' },
      { name: 'agentURI', type: 'string' },
      { name: 'agentWallet', type: 'address' },
      { name: 'isActive', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    name: 'getCurrentAgentId',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'isAgent',
    type: 'function',
    inputs: [{ name: 'agentAddress', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
] as const;

export const REPUTATION_ABI = [
  {
    name: 'getAgentReputation',
    type: 'function',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [
      { name: 'average', type: 'int256' },
      { name: 'total', type: 'uint256' },
      { name: 'providers', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
] as const;

export const JOB_STATUS = {
  0: 'Open',
  1: 'Funded',
  2: 'Submitted',
  3: 'Completed',
  4: 'Rejected',
  5: 'Expired',
} as const;

export type JobStatusType = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

export function formatUsdc(amount: bigint): string {
  return formatUnits(amount, 6);
}

export function parseUsdc(amount: string): bigint {
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(6, '0').slice(0, 6);
  return BigInt(whole + paddedFraction);
}
