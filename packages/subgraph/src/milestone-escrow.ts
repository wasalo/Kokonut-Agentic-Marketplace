import { BigInt } from '@graphprotocol/graph-ts';
import {
  MilestoneEnabled as MilestoneEnabledEvent,
  MilestoneAdded as MilestoneAddedEvent,
  MilestoneCompleted as MilestoneCompletedEvent,
  MilestoneReleased as MilestoneReleasedEvent,
  DisputeFlagged as DisputeFlaggedEvent,
  DisputeResolved as DisputeResolvedEvent,
  ArbiterRegistered as ArbiterRegisteredEvent,
  ArbiterUnregistered as ArbiterUnregisteredEvent,
} from '../generated/MilestoneEscrow/MilestoneEscrow';
import { Milestone, Dispute } from '../generated/schema';
import { updatePlatformStat } from './helpers';

export function handleMilestoneEnabled(event: MilestoneEnabledEvent): void {
  // Milestone setup event
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
  let disputeId = event.params.jobId.toString() + '-' + event.params.flagger.toHexString();
  let dispute = new Dispute(disputeId);
  dispute.jobId = event.params.jobId;
  dispute.flagger = event.params.flagger;
  dispute.resolved = false;
  dispute.createdAt = event.block.timestamp;
  dispute.save();

  updatePlatformStat('totalDisputes', true, event.block.timestamp);
}

export function handleDisputeResolved(event: DisputeResolvedEvent): void {
  let disputeId = event.params.jobId.toString() + '-';
  // Find dispute by scanning - simplified approach
}

export function handleArbiterRegistered(event: ArbiterRegisteredEvent): void {
  // Arbiter tracking
}

export function handleArbiterUnregistered(event: ArbiterUnregisteredEvent): void {
  // Arbiter tracking
}
