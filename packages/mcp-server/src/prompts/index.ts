export interface ListPromptsResponse {
  prompts: Array<{
    name: string;
    description: string;
    arguments?: Array<{
      name: string;
      description: string;
      required: boolean;
    }>;
  }>;
}

export function listPrompts(): ListPromptsResponse {
  return {
    prompts: [
      {
        name: 'job_summary',
        description: 'Generate a summary of a job including its current status and recommendations',
        arguments: [
          {
            name: 'job_id',
            description: 'The job ID to summarize',
            required: true,
          },
        ],
      },
      {
        name: 'service_analysis',
        description: 'Analyze a service and provide recommendations for optimization',
        arguments: [
          {
            name: 'service_id',
            description: 'The service ID to analyze',
            required: true,
          },
        ],
      },
      {
        name: 'agent_report',
        description:
          'Generate a comprehensive report about an agent including reputation and history',
        arguments: [
          {
            name: 'address',
            description: "The agent's Ethereum address",
            required: true,
          },
        ],
      },
    ],
  };
}

export function generateJobSummary(jobData: unknown): string {
  const job = jobData as any;

  return `## Job Summary: #${job.id}

**Status:** ${job.status}
**Client:** ${job.client}
**Provider:** ${job.provider}
**Budget:** ${job.budget} USDC

**Description:** ${job.description}

**Recommendations:**
${
  job.status === 'Open'
    ? '- Wait for a provider to accept the job\n- Consider increasing budget to attract more providers'
    : job.status === 'Funded'
      ? '- Provider should start work\n- Client should prepare evaluation criteria'
      : job.status === 'Submitted'
        ? '- Client should review and approve/reject the work\n- Evaluator can provide final approval if needed'
        : job.status === 'Completed'
          ? '- Job successfully completed\n- Consider leaving feedback for the provider'
          : '- Job ended without successful completion'
}
`;
}

export function generateServiceAnalysis(serviceData: unknown): string {
  const service = serviceData as any;

  return `## Service Analysis: ${service.name}

**Provider:** ${service.provider}
**Price:** ${service.price} USDC
**Status:** ${service.isActive ? 'Active' : 'Inactive'}
**Created:** ${service.createdAt}

**Description:** ${service.description}

**Recommendations:**
${
  service.isActive
    ? '- Service is live and can receive orders\n- Monitor job requests regularly\n- Consider adding metadataURI for enhanced discoverability'
    : '- Service is inactive\n- Consider reactivating to receive more orders'
}
${
  Number(service.price) < 1000000
    ? '- Price is below market rate (minimum 1 USDC recommended)\n- Consider increasing price to improve earnings'
    : ''
}
`;
}

export function generateAgentReport(agentData: unknown): string {
  const agent = agentData as any;

  if (!agent.isRegistered) {
    return `## Agent Report: ${agent.address}

**Status:** Not Registered

This address is not registered as an agent on Kokonut.

To register, visit: https://kokonut.network/identity/register
`;
  }

  return `## Agent Report

**Agent ID:** ${agent.id}
**Owner:** ${agent.owner}
**Agent Wallet:** ${agent.agentWallet}
**Status:** ${agent.isActive ? 'Active' : 'Inactive'}

**Reputation:**
- Average Rating: ${agent.reputation?.average || 'N/A'}
- Total Feedbacks: ${agent.reputation?.total || '0'}
- Providers: ${agent.reputation?.providers || '0'}

**Metadata:**
${agent.metadata ? `- Name: ${agent.metadata.name || 'Not set'}\n- Capabilities: ${JSON.stringify(agent.metadata.capabilities || [])}\n- Source: ${agent.metadata.source || 'Unknown'}` : 'No metadata available'}

**View Profile:** ${agent.profileUrl}
`;
}
