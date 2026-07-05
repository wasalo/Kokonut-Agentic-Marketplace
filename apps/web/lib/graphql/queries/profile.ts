export const GET_AGENT_PROFILE = `
  query GetAgentProfile($id: ID!) {
    agent(id: $id) {
      id
      agentId
      owner
      name
      description
      capabilities
      source
      metadataURI
      isActive
      createdAt
      updatedAt
      blacklisted
      featured
      services {
        id
        serviceId
        name
        description
        price
        paymentToken
        isActive
        createdAt
      }
      skills {
        id
        skillId
        name
        isActive
        createdAt
      }
    }
  }
`;

export const GET_AGENT_REVIEWS = `
  query GetAgentReviews($agent: Bytes!, $first: Int!) {
    reviews(
      first: $first
      where: { agent: $agent }
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      reviewer
      rating
      feedbackId
      timestamp
    }
  }
`;

export const GET_AGENT_JOBS = `
  query GetAgentJobs($address: Bytes!, $first: Int!) {
    providerJobs: jobs(
      first: $first
      where: { provider: $address }
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      jobId
      status
      budget
      createdAt
      fundedAt
      completedAt
    }
    clientJobs: jobs(
      first: $first
      where: { client: $address }
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      jobId
      status
      budget
      createdAt
      fundedAt
      completedAt
    }
  }
`;
