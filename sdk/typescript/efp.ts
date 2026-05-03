/**
 * Kokonut Agent SDK - EFP Module
 * Ethereum Follow Protocol integration for social graph features
 */

import { http, createPublicClient, parseAbi, encodeAbiParameters, type Address, type PublicClient, type WalletClient } from 'viem';
import { mainnet } from 'viem/chains';
import type { ContractAddresses, TransactionResult } from './types';

const EFP_API_BASE = 'https://api.ethfollow.xyz/api/v1';
const EFP_CHAIN_ID = 1;

const LIST_RECORDS_ABI = parseAbi([
  'function applyListOp(bytes calldata _listOp) external',
] as const);

const MINT_TO_ABI = parseAbi([
  'function mintTo(address to, bytes calldata listStorageLocation) external returns (uint256)',
] as const);

const ACCOUNT_METADATA_ABI = parseAbi([
  'function setValue(string calldata key, bytes calldata value) external',
] as const);

export interface EfpStats {
  followers_count: string;
  following_count: string;
}

export interface EfpFollower {
  efp_list_nft_token_id: string;
  address: string;
  tags: string[];
  is_following: boolean;
  is_blocked: boolean;
  is_muted: boolean;
}

export interface EfpFollowState {
  is_following: boolean;
  is_blocked: boolean;
  is_muted: boolean;
  is_followed_back: boolean;
}

const EFP_CONTRACTS = {
  EFPListRegistry: '0x5bB2D89c1990c86F5cC8b6Fb4211C18BcEE4A8a2' as Address,
  EFPAccountMetadata: '0x3B6ADe10E9E2C44Cb7D1eC8f3CADE850Be02937f' as Address,
} as const;

const LIST_RECORD_CONTRACTS: Record<number, Address> = {
  1: '0x7dAdDa25302e9c8e5E0E8343367F17A506C7730A',
};

function addressToBytes(address: string): Uint8Array {
  const addr = address.startsWith('0x') ? address.slice(2) : address;
  const bytes = new Uint8Array(20);
  for (let i = 0; i < 20; i++) {
    bytes[i] = parseInt(addr.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function buildFollowOp(targetAddress: string): `0x${string}` {
  const addrBytes = addressToBytes(targetAddress);
  const record = new Uint8Array([1, 1, ...addrBytes]);
  const op = new Uint8Array([1, 1, ...record]);
  let hex = '0x';
  for (const b of op) {
    hex += b.toString(16).padStart(2, '0');
  }
  return hex as `0x${string}`;
}

function buildUnfollowOp(targetAddress: string): `0x${string}` {
  const addrBytes = addressToBytes(targetAddress);
  const record = new Uint8Array([1, 1, ...addrBytes]);
  const op = new Uint8Array([1, 2, ...record]);
  let hex = '0x';
  for (const b of op) {
    hex += b.toString(16).padStart(2, '0');
  }
  return hex as `0x${string}`;
}

function buildStorageLocation(slot: bigint): `0x${string}` {
  const listRecordsAddr = LIST_RECORD_CONTRACTS[EFP_CHAIN_ID];

  const encoded = encodeAbiParameters(
    [
      { type: 'uint8', name: 'version' },
      { type: 'uint8', name: 'locationType' },
      { type: 'uint256', name: 'chainId' },
      { type: 'address', name: 'contractAddress' },
      { type: 'uint256', name: 'slot' },
    ],
    [
      1,
      1,
      BigInt(EFP_CHAIN_ID),
      listRecordsAddr,
      slot,
    ]
  );

  return encoded;
}

async function efpFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${EFP_API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`EFP API error: ${response.status}`);
  }
  const json = await response.json() as { data: T };
  return json.data;
}

export class EFPModule {
  private wallet: WalletClient;
  private publicClient: PublicClient;
  private mainnetClient: PublicClient;

  constructor(wallet: WalletClient, publicClient: PublicClient, contracts: ContractAddresses) {
    this.wallet = wallet;
    this.publicClient = publicClient;
    this.mainnetClient = createPublicClient({
      chain: mainnet,
      transport: http('https://ethereum.publicnode.com'),
    });
  }

  get address(): Address {
    return this.wallet.account.address;
  }

  async getStats(address: string): Promise<EfpStats> {
    return efpFetch<EfpStats>(`/users/${address}/stats`);
  }

  async getFollowers(address: string, limit = 10, offset = 0): Promise<EfpFollower[]> {
    const data = await efpFetch<{ followers: EfpFollower[] }>(
      `/users/${address}/followers?limit=${limit}&offset=${offset}`
    );
    return data.followers;
  }

  async getFollowing(address: string, limit = 10, offset = 0): Promise<EfpFollower[]> {
    const data = await efpFetch<{ following: EfpFollower[] }>(
      `/users/${address}/following?limit=${limit}&offset=${offset}`
    );
    return data.following;
  }

  async isFollowing(fromAddress: string, toAddress: string): Promise<boolean> {
    const data = await efpFetch<EfpFollowState>(
      `/users/${fromAddress}/follower-state/${toAddress}`
    );
    return data.is_following;
  }

  async hasList(address: string): Promise<boolean> {
    try {
      const data = await efpFetch<string | null>(`/users/${address}/primary-list`);
      return !!data;
    } catch {
      return false;
    }
  }

  async follow(targetAddress: string): Promise<TransactionResult> {
    const listOpData = buildFollowOp(targetAddress);
    const listRecordsAddr = LIST_RECORD_CONTRACTS[EFP_CHAIN_ID];

    const hash = await this.wallet.writeContract({
      address: listRecordsAddr,
      abi: LIST_RECORDS_ABI,
      functionName: 'applyListOp',
      args: [listOpData],
      chain: mainnet,
    } as any);

    return {
      hash,
      wait: () => this.mainnetClient.waitForTransactionReceipt({ hash }),
    };
  }

  async unfollow(targetAddress: string): Promise<TransactionResult> {
    const listOpData = buildUnfollowOp(targetAddress);
    const listRecordsAddr = LIST_RECORD_CONTRACTS[EFP_CHAIN_ID];

    const hash = await this.wallet.writeContract({
      address: listRecordsAddr,
      abi: LIST_RECORDS_ABI,
      functionName: 'applyListOp',
      args: [listOpData],
      chain: mainnet,
    } as any);

    return {
      hash,
      wait: () => this.mainnetClient.waitForTransactionReceipt({ hash }),
    };
  }

  async mintList(): Promise<TransactionResult> {
    const to = this.wallet.account.address;
    const slot = BigInt(Math.floor(Math.random() * 1000000) + 1);
    const listStorageLocation = buildStorageLocation(slot);

    const hash = await this.wallet.writeContract({
      address: EFP_CONTRACTS.EFPListRegistry,
      abi: MINT_TO_ABI,
      functionName: 'mintTo',
      args: [to, listStorageLocation],
      chain: mainnet,
    } as any);

    return {
      hash,
      wait: () => this.mainnetClient.waitForTransactionReceipt({ hash }),
    };
  }

  async setPrimaryList(tokenId: bigint): Promise<TransactionResult> {
    const key = 'primary-list';
    const valueHex = `0x${tokenId.toString(16).padStart(64, '0')}` as `0x${string}`;

    const hash = await this.wallet.writeContract({
      address: EFP_CONTRACTS.EFPAccountMetadata,
      abi: ACCOUNT_METADATA_ABI,
      functionName: 'setValue',
      args: [key, valueHex],
      chain: mainnet,
    } as any);

    return {
      hash,
      wait: () => this.mainnetClient.waitForTransactionReceipt({ hash }),
    };
  }
}
