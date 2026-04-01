import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

export function formatEther(wei: bigint): string {
  return (Number(wei) / 1e18).toFixed(4)
}

export function formatUsdc(usdc: bigint): string {
  return (Number(usdc) / 1e6).toFixed(2)
}
