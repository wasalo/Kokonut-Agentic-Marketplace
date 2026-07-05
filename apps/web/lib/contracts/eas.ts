/**
 * EAS (Ethereum Attestation Service) on Celo — minimal read ABIs
 *
 * Used by useEASAttestation hook for cross-chain attestation reads.
 * Contract addresses are in ./intelligence.ts (CELO_EAS_CONTRACTS).
 */

import type { Address } from 'viem';

// ---------- Attestation struct (matches IEAS.Attestation) ----------

export interface EASAttestation {
  uid: `0x${string}`;
  schema: `0x${string}`;
  time: bigint;
  expirationTime: bigint;
  revocationTime: bigint;
  refUID: `0x${string}`;
  recipient: Address;
  attester: Address;
  revocable: boolean;
  data: `0x${string}`;
}

// ---------- SchemaRecord struct (matches ISchemaRegistry.SchemaRecord) ----------

export interface EASSchemaRecord {
  uid: `0x${string}`;
  schema: string;
  resolver: Address;
  revocable: boolean;
}

// ---------- Minimal ABIs (view functions only) ----------

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
