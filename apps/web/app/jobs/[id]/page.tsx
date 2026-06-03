'use client';

import { use, useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card } from '@heroui/react';
import { card } from '@/lib/design-system';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useJobLifecycle, type LlmEvaluationResult } from '@/lib/hooks/useJobLifecycle';
import { JobStatus } from '@/lib/hooks/useJobs';
import { JobHeader } from '@/components/jobs/JobHeader';
import { JobWarnings } from '@/components/jobs/JobWarnings';
import { TransactionStatusCard } from '@/components/jobs/TransactionStatusCard';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { BalanceCard } from '@/components/jobs/BalanceCard';
import { JobSettingsCard } from '@/components/jobs/JobSettingsCard';
import { DeliverableDisplay } from '@/components/jobs/DeliverableDisplay';
import { FeedbackCard } from '@/components/jobs/FeedbackCard';
import { BiddingSectionForProvider } from '@/components/jobs/BiddingSectionForProvider';
import { JobFundingSection } from '@/components/jobs/JobFundingSection';
import { JobActionsCard } from '@/components/jobs/JobActionsCard';
import { JobBidListCard } from '@/components/jobs/JobBidListCard';
import { PaymentTokenSetupModal } from '@/components/jobs/PaymentTokenSetupModal';
import dynamic from 'next/dynamic';

