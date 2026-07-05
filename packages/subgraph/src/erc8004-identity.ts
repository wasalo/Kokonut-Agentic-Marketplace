import { Bytes } from '@graphprotocol/graph-ts';
import {
  Registered as RegisteredEvent,
  AgentURIUpdated as AgentURIUpdatedEvent,
  MetadataUpdated as MetadataUpdatedEvent,
} from '../generated/ERC8004Registry/ERC8004Registry';
import { Agent, Activity } from '../generated/schema';
import { updatePlatformStat } from './helpers';

export function handleRegistered(event: RegisteredEvent): void {
  let agent = new Agent(event.params.agentId.toString());
  agent.agentId = event.params.agentId;
  agent.owner = event.params.owner;
  agent.metadataURI = event.params.agentURI;
  agent.isActive = true;
  agent.createdAt = event.block.timestamp;
  agent.updatedAt = event.block.timestamp;
  agent.save();

  let activity = new Activity(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  );
  activity.type = 'AGENT_REGISTERED';
  activity.actor = event.params.owner;
  activity.targetId = event.params.agentId;
  activity.blockNumber = event.block.number;
  activity.timestamp = event.block.timestamp;
  activity.transactionHash = event.transaction.hash;
  activity.save();

  updatePlatformStat('totalAgents', true, event.block.timestamp);
}

export function handleAgentURIUpdated(event: AgentURIUpdatedEvent): void {
  let agent = Agent.load(event.params.agentId.toString());
  if (agent) {
    agent.metadataURI = event.params.newURI;
    agent.updatedAt = event.block.timestamp;
    agent.save();
  }
}

export function handleMetadataUpdated(event: MetadataUpdatedEvent): void {
  let agent = Agent.load(event.params.agentId.toString());
  if (agent) {
    agent.updatedAt = event.block.timestamp;
    agent.save();
  }
}
