import { createPublicClient, http, type PublicClient } from 'viem';
import { sepolia } from 'viem/chains';
import { OWSChain, OWS_RPC_URLS, OWS_CHAIN_IDS } from './types';

const clients: Map<OWSChain, PublicClient> = new Map();

function getClient(chain: OWSChain): PublicClient {
  if (!clients.has(chain)) {
    const rpcUrl = OWS_RPC_URLS[chain].replace('${API_KEY}', process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || '');
    const client = createPublicClient({
      chain: chain === 'sepolia' ? sepolia : undefined,
      transport: http(rpcUrl),
    });
    clients.set(chain, client);
  }
  return clients.get(chain) as PublicClient;
}

export interface BalanceResult {
  native: bigint;
  tokens: Record<string, bigint>;
}

export async function getWalletBalance(
  address: `0x${string}`,
  chain: OWSChain
): Promise<BalanceResult> {
  try {
    const client = getClient(chain);
    
    const nativeBalance: bigint = await client.getBalance({
      address: address,
    });

    return {
      native: nativeBalance,
      tokens: {},
    };
  } catch (error) {
    console.error('[OWS Balance] Error fetching balance:', error);
    return { native: 0n, tokens: {} };
  }
}

export async function getUSDCBalance(
  address: `0x${string}`,
  chain: OWSChain
): Promise<bigint> {
  if (chain !== 'sepolia') {
    return 0n;
  }

  try {
    const usdcAddress = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
    
    const client = getClient(chain);
    
    const balance: bigint = await client.readContract({
      address: usdcAddress as `0x${string}`,
      abi: [{ name: 'balanceOf', type: 'function', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' }],
      functionName: 'balanceOf',
      args: [address],
    });

    return balance;
  } catch (error) {
    console.error('[OWS Balance] Error fetching USDC balance:', error);
    return 0n;
  }
}

export async function getWalletBalances(
  address: `0x${string}`,
  chain: OWSChain
): Promise<BalanceResult> {
  const nativeResult = await getWalletBalance(address, chain);
  const usdcBalance = await getUSDCBalance(address, chain);

  return {
    native: nativeResult.native,
    tokens: {
      '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238': usdcBalance,
    },
  };
}

export async function estimateTransactionGas(
  from: `0x${string}`,
  to: `0x${string}`,
  chain: OWSChain,
  value?: bigint,
  data?: string
): Promise<bigint> {
  try {
    const client = getClient(chain);
    
    const gasEstimate: bigint = await client.estimateGas({
      account: from,
      to: to,
      value: value,
      data: data as `0x${string}` | undefined,
    });

    return gasEstimate;
  } catch (error) {
    console.error('[OWS Gas] Error estimating gas:', error);
    return 21000n;
  }
}

export async function getGasPrice(chain: OWSChain): Promise<bigint> {
  try {
    const client = getClient(chain);
    const gasPrice: bigint = await client.getGasPrice();
    return gasPrice;
  } catch (error) {
    console.error('[OWS Gas] Error fetching gas price:', error);
    return 20000000000n;
  }
}

export async function getChainId(chain: OWSChain): Promise<number> {
  return OWS_CHAIN_IDS[chain];
}

export function clearClientCache(): void {
  clients.clear();
}