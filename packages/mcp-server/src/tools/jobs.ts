import {
  publicClient,
  CONTRACTS,
  AGENTIC_COMMERCE_ABI,
  JOB_STATUS,
  formatUsdc,
} from '../client.js';

interface GetJobArgs {
  jobId: string;
}

interface ListJobsArgs {
  start?: string;
  count?: string;
}

interface GetMyJobsArgs {
  address: string;
  role?: 'client' | 'provider';
}

interface JobTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
  handler: (args: unknown) => Promise<unknown>;
}

async function getJob(args: GetJobArgs): Promise<unknown> {
  const { jobId } = args;

  const job = (await publicClient.readContract({
    address: CONTRACTS.agenticCommerce,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'getJob',
    args: [BigInt(jobId)],
  })) as any;

  return {
    id: job.id.toString(),
    client: job.client,
    provider: job.provider,
    evaluator: job.evaluator,
    description: job.description,
    budget: formatUsdc(job.budget),
    budgetRaw: job.budget.toString(),
    expiredAt: new Date(Number(job.expiredAt) * 1000).toISOString(),
    status: JOB_STATUS[Number(job.status)] || 'Unknown',
    statusCode: Number(job.status),
    hook: job.hook,
    explorerUrl: `https://sepolia.etherscan.io/tx/${job.hook !== '0x0000000000000000000000000000000000000000' ? job.hook : ''}`,
  };
}

async function listJobs(args: ListJobsArgs): Promise<unknown> {
  const start = BigInt(args.start || '0');
  const count = BigInt(args.count || '20');

  const jobIds = (await publicClient.readContract({
    address: CONTRACTS.agenticCommerce,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'getCurrentJobId',
    args: [],
  })) as bigint;

  const totalJobs = Number(jobIds);
  const endIndex = Math.min(Number(start) + Number(count), totalJobs);

  const jobs = [];
  for (let i = totalJobs - Number(start); i > Math.max(totalJobs - endIndex, 0); i--) {
    try {
      const job = (await publicClient.readContract({
        address: CONTRACTS.agenticCommerce,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'getJob',
        args: [BigInt(i)],
      })) as any;

      jobs.push({
        id: job.id.toString(),
        client: job.client,
        provider: job.provider,
        status: JOB_STATUS[Number(job.status)] || 'Unknown',
        budget: formatUsdc(job.budget),
      });
    } catch {
      // Skip invalid jobs
    }
  }

  return {
    total: totalJobs,
    jobs,
  };
}

async function getMyJobs(args: GetMyJobsArgs): Promise<unknown> {
  const { address, role } = args;

  let jobIds: bigint[];

  if (role === 'provider') {
    jobIds = (await publicClient.readContract({
      address: CONTRACTS.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'getProviderJobs',
      args: [address as `0x${string}`],
    })) as bigint[];
  } else {
    jobIds = (await publicClient.readContract({
      address: CONTRACTS.agenticCommerce,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'getClientJobs',
      args: [address as `0x${string}`],
    })) as bigint[];
  }

  const jobs = [];
  for (const jobId of jobIds.slice(-20)) {
    try {
      const job = (await publicClient.readContract({
        address: CONTRACTS.agenticCommerce,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'getJob',
        args: [jobId],
      })) as any;

      jobs.push({
        id: job.id.toString(),
        client: job.client,
        provider: job.provider,
        evaluator: job.evaluator,
        description: job.description.slice(0, 100) + (job.description.length > 100 ? '...' : ''),
        budget: formatUsdc(job.budget),
        status: JOB_STATUS[Number(job.status)] || 'Unknown',
        expiredAt: new Date(Number(job.expiredAt) * 1000).toISOString(),
      });
    } catch {
      // Skip invalid jobs
    }
  }

  return {
    address,
    role: role || 'client',
    count: jobs.length,
    jobs,
  };
}

export const jobsTools: JobTool[] = [
  {
    name: 'jobs_get',
    description: 'Get details of a specific job by ID',
    inputSchema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'The job ID (uint256 as string)' },
      },
      required: ['jobId'],
    },
    handler: getJob,
  },
  {
    name: 'jobs_list',
    description: 'List recent jobs on the platform',
    inputSchema: {
      type: 'object',
      properties: {
        start: { type: 'string', description: 'Starting index (default: 0)' },
        count: { type: 'string', description: 'Number of jobs to return (default: 20, max: 100)' },
      },
    },
    handler: listJobs,
  },
  {
    name: 'jobs_my',
    description: 'Get jobs for a specific address (as client or provider)',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Ethereum address' },
        role: { type: 'string', description: 'Role filter: "client" or "provider"' },
      },
      required: ['address'],
    },
    handler: getMyJobs,
  },
];
