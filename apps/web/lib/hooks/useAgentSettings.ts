import { useWriteContract, useReadContract } from 'wagmi';
import { parseAbi } from 'viem';
import { CONTRACT_ADDRESSES } from '@/lib/contracts/config';

const ERC8004_REGISTRY = CONTRACT_ADDRESSES.sepolia.erc8004Registry;
const ERC8004_REPUTATION = CONTRACT_ADDRESSES.sepolia.erc8004Reputation;
const SEPOLIA_CHAIN_ID = 11155111;

const ERC8004_REGISTRY_ABI = parseAbi([
  'function setAgentURI(uint256 agentId, string newURI) external',
  'function setMetadata(uint256 agentId, string metadataKey, bytes metadataValue) external',
  'function getAgent(uint256 agentId) external view returns (address owner, string agentURI, address agentWallet, bool isActive)',
]);

const ERC8004_REPUTATION_ABI = parseAbi([
  'function getAgentReputation(address agent) external view returns (int256 average, uint256 total, uint256 providers)',
  'function getFeedbackCount(address agent) external view returns (uint256)',
]);

export function useSetAgentURI() {
  const { writeContract, data: hash, isPending } = useWriteContract();

  const setAgentURI = (agentId: bigint, newURI: string) => {
    writeContract({
      chainId: SEPOLIA_CHAIN_ID,
      address: ERC8004_REGISTRY,
      abi: ERC8004_REGISTRY_ABI,
      functionName: 'setAgentURI',
      args: [agentId, newURI],
    });
  };

  return { setAgentURI, hash, isPending };
}

export function useSetAgentMetadata() {
  const { writeContract, data: hash, isPending } = useWriteContract();

  const setMetadata = (agentId: bigint, metadataKey: string, metadataValue: `0x${string}`) => {
    writeContract({
      chainId: SEPOLIA_CHAIN_ID,
      address: ERC8004_REGISTRY,
      abi: ERC8004_REGISTRY_ABI,
      functionName: 'setMetadata',
      args: [agentId, metadataKey, metadataValue],
    });
  };

  return { setMetadata, hash, isPending };
}

export function useAgentStats(agentId: bigint | undefined) {
  const { data: agentData } = useReadContract({
    address: ERC8004_REGISTRY,
    abi: ERC8004_REGISTRY_ABI,
    functionName: 'getAgent',
    args: agentId !== undefined ? [agentId] : undefined,
    query: { enabled: agentId !== undefined },
  });

  const agentAddress = agentData?.[0] as `0x${string}` | undefined;

  const { data: reputation } = useReadContract({
    address: ERC8004_REPUTATION,
    abi: ERC8004_REPUTATION_ABI,
    functionName: 'getAgentReputation',
    args: agentAddress ? [agentAddress] : undefined,
    query: { enabled: !!agentAddress },
  });

  const { data: feedbackCountData } = useReadContract({
    address: ERC8004_REPUTATION,
    abi: ERC8004_REPUTATION_ABI,
    functionName: 'getFeedbackCount',
    args: agentAddress ? [agentAddress] : undefined,
    query: { enabled: !!agentAddress },
  });

  return {
    jobsCompleted: Number(reputation?.[1] ?? 0),
    rating: reputation?.[0] ? Number(reputation[0]) / 1e18 : 0,
    feedbackCount: Number(feedbackCountData ?? 0),
  };
}
