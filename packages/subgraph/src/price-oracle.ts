import { BigInt } from '@graphprotocol/graph-ts';
import {
  TokenAdded as TokenAddedEvent,
  TokenRemoved as TokenRemovedEvent,
  TokenPriceFeedSet as TokenPriceFeedSetEvent,
  PriceOracle,
} from '../generated/PriceOracle/PriceOracle';
import { PriceOracleToken, Activity } from '../generated/schema';
import { updatePlatformStat } from './helpers';

export function handleTokenAdded(event: TokenAddedEvent): void {
  let id = event.params.token.toHexString();
  let token = new PriceOracleToken(id);
  token.token = event.params.token;
  token.decimals = event.params.decimals;
  token.addedAt = event.block.timestamp;
  token.save();

  let activity = new Activity(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  );
  activity.type = 'ORACLE_TOKEN_ADDED';
  activity.targetId = event.params.token;
  activity.blockNumber = event.block.number;
  activity.timestamp = event.block.timestamp;
  activity.transactionHash = event.transaction.hash;
  activity.save();

  updatePlatformStat('oracleTokenCount', true, event.block.timestamp);
}

export function handleTokenRemoved(event: TokenRemovedEvent): void {
  let id = event.params.token.toHexString();
  let token = PriceOracleToken.load(id);
  if (token) {
    token.save();
  }

  let activity = new Activity(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  );
  activity.type = 'ORACLE_TOKEN_REMOVED';
  activity.targetId = event.params.token;
  activity.blockNumber = event.block.number;
  activity.timestamp = event.block.timestamp;
  activity.transactionHash = event.transaction.hash;
  activity.save();

  updatePlatformStat('oracleTokenCount', false, event.block.timestamp);
}

export function handleTokenPriceFeedSet(event: TokenPriceFeedSetEvent): void {
  let activity = new Activity(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  );
  activity.type = 'ORACLE_PRICE_FEED_SET';
  activity.targetId = event.params.token;
  activity.blockNumber = event.block.number;
  activity.timestamp = event.block.timestamp;
  activity.transactionHash = event.transaction.hash;
  activity.save();
}
