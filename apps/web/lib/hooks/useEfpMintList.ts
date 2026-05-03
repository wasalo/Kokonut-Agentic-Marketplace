'use client';

import { useCallback, useEffect } from 'react';
import { useWriteContract, useSwitchChain, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseAbi, encodeAbiParameters } from 'viem';
import { mainnet } from 'wagmi/chains';
import { coreEfpContracts, ListRecordContracts } from 'ethereum-identity-kit';
import { useEfpListStatus } from './useEfpListStatus';

const MINT_ABI = parseAbi([
  'function mintTo(address to, bytes calldata listStorageLocation) external returns (uint256)',
] as const);

const EFP_CHAIN_ID = mainnet.id;

function buildStorageLocation(slot: bigint): `0x${string}` {
  const listRecordsAddr = ListRecordContracts[EFP_CHAIN_ID] as `0x${string}`;
  const chainId = BigInt(EFP_CHAIN_ID);

  const encoded = encodeAbiParameters(
    [
      { type: 'uint8', name: 'version' },
      { type: 'uint8', name: 'locationType' },
      { type: 'uint256', name: 'chainId' },
      { type: 'address', name: 'contractAddress' },
      { type: 'uint256', name: 'slot' },
    ],
    [
      1,
      1,
      chainId,
      listRecordsAddr,
      slot,
    ]
  );

  return encoded;
}

interface UseEfpMintListReturn {
  mintList: () => Promise<`0x${string}` | undefined>;
  isPending: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  hash: `0x${string}` | undefined;
  error: Error | null;
  hasList: boolean;
}

export function useEfpMintList(address: string | undefined): UseEfpMintListReturn {
  const { address: connectedAddress } = useAccount();
  const { hasList, refetch } = useEfpListStatus(address);
  const { switchChainAsync } = useSwitchChain();

  const {
    writeContractAsync,
    data: hash,
    error: writeError,
    isPending,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isConfirmed) {
      const timer = setTimeout(() => refetch(), 2000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmed, refetch]);

  const mintList = useCallback(async () => {
    try {
      await switchChainAsync({ chainId: EFP_CHAIN_ID });

      const to = connectedAddress!;
      const slot = BigInt(Math.floor(Math.random() * 1000000) + 1);
      const listStorageLocation = buildStorageLocation(slot);

      const txHash = await writeContractAsync({
        address: coreEfpContracts.EFPListRegistry as `0x${string}`,
        abi: MINT_ABI,
        functionName: 'mintTo',
        args: [to, listStorageLocation],
      });

      return txHash;
    } catch (err) {
      throw err;
    }
  }, [switchChainAsync, writeContractAsync, connectedAddress]);

  return {
    mintList,
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    error: writeError as Error | null,
    hasList,
  };
}
