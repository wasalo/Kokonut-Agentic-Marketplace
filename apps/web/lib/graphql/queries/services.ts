export const GET_SERVICES = `
  query GetServices($first: Int!, $skip: Int!) {
    services(
      first: $first
      skip: $skip
      where: { isActive: true }
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      serviceId
      agent {
        id
        name
        owner
      }
      provider
      name
      description
      price
      paymentToken
      isActive
      createdAt
    }
    platformStats(id: "platform") {
      totalServices
    }
  }
`;

export const GET_SERVICES_BY_PROVIDER = `
  query GetServicesByProvider($provider: Bytes!, $first: Int!, $skip: Int!) {
    services(
      first: $first
      skip: $skip
      where: { provider: $provider }
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      serviceId
      name
      description
      price
      paymentToken
      isActive
      createdAt
    }
  }
`;

export const GET_SERVICE = `
  query GetService($id: ID!) {
    service(id: $id) {
      id
      serviceId
      agent {
        id
        name
        owner
      }
      provider
      name
      description
      metadataURI
      price
      paymentToken
      paymentAddress
      isActive
      createdAt
      bond
    }
  }
`;
