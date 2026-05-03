export const GET_ACTIVITY_IN_RANGE = `
  query GetActivityInRange($from: BigInt!, $to: BigInt!) {
    activities(
      where: { timestamp_gte: $from, timestamp_lte: $to }
      orderBy: timestamp
      orderDirection: asc
    ) {
      id
      type
      timestamp
      blockNumber
    }
    platformStats(first: 1, where: { id: "platform" }) {
      totalAgents
      totalServices
      totalJobs
      totalProposals
      totalReviews
    }
  }
`;

export const GET_JOB_STATUSES = `
  query GetJobStatuses($first: Int!) {
    jobs(first: $first, orderBy: createdAt, orderDirection: desc) {
      id
      status
      budget
    }
  }
`;
