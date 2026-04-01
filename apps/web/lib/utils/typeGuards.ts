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
 * Validates if a string is a valid Ethereum transaction hash (0x + 64 hex chars)
 * @param hash The hash to validate
 * @returns True if valid transaction hash
 */
export function isValidHash(hash: string | undefined | null): hash is `0x${string}` {
  return !!hash && /^0x[a-fA-F0-9]{64}$/i.test(hash);
}

/**
 * Validates if a string is a valid bytes32 value (0x + 64 hex chars)
 * @param value The value to validate
 * @returns True if valid bytes32
 */
export function isValidBytes32(value: string | undefined | null): value is `0x${string}` {
  return !!value && /^0x[a-fA-F0-9]{64}$/i.test(value);
}

/**
 * Validates if a value is a valid bigint
 * @param value The value to check
 * @returns True if bigint
 */
export function isValidBigInt(value: unknown): value is bigint {
  return typeof value === 'bigint';
}

/**
 * Validates if a string can be converted to a valid bigint
 * @param value The string to validate
 * @returns True if can be converted to bigint
 */
export function isValidBigIntString(value: string | undefined | null): boolean {
  if (!value) return false;
  try {
    BigInt(value);
    return true;
  } catch {
    return false;
  }
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

/**
 * Safe type assertion for optional addresses
 * Returns undefined if invalid/null, typed address if valid
 * @param addr The address to validate
 * @returns Valid address or undefined
 */
export function safeAddress(addr: string | undefined | null): `0x${string}` | undefined {
  return isValidAddress(addr) ? addr : undefined;
}

/**
 * Validates agent metadata structure
 * @param metadata The metadata to validate
 * @returns True if valid agent metadata
 */
export function isValidAgentMetadata(metadata: unknown): metadata is {
  name: string;
  capabilities: string[];
  endpoints?: Record<string, string>;
} {
  if (!metadata || typeof metadata !== 'object') return false;
  const m = metadata as Record<string, unknown>;
  return (
    typeof m.name === 'string' &&
    Array.isArray(m.capabilities) &&
    m.capabilities.every(c => typeof c === 'string')
  );
}

/**
 * Validates if a value is a valid number
 * @param value The value to check
 * @returns True if valid number
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Validates if a string is a valid URL
 * @param url The URL to validate
 * @returns True if valid URL
 */
export function isValidUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates if a value is a non-empty string
 * @param value The value to check
 * @returns True if non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Validates if a value is a valid array
 * @param value The value to check
 * @returns True if array
 */
export function isValidArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * Validates if a value is a valid object (not null, not array)
 * @param value The value to check
 * @returns True if plain object
 */
export function isValidObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
