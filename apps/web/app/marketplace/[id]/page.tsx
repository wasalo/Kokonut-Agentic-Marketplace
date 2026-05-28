'use client';

import { use, useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import NextLink from 'next/link';
import { FollowButton } from '@/components/FollowButton';
import { useUnifiedAgentProfile } from '@/lib/hooks/useUnifiedAgentProfile';
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
  Star,
  Shield,
  Wallet,
  X,
} from 'lucide-react';
import { Card } from '@heroui/react';
import { StatusBadge } from '@/components/StatusBadge';
import {
  useUpdateService,
  useDeactivateService,
  useActivateService,
  useGetServiceBond,
  useDeactivatedAt,
  useSetPaymentAddress,
  useWithdrawServiceBond,
} from '@/lib/hooks/useServices';
import { useServiceContract } from '@/lib/hooks/useServicesContract';
import { useAgentReputation } from '@/lib/hooks/useAgentReputation';
import { useTokenPriceConversion } from '@/lib/hooks/useTokenConversion';
import {
  formatAmount,
  formatInputAmount,
  formatUsd,
  getTokenByAddress,
  parseAmount,
  tokenAmountToUsd,
} from '@/lib/tokenUtils';
import { parseEther } from 'viem';
import { showToast, getTransactionError } from '@/lib/toast';
import { Address } from '@/components/Address';

