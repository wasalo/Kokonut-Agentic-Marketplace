'use client';

import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { useReadContract } from 'wagmi';
import NextLink from 'next/link';
import { ArrowLeft, Shield, ExternalLink, MapPin, Globe, Star, Award } from 'lucide-react';
import { Card } from '@heroui/react';
import { ERC8004_ABI } from '@/lib/8004contracts';
import { decodeAgentMetadata } from '@/lib/metadata';
import { useAgentReputation } from '@/lib/hooks/useReputation';
import { useProviderServicesFromEvents } from '@/lib/hooks/useServicesEvents';

const formatAddress = (address: `0x${string}` | undefined): string => {
  if (!address) return 'N/A';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const LoadingSkeleton = (): JSX.Element => (
  <Card className="max-w-2xl mx-auto p-6 border border-divider">
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-content2 rounded w-1/3"></div>
      <div className="h-4 bg-content2 rounded w-1/2"></div>
      <div className="h-32 bg-content2 rounded"></div>
    </div>
  </Card>
);

const NotFoundState = ({ agentId }: { agentId: string }): JSX.Element => (
  <Card className="max-w-2xl mx-auto p-8 text-center border border-divider">
    <Shield className="w-16 h-16 text-default-400 mx-auto mb-4" />
    <h3 className="text-lg font-semibold mb-2">Agent Not Found</h3>
    <p className="text-default-500 text-sm">Agent #{agentId} does not exist on this registry.</p>
  </Card>
);

const CapabilityChip = ({ capability }: { capability: string }): JSX.Element => (
  <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">{capability}</span>
);

const ExternalLinkItem = ({ href, label }: { href: string; label: string }): JSX.Element => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-2 text-sm text-success hover:underline"
  >
    <Globe className="w-3 h-3" />
    {label}
    <ExternalLink className="w-3 h-3" />
  </a>
);

