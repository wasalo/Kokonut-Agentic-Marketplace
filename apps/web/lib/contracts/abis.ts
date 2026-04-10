export const AGENT_IDENTITY_REGISTRY_ABI = [
  {
    inputs: [],
    name: 'register',
    outputs: [{ name: 'agentId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'agentURI', type: 'string' }],
    name: 'register',
    outputs: [{ name: 'agentId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'agentURI', type: 'string' },
      {
        name: 'metadata',
        type: 'tuple[]',
        components: [
          { name: 'metadataKey', type: 'string' },
          { name: 'metadataValue', type: 'bytes' },
        ],
      },
    ],
    name: 'registerWithMetadata',
    outputs: [{ name: 'agentId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'agentId', type: 'uint256' }],
    name: 'getAgent',
    outputs: [
      { name: 'owner', type: 'address' },
      { name: 'agentURI', type: 'string' },
      { name: 'agentWallet', type: 'address' },
      { name: 'isActive', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'agentAddress', type: 'address' }],
    name: 'isAgent',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getCurrentAgentId',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'agentId', type: 'uint256' }],
    name: 'resolveAgent',
    outputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'agentURI', type: 'string' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'newURI', type: 'string' },
    ],
    name: 'setAgentURI',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'metadataKey', type: 'string' },
    ],
    name: 'getMetadata',
    outputs: [{ name: '', type: 'bytes' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'metadataKey', type: 'string' },
      { name: 'metadataValue', type: 'bytes' },
    ],
    name: 'setMetadata',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'agentId', type: 'uint256' }],
    name: 'getAgentWallet',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'newWallet', type: 'address' },
      { name: 'deadline', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    name: 'setAgentWallet',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'agentId', type: 'uint256' }],
    name: 'unsetAgentWallet',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const SERVICE_REGISTRY_ABI = [
  {
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'name', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'metadataURI', type: 'string' },
      { name: 'price', type: 'uint256' },
      { name: 'paymentToken', type: 'address' },
    ],
    name: 'createService',
    outputs: [{ name: 'serviceId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'serviceId', type: 'uint256' },
      { name: 'name', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'metadataURI', type: 'string' },
      { name: 'price', type: 'uint256' },
    ],
    name: 'updateService',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'serviceId', type: 'uint256' }],
    name: 'deactivateService',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'serviceId', type: 'uint256' }],
    name: 'activateService',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'serviceId', type: 'uint256' }],
    name: 'getService',
    outputs: [
      {
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
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'start', type: 'uint256' },
      { name: 'count', type: 'uint256' },
    ],
    name: 'getServices',
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getActiveServiceCount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'provider', type: 'address' }],
    name: 'getProviderServices',
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'agentId', type: 'uint256' }],
    name: 'getServicesByAgent',
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getServiceCounter',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const AGENTIC_COMMERCE_ABI = [
  // === V6.1 Constants ===
  {
    inputs: [],
    name: 'FEE_DENOMINATOR',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'EVALUATOR_FEE_BP',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MIN_EXPIRY_DURATION',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MAX_EXPIRY_DURATION',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MAX_JOBS_PER_CLIENT',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MAX_DESCRIPTION_LENGTH',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MIN_BUDGET',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MAX_BUDGET',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MIN_ETH_PAYMENT',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'DEFAULT_DISPUTE_WINDOW',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'DEFAULT_NONRESPONSIVE_SLASH_BP',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },

  // === Initialization ===
  {
    inputs: [{ name: 'treasury_', type: 'address' }],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // === V6.1 Job Creation ===
  {
    inputs: [
      { name: 'provider', type: 'address' },
      { name: 'evaluator', type: 'address' },
      { name: 'expiredAt', type: 'uint256' },
      { name: 'description', type: 'string' },
      { name: 'hook', type: 'address' },
      { name: 'evaluatorFee', type: 'bool' },
    ],
    name: 'createJob',
    outputs: [{ name: 'jobId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'serviceId', type: 'uint256' },
      { name: 'evaluator', type: 'address' },
      { name: 'expiredAt', type: 'uint256' },
      { name: 'description', type: 'string' },
      { name: 'hook', type: 'address' },
      { name: 'evaluatorFee', type: 'bool' },
    ],
    name: 'createJobFromService',
    outputs: [{ name: 'jobId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'maxBudget', type: 'uint256' },
      { name: 'evaluator', type: 'address' },
      { name: 'expiredAt', type: 'uint256' },
      { name: 'description', type: 'string' },
      { name: 'paymentToken', type: 'address' },
      { name: 'evaluatorFee', type: 'bool' },
    ],
    name: 'createOpenJob',
    outputs: [{ name: 'jobId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // === Job Updates ===
  {
    inputs: [
      { name: 'jobId', type: 'uint256' },
      { name: 'provider', type: 'address' },
    ],
    name: 'setProvider',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'jobId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'setBudget',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'jobId', type: 'uint256' },
      { name: 'paymentToken', type: 'address' },
    ],
    name: 'setPaymentToken',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // === V6.1 Dispute Management ===
  {
    inputs: [
      { name: 'jobId', type: 'uint256' },
      { name: 'window', type: 'uint256' },
    ],
    name: 'setDisputeWindow',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'jobId', type: 'uint256' },
      { name: 'slashBP', type: 'uint256' },
    ],
    name: 'setNonResponsiveSlashBP',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // === Job Lifecycle (Payable for ETH) ===
  {
    inputs: [{ name: 'jobId', type: 'uint256' }],
    name: 'fund',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'jobId', type: 'uint256' },
      { name: 'deliverable', type: 'bytes32' },
    ],
    name: 'submit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'jobId', type: 'uint256' },
      { name: 'reason', type: 'bytes32' },
    ],
    name: 'complete',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'jobId', type: 'uint256' },
      { name: 'reason', type: 'bytes32' },
    ],
    name: 'completeAfterTimeout',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'jobId', type: 'uint256' },
      { name: 'reason', type: 'bytes32' },
    ],
    name: 'reject',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'jobId', type: 'uint256' }],
    name: 'claimRefund',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // === View Functions ===
  {
    inputs: [{ name: 'jobId', type: 'uint256' }],
    name: 'getJob',
    outputs: [
      {
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'client', type: 'address' },
          { name: 'provider', type: 'address' },
          { name: 'evaluator', type: 'address' },
          { name: 'serviceId', type: 'uint256' },
          { name: 'paymentToken', type: 'address' },
          { name: 'description', type: 'string' },
          { name: 'budget', type: 'uint256' },
          { name: 'expiredAt', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'hook', type: 'address' },
          { name: 'deliverable', type: 'bytes32' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'client', type: 'address' }],
    name: 'getClientJobCount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'jobId', type: 'uint256' }],
    name: 'isEvaluatorFeeEnabled',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'uint256' }],
    name: 'jobs',
    outputs: [
      {
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'client', type: 'address' },
          { name: 'provider', type: 'address' },
          { name: 'evaluator', type: 'address' },
          { name: 'serviceId', type: 'uint256' },
          { name: 'paymentToken', type: 'address' },
          { name: 'description', type: 'string' },
          { name: 'budget', type: 'uint256' },
          { name: 'expiredAt', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'hook', type: 'address' },
          { name: 'deliverable', type: 'bytes32' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },

  // === Constants ===
  {
    inputs: [],
    name: 'jobCounter',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'platformTreasury',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },

  // === Admin ===
  {
    inputs: [{ name: 'treasury', type: 'address' }],
    name: 'setPlatformTreasury',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // === Ownership ===
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'newOwner', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // === Disabled Bidding Functions (Still exist in contract, revert when called) ===
  // These are kept for backward compatibility - they revert with "Bidding disabled"
  {
    inputs: [{ name: 'maxBudget', type: 'uint256' }],
    name: 'calculateStake',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      { name: 'jobId', type: 'uint256' },
      { name: 'commitHash', type: 'bytes32' },
    ],
    name: 'commitBid',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'jobId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'message', type: 'string' },
      { name: 'salt', type: 'bytes32' },
    ],
    name: 'revealBid',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'jobId', type: 'uint256' },
      { name: 'bidId', type: 'uint256' },
    ],
    name: 'acceptBid',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'jobId', type: 'uint256' }],
    name: 'withdrawStake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'jobId', type: 'uint256' },
      { name: 'user', type: 'address' },
    ],
    name: 'getUserBid',
    outputs: [
      {
        components: [
          { name: 'bidId', type: 'uint256' },
          { name: 'bidder', type: 'address' },
          { name: 'proposedAmount', type: 'uint256' },
          { name: 'stake', type: 'uint256' },
          { name: 'message', type: 'string' },
          { name: 'commitHash', type: 'bytes32' },
          { name: 'revealed', type: 'bool' },
          { name: 'accepted', type: 'bool' },
          { name: 'withdrawn', type: 'bool' },
          { name: 'timestamp', type: 'uint256' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'jobId', type: 'uint256' }],
    name: 'jobBidCount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'jobId', type: 'uint256' },
      { name: '', type: 'uint256' },
    ],
    name: 'jobBids',
    outputs: [
      {
        components: [
          { name: 'bidId', type: 'uint256' },
          { name: 'bidder', type: 'address' },
          { name: 'proposedAmount', type: 'uint256' },
          { name: 'stake', type: 'uint256' },
          { name: 'message', type: 'string' },
          { name: 'commitHash', type: 'bytes32' },
          { name: 'revealed', type: 'bool' },
          { name: 'accepted', type: 'bool' },
          { name: 'withdrawn', type: 'bool' },
          { name: 'timestamp', type: 'uint256' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'address' }],
    name: 'totalStakesHeld',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'REVEAL_WINDOW',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'platformFeeBP',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'feeBP', type: 'uint256' },
      { name: 'treasury', type: 'address' },
    ],
    name: 'setPlatformFee',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // === V6.1 New Functions ===
  {
    inputs: [{ name: 'jobId', type: 'uint256' }],
    name: 'completeAfterTimeout',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'jobId', type: 'uint256' }],
    name: 'refundExpired',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'provider', type: 'address' },
      { name: 'evaluator', type: 'address' },
      { name: 'serviceId', type: 'uint256' },
      { name: 'budget', type: 'uint256' },
      { name: 'expiredAt', type: 'uint256' },
      { name: 'description', type: 'string' },
      { name: 'hook', type: 'address' },
    ],
    name: 'createJobWithRandomEvaluator',
    outputs: [{ name: 'jobId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'registerAsEvaluator',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'unregisterAsEvaluator',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// === V5 Events (for useWatchContractEvents) ===
export const AGENTIC_COMMERCE_EVENTS = [
  // Core Job Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'jobId', type: 'uint256' },
      { indexed: true, name: 'client', type: 'address' },
      { indexed: true, name: 'provider', type: 'address' },
      { indexed: false, name: 'evaluator', type: 'address' },
      { indexed: false, name: 'serviceId', type: 'uint256' },
      { indexed: false, name: 'expiredAt', type: 'uint256' },
    ],
    name: 'JobCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'jobId', type: 'uint256' },
      { indexed: true, name: 'client', type: 'address' },
      { indexed: false, name: 'maxBudget', type: 'uint256' },
      { indexed: false, name: 'evaluator', type: 'address' },
      { indexed: false, name: 'expiredAt', type: 'uint256' },
    ],
    name: 'OpenJobCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'jobId', type: 'uint256' },
      { indexed: true, name: 'provider', type: 'address' },
    ],
    name: 'ProviderSet',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'jobId', type: 'uint256' },
      { indexed: false, name: 'amount', type: 'uint256' },
    ],
    name: 'BudgetSet',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'jobId', type: 'uint256' },
      { indexed: true, name: 'client', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
    ],
    name: 'JobFunded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'jobId', type: 'uint256' },
      { indexed: true, name: 'provider', type: 'address' },
      { indexed: false, name: 'deliverable', type: 'bytes32' },
    ],
    name: 'JobSubmitted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'jobId', type: 'uint256' },
      { indexed: true, name: 'evaluator', type: 'address' },
      { indexed: false, name: 'reason', type: 'bytes32' },
    ],
    name: 'JobCompleted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'jobId', type: 'uint256' },
      { indexed: true, name: 'rejector', type: 'address' },
      { indexed: false, name: 'reason', type: 'bytes32' },
    ],
    name: 'JobRejected',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, name: 'jobId', type: 'uint256' }],
    name: 'JobExpired',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'jobId', type: 'uint256' },
      { indexed: true, name: 'provider', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
    ],
    name: 'PaymentReleased',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'jobId', type: 'uint256' },
      { indexed: true, name: 'client', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
    ],
    name: 'Refunded',
    type: 'event',
  },

  // Enhanced Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'jobId', type: 'uint256' },
      { indexed: true, name: 'oldStatus', type: 'uint8' },
      { indexed: true, name: 'newStatus', type: 'uint8' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
    name: 'JobStatusChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'jobId', type: 'uint256' },
      { indexed: true, name: 'updateType', type: 'bytes32' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
    name: 'JobUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'client', type: 'address' },
      { indexed: false, name: 'attemptedCount', type: 'uint256' },
      { indexed: false, name: 'maxAllowed', type: 'uint256' },
    ],
    name: 'JobLimitExceeded',
    type: 'event',
  },

  // V6.1 Dispute Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'jobId', type: 'uint256' },
      { indexed: false, name: 'window', type: 'uint256' },
    ],
    name: 'DisputeWindowSet',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'jobId', type: 'uint256' },
      { indexed: false, name: 'slashBP', type: 'uint256' },
    ],
    name: 'NonResponsiveSlashSet',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'jobId', type: 'uint256' },
      { indexed: true, name: 'evaluator', type: 'address' },
      { indexed: false, name: 'slashAmount', type: 'uint256' },
    ],
    name: 'EvaluatorSlashedForInactivity',
    type: 'event',
  },

  // Bidding Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'jobId', type: 'uint256' },
      { indexed: true, name: 'bidder', type: 'address' },
      { indexed: false, name: 'stakeAmount', type: 'uint256' },
      { indexed: false, name: 'commitHash', type: 'bytes32' },
    ],
    name: 'BidCommitted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'jobId', type: 'uint256' },
      { indexed: true, name: 'bidder', type: 'address' },
      { indexed: false, name: 'proposedAmount', type: 'uint256' },
      { indexed: false, name: 'message', type: 'string' },
    ],
    name: 'BidRevealed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'jobId', type: 'uint256' },
      { indexed: true, name: 'bidder', type: 'address' },
      { indexed: false, name: 'bidId', type: 'uint256' },
      { indexed: false, name: 'acceptedAmount', type: 'uint256' },
    ],
    name: 'BidAccepted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'jobId', type: 'uint256' },
      { indexed: true, name: 'recipient', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
    ],
    name: 'StakesReturned',
    type: 'event',
  },
] as const;

