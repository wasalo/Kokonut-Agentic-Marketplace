import { BigInt, Bytes } from '@graphprotocol/graph-ts';
import {
  BiddingSessionCreated as BiddingSessionCreatedEvent,
  BidCommitted as BidCommittedEvent,
  BidRevealed as BidRevealedEvent,
  BidAccepted as BidAcceptedEvent,
  BidRejected as BidRejectedEvent,
  StakeWithdrawn as StakeWithdrawnEvent,
  StakeClaimed as StakeClaimedEvent,
  JobCreatedFromSession as JobCreatedFromSessionEvent,
  SessionCancelled as SessionCancelledEvent,
  SessionCompleted as SessionCompletedEvent,
  RevealWindowExtended as RevealWindowExtendedEvent,
} from '../generated/BiddingSystem/BiddingSystem';
import { BiddingSession, Bid, Activity } from '../generated/schema';
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

function loadOrCreateSession(sessionId: BigInt, event: BiddingSessionCreatedEvent): BiddingSession {
  let session = BiddingSession.load(sessionId.toString());
  if (!session) {
    session = new BiddingSession(sessionId.toString());
    session.sessionId = sessionId;
    session.createdAt = event.block.timestamp;
    session.updatedAt = event.block.timestamp;
    session.jobCreated = false;
    session.status = 0;
  }
  return session;
}

export function handleBiddingSessionCreated(event: BiddingSessionCreatedEvent): void {
  let session = new BiddingSession(event.params.sessionId.toString());
  session.sessionId = event.params.sessionId;
  session.creator = event.params.creator;
  session.evaluator = event.params.evaluator;
  session.maxBudget = event.params.maxBudget;
  session.deadline = event.params.deadline;
  session.serviceId = event.params.serviceId;
  session.jobCreated = false;
  session.status = 0;
  session.createdAt = event.block.timestamp;
  session.updatedAt = event.block.timestamp;
  session.save();

  createActivity(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString(),
    'BIDDING_SESSION_CREATED',
    event.params.creator as Bytes,
    event.params.sessionId,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash
  );
}

export function handleBidCommitted(event: BidCommittedEvent): void {
  let session = BiddingSession.load(event.params.sessionId.toString());
  if (!session) return;

  session.updatedAt = event.block.timestamp;
  session.save();

  let bid = new Bid(
    event.params.sessionId.toString() + '-' + event.params.bidder.toHexString()
  );
  bid.bidId = BigInt.fromI32(0);
  bid.session = session.id;
  bid.bidder = event.params.bidder;
  bid.stake = event.params.stakeAmount;
  bid.commitHash = event.params.commitHash;
  bid.revealed = false;
  bid.accepted = false;
  bid.rejected = false;
  bid.stakeWithdrawn = false;
  bid.timestamp = event.block.timestamp;
  bid.save();
}

export function handleBidRevealed(event: BidRevealedEvent): void {
  let session = BiddingSession.load(event.params.sessionId.toString());
  if (!session) return;

  session.updatedAt = event.block.timestamp;
  session.save();

  let bidId = event.params.sessionId.toString() + '-' + event.params.bidder.toHexString();
  let bid = Bid.load(bidId);
  if (bid) {
    bid.revealed = true;
    bid.proposedAmount = event.params.proposedAmount;
    bid.save();
  }
}

export function handleBidAccepted(event: BidAcceptedEvent): void {
  let session = BiddingSession.load(event.params.sessionId.toString());
  if (!session) return;

  session.winner = event.params.winner;
  session.winningBidId = event.params.bidId;
  session.status = 2;
  session.updatedAt = event.block.timestamp;
  session.save();

  let bidId = event.params.sessionId.toString() + '-' + event.params.winner.toHexString();
  let bid = Bid.load(bidId);
  if (bid) {
    bid.accepted = true;
    bid.save();
  }

  createActivity(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString(),
    'BID_ACCEPTED',
    event.params.winner as Bytes,
    event.params.sessionId,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash
  );
}

export function handleBidRejected(event: BidRejectedEvent): void {
  let session = BiddingSession.load(event.params.sessionId.toString());
  if (!session) return;

  session.updatedAt = event.block.timestamp;
  session.save();

  let bidId = event.params.sessionId.toString() + '-' + event.params.bidder.toHexString();
  let bid = Bid.load(bidId);
  if (bid) {
    bid.rejected = true;
    bid.save();
  }
}

export function handleStakeWithdrawn(event: StakeWithdrawnEvent): void {
  let bidId = event.params.sessionId.toString() + '-' + event.params.bidder.toHexString();
  let bid = Bid.load(bidId);
  if (bid) {
    bid.stakeWithdrawn = true;
    bid.save();
  }
}

export function handleStakeClaimed(event: StakeClaimedEvent): void {
  let bidId = event.params.sessionId.toString() + '-' + event.params.winner.toHexString();
  let bid = Bid.load(bidId);
  if (bid) {
    bid.stakeWithdrawn = true;
    bid.save();
  }
}

export function handleJobCreatedFromSession(event: JobCreatedFromSessionEvent): void {
  let session = BiddingSession.load(event.params.sessionId.toString());
  if (!session) return;

  session.jobId = event.params.jobId;
  session.jobCreated = true;
  session.status = 3;
  session.winner = event.params.winner;
  session.updatedAt = event.block.timestamp;
  session.save();

  createActivity(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString(),
    'JOB_CREATED_FROM_SESSION',
    event.params.winner as Bytes,
    event.params.sessionId,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash
  );
}

export function handleSessionCancelled(event: SessionCancelledEvent): void {
  let session = BiddingSession.load(event.params.sessionId.toString());
  if (!session) return;

  session.status = 5;
  session.updatedAt = event.block.timestamp;
  session.save();
}

export function handleSessionCompleted(event: SessionCompletedEvent): void {
  let session = BiddingSession.load(event.params.sessionId.toString());
  if (!session) return;

  session.status = 4;
  session.updatedAt = event.block.timestamp;
  session.save();
}

export function handleRevealWindowExtended(event: RevealWindowExtendedEvent): void {
  let session = BiddingSession.load(event.params.sessionId.toString());
  if (!session) return;

  session.revealWindowEnd = event.params.newRevealWindowEnd;
  session.updatedAt = event.block.timestamp;
  session.save();
}