export default function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): JSX.Element {
  useEffect(() => {
    document.title = 'Service Details | Kokonut Agent Economy';
  }, []);

  const { id } = use(params);
  const serviceId = BigInt(id);
  const { address } = useAccount();

  const { service, isLoading, refetch } = useServiceContract(serviceId);
  const reputation = useAgentReputation(service?.provider);
  const { ethToUsdcRate } = useTokenPriceConversion();

  // Agent profile from subgraph for richer provider card
  const agentIdForProfile = service ? BigInt(service.agentId) : BigInt(0);
  const agentAddress = service?.provider as `0x${string}`;
  const { profile: agentProfile } = useUnifiedAgentProfile(agentIdForProfile, agentAddress);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    price: '',
  });

  const { updateService, isPending: isUpdatePending } = useUpdateService();
  const { deactivateService, isPending: isDeactivatePending } = useDeactivateService();
  const { activateService, isPending: isActivatePending } = useActivateService();
  const { setPaymentAddress, isPending: isSetPaymentPending } = useSetPaymentAddress();
  const { withdrawServiceBond, isPending: isWithdrawPending } = useWithdrawServiceBond();
  const { bond } = useGetServiceBond(serviceId);
  const { deactivatedAt } = useDeactivatedAt(serviceId);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAddressInput, setPaymentAddressInput] = useState('');

  const isProvider = address && service && address.toLowerCase() === service.provider.toLowerCase();
  const hasBond = bond >= parseEther('0.01');
  const cooldownMs = 7 * 24 * 60 * 60 * 1000;
  const canWithdrawBond =
    !service?.isActive && hasBond && deactivatedAt > 0 && Date.now() >= deactivatedAt + cooldownMs;

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

  const token = getTokenByAddress(service.paymentToken);
  const tokenSymbol = token.symbol;
  const formattedPrice = formatInputAmount(service.price, token);
  const displayPrice = formatAmount(service.price, token, {
    minFractionDigits: token.symbol === 'USDC' ? 2 : 0,
    maxFractionDigits: token.symbol === 'USDC' ? 2 : 6,
  });
  const usdValue = tokenAmountToUsd(service.price, token, ethToUsdcRate);

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
                    <StatusBadge status={service.isActive ? 'active' : 'inactive'} size="sm" />
                  </div>
                  <p className="text-xs text-default-400 font-mono">
                    Service #{service.id.toString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-success">
                    {displayPrice}
                  </p>
                  <p className="text-xs text-default-400">{tokenSymbol}</p>
                  {token.symbol === 'ETH' && ethToUsdcRate && (
                    <p className="text-xs text-default-400">
                      ~{formatUsd(usdValue)}
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
                  <ExternalLink className="size-3" />
                  View Service Documentation
                </a>
              )}

              {/* Bond Info Panel */}
              {isProvider && (
                <div className="mt-4 p-3 bg-content2/50 rounded-lg border border-divider">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="size-4 text-success" />
                      <span className="text-sm font-medium">Service Bond</span>
                    </div>
                    <span className="text-sm">
                      {hasBond ? (
                        <span className="text-success font-medium">0.01 ETH locked</span>
                      ) : (
                        <span className="text-default-400">No bond</span>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-default-400 mt-1">
                    {service.isActive
                      ? 'Bond stays locked while service is active.'
                      : hasBond
                        ? deactivatedAt > 0 && Date.now() < deactivatedAt + cooldownMs
                          ? `Withdrawable after ${new Date(deactivatedAt + cooldownMs).toLocaleDateString()}`
                          : 'Bond is withdrawable.'
                        : 'Bond has been withdrawn.'}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-divider text-xs text-default-400">
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  Created {new Date(Number(service.createdAt) * 1000).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Tag className="size-3" />
                  {tokenSymbol}
                </span>
              </div>

              {/* Provider Actions */}
              {isProvider && (
                <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-divider">
                  {service.isActive && (
                    <>
                      <button type="button"
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
                        <Edit className="size-4" />
                        Edit Service
                      </button>
                      <button type="button"
                        onClick={() => setShowPaymentModal(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-default-foreground border border-divider rounded-lg hover:bg-content2"
                      >
                        <Wallet className="size-4" />
                        Payment Address
                      </button>
                      <button type="button"
                        onClick={async () => {
                          try {
                            const toastId = showToast.loading('Deactivating service…');
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
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Power className="size-4" />
                        )}
                        Deactivate
                      </button>
                    </>
                  )}
                  {!service.isActive && (
                    <>
                      <button type="button"
                        onClick={async () => {
                          try {
                            const toastId = showToast.loading('Activating service…');
                            await activateService(serviceId);
                            showToast.dismiss(toastId);
                            showToast.success(
                              'Service activated',
                              'Your service is now visible in the marketplace.'
                            );
                            refetch();
                          } catch (err) {
                            const errorMessage = getTransactionError(err);
                            showToast.error('Activation failed', errorMessage);
                            console.error('[ActivateService] Error:', err);
                          }
                        }}
                        disabled={isActivatePending}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-success border border-success/30 rounded-lg hover:bg-success/5 disabled:opacity-50"
                      >
                        {isActivatePending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Power className="size-4" />
                        )}
                        Activate Service
                      </button>
                      {canWithdrawBond && (
                        <button type="button"
                          onClick={async () => {
                            try {
                              const toastId = showToast.loading('Withdrawing bond…');
                              await withdrawServiceBond(serviceId);
                              showToast.dismiss(toastId);
                              showToast.success('Bond withdrawn', '0.01 ETH returned to your wallet.');
                              refetch();
                            } catch (err) {
                              showToast.error('Withdrawal failed', getTransactionError(err));
                            }
                          }}
                          disabled={isWithdrawPending}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-primary border border-primary/30 rounded-lg hover:bg-primary/5 disabled:opacity-50"
                        >
                          {isWithdrawPending ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Wallet className="size-4" />
                          )}
                          Withdraw Bond
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Edit Form */
            <form
              onSubmit={async e => {
                e.preventDefault();
                await updateService({
                  serviceId,
                  name: editForm.name,
                  description: editForm.description,
                  metadataURI: service.metadataURI,
                  price: parseAmount(editForm.price, token),
                });
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
                <label className="text-sm font-medium">Price ({tokenSymbol})</label>
                <input
                  type="number"
                  step="0.000001"
                  value={editForm.price}
                  onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                  required
                  className="w-full mt-1 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit"
                  disabled={isUpdatePending}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {isUpdatePending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </button>
                <button type="button"
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
            <User className="size-4 text-primary" />
            Provider
          </h2>

          <div className="flex items-start gap-4">
            <div className="size-122 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold shrink-0">
              <Shield className="size-6" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-base truncate">
                  {agentProfile.name || `Agent #${service.agentId.toString()}`}
                </p>
                {agentProfile.capabilities.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-content2 text-default-500">
                    {agentProfile.capabilities[0]}
                  </span>
                )}
              </div>
              <Address
                address={service.provider as `0x${string}`}
                truncate
                className="text-xs text-default-400 font-mono mt-0.5"
              />
              {agentProfile.capabilities.length > 1 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {agentProfile.capabilities.slice(1, 4).map(cap => (
                    <span key={cap} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      {cap}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="text-right shrink-0">
              {reputation.feedbackCount > 0 ? (
                <div>
                  <p className="text-lg font-semibold flex items-center gap-1">
                    <Star className="size-3.5 fill-yellow-500 text-yellow-500" />
                    {reputation.normalizedRating.toFixed(1)}
                  </p>
                  <p className="text-xs text-default-400">{reputation.feedbackCount} reviews</p>
                </div>
              ) : (
                <p className="text-xs text-default-400">No reviews yet</p>
              )}
              {agentProfile.services.length > 0 && (
                <p className="text-xs text-default-400 mt-1">
                  {agentProfile.services.length} service{agentProfile.services.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-divider">
            <NextLink
              href={`/identity/${service.agentId}`}
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              <ExternalLink className="size-3" />
              View Agent Profile
            </NextLink>
            <FollowButton
              lookupAddress={service.provider as `0x${string}`}
              connectedAddress={address as `0x${string}` | undefined}
            />
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
                <ShieldCheck className="size-4" />
                Purchase Service
              </NextLink>
            </div>
          </Card>
        )}

        {/* Similar Services */}
        {agentProfile.services.length > 1 && (
          <Card className="border border-divider p-6">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <ShoppingBag className="size-4 text-success" />
              More from {agentProfile.name || 'this provider'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {agentProfile.services
                .filter(s => s.id !== service.id.toString())
                .slice(0, 3)
                .map(s => (
                  <NextLink
                    key={s.id}
                    href={`/marketplace/${s.serviceId}`}
                    className="block p-3 border border-divider rounded-lg hover:border-primary/50 transition-colors cursor-pointer"
                  >
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    <p className="text-xs text-default-500 mt-1 line-clamp-1">{s.description || ''}</p>
                    {s.price && (
                      <p className="text-xs text-success font-medium mt-1">
                        {formatUsd(BigInt(s.price), { decimals: 6 })}
                      </p>
                    )}
                  </NextLink>
                ))}
            </div>
          </Card>
        )}

        {/* Payment Address Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-content1 border border-divider rounded-xl p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Set Payment Address</h3>
                <button type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="p-1 hover:bg-content2 rounded-lg transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>
              <p className="text-sm text-default-500 mb-4">
                Specify the address that will receive payments for this service. Defaults to your connected wallet.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Payment Address</label>
                <input
                  type="text"
                  value={paymentAddressInput}
                  onChange={e => setPaymentAddressInput(e.target.value)}
                  placeholder={service.paymentAddress}
                  className="w-full px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono"
                />
                <p className="text-xs text-default-400 mt-1">
                  Current: {service.paymentAddress.slice(0, 6)}...{service.paymentAddress.slice(-4)}
                </p>
              </div>
              <div className="flex gap-3">
                <button type="button"
                  onClick={async () => {
                    try {
                      const addr = paymentAddressInput.trim() as `0x${string}`;
                      if (!addr || addr.length !== 42) {
                        showToast.error('Invalid address', 'Please enter a valid Ethereum address');
                        return;
                      }
                      const toastId = showToast.loading('Updating payment address…');
                      await setPaymentAddress({ serviceId, paymentAddress: addr });
                      showToast.dismiss(toastId);
                      showToast.success('Payment address updated');
                      setShowPaymentModal(false);
                      setPaymentAddressInput('');
                      refetch();
                    } catch (err) {
                      showToast.error('Update failed', getTransactionError(err));
                    }
                  }}
                  disabled={isSetPaymentPending}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {isSetPaymentPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    'Save Address'
                  )}
                </button>
                <button type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentAddressInput('');
                  }}
                  className="px-4 py-2 border border-divider rounded-lg hover:bg-content2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
