import { BigInt } from '@graphprotocol/graph-ts';
import {
  FeedbackSubmitted as FeedbackSubmittedEvent,
} from '../generated/ERC8004Reputation/ERC8004Reputation';
import { Review } from '../generated/schema';
import { updatePlatformStat } from './helpers';

export function handleFeedbackSubmitted(event: FeedbackSubmittedEvent): void {
  let reviewId = event.params.feedbackId.toString();
  let review = new Review(reviewId);
  review.agent = event.params.agent;
  review.reviewer = event.params.provider;
  review.rating = event.params.rating.toI32();
  review.feedbackId = event.params.feedbackId;
  review.timestamp = event.block.timestamp;
  review.save();

  updatePlatformStat('totalReviews', true);
}
