export const GET_AGENTS_BY_OWNER_FULL = `
  query GetAgentsByOwner($owner: Bytes!, $first: Int!) {
    agents(
      first: $first
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
      isActive
      createdAt
      services {
        id
        name
      }
    }
    agentEntities: agents(
      where: { owner: $owner, source: "kokonut-marketplace" }
    ) {
      id
    }
  }
`;

export const GET_AGENT_COUNTS_BY_OWNER = `
  query GetAgentCountsByOwner($owner: Bytes!) {
    all: agents(where: { owner: $owner }) { id }
    kokonut: agents(where: { owner: $owner, source: "kokonut-marketplace" }) { id }
  }
`;
