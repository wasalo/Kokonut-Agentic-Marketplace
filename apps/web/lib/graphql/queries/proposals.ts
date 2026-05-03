export const GET_PROPOSALS = `
  query GetProposals($first: Int!, $skip: Int!) {
    proposals(
      first: $first
      skip: $skip
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      proposalId
      proposer
      title
      reward
      status
      createdAt
      decidedAt
      winningEvaluator
    }
    platformStats(id: "platform") {
      totalProposals
    }
  }
`;

export const GET_PROPOSAL = `
  query GetProposal($id: ID!) {
    proposal(id: $id) {
      id
      proposalId
      proposer
      title
      description
      reward
      status
      createdAt
      decidedAt
      winningEvaluator
      evaluations {
        id
        evaluator
        confidenceScore
        createdAt
      }
    }
  }
`;
