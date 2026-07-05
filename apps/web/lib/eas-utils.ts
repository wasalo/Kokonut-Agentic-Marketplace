/**
 * EAS schema string parser + attestation data decoder
 *
 * Parses EAS schema strings (e.g. "uint256 eventId, bool vote") into
 * viem AbiParameter[] for use with decodeAbiParameters.
 *
 * Supports: uint/int variants, address, bool, bytes, string, and tuple nesting.
 */

import { type AbiParameter, decodeAbiParameters } from 'viem';

// ---------- Schema string parser ----------

/**
 * Split a schema string into individual parameter declarations,
 * respecting nested parentheses for tuple types.
 *
 * Example: "tuple(uint256 a, tuple(uint256 b) inner) data, bool flag"
 *        → ["tuple(uint256 a, tuple(uint256 b) inner) data", "bool flag"]
 */
function splitSchemaParams(schema: string): string[] {
  const params: string[] = [];
  let depth = 0;
  let current = '';

  for (const ch of schema) {
    if (ch === '(') {
      depth++;
      current += ch;
    } else if (ch === ')') {
      depth--;
      current += ch;
    } else if (ch === ',' && depth === 0) {
      const trimmed = current.trim();
      if (trimmed) params.push(trimmed);
      current = '';
    } else {
      current += ch;
    }
  }

  const last = current.trim();
  if (last) params.push(last);

  return params;
}

/**
 * Parse a single EAS schema parameter declaration into an AbiParameter.
 *
 * Handles:
 *   - "uint256 eventId"       → { type: 'uint256', name: 'eventId' }
 *   - "address voter"         → { type: 'address', name: 'voter' }
 *   - "tuple(uint256 a, bool b) data"
 *     → { type: 'tuple', name: 'data', components: [...] }
 */
function parseSingleParam(paramStr: string): AbiParameter {
  const trimmed = paramStr.trim();

  // Tuple type: "tuple(...) name"
  if (trimmed.startsWith('tuple(')) {
    return parseTupleParam(trimmed);
  }

  // Simple type: "type name" or just "type"
  const spaceIdx = trimmed.indexOf(' ');
  if (spaceIdx === -1) {
    return { type: trimmed } as AbiParameter;
  }

  const type = trimmed.slice(0, spaceIdx).trim();
  const name = trimmed.slice(spaceIdx + 1).trim();

  return { type, name } as AbiParameter;
}

/**
 * Parse a tuple parameter declaration.
 * Input: "tuple(uint256 a, tuple(uint256 b) inner, bool c) data"
 */
function parseTupleParam(paramStr: string): AbiParameter {
  // Extract the part inside the first tuple(...) and the trailing name
  // Find the matching closing paren for the outer tuple(
  const tupleStart = paramStr.indexOf('tuple(');
  let depth = 0;
  let closeIdx = -1;

  for (let i = tupleStart + 5; i < paramStr.length; i++) {
    if (paramStr[i] === '(') depth++;
    if (paramStr[i] === ')') {
      if (depth === 0) {
        closeIdx = i;
        break;
      }
      depth--;
    }
  }

  const innerContent = paramStr.slice(tupleStart + 6, closeIdx);
  const trailingName = paramStr.slice(closeIdx + 1).trim();

  // Parse the inner parameters recursively
  const innerParams = splitSchemaParams(innerContent);
  const components = innerParams.map(parseSingleParam);

  return {
    type: 'tuple',
    name: trailingName,
    components: components as AbiParameter[],
  } as AbiParameter;
}

/**
 * Parse a full EAS schema string into viem AbiParameter[].
 *
 * @example
 * parseEASSchema("uint256 eventId, bool vote, address voter")
 * // → [{ type: 'uint256', name: 'eventId' }, ...]
 *
 * @example
 * parseEASSchema("tuple(uint256 amount, address token) payment, bool verified")
 * // → [{ type: 'tuple', name: 'payment', components: [...] }, { type: 'bool', name: 'verified' }]
 */
export function parseEASSchema(schema: string): AbiParameter[] {
  const paramStrs = splitSchemaParams(schema);
  return paramStrs.map(parseSingleParam);
}

// ---------- Data decoder ----------

/**
 * Decode attestation data bytes using an EAS schema string.
 *
 * @param data   The raw ABI-encoded bytes from the attestation
 * @param schema The EAS schema string (e.g. "uint256 eventId, bool vote")
 * @returns Decoded claim fields as a key-value record
 */
export function decodeAttestationData(
  data: `0x${string}`,
  schema: string
): Record<string, unknown> {
  if (!data || data === '0x') return {};

  const params = parseEASSchema(schema);
  if (params.length === 0) return {};

  try {
    const decoded = decodeAbiParameters(params as any, data as any);

    // Convert tuple to object if single tuple param
    if (params.length === 1 && params[0].type === 'tuple' && params[0].name) {
      return { [params[0].name]: decoded[0] };
    }

    // Map results to named record
    const result: Record<string, unknown> = {};
    for (let i = 0; i < params.length; i++) {
      const key = params[i].name || `_${i}`;
      result[key] = decoded[i];
    }
    return result;
  } catch {
    // If decode fails (e.g. schema mismatch), return raw data
    return { _raw: data };
  }
}

// ---------- Validity helpers ----------

/**
 * Check if an EAS attestation is currently valid (not revoked, not expired).
 */
export function isAttestationValid(args: {
  revocationTime: bigint;
  expirationTime: bigint;
}): boolean {
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (args.revocationTime > 0n) return false;
  if (args.expirationTime > 0n && now >= args.expirationTime) return false;
  return true;
}

/**
 * Format a Unix timestamp (seconds) to a human-readable date string.
 */
export function formatAttestationTime(timestamp: bigint): string {
  const ms = Number(timestamp) * 1000;
  return new Date(ms).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
