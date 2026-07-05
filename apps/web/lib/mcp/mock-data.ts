export interface MockJob {
  id: string;
  client: string;
  provider: string;
  description: string;
  budget: string;
  status: 'Open' | 'Funded' | 'Submitted' | 'Completed' | 'Rejected' | 'Expired';
  evaluator: string;
  createdAt: string;
}

export interface MockService {
  id: string;
  provider: string;
  name: string;
  description: string;
  price: string;
  isActive: boolean;
  createdAt: string;
}

export interface MockAgent {
  id: string;
  owner: string;
  name: string;
  capabilities: string[];
  reputation: {
    averageRating: string;
    totalFeedbacks: string;
  };
  isActive: boolean;
}

export interface MockPlatformStats {
  totalJobs: number;
  totalServices: number;
  totalAgents: number;
  activeJobs: number;
  totalVolumeUSDC: string;
}

export const MOCK_JOBS: MockJob[] = [
  {
    id: '42',
    client: '0x742d35Cc6634C0532925a3b844Bc9e7595f8eE91',
    provider: '0x8Ba1f109551bD432803012645Ac136ddd64DBA72',
    description: 'Need data analysis for Q4 metrics',
    budget: '100.00',
    status: 'Open',
    evaluator: '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720',
    createdAt: '2026-04-01T10:00:00Z',
  },
  {
    id: '43',
    client: '0x9f3F66aCf8f4E4D3a0aC3D3EFcF4d5E6F7890A12',
    provider: '0x0',
    description: 'Smart contract audit for new DeFi protocol',
    budget: '500.00',
    status: 'Funded',
    evaluator: '0xB0B0faceC0deF4ceE5b5F4fA8C7d1E2F3a4B5C6D',
    createdAt: '2026-04-02T14:30:00Z',
  },
  {
    id: '44',
    client: '0x742d35Cc6634C0532925a3b844Bc9e7595f8eE91',
    provider: '0x8Ba1f109551bD432803012645Ac136ddd64DBA72',
    description: 'Build trading bot integration',
    budget: '250.00',
    status: 'Completed',
    evaluator: '0xC0FFEE1234567890abcdefABCDEF1234567890AB',
    createdAt: '2026-03-28T09:15:00Z',
  },
];

export const MOCK_SERVICES: MockService[] = [
  {
    id: '5',
    provider: '0x742d35Cc6634C0532925a3b844Bc9e7595f8eE91',
    name: 'Data Analysis Pro',
    description: 'Professional data analysis and visualization for onchain metrics',
    price: '150.00',
    isActive: true,
    createdAt: '2026-03-15T08:00:00Z',
  },
  {
    id: '12',
    provider: '0x8Ba1f109551bD432803012645Ac136ddd64DBA72',
    name: 'Smart Contract Auditor',
    description: 'Security auditing for Web3 protocols with detailed reports',
    price: '500.00',
    isActive: true,
    createdAt: '2026-03-10T12:00:00Z',
  },
  {
    id: '18',
    provider: '0x0E9B2C3D4F5A6B7C8D9E0F1A2B3C4D5E6F7A8B9C',
    name: 'Trading Bot Development',
    description: 'Custom trading bots for DeFi and CEX integration',
    price: '300.00',
    isActive: true,
    createdAt: '2026-03-20T16:45:00Z',
  },
];

export const MOCK_AGENTS: MockAgent[] = [
  {
    id: '100',
    owner: '0x742d35Cc6634C0532925a3b844Bc9e7595f8eE91',
    name: 'DataAgent Pro',
    capabilities: ['data-analysis', 'visualization', 'python', 'sql'],
    reputation: { averageRating: '4.8', totalFeedbacks: '156' },
    isActive: true,
  },
  {
    id: '101',
    owner: '0x8Ba1f109551bD432803012645Ac136ddd64DBA72',
    name: 'Solidity Auditor',
    capabilities: ['smart-contract-audit', 'security', 'solidity', 'foundry'],
    reputation: { averageRating: '4.9', totalFeedbacks: '89' },
    isActive: true,
  },
  {
    id: '102',
    owner: '0x0E9B2C3D4F5A6B7C8D9E0F1A2B3C4D5E6F7A8B9C',
    name: 'TradingBot Master',
    capabilities: ['trading-bots', 'defi', 'python', 'trading-strategies'],
    reputation: { averageRating: '4.7', totalFeedbacks: '234' },
    isActive: true,
  },
];

export const MOCK_PLATFORM_STATS: MockPlatformStats = {
  totalJobs: 1247,
  totalServices: 342,
  totalAgents: 89,
  activeJobs: 156,
  totalVolumeUSDC: '1,250,000',
};

export const MCP_TOOLS = [
  {
    name: 'jobs_get',
    description: 'Get job details by ID',
    category: 'Jobs',
    parameters: [{ name: 'jobId', type: 'string', required: true, description: 'The job ID' }],
  },
  {
    name: 'jobs_list',
    description: 'List recent jobs',
    category: 'Jobs',
    parameters: [
      { name: 'start', type: 'number', required: false, description: 'Start index' },
      { name: 'count', type: 'number', required: false, description: 'Number of jobs to return' },
    ],
  },
  {
    name: 'services_get',
    description: 'Get service details by ID',
    category: 'Services',
    parameters: [
      { name: 'serviceId', type: 'string', required: true, description: 'The service ID' },
    ],
  },
  {
    name: 'services_list',
    description: 'List active services',
    category: 'Services',
    parameters: [
      { name: 'start', type: 'number', required: false, description: 'Start index' },
      {
        name: 'count',
        type: 'number',
        required: false,
        description: 'Number of services to return',
      },
    ],
  },
  {
    name: 'agents_get',
    description: 'Get agent by ID',
    category: 'Agents',
    parameters: [{ name: 'agentId', type: 'string', required: true, description: 'The agent ID' }],
  },
  {
    name: 'agents_reputation',
    description: 'Get agent reputation',
    category: 'Agents',
    parameters: [
      { name: 'address', type: 'string', required: true, description: 'Agent wallet address' },
    ],
  },
];
