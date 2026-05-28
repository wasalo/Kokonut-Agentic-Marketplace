'use client';

import { useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useEfpFollow, useEfpFollowState } from '@/lib/hooks';
import { Button } from '@/components/ui/Button';
import { showToast } from '@/lib/toast';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';

interface FollowButtonProps {
  lookupAddress: `0x${string}`;
  connectedAddress?: `0x${string}`;
}

export function FollowButton({ lookupAddress, connectedAddress }: FollowButtonProps) {
  const { address } = useAccount();
  const activeAddress = connectedAddress ?? address;
  const isOwner = activeAddress?.toLowerCase() === lookupAddress.toLowerCase();

  const { follow, unfollow, isPending, isConfirming, isConfirmed, error } = useEfpFollow();
  const { isFollowing, isLoading: isStateLoading } = useEfpFollowState(activeAddress, lookupAddress);

  useEffect(() => {
    if (isConfirmed) {
      showToast.success('Follow status updated on-chain');
    }
  }, [isConfirmed]);

  useEffect(() => {
    if (error) {
      showToast.error('Follow action failed', error.message.length > 100 ? error.message.slice(0, 100) + '…' : error.message);
    }
  }, [error]);

  const handleFollow = useCallback(async () => {
    if (!activeAddress) return;
    try {
      if (isFollowing) {
        await unfollow(lookupAddress);
      } else {
        await follow(lookupAddress);
      }
    } catch {
      // error handled by the useEffect above
    }
  }, [activeAddress, isFollowing, follow, unfollow, lookupAddress]);

  if (!activeAddress || isOwner) {
    return null;
  }

  if (isStateLoading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Loader2 className="size-3.5 animate-spin" />
      </Button>
    );
  }

  const buttonVariant = isFollowing ? 'secondary' : 'primary';

  return (
    <Button
      variant={buttonVariant}
      size="sm"
      onClick={handleFollow}
      isLoading={isPending || isConfirming}
      icon={isFollowing ? <UserMinus className="size-3.5" /> : <UserPlus className="size-3.5" />}
    >
      {isPending || isConfirming ? '' : (isFollowing ? 'Unfollow' : 'Follow')}
    </Button>
  );
}