export const AGENT_REVIEW_ABI = [
  {
    inputs: [
      { name: 'title', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'criteriaURI', type: 'string' },
      { name: 'reward', type: 'uint256' },
      { name: 'decisionDeadline', type: 'uint256' },
    ],
    name: 'createProposal',
    outputs: [{ name: 'proposalId', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    name: 'getProposal',
    outputs: [
      {
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'proposer', type: 'address' },
          { name: 'title', type: 'string' },
          { name: 'description', type: 'string' },
          { name: 'criteriaURI', type: 'string' },
          { name: 'reward', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'decisionDeadline', type: 'uint256' },
          { name: 'winningEvaluator', type: 'address' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'confidenceScore', type: 'int256' },
      { name: 'reasoningURI', type: 'string' },
    ],
    name: 'submitEvaluation',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'winningEvaluator', type: 'address' },
    ],
    name: 'attestDecision',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    name: 'getProposalEvaluations',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'evaluator', type: 'address' },
    ],
    name: 'getEvaluation',
    outputs: [
      {
        components: [
          { name: 'proposalId', type: 'uint256' },
          { name: 'evaluator', type: 'address' },
          { name: 'confidenceScore', type: 'int256' },
          { name: 'reasoningURI', type: 'string' },
          { name: 'stakeAmount', type: 'uint256' },
          { name: 'isFinal', type: 'bool' },
          { name: 'submittedAt', type: 'uint256' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getProposalCount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    name: 'claimReward',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    name: 'releaseStake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // === Admin & Proposal Management ===
  {
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    name: 'cancelProposal',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'evaluator', type: 'address' },
      { name: 'proposalId', type: 'uint256' },
      { name: 'reason', type: 'string' },
    ],
    name: 'slashEvaluator',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    name: 'getEvaluatorCount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // === V5 New Functions ===
  {
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    name: 'finalizeDecision',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    name: 'calculateMedianScore',
    outputs: [{ name: '', type: 'int256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'slashTreasury',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const AGENT_SKILL_REGISTRY_ABI = [
  {
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'endpoint', type: 'string' },
      { name: 'domains', type: 'string[]' },
    ],
    name: 'registerSkill',
    outputs: [{ name: 'skillId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'agentId', type: 'uint256' }],
    name: 'getAgentSkills',
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'skillId', type: 'uint256' }],
    name: 'getSkill',
    outputs: [
      {
        components: [
          { name: 'agentId', type: 'uint256' },
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'description', type: 'string' },
          { name: 'endpoint', type: 'string' },
          { name: 'domains', type: 'string[]' },
          { name: 'isActive', type: 'bool' },
          { name: 'registeredBy', type: 'address' },
          { name: 'registeredAt', type: 'uint256' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'skillId', type: 'uint256' }],
    name: 'getSkillData',
    outputs: [
      {
        components: [
          { name: 'agentId', type: 'uint256' },
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'description', type: 'string' },
          { name: 'endpoint', type: 'string' },
          { name: 'domains', type: 'string[]' },
          { name: 'isActive', type: 'bool' },
          { name: 'registeredBy', type: 'address' },
          { name: 'registeredAt', type: 'uint256' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'skillId', type: 'uint256' },
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'endpoint', type: 'string' },
      { name: 'domains', type: 'string[]' },
    ],
    name: 'updateSkill',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'skillId', type: 'uint256' }],
    name: 'deactivateSkill',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'domain', type: 'string' }],
    name: 'findSkillsByDomain',
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ERC-8004 Reputation Registry ABI
export const ERC8004_REPUTATION_ABI = [
  {
    inputs: [{ name: 'agent', type: 'address' }],
    name: 'getAgentReputation',
    outputs: [
      { name: 'average', type: 'int256' },
      { name: 'total', type: 'uint256' },
      { name: 'providers', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'agent', type: 'address' }],
    name: 'getFeedbackCount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'feedbackId', type: 'uint256' }],
    name: 'getFeedbackDetails',
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'agent', type: 'address' },
          { name: 'taskId', type: 'uint256' },
          { name: 'rating', type: 'int256' },
          { name: 'metadataURI', type: 'string' },
          { name: 'timestamp', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'agent', type: 'address' },
      { name: 'taskId', type: 'uint256' },
      { name: 'rating', type: 'int256' },
      { name: 'metadataURI', type: 'string' },
    ],
    name: 'submitFeedback',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// Price Oracle ABI
export const PRICE_ORACLE_ABI = [
  {
    inputs: [],
    name: 'getUSDCPrice',
    outputs: [{ name: '', type: 'int256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getETHRate',
    outputs: [{ name: '', type: 'int256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'isStale',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'token', type: 'address' }],
    name: 'getUsdPriceOfToken',
    outputs: [{ name: '', type: 'int256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ERC20 Token ABI (for USDC)
export const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Commit Reveal ABI
export const COMMIT_REVEAL_ABI = [
  {
    inputs: [{ name: 'commitmentHash', type: 'bytes32' }],
    name: 'commit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'data', type: 'string' },
      { name: 'nonce', type: 'uint256' },
      { name: 'serviceId', type: 'uint256' },
    ],
    name: 'reveal',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'commitmentHash', type: 'bytes32' }],
    name: 'cancel',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'commitmentHash', type: 'bytes32' },
    ],
    name: 'getCommitment',
    outputs: [
      {
        components: [
          { name: 'blockNumber', type: 'uint256' },
          { name: 'exists', type: 'bool' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'commitmentHash', type: 'bytes32' }],
    name: 'isCommitmentValid',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'REVEAL_DELAY',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Slash Manager ABI
export const SLASH_MANAGER_ABI = [
  {
    inputs: [{ name: '', type: 'address' }],
    name: 'isSigner',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getSigners',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'requiredConfirmations',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'bytes32' }],
    name: 'getProposal',
    outputs: [
      {
        components: [
          { name: 'evaluator', type: 'address' },
          { name: 'proposalId', type: 'uint256' },
          { name: 'amount', type: 'uint256' },
          { name: 'reason', type: 'string' },
          { name: 'confirmations', type: 'uint256' },
          { name: 'execAfter', type: 'uint256' },
          { name: 'isExecuted', type: 'bool' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'evaluator', type: 'address' },
      { name: 'proposalId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'reason', type: 'string' },
    ],
    name: 'createProposal',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'proposalId', type: 'bytes32' }],
    name: 'confirmProposal',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'proposalId', type: 'bytes32' }],
    name: 'executeProposal',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'proposalId', type: 'bytes32' }],
    name: 'cancelProposal',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'executionDelay',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'maxSlashAmount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Chainlink Aggregator ABI (for reading price feeds)
export const CHAINLINK_AGGREGATOR_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'description',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// =============================================================================
// BIDDING SYSTEM ABI (Phase 11)
// Standalone commit-reveal bidding contract
// =============================================================================

export const BIDDING_SYSTEM_ABI = [
  // Enums
  {
    inputs: [],
    name: 'SessionStatus',
    outputs: [
      { name: 'Active', type: 'uint8' },
      { name: 'BiddingClosed', type: 'uint8' },
      { name: 'WinnerSelected', type: 'uint8' },
      { name: 'JobCreated', type: 'uint8' },
      { name: 'Completed', type: 'uint8' },
      { name: 'Cancelled', type: 'uint8' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // Read functions
  {
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'commerce',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'treasury',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'revealWindow',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'platformFeeBP',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'sessionCounter',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'sessionId', type: 'uint256' }],
    name: 'getSession',
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'creator', type: 'address' },
          { name: 'evaluator', type: 'address' },
          { name: 'maxBudget', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'revealWindowEnd', type: 'uint256' },
          { name: 'metadata', type: 'bytes' },
          { name: 'serviceId', type: 'uint256' },
          { name: 'jobId', type: 'uint256' },
          { name: 'winner', type: 'address' },
          { name: 'winningBidId', type: 'uint256' },
          { name: 'jobCreated', type: 'bool' },
          { name: 'status', type: 'uint8' },
        ],
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'sessionId', type: 'uint256' },
      { name: 'bidId', type: 'uint256' },
    ],
    name: 'getBid',
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'bidId', type: 'uint256' },
          { name: 'bidder', type: 'address' },
          { name: 'proposedAmount', type: 'uint256' },
          { name: 'stake', type: 'uint256' },
          { name: 'message', type: 'string' },
          { name: 'commitHash', type: 'bytes32' },
          { name: 'revealed', type: 'bool' },
          { name: 'accepted', type: 'bool' },
          { name: 'stakeWithdrawn', type: 'bool' },
          { name: 'timestamp', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'sessionId', type: 'uint256' },
      { name: 'user', type: 'address' },
    ],
    name: 'getUserBid',
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'bidId', type: 'uint256' },
          { name: 'bidder', type: 'address' },
          { name: 'proposedAmount', type: 'uint256' },
          { name: 'stake', type: 'uint256' },
          { name: 'message', type: 'string' },
          { name: 'commitHash', type: 'bytes32' },
          { name: 'revealed', type: 'bool' },
          { name: 'accepted', type: 'bool' },
          { name: 'stakeWithdrawn', type: 'bool' },
          { name: 'timestamp', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'sessionId', type: 'uint256' }],
    name: 'getSessionCount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'maxBudget', type: 'uint256' }],
    name: 'calculateStake',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'pure',
    type: 'function',
  },
  // Write functions
  {
    inputs: [
      { name: 'evaluator', type: 'address' },
      { name: 'maxBudget', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'metadata', type: 'bytes' },
      { name: 'serviceId', type: 'uint256' },
    ],
    name: 'createBiddingSession',
    outputs: [{ name: 'sessionId', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'sessionId', type: 'uint256' },
      { name: 'commitHash', type: 'bytes32' },
    ],
    name: 'commitBid',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'sessionId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'message', type: 'string' },
      { name: 'salt', type: 'bytes32' },
    ],
    name: 'revealBid',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'sessionId', type: 'uint256' },
      { name: 'bidId', type: 'uint256' },
    ],
    name: 'acceptBid',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'sessionId', type: 'uint256' },
      { name: 'bidId', type: 'uint256' },
      { name: 'reason', type: 'string' },
    ],
    name: 'rejectBid',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'sessionId', type: 'uint256' }],
    name: 'withdrawStake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'sessionId', type: 'uint256' }],
    name: 'claimStake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'sessionId', type: 'uint256' },
      { name: 'jobExpiredAt', type: 'uint256' },
      { name: 'description', type: 'string' },
    ],
    name: 'createJobAndFund',
    outputs: [{ name: 'jobId', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'sessionId', type: 'uint256' }],
    name: 'cancelSession',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'sessionId', type: 'uint256' },
      { name: 'additionalSeconds', type: 'uint256' },
    ],
    name: 'extendRevealWindow',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Admin functions
  {
    inputs: [{ name: 'commerce_', type: 'address' }],
    name: 'setCommerce',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'registry_', type: 'address' }],
    name: 'setServiceRegistry',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'window_', type: 'uint256' }],
    name: 'setRevealWindow',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'basisPoints_', type: 'uint256' }],
    name: 'setMinStakeBP',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'basisPoints_', type: 'uint256' }],
    name: 'setPlatformFeeBP',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'withdrawPlatformFees',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // UUPS
  {
    inputs: [{ name: 'newImplementation', type: 'address' }],
    name: 'upgradeTo',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;
