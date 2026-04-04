import { publicClient, CONTRACTS, SERVICE_REGISTRY_ABI, formatUsdc } from '../client.js';

interface GetServiceArgs {
  serviceId: string;
}

interface ListServicesArgs {
  start?: string;
  count?: string;
}

interface GetProviderServicesArgs {
  address: string;
}

interface ServiceTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
  handler: (args: unknown) => Promise<unknown>;
}

async function getService(args: GetServiceArgs): Promise<unknown> {
  const { serviceId } = args;

  const service = (await publicClient.readContract({
    address: CONTRACTS.serviceRegistry,
    abi: SERVICE_REGISTRY_ABI,
    functionName: 'getService',
    args: [BigInt(serviceId)],
  })) as any;

  return {
    id: service.id.toString(),
    provider: service.provider,
    agentId: service.agentId.toString(),
    name: service.name,
    description: service.description,
    metadataURI: service.metadataURI,
    price: formatUsdc(service.price),
    priceRaw: service.price.toString(),
    paymentToken: service.paymentToken,
    isActive: service.isActive,
    createdAt: new Date(Number(service.createdAt) * 1000).toISOString(),
    marketplaceUrl: `https://kokonut.network/marketplace/${service.id}`,
  };
}

async function listServices(args: ListServicesArgs): Promise<unknown> {
  const start = BigInt(args.start || '0');
  const count = BigInt(args.count || '20');

  const serviceIds = (await publicClient.readContract({
    address: CONTRACTS.serviceRegistry,
    abi: SERVICE_REGISTRY_ABI,
    functionName: 'getActiveServiceCount',
    args: [],
  })) as bigint;

  const ids = (await publicClient.readContract({
    address: CONTRACTS.serviceRegistry,
    abi: SERVICE_REGISTRY_ABI,
    functionName: 'getServices',
    args: [start, count],
  })) as bigint[];

  const services = [];
  for (const serviceId of ids) {
    try {
      const service = (await publicClient.readContract({
        address: CONTRACTS.serviceRegistry,
        abi: SERVICE_REGISTRY_ABI,
        functionName: 'getService',
        args: [serviceId],
      })) as any;

      services.push({
        id: service.id.toString(),
        provider: service.provider,
        name: service.name,
        description:
          service.description.slice(0, 80) + (service.description.length > 80 ? '...' : ''),
        price: formatUsdc(service.price),
        isActive: service.isActive,
      });
    } catch {
      // Skip invalid services
    }
  }

  return {
    total: serviceIds.toString(),
    services,
  };
}

async function getProviderServices(args: GetProviderServicesArgs): Promise<unknown> {
  const { address } = args;

  const serviceIds = (await publicClient.readContract({
    address: CONTRACTS.serviceRegistry,
    abi: SERVICE_REGISTRY_ABI,
    functionName: 'getProviderServices',
    args: [address as `0x${string}`],
  })) as bigint[];

  const services = [];
  for (const serviceId of serviceIds) {
    try {
      const service = (await publicClient.readContract({
        address: CONTRACTS.serviceRegistry,
        abi: SERVICE_REGISTRY_ABI,
        functionName: 'getService',
        args: [serviceId],
      })) as any;

      services.push({
        id: service.id.toString(),
        name: service.name,
        description:
          service.description.slice(0, 80) + (service.description.length > 80 ? '...' : ''),
        price: formatUsdc(service.price),
        isActive: service.isActive,
        createdAt: new Date(Number(service.createdAt) * 1000).toISOString(),
      });
    } catch {
      // Skip invalid services
    }
  }

  return {
    provider: address,
    count: services.length,
    services,
  };
}

export const servicesTools: ServiceTool[] = [
  {
    name: 'services_get',
    description: 'Get details of a specific service by ID',
    inputSchema: {
      type: 'object',
      properties: {
        serviceId: { type: 'string', description: 'The service ID (uint256 as string)' },
      },
      required: ['serviceId'],
    },
    handler: getService,
  },
  {
    name: 'services_list',
    description: 'List active services on the marketplace',
    inputSchema: {
      type: 'object',
      properties: {
        start: { type: 'string', description: 'Starting index (default: 0)' },
        count: {
          type: 'string',
          description: 'Number of services to return (default: 20, max: 100)',
        },
      },
    },
    handler: listServices,
  },
  {
    name: 'services_by_provider',
    description: 'Get all services offered by a specific provider',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: "Provider's Ethereum address" },
      },
      required: ['address'],
    },
    handler: getProviderServices,
  },
];
