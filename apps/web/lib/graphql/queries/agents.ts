export const GET_ALL_AGENTS_PAGINATED = `
  query GetAllAgentsPaginated($first: Int!, $skip: Int!) {
    agents(
      first: $first
      skip: $skip
      orderBy: createdAt
      orderDirection: desc
    ) {
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
      blacklisted
      featured
    }
  }
`;

export const GET_AGENT = `
  query GetAgent($id: ID!) {
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
        name
        description
        price
        isActive
      }
    }
  }
`;

export const GET_AGENTS_BY_OWNER = `
  query GetAgentsByOwner($owner: Bytes!, $first: Int!, $skip: Int!) {
    agents(
      first: $first
      skip: $skip
      where: { owner: $owner }
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      agentId
      owner
      name
      description
      capabilities
      source
      metadataURI
      createdAt
    }
  }
`;
