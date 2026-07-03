/**
 * EAS utilities for the SDK — minimal cross-chain attestation reader
 *
 * Mirrors the web app's eas-utils.ts and contracts/eas.ts but as a self-contained
 * SDK module (no @/ aliases).
 */

import { type AbiParameter, decodeAbiParameters } from 'viem';

// ---------- Minimal ABIs ----------

export const EAS_ABI = [
  {
    name: 'getAttestation',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'uid', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'uid', type: 'bytes32' },
          { name: 'schema', type: 'bytes32' },
          { name: 'time', type: 'uint64' },
          { name: 'expirationTime', type: 'uint64' },
          { name: 'revocationTime', type: 'uint64' },
          { name: 'refUID', type: 'bytes32' },
          { name: 'recipient', type: 'address' },
          { name: 'attester', type: 'address' },
          { name: 'revocable', type: 'bool' },
          { name: 'data', type: 'bytes' },
        ],
      },
    ],
  },
] as const;

export const SCHEMA_REGISTRY_ABI = [
  {
    name: 'getSchema',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'uid', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'uid', type: 'bytes32' },
          { name: 'schema', type: 'string' },
          { name: 'resolver', type: 'address' },
          { name: 'revocable', type: 'bool' },
        ],
      },
    ],
  },
] as const;

// ---------- Schema parser ----------

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

function parseSingleParam(paramStr: string): AbiParameter {
  const trimmed = paramStr.trim();

  if (trimmed.startsWith('tuple(')) {
    return parseTupleParam(trimmed);
  }

  const spaceIdx = trimmed.indexOf(' ');
  if (spaceIdx === -1) {
    return { type: trimmed } as AbiParameter;
  }

  const type = trimmed.slice(0, spaceIdx).trim();
  const name = trimmed.slice(spaceIdx + 1).trim();

  return { type, name } as AbiParameter;
}

function parseTupleParam(paramStr: string): AbiParameter {
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

  const innerParams = splitSchemaParams(innerContent);
  const components = innerParams.map(parseSingleParam);

  return {
    type: 'tuple',
    name: trailingName,
    components: components as AbiParameter[],
  } as AbiParameter;
}

export function parseEASSchema(schema: string): AbiParameter[] {
  const paramStrs = splitSchemaParams(schema);
  return paramStrs.map(parseSingleParam);
}

export function decodeAttestationData(
  data: `0x${string}`,
  schema: string
): Record<string, unknown> {
  if (!data || data === '0x') return {};

  const params = parseEASSchema(schema);
  if (params.length === 0) return {};

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decoded = decodeAbiParameters(params as any, data as any);

    if (params.length === 1 && params[0].type === 'tuple' && params[0].name) {
      return { [params[0].name]: decoded[0] };
    }

    const result: Record<string, unknown> = {};
    for (let i = 0; i < params.length; i++) {
      const key = params[i].name || `_${i}`;
      result[key] = decoded[i];
    }
    return result;
  } catch {
    return { _raw: data };
  }
}

export function isAttestationValid(args: {
  revocationTime: bigint;
  expirationTime: bigint;
}): boolean {
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (args.revocationTime > 0n) return false;
  if (args.expirationTime > 0n && now >= args.expirationTime) return false;
  return true;
}
