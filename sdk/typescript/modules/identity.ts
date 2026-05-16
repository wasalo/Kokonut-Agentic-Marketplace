import { createWalletClient, createPublicClient, type Address } from 'viem';
import { IDENTITY_REGISTRY_ABI } from '../abis';
import type { ContractAddresses, AgentRegistrationParams, AgentMetadata, SDKEventName, SDKEventHandler, SDKEventMap, TransactionResult } from '../types';

export class IdentityModule {
  private wallet: ReturnType<typeof createWalletClient>;
  private publicClient: ReturnType<typeof createPublicClient>;
  private contracts: ContractAddresses;

  constructor(
    wallet: ReturnType<typeof createWalletClient>,
    publicClient: ReturnType<typeof createPublicClient>,
    contracts: ContractAddresses
  ) {
    this.wallet = wallet;
    this.publicClient = publicClient;
    this.contracts = contracts;
  }

  async register(params: AgentRegistrationParams): Promise<TransactionResult> {
    const metadata: AgentMetadata = {
      name: params.name,
      description: params.description,
      capabilities: params.capabilities,
      endpoints: params.endpoints,
      social: params.social,
      createdAt: new Date().toISOString(),
    };

    const metadataURI = this.encodeMetadata(metadata);
    const hash = await this.wallet.writeContract({
      address: this.contracts.erc8004Registry as Address,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'register',
      args: [metadataURI],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async getAgent(agentId: number | bigint): Promise<{
    owner: Address;
    agentURI: string;
    agentWallet: Address;
    isActive: boolean;
  }> {
    const agent = (await this.publicClient.readContract({
      address: this.contracts.erc8004Registry as Address,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'getAgent',
      args: [BigInt(agentId)],
    } as any)) as [Address, string, Address, boolean];

    return {
      owner: agent[0],
      agentURI: agent[1],
      agentWallet: agent[2],
      isActive: agent[3],
    };
  }

  async isAgent(address: Address): Promise<boolean> {
    const result = await this.publicClient.readContract({
      address: this.contracts.erc8004Registry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'isAgent',
      args: [address],
    } as any);
    return result as unknown as boolean;
  }

  async getAgentCount(): Promise<bigint> {
    const result = await this.publicClient.readContract({
      address: this.contracts.erc8004Registry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'getCurrentAgentId',
    } as any);
    return result as unknown as bigint;
  }

  async isRegistered(): Promise<boolean> {
    return this.isAgent(this.wallet.account?.address as Address);
  }

  async setAgentURI(agentId: number | bigint, newURI: string): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.erc8004Registry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'setAgentURI',
      args: [agentId, newURI],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async getMetadata(agentId: number | bigint, key: string): Promise<string> {
    const result = await this.publicClient.readContract({
      address: this.contracts.erc8004Registry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'getMetadata',
      args: [agentId, key],
    } as any);
    return Buffer.from(result as unknown as string).toString('utf8');
  }

  async setMetadata(
    agentId: number | bigint,
    key: string,
    value: string
  ): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.erc8004Registry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'setMetadata',
      args: [agentId, key, Buffer.from(value).toString('utf8')],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async getAgentWallet(agentId: number | bigint): Promise<Address> {
    const result = await this.publicClient.readContract({
      address: this.contracts.erc8004Registry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'getAgentWallet',
      args: [agentId],
    } as any);
    return result as unknown as Address;
  }

  async setAgentWallet(
    agentId: number | bigint,
    newWallet: Address,
    deadline: bigint,
    signature: `0x${string}`
  ): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.erc8004Registry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'setAgentWallet',
      args: [agentId, newWallet, deadline, signature],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  async unsetAgentWallet(agentId: number | bigint): Promise<TransactionResult> {
    const hash = await this.wallet.writeContract({
      address: this.contracts.erc8004Registry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'unsetAgentWallet',
      args: [agentId],
    } as any);

    return {
      hash,
      wait: () => this.publicClient.waitForTransactionReceipt({ hash }),
    };
  }

  on<K extends 'AgentRegistered'>(event: K, handler: SDKEventHandler<SDKEventMap[K]>): void {
    // Event watching via watchContractEvent is not fully implemented
    // Use polling or WebSocket for production event handling
  }

  private encodeMetadata(data: AgentMetadata): string {
    const json = JSON.stringify(data);
    const base64 = Buffer.from(json).toString('base64');
    return `data:application/json;base64,${base64}`;
  }

  decodeMetadata(uri: string): AgentMetadata | null {
    try {
      if (uri.startsWith('data:')) {
        const parts = uri.split(',');
        if (parts.length === 2 && parts[0].includes('base64')) {
          return JSON.parse(Buffer.from(parts[1], 'base64').toString());
        }
      }
      return null;
    } catch {
      return null;
    }
  }
}
