export const GET_JOBS = `
  query GetJobs($first: Int!, $skip: Int!) {
    jobs(
      first: $first
      skip: $skip
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      jobId
      client
      provider
      evaluator
      description
      budget
      status
      createdAt
      fundedAt
      completedAt
    }
    platformStats(id: "platform") {
      totalJobs
    }
  }
`;

export const GET_JOBS_BY_CLIENT = `
  query GetJobsByClient($client: Bytes!, $first: Int!, $skip: Int!) {
    jobs(
      first: $first
      skip: $skip
      where: { client: $client }
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      jobId
      client
      provider
      evaluator
      description
      budget
      status
      createdAt
      fundedAt
      completedAt
    }
  }
`;

export const GET_JOBS_BY_PROVIDER = `
  query GetJobsByProvider($provider: Bytes!, $first: Int!, $skip: Int!) {
    jobs(
      first: $first
      skip: $skip
      where: { provider: $provider }
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      jobId
      client
      provider
      evaluator
      description
      budget
      status
      createdAt
      fundedAt
      completedAt
    }
  }
`;

export const GET_JOB = `
  query GetJob($id: ID!) {
    job(id: $id) {
      id
      jobId
      client
      provider
      evaluator
      paymentToken
      description
      budget
      expiredAt
      status
      hook
      createdAt
      fundedAt
      submittedAt
      completedAt
      rejectedAt
      deliverable
      platformFee
      evaluatorFee
    }
  }
`;
