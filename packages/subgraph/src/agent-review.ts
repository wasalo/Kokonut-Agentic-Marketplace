import { BigInt, Bytes } from '@graphprotocol/graph-ts';
import {
  ProposalCreated as ProposalCreatedEvent,
  EvaluationSubmitted as EvaluationSubmittedEvent,
  DecisionAttested as DecisionAttestedEvent,
  EvaluatorSlashed as EvaluatorSlashedEvent,
} from '../generated/AgentReview/AgentReview';
import { Proposal, Evaluation, Activity } from '../generated/schema';
import { updatePlatformStat } from './helpers';

export function handleProposalCreated(event: ProposalCreatedEvent): void {
  let proposal = new Proposal(event.params.proposalId.toString());
  proposal.proposalId = event.params.proposalId;
  proposal.proposer = event.params.proposer;
  proposal.title = event.params.title;
  proposal.reward = event.params.reward;
  proposal.status = 0;
  proposal.createdAt = event.block.timestamp;
  proposal.save();

  let activity = new Activity(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  );
  activity.type = 'PROPOSAL_CREATED';
  activity.actor = event.params.proposer;
  activity.targetId = event.params.proposalId;
  activity.blockNumber = event.block.number;
  activity.timestamp = event.block.timestamp;
  activity.transactionHash = event.transaction.hash;
  activity.save();

  updatePlatformStat('totalProposals', true);
}

export function handleEvaluationSubmitted(event: EvaluationSubmittedEvent): void {
  let evaluation = new Evaluation(
    event.params.proposalId.toString() + '-' + event.params.evaluator.toHexString()
  );
  evaluation.proposal = event.params.proposalId.toString();
  evaluation.evaluator = event.params.evaluator;
  evaluation.confidenceScore = event.params.confidenceScore.toI32();
  evaluation.createdAt = event.block.timestamp;
  evaluation.save();
}

export function handleDecisionAttested(event: DecisionAttestedEvent): void {
  let proposal = Proposal.load(event.params.proposalId.toString());
  if (proposal) {
    proposal.status = 2;
    proposal.decidedAt = event.block.timestamp;
    proposal.winningEvaluator = event.params.winningEvaluator;
    proposal.save();
  }
}

export function handleEvaluatorSlashed(event: EvaluatorSlashedEvent): void {
  // Event tracked but no specialized entity needed
}
