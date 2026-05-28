/**
 * Type guard utilities for runtime type checking
 * Provides runtime validation and TypeScript type narrowing
 */

/**
 * Validates if a string is a valid Ethereum address (0x + 40 hex chars)
 * @param addr The address to validate
 * @returns True if valid Ethereum address
 */
export function isValidAddress(addr: string | undefined | null): addr is `0x${string}` {
  return !!addr && /^0x[a-fA-F0-9]{40}$/i.test(addr);
}

/**
 * Type guard for contract addresses from environment variables
 * Throws error if invalid, returns typed address if valid
 * @param addr The address to validate
 * @param name The name of the address (for error messages)
 * @returns Validated address
 * @throws Error if address is invalid
 */
export function assertValidAddress(addr: string | undefined | null, name: string): `0x${string}` {
  if (!isValidAddress(addr)) {
    throw new Error(`Invalid ${name} address: ${addr}`);
  }
  return addr;
}
