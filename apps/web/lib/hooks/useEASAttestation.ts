'use client';

import { useQuery } from '@tanstack/react-query';
import { celoClient, CELO_EAS_CONTRACTS } from '@/lib/contracts/intelligence';
import { EAS_ABI, SCHEMA_REGISTRY_ABI, type EASAttestation, type EASSchemaRecord } from '@/lib/contracts/eas';
import { decodeAttestationData, isAttestationValid } from '@/lib/eas-utils';

export interface DecodedAttestation {
  uid: string;
  schemaUID: string;
  schema: string;
  time: number;
  expirationTime: number;
  revocationTime: number;
  refUID: string;
  recipient: string;
  attester: string;
  revocable: boolean;
  decoded: Record<string, unknown>;
  rawData: string;
  isValid: boolean;
}

interface UseEASAttestationReturn {
  attestation: DecodedAttestation | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

function isValidBytes32(value: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}

/**
 * Read an EAS attestation from Celo by UID, fetch its schema, and decode the claim data.
 *
 * Uses staleTime: Infinity since attestations are immutable once written
 * (revocation is the only state change, which is extremely rare).
 *
 * @param uid  The EAS attestation UID (bytes32 hex string). Pass undefined/null to disable.
 */
export function useEASAttestation(
  uid: string | undefined | null
): UseEASAttestationReturn {
  const enabled = Boolean(uid && isValidBytes32(uid));

  const { data, isLoading, error, refetch } = useQuery<DecodedAttestation | null>({
    queryKey: ['eas-attestation', uid],
    queryFn: async () => {
      if (!uid) return null;

      // Read 1: Get the attestation from EAS on Celo
      const rawAttestation = await celoClient.readContract({
        address: CELO_EAS_CONTRACTS.eas,
        abi: EAS_ABI,
        functionName: 'getAttestation',
        args: [uid as `0x${string}`],
      });

      const att = rawAttestation as unknown as EASAttestation;

      // Check if attestation exists (uid will be zero bytes if not found)
      if (att.uid === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        return null;
      }

      // Read 2: Get the schema definition from SchemaRegistry
      let schemaStr = '';
      try {
        const rawSchema = await celoClient.readContract({
          address: CELO_EAS_CONTRACTS.schemaRegistry,
          abi: SCHEMA_REGISTRY_ABI,
          functionName: 'getSchema',
          args: [att.schema],
        });
        const schemaRecord = rawSchema as unknown as EASSchemaRecord;
        schemaStr = schemaRecord.schema;
      } catch {
        // Schema might not be registered or accessible — return raw attestation
      }

      // Decode the attestation data using the schema string
      const decoded = schemaStr
        ? decodeAttestationData(att.data, schemaStr)
        : { _raw: att.data };

      // Compute validity
      const isValid = isAttestationValid({
        revocationTime: att.revocationTime,
        expirationTime: att.expirationTime,
      });

      return {
        uid: att.uid,
        schemaUID: att.schema,
        schema: schemaStr,
        time: Number(att.time),
        expirationTime: Number(att.expirationTime),
        revocationTime: Number(att.revocationTime),
        refUID: att.refUID,
        recipient: att.recipient,
        attester: att.attester,
        revocable: att.revocable,
        decoded,
        rawData: att.data,
        isValid,
      };
    },
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
    retry: 2,
  });

  return {
    attestation: data ?? null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
