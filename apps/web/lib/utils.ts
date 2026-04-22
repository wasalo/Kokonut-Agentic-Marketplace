import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAddress(address: string, chars = 4, ensName?: string): string {
  if (ensName) {
    return ensName;
  }
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

export function formatEther(wei: bigint): string {
  return (Number(wei) / 1e18).toFixed(4)
}

export function formatUsdc(usdc: bigint): string {
  return (Number(usdc) / 1e6).toFixed(2)
}

export function isValidEnsName(value: string): boolean {
  return value.endsWith('.eth') && value.length > 4;
}

export function isValidAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}
