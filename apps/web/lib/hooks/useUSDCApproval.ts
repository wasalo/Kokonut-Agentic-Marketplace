'use client';

import { useCallback } from 'react';
import { erc20Abi } from 'viem';
import { USDC_TOKEN } from '@/lib/hooks/useTokenConversion';
import { showToast } from '@/lib/toast';
import { formatAmount } from '@/lib/tokenUtils';

type ApprovalPhase = 'idle' | 'checking' | 'approving' | 'creating';

type PublicClientWithApprovalReads = {
  readContract: (args: {
    address: `0x${string}`;
    abi: typeof erc20Abi;
    functionName: 'balanceOf' | 'allowance';
    args: readonly [`0x${string}`] | readonly [`0x${string}`, `0x${string}`];
  }) => Promise<bigint>;
  getTransactionReceipt: (args: { hash: `0x${string}` }) => Promise<{ status: 'success' | 'reverted' }>;
};

type WriteContractAsync = (args: {
  chainId: number;
  address: `0x${string}`;
  abi: typeof erc20Abi;
  functionName: 'approve';
  args: readonly [`0x${string}`, bigint];
}) => Promise<`0x${string}`>;

interface UseUSDCApprovalParams {
  account?: `0x${string}`;
  publicClient?: PublicClientWithApprovalReads;
  spender: `0x${string}`;
  writeContractAsync: WriteContractAsync;
  setPhase: (phase: ApprovalPhase) => void;
}

export function useUSDCApproval({
  account,
  publicClient,
  spender,
  writeContractAsync,
  setPhase,
}: UseUSDCApprovalParams) {
  const ensureUSDCApproval = useCallback(
    async (amount: bigint, amountLabel: string) => {
      if (!account || !publicClient) return false;

      try {
        setPhase('checking');
        const balance = await publicClient.readContract({
          address: USDC_TOKEN.address,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [account],
        });

        if (balance < amount) {
          const formattedBalance = formatAmount(balance, USDC_TOKEN, { includeSymbol: true });
          showToast.error('Insufficient USDC balance',
            `You need ${amountLabel} USDC but only have ${formattedBalance}`);
          setPhase('idle');
          return false;
        }

        const allowance = await publicClient.readContract({
          address: USDC_TOKEN.address,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [account, spender],
        });

        if (allowance >= amount) return true;

        setPhase('approving');
        showToast.info('USDC approval needed', `Approving exact amount: ${amountLabel} USDC`);

        const approveHash = await writeContractAsync({
          chainId: 11155111,
          address: USDC_TOKEN.address,
          abi: erc20Abi,
          functionName: 'approve',
          args: [spender, amount],
        });

        showToast.info('Approval submitted', 'Waiting for confirmation…');

        for (let attempts = 0; attempts < 60; attempts++) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          try {
            const receipt = await publicClient.getTransactionReceipt({ hash: approveHash });
            if (receipt.status === 'success') {
              showToast.success('USDC approved', 'You can now create the job');
              return true;
            }
          } catch {
            // Receipt is unavailable until the transaction is mined.
          }
        }

        showToast.error('Approval timeout', 'Please check your wallet and try again');
        setPhase('idle');
        return false;
      } catch (err) {
        console.error('[CreateJob] Allowance/approval error:', err);
        showToast.error('Approval failed', err instanceof Error ? err.message : 'Please try again');
        setPhase('idle');
        return false;
      }
    },
    [account, publicClient, setPhase, spender, writeContractAsync]
  );

  return { ensureUSDCApproval };
}
