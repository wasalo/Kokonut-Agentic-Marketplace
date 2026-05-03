export const GET_ACTIVITY_ALL = `
  query GetActivityAll($first: Int!, $skip: Int!) {
    activities(
      first: $first
      skip: $skip
      orderBy: blockNumber
      orderDirection: desc
    ) {
      id
      type
      actor
      targetId
      blockNumber
      timestamp
      transactionHash
    }
  }
`;

export const GET_ACTIVITY_BY_ACTORS = `
  query GetActivityByActors($first: Int!, $skip: Int!, $actors: [Bytes!]!) {
    activities(
      first: $first
      skip: $skip
      where: { actor_in: $actors }
      orderBy: blockNumber
      orderDirection: desc
    ) {
      id
      type
      actor
      targetId
      blockNumber
      timestamp
      transactionHash
    }
  }
`;

export const GET_ACTIVITY_BY_TYPE = `
  query GetActivityByType($first: Int!, $skip: Int!, $type: String!) {
    activities(
      first: $first
      skip: $skip
      where: { type: $type }
      orderBy: blockNumber
      orderDirection: desc
    ) {
      id
      type
      actor
      targetId
      blockNumber
      timestamp
      transactionHash
    }
  }
`;
