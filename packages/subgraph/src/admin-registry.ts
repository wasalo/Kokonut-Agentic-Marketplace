import { BigInt } from '@graphprotocol/graph-ts';
import {
  AgentBlacklisted as AgentBlacklistedEvent,
  AgentUnblacklisted as AgentUnblacklistedEvent,
  WalletBlacklisted as WalletBlacklistedEvent,
  WalletUnblacklisted as WalletUnblacklistedEvent,
  FeaturedAgentUpdated as FeaturedAgentUpdatedEvent,
  SlashManagerSet as SlashManagerSetEvent,
  CommerceSet as CommerceSetEvent,
  ServiceRegistrySet as ServiceRegistrySetEvent,
} from '../generated/AdminRegistry/AdminRegistry';
import { BlacklistEntry, Agent, PlatformStat, Activity } from '../generated/schema';
import { updatePlatformStat } from './helpers';

export function handleAgentBlacklisted(event: AgentBlacklistedEvent): void {
  let entryId = 'agent-' + event.params.agentId.toString();
  let entry = new BlacklistEntry(entryId);
  entry.agentId = event.params.agentId;
  entry.reason = event.params.reason;
  entry.blacklistedBy = event.params.by;
  entry.blacklistedAt = event.block.timestamp;
  entry.activationAt = event.params.activationAt;
  entry.active = event.block.timestamp >= event.params.activationAt;
  entry.save();

  let agent = Agent.load(event.params.agentId.toString());
  if (agent) {
    agent.blacklisted = true;
    agent.save();
  }

  updatePlatformStat('totalBlacklistedAgents', true, event.block.timestamp);
}

export function handleAgentUnblacklisted(event: AgentUnblacklistedEvent): void {
  let entryId = 'agent-' + event.params.agentId.toString();
  let entry = BlacklistEntry.load(entryId);
  if (entry) {
    entry.active = false;
    entry.save();
  }

  let agent = Agent.load(event.params.agentId.toString());
  if (agent) {
    agent.blacklisted = false;
    agent.save();
  }
}

export function handleWalletBlacklisted(event: WalletBlacklistedEvent): void {
  let entryId = 'wallet-' + event.params.wallet.toHexString();
  let entry = new BlacklistEntry(entryId);
  entry.wallet = event.params.wallet;
  entry.reason = event.params.reason;
  entry.blacklistedBy = event.params.by;
  entry.blacklistedAt = event.block.timestamp;
  entry.activationAt = event.params.activationAt;
  entry.active = event.block.timestamp >= event.params.activationAt;
  entry.save();
}

export function handleWalletUnblacklisted(event: WalletUnblacklistedEvent): void {
  let entryId = 'wallet-' + event.params.wallet.toHexString();
  let entry = BlacklistEntry.load(entryId);
  if (entry) {
    entry.active = false;
    entry.save();
  }
}

export function handleFeaturedAgentUpdated(event: FeaturedAgentUpdatedEvent): void {
  let agent = Agent.load(event.params.agentId.toString());
  if (agent) {
    agent.featured = event.params.isFeatured;
    agent.save();
  }
}

// Phase 45d: wiring setters
export function handleSlashManagerSet(event: SlashManagerSetEvent): void {
  let activity = new Activity(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  );
  activity.type = 'SLASH_MANAGER_SET';
  activity.actor = event.transaction.from;
  activity.blockNumber = event.block.number;
  activity.timestamp = event.block.timestamp;
  activity.transactionHash = event.transaction.hash;
  activity.save();
}

export function handleCommerceSet(event: CommerceSetEvent): void {
  let activity = new Activity(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  );
  activity.type = 'COMMERCE_SET';
  activity.actor = event.transaction.from;
  activity.blockNumber = event.block.number;
  activity.timestamp = event.block.timestamp;
  activity.transactionHash = event.transaction.hash;
  activity.save();
}

export function handleServiceRegistrySet(event: ServiceRegistrySetEvent): void {
  let activity = new Activity(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  );
  activity.type = 'SERVICE_REGISTRY_SET';
  activity.actor = event.transaction.from;
  activity.blockNumber = event.block.number;
  activity.timestamp = event.block.timestamp;
  activity.transactionHash = event.transaction.hash;
  activity.save();
}
