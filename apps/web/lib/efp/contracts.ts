'use client';

import { mainnet } from 'wagmi/chains';
import {
  coreEfpContracts,
  efpListRegistryAbi,
  efpAccountMetadataAbi,
  listMetadataAbi,
} from 'ethereum-identity-kit';

export const EFP_CHAIN_ID = mainnet.id;

export const EFP_CONTRACTS = {
  EFPListRegistry: coreEfpContracts.EFPListRegistry as `0x${string}`,
  EFPAccountMetadata: coreEfpContracts.EFPAccountMetadata as `0x${string}`,
} as const;

export { efpListRegistryAbi, efpAccountMetadataAbi, listMetadataAbi };

export const EFP_ACCOUNT_METADATA_ABI = efpAccountMetadataAbi;
export const EFP_LIST_REGISTRY_ABI = efpListRegistryAbi;

export const EFP_EXPLORER_URL = 'https://etherscan.io';
