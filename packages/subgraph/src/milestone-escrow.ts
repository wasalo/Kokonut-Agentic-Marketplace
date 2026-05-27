import { Address, BigInt } from '@graphprotocol/graph-ts';
import {
  MilestoneEnabled as MilestoneEnabledEvent,
  MilestoneAdded as MilestoneAddedEvent,
  MilestoneCompleted as MilestoneCompletedEvent,
  MilestoneReleased as MilestoneReleasedEvent,
  DisputeFlagged as DisputeFlaggedEvent,
  DisputeResolved as DisputeResolvedEvent,
  ArbiterRegistered as ArbiterRegisteredEvent,
  ArbiterUnregistered as ArbiterUnregisteredEvent,
  MilestoneEscrow,
} from '../generated/MilestoneEscrow/MilestoneEscrow';
import { Milestone, Dispute } from '../generated/schema';
import { updatePlatformStat } from './helpers';

const ZERO_ADDRESS = Address.fromString('0x0000000000000000000000000000000000000000');

export function handleMilestoneEnabled(event: MilestoneEnabledEvent): void {
  // Milestone setup is represented by later MilestoneAdded entities.
}

export function handleMilestoneAdded(event: MilestoneAddedEvent): void {
  let milestoneId = event.params.jobId.toString() + '-' + event.params.milestoneIndex.toString();
  let milestone = new Milestone(milestoneId);
  milestone.jobId = event.params.jobId;
  milestone.milestoneIndex = event.params.milestoneIndex;
  milestone.description = event.params.description;
  milestone.amount = event.params.amount;
  milestone.status = 0;
  milestone.createdAt = event.block.timestamp;
  milestone.save();
}

export function handleMilestoneCompleted(event: MilestoneCompletedEvent): void {
  let milestoneId = event.params.jobId.toString() + '-' + event.params.milestoneIndex.toString();
  let milestone = Milestone.load(milestoneId);
  if (milestone) {
    milestone.status = 1;
    milestone.completedAt = event.block.timestamp;
    milestone.save();
  }
}

export function handleMilestoneReleased(event: MilestoneReleasedEvent): void {
  let milestoneId = event.params.jobId.toString() + '-' + event.params.milestoneIndex.toString();
  let milestone = Milestone.load(milestoneId);
  if (milestone) {
    milestone.status = 2;
    milestone.save();
  }
}

export function handleDisputeFlagged(event: DisputeFlaggedEvent): void {
  let disputeId = event.params.jobId.toString();
  let dispute = new Dispute(disputeId);
  dispute.jobId = event.params.jobId;
  dispute.flagger = event.params.flagger;
  dispute.milestoneIndex = BigInt.zero();
  dispute.arbiter = ZERO_ADDRESS;
  dispute.token = event.params.token;
  dispute.feePaid = event.params.fee;
  dispute.releasedToProvider = false;
  dispute.arbiterFee = BigInt.zero();
  dispute.resolved = false;
  dispute.createdAt = event.block.timestamp;

  let contract = MilestoneEscrow.bind(event.address);
  let disputeResult = contract.try_getDispute(event.params.jobId);
  if (!disputeResult.reverted) {
    dispute.arbiter = disputeResult.value.arbiter;
    dispute.milestoneIndex = disputeResult.value.milestoneIndex;
    dispute.feePaid = disputeResult.value.feePaid;
  }

  dispute.save();

  updatePlatformStat('totalDisputes', true, event.block.timestamp);
}

export function handleDisputeResolved(event: DisputeResolvedEvent): void {
  let disputeId = event.params.jobId.toString();
  let dispute = Dispute.load(disputeId);
  if (dispute == null) {
    dispute = new Dispute(disputeId);
    dispute.jobId = event.params.jobId;
    dispute.flagger = ZERO_ADDRESS;
    dispute.milestoneIndex = BigInt.zero();
    dispute.createdAt = event.block.timestamp;
  }

  dispute.arbiter = event.params.arbiter;
  dispute.token = event.params.token;
  dispute.arbiterFee = event.params.arbiterFee;
  dispute.releasedToProvider = event.params.releasedToProvider;
  dispute.resolved = true;
  dispute.resolvedAt = event.block.timestamp;
  dispute.save();
}

export function handleArbiterRegistered(event: ArbiterRegisteredEvent): void {
  // Arbiter pool changes are currently surfaced through contract reads in the app.
}

export function handleArbiterUnregistered(event: ArbiterUnregisteredEvent): void {
  // Arbiter pool changes are currently surfaced through contract reads in the app.
}