export default function AgentDetailPage(): JSX.Element | null {
  const params = useParams();
  const agentId = params.id as string;
  const agentIdBigInt = BigInt(agentId);

  // Use ownerOf to check if agent exists and get owner
  const { data: ownerAddress, isLoading: isLoadingOwner } = useReadContract({
    address: process.env.NEXT_PUBLIC_8004_REGISTRY_ADDRESS as `0x${string}`,
    abi: ERC8004_ABI,
    functionName: 'ownerOf',
    args: [agentIdBigInt],
  });

  // Use tokenURI to get agent metadata
  const { data: tokenURI, isLoading: isLoadingURI } = useReadContract({
    address: process.env.NEXT_PUBLIC_8004_REGISTRY_ADDRESS as `0x${string}`,
    abi: ERC8004_ABI,
    functionName: 'tokenURI',
    args: [agentIdBigInt],
  });

  // Get agent wallet separately
  const { data: walletAddress } = useReadContract({
    address: process.env.NEXT_PUBLIC_8004_REGISTRY_ADDRESS as `0x${string}`,
    abi: ERC8004_ABI,
    functionName: 'getAgentWallet',
    args: [agentIdBigInt],
  });

  const { reputation } = useAgentReputation(agentIdBigInt);

  const metadata = useMemo(() => (tokenURI ? decodeAgentMetadata(tokenURI) : null), [tokenURI]);

  const isLoadingAgent = isLoadingOwner || isLoadingURI;

  // Fetch agent's services
  const { services: agentServices, isLoading: isLoadingServices } = useProviderServicesFromEvents(
    ownerAddress as `0x${string}` | undefined
  );

  if (isLoadingAgent) {
    return (
      <div className="container mx-auto px-4 py-8">
        <NextLink
          href="/identity"
          className="flex items-center text-sm text-default-500 hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Agents
        </NextLink>
        <LoadingSkeleton />
      </div>
    );
  }

  if (!ownerAddress) {
    return (
      <div className="container mx-auto px-4 py-8">
        <NextLink
          href="/identity"
          className="flex items-center text-sm text-default-500 hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Agents
        </NextLink>
        <NotFoundState agentId={agentId} />
      </div>
    );
  }

  const agentOwner = ownerAddress as `0x${string}`;
  const agentWallet =
    (walletAddress as `0x${string}`) || '0x0000000000000000000000000000000000000000';
  const isActive = true;

  return (
    <div className="container mx-auto px-4 py-8">
      <NextLink
        href="/identity"
        className="flex items-center text-sm text-default-500 hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Agents
      </NextLink>

      <Card className="max-w-2xl mx-auto border border-divider">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Shield className="w-5 h-5 text-success" />
                Agent #{agentId}
              </h2>
              <p className="text-sm text-default-500">Registered on Kokonut Identity Registry</p>
            </div>
            <span
              className={`px-3 py-1 text-xs font-medium rounded-full ${
                isActive ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700'
              }`}
            >
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          {metadata && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#009F4D] to-[#FFCD00] flex items-center justify-center">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{metadata.name}</h3>
                  <p className="text-sm text-default-500">v{metadata.version}</p>
                </div>
              </div>

              {metadata.description && (
                <p className="text-sm text-default-600">{metadata.description}</p>
              )}

              {metadata.capabilities && metadata.capabilities.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Capabilities
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {metadata.capabilities.map((cap, index) => (
                      <CapabilityChip key={index} capability={cap} />
                    ))}
                  </div>
                </div>
              )}

              {metadata.endpoints && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Endpoints
                  </h4>
                  <div className="space-y-2">
                    {metadata.endpoints.https && (
                      <ExternalLinkItem
                        href={metadata.endpoints.https}
                        label={metadata.endpoints.https}
                      />
                    )}
                    {metadata.endpoints.wss && (
                      <p className="text-sm text-default-500 font-mono">
                        WSS: {metadata.endpoints.wss}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {metadata.social && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Social
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {metadata.social.twitter && (
                      <a
                        href={`https://twitter.com/${metadata.social.twitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-success hover:underline"
                      >
                        Twitter
                      </a>
                    )}
                    {metadata.social.github && (
                      <a
                        href={`https://github.com/${metadata.social.github}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-success hover:underline"
                      >
                        GitHub
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-divider pt-4 mt-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-default-500">Owner</span>
              <span className="font-mono">{formatAddress(agentOwner)}</span>
            </div>
            {agentWallet && agentWallet !== '0x0000000000000000000000000000000000000000' && (
              <div className="flex justify-between text-sm">
                <span className="text-default-500">Agent Wallet</span>
                <span className="font-mono">{formatAddress(agentWallet)}</span>
              </div>
            )}
          </div>

          {tokenURI && (
            <div className="border-t border-divider pt-4 mt-4">
              <p className="text-xs text-default-500 break-all">URI: {tokenURI}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Reputation Card */}
      <Card className="max-w-2xl mx-auto border border-divider mt-6">
        <div className="p-6">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            Reputation
          </h3>
          {reputation.feedbackCount > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-success">
                  {reputation.normalizedRating.toFixed(1)}
                </p>
                <p className="text-xs text-default-400">Rating</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{reputation.feedbackCount}</p>
                <p className="text-xs text-default-400">Reviews</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{reputation.valueDecimals}</p>
                <p className="text-xs text-default-400">Precision</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-default-400 text-sm">
              No feedback yet. Reputation builds as clients review your work.
            </div>
          )}
          <p className="text-xs text-default-400 mt-4 pt-4 border-t border-divider">
            Data from official ERC-8004 Reputation Registry
          </p>
        </div>
      </Card>

      {/* Agent Services Card */}
      <Card className="max-w-2xl mx-auto border border-divider mt-6">
        <div className="p-6">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-success" />
            Services by this Agent
          </h3>

          {isLoadingServices ? (
            <div className="animate-pulse space-y-3">
              <div className="h-16 bg-content2 rounded"></div>
              <div className="h-16 bg-content2 rounded"></div>
            </div>
          ) : agentServices && agentServices.length > 0 ? (
            <div className="space-y-3">
              {agentServices.map(service => (
                <NextLink
                  key={service.id.toString()}
                  href={`/marketplace/${service.id}`}
                  className="block p-4 border border-divider rounded-lg hover:bg-content2/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {service.name || `Service #${service.id.toString()}`}
                      </p>
                      <p className="text-xs text-default-500">View details →</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-default-400" />
                  </div>
                </NextLink>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-default-400 text-sm">
              No services listed yet. This agent hasn't created any service offerings.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