const MilestoneSectionDynamic = dynamic(
  () => import('@/components/MilestoneSection').then(m => m.MilestoneSection),
  {
    loading: () => <div className="animate-pulse h-48 bg-content2 rounded-lg" />,
  }
);

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): JSX.Element {
  useEffect(() => {
    document.title = 'Job Details | Kokonut Agent Economy';
  }, []);

  const { id } = use(params);
  const jobId = BigInt(id);
  const state = useJobLifecycle({ jobId });

  const [showFulfillmentInput, setShowFulfillmentInput] = useState(false);
  const [fulfillmentText, setFulfillmentText] = useState('');
  const [evaluationResult, setEvaluationResult] = useState<LlmEvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeMilestoneIndex, setDisputeMilestoneIndex] = useState(0);

  const {
    address,
    job,
    service,
    isLoading,
    refetch,
    jobPaymentToken,
    isUSDC,
    budgetDecimals,
    formattedBudget,
    usdcBalance,
    usdcBalanceLoading,
    ethBalance,
    ethBalanceLoading,
    isApprovePending,
    isFundPending,
    isFundETHPending,
    isApprovingAndFunding,
    isPaymentTokenPending,
    isPriceLoading,
    isOpen,
    isEvaluatorFeeEnabled,
    isClient,
    isProvider,
    isEvaluator,
    isExpired,
    isPastDisputeWindow,
    isTerminal,
    hasActiveDispute,
    canFlagDispute,
    hasActions,
    dispute,
    milestones,
    needsApproval,
    hasAllowance,
    txStep,
    currentError,
    bidCount,
    bids,
    isLoadingBids,
    isFinalizeRandomPending,
    finalizeRandomHash,
    finalizeRandomError,
    showPaymentTokenModal,
    selectedPaymentToken,
    newBudget,
    setNewBudget,
    setBudget,
    isBudgetPending,
    formatUsdValue,
    handleFundJob,
    handleSubmitDeliverable,
    handleClientApprove,
    handleFinalize,
    handleEvaluate,
    handleRejectWork,
    handleClaimRefund,
    handleCompleteAfterTimeout,
    handleRefundExpired,
    handlePaymentTokenSetup,
    handleFlagDispute,
    finalizeRandomEvaluator,
    setShowPaymentTokenModal,
    setSelectedPaymentToken,
    isSubmitPending,
    isApproveByClientPending,
    isFinalizePending,
    isRejectPending,
    isRefundPending,
    isCompleteAfterTimeoutPending,
    isRefundExpiredPending,
    isFlagPending,
    flagError,
  } = state;

  if (isLoading) {
    return (
      <div className="container mx-auto px-3 md:px-4 py-6 md:py-8">
        <div className="max-w-2xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-content2 rounded w-1/3" />
          <div className="h-64 bg-content2 rounded" />
        </div>
      </div>
    );
  }

  if (!job || Number(job.id) === 0) {
    return (
      <div className="container mx-auto px-3 md:px-4 py-6 md:py-8">
        <Card className={card('padded', 'max-w-2xl mx-auto p-6 md:p-8 text-center')}>
          <AlertCircle className="size-10 md:w-12 md:h-12 text-default-400 mx-auto mb-3 md:mb-4" />
          <h2 className="text-lg md:text-xl font-semibold mb-2">Job Not Found</h2>
          <p className="text-default-500 text-sm">This job does not exist.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 md:px-4 py-6 md:py-8">
      <Breadcrumb
        items={[
          { label: 'Marketplace', href: '/marketplace' },
          { label: 'Jobs', href: '/marketplace?tab=jobs' },
          { label: `Job #${id}` },
        ]}
        className="mb-6"
      />

      <div className="max-w-2xl mx-auto space-y-6">
        <JobHeader job={job} service={service} isClient={isClient} isProvider={isProvider} isEvaluator={isEvaluator} />

        <JobWarnings job={job} isClient={isClient} isProvider={isProvider} isEvaluatorFeeEnabled={isEvaluatorFeeEnabled} address={address} />

        <TransactionStatusCard txStep={txStep} />

        {Boolean(currentError) && <ErrorDisplay error={currentError as Error} />}

        <BalanceCard job={job} isClient={isClient} address={address} />

        <MilestoneSectionDynamic
          jobId={jobId}
          client={job.client}
          provider={job.provider}
          paymentToken={job.paymentToken}
          budget={job.budget}
          jobStatus={job.status}
          isClient={isClient}
          isProvider={isProvider}
          onRefetch={refetch}
        />

        {job.provider &&
          job.provider !== '0x0000000000000000000000000000000000000000' &&
          job.evaluator.toLowerCase() === job.provider.toLowerCase() && (
            <Card className="border border-warning/30 bg-warning/5 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="size-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-warning">Conflict of Interest</p>
                  <p className="text-sm text-default-500 mt-1">
                    The evaluator is the same as the provider. This may affect job evaluation
                    impartiality.
                  </p>
                </div>
              </div>
            </Card>
          )}

        {job && job.evaluator === '0x0000000000000000000000000000000000000000' && (
          <Card className="border border-[#009F4D]/20 bg-[#009F4D]/5 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 text-[#009F4D] shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-[#009F4D]">Evaluator Pending</p>
                <p className="text-sm text-default-500 mt-1">
                  This job uses the random evaluator pool. Click below to finalize the evaluator assignment.
                </p>
                <button
                  type="button"
                  onClick={finalizeRandomEvaluator}
                  disabled={isFinalizeRandomPending}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-[#009F4D] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isFinalizeRandomPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : finalizeRandomHash ? (
                    'Evaluator Finalized!'
                  ) : (
                    'Finalize Evaluator'
                  )}
                </button>
                {Boolean(finalizeRandomError) && (
                  <p className="text-danger text-sm mt-2">{(finalizeRandomError as { message?: string }).message}</p>
                )}
              </div>
            </div>
          </Card>
        )}

        {txStep && (
          <Card className="border border-primary/20 p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="size-5 animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium text-primary">{txStep}…</p>
                <p className="text-xs text-default-400">Waiting for confirmation</p>
              </div>
            </div>
          </Card>
        )}

        {Boolean(currentError) && <ErrorDisplay error={currentError as Error} />}

        <JobFundingSection
          job={job}
          isClient={isClient}
          selectedPaymentToken={selectedPaymentToken}
          usdcBalance={usdcBalance}
          usdcBalanceLoading={usdcBalanceLoading}
          ethBalance={ethBalance}
          ethBalanceLoading={ethBalanceLoading}
          needsApproval={needsApproval}
          isUSDC={isUSDC}
          hasAllowance={hasAllowance}
          formattedBudget={formattedBudget}
          txStep={txStep}
          isApprovePending={isApprovePending}
          isFundPending={isFundPending}
          isFundETHPending={isFundETHPending}
          isApprovingAndFunding={isApprovingAndFunding}
          isPaymentTokenPending={isPaymentTokenPending}
          isPriceLoading={isPriceLoading}
          formatUsdValue={formatUsdValue}
          onFund={handleFundJob}
        />

        <JobActionsCard
          job={job}
          jobPaymentToken={jobPaymentToken}
          hasActions={hasActions}
          isClient={isClient}
          isProvider={isProvider}
          isEvaluator={isEvaluator}
          isExpired={isExpired}
          isPastDisputeWindow={isPastDisputeWindow}
          isTerminal={isTerminal}
          hasActiveDispute={hasActiveDispute}
          canFlagDispute={canFlagDispute}
          dispute={dispute}
          milestones={milestones}
          formattedBudget={formattedBudget}
          isUSDC={isUSDC}
          txStep={txStep}
          fulfillmentText={fulfillmentText}
          showFulfillmentInput={showFulfillmentInput}
          clientApproved={false}
          evaluationResult={evaluationResult}
          isEvaluating={isEvaluating}
          showDisputeForm={showDisputeForm}
          disputeMilestoneIndex={disputeMilestoneIndex}
          isSubmitPending={isSubmitPending}
          isApproveByClientPending={isApproveByClientPending}
          isFinalizePending={isFinalizePending}
          isRejectPending={isRejectPending}
          isRefundPending={isRefundPending}
          isCompleteAfterTimeoutPending={isCompleteAfterTimeoutPending}
          isRefundExpiredPending={isRefundExpiredPending}
          isFlagPending={isFlagPending}
          flagError={flagError as Error | null}
          onFulfillmentTextChange={setFulfillmentText}
          onShowFulfillmentInputChange={setShowFulfillmentInput}
          onSubmitDeliverable={() => handleSubmitDeliverable(fulfillmentText)}
          onClientApprove={handleClientApprove}
          onFinalize={handleFinalize}
          onEvaluate={() => handleEvaluate({ fulfillmentText, setFulfillmentText, setEvaluationResult, setIsEvaluating })}
          onReject={handleRejectWork}
          onClaimRefund={handleClaimRefund}
          onCompleteAfterTimeout={handleCompleteAfterTimeout}
          onRefundExpired={handleRefundExpired}
          onToggleDisputeForm={() => setShowDisputeForm(!showDisputeForm)}
          onDisputeMilestoneChange={setDisputeMilestoneIndex}
          onFlagDispute={() => handleFlagDispute(disputeMilestoneIndex)}
        />

        {isOpen && (
          <>
            {!isClient && address && (
              <BiddingSectionForProvider job={job} address={address} refetch={refetch} />
            )}
            {isClient && (
              <JobBidListCard
                job={job}
                bidCount={bidCount ?? 0}
                bids={bids}
                isLoadingBids={isLoadingBids}
                onAccepted={() => void refetch()}
              />
            )}
          </>
        )}

        <JobSettingsCard
          job={job}
          isClient={isClient}
          isUSDC={isUSDC}
          budgetDecimals={budgetDecimals}
          newBudget={newBudget}
          setNewBudget={setNewBudget}
          setBudget={setBudget}
          isBudgetPending={isBudgetPending}
          handleAction={(_action: string, fn: () => void) => fn()}
        />

        <DeliverableDisplay job={job} />

        {job.status === JobStatus.Completed &&
          isClient &&
          service &&
          Number(service.agentId) > 0 && <FeedbackCard agentId={service.agentId} jobId={job.id} />}

        {showPaymentTokenModal && (
          <PaymentTokenSetupModal
            job={job}
            selectedPaymentToken={selectedPaymentToken}
            setSelectedPaymentToken={setSelectedPaymentToken}
            onSetup={handlePaymentTokenSetup}
            isPending={isPaymentTokenPending}
            onClose={() => setShowPaymentTokenModal(false)}
          />
        )}
      </div>
    </div>
  );
}
