'use client';

import { memo } from 'react';
import Image from 'next/image';
import { Card, Chip } from '@heroui/react';
import { Star, ExternalLink, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Address } from '@/components/Address';

interface AgentCardProps {
  id: string;
  name: string;
  description?: string;
  owner: string;
  capabilities?: string[];
  rating?: number;
  totalReviews?: number;
  agentURI?: string;
  isActive?: boolean;
}

export const AgentCard = memo(function AgentCard({
  id,
  name,
  description,
  owner,
  capabilities = [],
  rating = 0,
  totalReviews = 0,
  agentURI,
  isActive = true,
}: AgentCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/identity/${id}`);
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
      role="button"
      tabIndex={0}
      className="block cursor-pointer"
    >
      <Card className="hover:shadow-lg transition-shadow border border-divider">
        <div className="flex gap-4 p-4">
          <div className="relative shrink-0">
            {agentURI ? (
              <Image
                src={agentURI}
                alt={name}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full object-cover bg-content2"
                unoptimized
                onError={e => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className={`w-12 h-12 rounded-full bg-gradient-to-br from-[#009F4D] to-[#FFCD00] flex items-center justify-center text-white font-bold ${agentURI ? 'hidden' : ''}`}
              style={agentURI ? { display: 'flex' } : { display: 'none' }}
            >
              <Shield className="w-6 h-6" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold truncate">{name}</h3>
                  {!isActive && (
                    <span className="px-2 py-0.5 text-xs bg-danger-100 text-danger-700 rounded-full">
                      Inactive
                    </span>
                  )}
                </div>
                <Address
                  address={owner as `0x${string}`}
                  truncate
                  className="text-small text-default-500"
                />
              </div>
              {rating > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-warning-100 text-warning-700 rounded-full text-xs font-medium shrink-0">
                  <Star className="w-3 h-3 fill-current" />
                  {rating.toFixed(1)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 pb-4">
          {description && (
            <p className="text-default-600 text-sm line-clamp-2 mb-3">{description}</p>
          )}
          {capabilities.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {capabilities.slice(0, 3).map(cap => (
                <Chip key={cap} size="sm" variant="soft" color="success">
                  {cap}
                </Chip>
              ))}
              {capabilities.length > 3 && (
                <Chip size="sm" variant="soft">
                  +{capabilities.length - 3}
                </Chip>
              )}
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-sm text-success">
              View Details
              <ExternalLink className="w-4 h-4" />
            </span>
            {totalReviews > 0 && (
              <p className="text-tiny text-default-400">
                {totalReviews} review{totalReviews !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
});
