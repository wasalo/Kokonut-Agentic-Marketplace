import { PublicClient, parseAbiItem } from 'viem';

const REGISTERED_EVENT = parseAbiItem(
  'event Registered(uint256 indexed agentId, string agentURI, address indexed owner)'
);

const METADATA_SET_EVENT = parseAbiItem(
  'event MetadataSet(uint256 indexed agentId, string indexed indexedMetadataKey, string metadataKey, bytes metadataValue)'
);

// Known deployment block for the ERC-8004 registry on Sepolia
// Scanning from here instead of block 0 dramatically speeds up event queries
const ERC8004_SEPOLIA_DEPLOYMENT_BLOCK = BigInt(7_000_000);

export interface RegisteredAgentId {
  agentId: bigint;
  agentURI: string;
}

/** Query Registered events indexed by owner to find all agentIds for a wallet. */
export async function getAgentIdsByOwner(
  publicClient: PublicClient,
  registryAddress: `0x${string}`,
  owner: `0x${string}`
): Promise<RegisteredAgentId[]> {
  try {
    const logs = await publicClient.getLogs({
      address: registryAddress,
      event: REGISTERED_EVENT,
      args: { owner },
      fromBlock: ERC8004_SEPOLIA_DEPLOYMENT_BLOCK,
    });

    return logs.map(log => ({
      agentId: log.args.agentId!,
      agentURI: log.args.agentURI!,
    }));
  } catch (error) {
    console.error('Error fetching Registered events:', error);
    return [];
  }
}

const KOKONUT_SOURCE_VALUE = 'kokonut-marketplace';

/** Query MetadataSet events to find agentIds tagged with "kokonut-marketplace" source. */
export async function getKokonutAgentIds(
  publicClient: PublicClient,
  registryAddress: `0x${string}`
): Promise<Set<string>> {
  try {
    const logs = await publicClient.getLogs({
      address: registryAddress,
      event: METADATA_SET_EVENT,
      args: { indexedMetadataKey: 'source' },
      fromBlock: ERC8004_SEPOLIA_DEPLOYMENT_BLOCK,
    });

    const kokonutIds = new Set<string>();
    for (const log of logs) {
      const value = log.args.metadataValue as string | undefined;
      if (value === KOKONUT_SOURCE_VALUE) {
        kokonutIds.add(log.args.agentId!.toString());
      }
    }

    return kokonutIds;
  } catch (error) {
    console.error('Error fetching MetadataSet events:', error);
    return new Set();
  }
}
