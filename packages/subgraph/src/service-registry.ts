import { BigInt } from '@graphprotocol/graph-ts';
import {
  ServiceCreated as ServiceCreatedEvent,
  ServiceUpdated as ServiceUpdatedEvent,
  ServiceDeactivated as ServiceDeactivatedEvent,
  ServiceRegistry,
} from '../generated/ServiceRegistry/ServiceRegistry';
import { Service, Activity } from '../generated/schema';
import { updatePlatformStat } from './helpers';

export function handleServiceCreated(event: ServiceCreatedEvent): void {
  let service = new Service(event.params.serviceId.toString());
  service.serviceId = event.params.serviceId;
  service.agent = event.params.agentId.toString();
  service.provider = event.params.provider;
  service.name = event.params.name;
  service.price = event.params.price;
  service.isActive = true;
  service.createdAt = event.block.timestamp;
  service.save();

  let activity = new Activity(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  );
  activity.type = 'SERVICE_CREATED';
  activity.actor = event.params.provider;
  activity.targetId = event.params.serviceId;
  activity.blockNumber = event.block.number;
  activity.timestamp = event.block.timestamp;
  activity.transactionHash = event.transaction.hash;
  activity.save();

  updatePlatformStat('totalServices', true, event.block.timestamp);
}

export function handleServiceUpdated(event: ServiceUpdatedEvent): void {
  let service = Service.load(event.params.serviceId.toString());
  if (!service) return;

  let contract = ServiceRegistry.bind(event.address);
  let result = contract.try_getService(event.params.serviceId);
  if (!result.reverted) {
    let data = result.value;
    service.name = data.name;
    service.description = data.description;
    service.metadataURI = data.metadataURI;
    service.price = data.price;
    service.paymentToken = data.paymentToken;
    service.save();
  }
}

export function handleServiceDeactivated(event: ServiceDeactivatedEvent): void {
  let service = Service.load(event.params.serviceId.toString());
  if (service) {
    service.isActive = false;
    service.save();
  }
}
