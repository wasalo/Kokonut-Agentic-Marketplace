'use client';

import { use, useState } from 'react';
import { useAccount } from 'wagmi';
import NextLink from 'next/link';
import {
  ArrowLeft,
  ShoppingBag,
  User,
  Clock,
  Tag,
  ShieldCheck,
  ExternalLink,
  Edit,
  Power,
  Loader2,
} from 'lucide-react';
import { Card } from '@heroui/react';
import { formatUnits } from 'viem';
import { useUpdateService, useDeactivateService } from '@/lib/hooks/useServices';
import { useServiceContract } from '@/lib/hooks/useServicesContract';
import { useAgentReputation } from '@/lib/hooks/useReputation';
import { useTokenPriceConversion } from '@/lib/hooks/useTokenConversion';
import { showToast, getTransactionError } from '@/lib/toast';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export default function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): JSX.Element {
  const { id } = use(params);
  const serviceId = BigInt(id);
  const { address } = useAccount();

  const { service, isLoading, refetch } = useServiceContract(serviceId);
  const { reputation } = useAgentReputation(service?.agentId);
  const { ethToUsdcRate } = useTokenPriceConversion();

  const isEth =
    service?.paymentToken && service.paymentToken.toLowerCase() === ZERO_ADDRESS.toLowerCase();
  const tokenDecimals = isEth ? 18 : 6;
  const tokenSymbol = isEth ? 'ETH' : 'USDC';

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    price: '',
  });

  const { updateService, isPending: isUpdatePending } = useUpdateService();
  const { deactivateService, isPending: isDeactivatePending } = useDeactivateService();

  const isProvider = address && service && address.toLowerCase() === service.provider.toLowerCase();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-content2 rounded w-1/3" />
            <div className="h-48 bg-content2 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto border border-divider p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Service Not Found</h2>
          <p className="text-default-500 text-sm">
            This service does not exist or has been removed.
          </p>
        </Card>
      </div>
    );
  }

  const formattedPrice = formatUnits(service.price, 6);

  return (
    <div className="container mx-auto px-4 py-8">
      <NextLink
        href="/marketplace"
        className="inline-flex items-center text-sm text-default-500 hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Marketplace
      </NextLink>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Service Info */}
        <Card className="border border-divider p-6">
          {!isEditing ? (
            <>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ShoppingBag className="h-5 w-5 text-success" />
                    <h1 className="text-2xl font-semibold">{service.name}</h1>
                    {service.isActive ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">
                        Active
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-danger/10 text-danger">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-default-400 font-mono">
                    Service #{service.id.toString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-success">
                    {tokenSymbol === 'USDC' && `$${formattedPrice}`}
                    {tokenSymbol === 'ETH' && `${formattedPrice} ETH`}
                  </p>
                  <p className="text-xs text-default-400">{tokenSymbol}</p>
                  {isEth && ethToUsdcRate && (
                    <p className="text-xs text-default-400">
                      ~$
                      {(parseFloat(formattedPrice) * ethToUsdcRate).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      USD
                    </p>
                  )}
                </div>
              </div>

              <p className="text-default-600 mb-4">{service.description}</p>

              {service.metadataURI && (
                <a
                  href={service.metadataURI}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  View Service Documentation
                </a>
              )}

              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-divider text-xs text-default-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Created {new Date(Number(service.createdAt) * 1000).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {service.paymentToken === '0x0000000000000000000000000000000000000000'
                    ? 'ETH'
                    : 'USDC'}
                </span>
              </div>

              {/* Provider Actions */}
              {isProvider && service.isActive && (
                <div className="flex gap-3 mt-4 pt-4 border-t border-divider">
                  <button
                    onClick={() => {
                      setEditForm({
                        name: service.name,
                        description: service.description,
                        price: formattedPrice,
                      });
                      setIsEditing(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-primary border border-primary/30 rounded-lg hover:bg-primary/5"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Service
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const toastId = showToast.loading('Deactivating service...');
                        await deactivateService(serviceId);
                        showToast.dismiss(toastId);
                        showToast.success(
                          'Service deactivated',
                          'Your service has been deactivated.'
                        );
                        refetch();
                      } catch (err) {
                        const errorMessage = getTransactionError(err);
                        showToast.error('Deactivation failed', errorMessage);
                        console.error('[DeactivateService] Error:', err);
                      }
                    }}
                    disabled={isDeactivatePending}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-danger border border-danger/30 rounded-lg hover:bg-danger/5 disabled:opacity-50"
                  >
                    {isDeactivatePending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Power className="w-4 h-4" />
                    )}
                    Deactivate
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Edit Form */
            <form
              onSubmit={async e => {
                e.preventDefault();
                await updateService(
                  serviceId,
                  editForm.name,
                  editForm.description,
                  service.metadataURI,
                  BigInt(Math.floor(parseFloat(editForm.price) * 1e6))
                );
                setIsEditing(false);
                refetch();
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium">Service Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  className="w-full mt-1 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  required
                  rows={3}
                  className="w-full mt-1 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Price (USDC)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.price}
                  onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                  required
                  className="w-full mt-1 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isUpdatePending}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {isUpdatePending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-divider rounded-lg hover:bg-content2"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </Card>

        {/* Provider Info */}
        <Card className="border border-divider p-6">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Provider
          </h2>

          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium">Agent #{service.agentId.toString()}</p>
              <p className="text-xs text-default-400 font-mono mt-1">{service.provider}</p>
            </div>

            <div className="text-right">
              {reputation.feedbackCount > 0 ? (
                <div>
                  <p className="text-lg font-semibold">{reputation.normalizedRating.toFixed(1)}</p>
                  <p className="text-xs text-default-400">{reputation.feedbackCount} reviews</p>
                </div>
              ) : (
                <p className="text-xs text-default-400">No reviews yet</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <NextLink
              href={`/identity/${service.agentId}`}
              className="text-sm text-primary hover:underline"
            >
              View Agent Profile
            </NextLink>
          </div>
        </Card>

        {/* Purchase Action */}
        {service.isActive && (
          <Card className="border border-success/30 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Ready to purchase?</h3>
                <p className="text-sm text-default-500 mt-0.5">
                  Create a job to engage this service. Payment is held in escrow until work is
                  approved.
                </p>
              </div>
              <NextLink
                href={`/jobs/create?serviceId=${service.id}&provider=${service.provider}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                <ShieldCheck className="w-4 h-4" />
                Purchase Service
              </NextLink>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
