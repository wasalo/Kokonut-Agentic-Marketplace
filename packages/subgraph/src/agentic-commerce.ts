import { BigInt, Bytes } from '@graphprotocol/graph-ts';
import {
  JobCreated as JobCreatedEvent,
  JobFunded as JobFundedEvent,
  JobSubmitted as JobSubmittedEvent,
  JobStatusChanged as JobStatusChangedEvent,
  PaymentReleased as PaymentReleasedEvent,
  JobRejected as JobRejectedEvent,
  JobCompleted as JobCompletedEvent,
} from '../generated/AgenticCommerce/AgenticCommerce';
import { Job, Activity } from '../generated/schema';
import { updatePlatformStat } from './helpers';

function createActivity(
  id: string,
  type: string,
  actor: Bytes,
  targetId: BigInt,
  blockNumber: BigInt,
  timestamp: BigInt,
  txHash: Bytes
): void {
  let activity = new Activity(id);
  activity.type = type;
  activity.actor = actor;
  activity.targetId = targetId;
  activity.blockNumber = blockNumber;
  activity.timestamp = timestamp;
  activity.transactionHash = txHash;
  activity.save();
}

export function handleJobCreated(event: JobCreatedEvent): void {
  let job = new Job(event.params.jobId.toString());
  job.jobId = event.params.jobId;
  job.client = event.params.client;
  job.budget = event.params.budget;
  job.expiredAt = event.params.expiredAt;
  job.status = 0;
  job.createdAt = event.block.timestamp;
  job.save();

  createActivity(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString(),
    'JOB_CREATED',
    event.params.client as Bytes,
    event.params.jobId,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash
  );

  updatePlatformStat('totalJobs', true, event.block.timestamp);
}

export function handleJobFunded(event: JobFundedEvent): void {
  let job = Job.load(event.params.jobId.toString());
  if (job) {
    job.status = 1;
    job.fundedAt = event.block.timestamp;
    job.save();
  }
}

export function handleJobCompleted(event: JobCompletedEvent): void {
  let job = Job.load(event.params.jobId.toString());
  if (job) {
    job.status = 3;
    job.completedAt = event.block.timestamp;
    job.provider = event.params.provider;
    job.save();
  }
}

export function handleJobSubmitted(event: JobSubmittedEvent): void {
  let job = Job.load(event.params.jobId.toString());
  if (job) {
    job.status = 2;
    job.provider = event.params.provider;
    job.submittedAt = event.block.timestamp;
    job.deliverable = event.params.deliverable;
    job.save();
  }
}

export function handleJobStatusChanged(event: JobStatusChangedEvent): void {
  let job = Job.load(event.params.jobId.toString());
  if (!job) return;

  job.status = event.params.newStatus as i32;

  if (event.params.newStatus == 3) {
    job.completedAt = event.block.timestamp;
  } else if (event.params.newStatus == 4) {
    job.rejectedAt = event.block.timestamp;
  }

  job.save();
}

export function handlePaymentReleased(event: PaymentReleasedEvent): void {
  let job = Job.load(event.params.jobId.toString());
  if (job) {
    job.status = 3;
    job.completedAt = event.block.timestamp;
    job.platformFee = event.params.platformFee;
    job.evaluatorFee = event.params.evaluatorFee;
    job.save();
  }

  createActivity(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString(),
    'PAYMENT_RELEASED',
    event.transaction.from,
    event.params.jobId,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash
  );
}

export function handleJobRejected(event: JobRejectedEvent): void {
  let job = Job.load(event.params.jobId.toString());
  if (job) {
    job.status = 4;
    job.rejectedAt = event.block.timestamp;
    job.save();
  }
}
