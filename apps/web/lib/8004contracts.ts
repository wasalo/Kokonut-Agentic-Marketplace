import { createPublicClient, http, PublicClient } from 'viem';
import { sepolia } from 'viem/chains';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const ERC8004_ADDRESSES = {
  sepolia: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
  mainnet: '0x80048705E3D51c3A7B3A8cB5b4E8F7D2a5B9C3E1',
} as const;

export const ERC8004_ABI = [
  // ERC721 Standard Functions
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Registration
  {
    inputs: [{ name: 'agentURI', type: 'string' }],
    name: 'register',
    outputs: [{ name: 'agentId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'newURI', type: 'string' },
    ],
    name: 'setAgentURI',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'metadataKey', type: 'string' },
    ],
    name: 'getMetadata',
    outputs: [{ name: '', type: 'bytes' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'metadataKey', type: 'string' },
      { name: 'metadataValue', type: 'bytes' },
    ],
    name: 'setMetadata',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'agentId', type: 'uint256' }],
    name: 'getAgentWallet',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'newWallet', type: 'address' },
      { name: 'deadline', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    name: 'setAgentWallet',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'agentId', type: 'uint256' }],
    name: 'unsetAgentWallet',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'value', type: 'int128' },
      { name: 'valueDecimals', type: 'uint8' },
      { name: 'providerUri', type: 'string' },
      { name: 'agentUri', type: 'string' },
      { name: 'feedbackUri', type: 'string' },
      { name: 'extra', type: 'string' },
      { name: 'salt', type: 'bytes32' },
    ],
    name: 'giveFeedback',
    outputs: [{ name: 'feedbackId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'clients', type: 'address[]' },
      { name: 'providerUri', type: 'string' },
      { name: 'agentUri', type: 'string' },
    ],
    name: 'getSummary',
    outputs: [
      { name: 'count', type: 'uint64' },
      { name: 'value', type: 'int128' },
      { name: 'valueDecimals', type: 'uint8' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'client', type: 'address' },
      { name: 'feedbackId', type: 'uint256' },
    ],
    name: 'readFeedback',
    outputs: [
      { name: 'value', type: 'int128' },
      { name: 'valueDecimals', type: 'uint8' },
      { name: 'revoked', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'feedbackId', type: 'uint256' },
    ],
    name: 'revokeFeedback',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'agentId', type: 'uint256' },
      { indexed: false, name: 'agentURI', type: 'string' },
      { indexed: true, name: 'owner', type: 'address' },
    ],
    name: 'Registered',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'agentId', type: 'uint256' },
      { indexed: false, name: 'newURI', type: 'string' },
      { indexed: true, name: 'updatedBy', type: 'address' },
    ],
    name: 'URIUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'agentId', type: 'uint256' },
      { indexed: true, name: 'indexedMetadataKey', type: 'string' },
      { indexed: false, name: 'metadataKey', type: 'string' },
      { indexed: false, name: 'metadataValue', type: 'bytes' },
    ],
    name: 'MetadataSet',
    type: 'event',
  },
] as const;

export function get8004Client(chainId: number = 11155111): PublicClient {
  const transport = http(
    chainId === 11155111
      ? process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com'
      : process.env.NEXT_PUBLIC_MAINNET_RPC_URL || 'https://eth.llamarpc.com'
  );

  return createPublicClient({
    chain: chainId === 11155111 ? sepolia : undefined,
    transport,
  });
}

export function get8004Address(chainId: number = 11155111): `0x${string}` {
  return chainId === 11155111 ? ERC8004_ADDRESSES.sepolia : ERC8004_ADDRESSES.mainnet;
}

/**
 * Fetch tokenURI for an agent using multicall for efficiency
 */
export async function getAgentTokenURIs(
  agentIds: bigint[],
  chainId: number = 11155111
): Promise<{ agentId: bigint; uri: string | null }[]> {
  try {
    const client = get8004Client(chainId);
    const address = get8004Address(chainId);

    const calls = agentIds.map(id => ({
      address,
      abi: ERC8004_ABI,
      functionName: 'tokenURI' as const,
      args: [id] as const,
    }));

    const results = await client.multicall({ contracts: calls });

    return results.map((result, index) => ({
      agentId: agentIds[index],
      uri: result.status === 'success' ? result.result : null,
    }));
  } catch (error) {
    console.error('Error fetching tokenURIs:', error);
    return agentIds.map(id => ({ agentId: id, uri: null }));
  }
}
