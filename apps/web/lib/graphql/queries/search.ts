export const SEARCH_AGENTS = `
  query SearchAgents($search: String!, $first: Int!, $skip: Int!) {
    agents(
      first: $first
      skip: $skip
      where: { name_contains: $search }
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
