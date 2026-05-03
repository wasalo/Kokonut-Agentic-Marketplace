export const GET_PLATFORM_STATS = `
  query GetPlatformStats {
    platformStats(first: 1, where: { id: "platform" }) {
      totalAgents
      totalServices
      totalJobs
      totalProposals
      totalReviews
      totalSkills
      totalBlacklistedAgents
      totalDisputes
      updatedAt
    }
  }
`;

export const GET_ALL_AGENTS_METADATA = `
  query GetAllAgentsMetadata($first: Int!) {
    agents(first: $first, orderBy: createdAt, orderDirection: desc) {
      id
      metadataURI
    }
  }
`;

export const GET_ACTIVITY_COUNTS = `
  query GetActivityCounts {
    jobCreated: activities(where: { type: "JOB_CREATED" }, first: 0) {
      id
    }
    jobFunded: activities(where: { type: "JOB_FUNDED" }, first: 0) {
      id
    }
    paymentReleased: activities(where: { type: "PAYMENT_RELEASED" }, first: 0) {
      id
    }
    serviceCreated: activities(where: { type: "SERVICE_CREATED" }, first: 0) {
      id
    }
    proposalCreated: activities(where: { type: "PROPOSAL_CREATED" }, first: 0) {
      id
    }
    agentRegistered: activities(where: { type: "AGENT_REGISTERED" }, first: 0) {
      id
    }
  }
`;
