import { SUPPORTED_CHAINS } from '@/lib/chains';

export function getExplorerTxUrl(txHash: `0x${string}`, chainId: number = 11155111): string | undefined {
  const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId);
  if (!chain?.explorerUrl) return undefined;
  return `${chain.explorerUrl}/tx/${txHash}`;
}

export function getExplorerAddressUrl(address: `0x${string}`, chainId: number = 11155111): string | undefined {
  const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId);
  if (!chain?.explorerUrl) return undefined;
  return `${chain.explorerUrl}/address/${address}`;
}
