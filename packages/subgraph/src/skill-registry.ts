import { BigInt } from '@graphprotocol/graph-ts';
import { Skill } from '../generated/schema';
import { SkillRegistered as SkillRegisteredEvent, SkillDeactivated as SkillDeactivatedEvent } from '../generated/SkillRegistry/SkillRegistry';

export function handleSkillRegistered(event: SkillRegisteredEvent): void {
  let sid = event.params.skillId.toString();
  let skill = new Skill(sid);
  skill.skillId = event.params.skillId;
  skill.agent = event.params.agentId.toString();
  skill.name = event.params.name.toString();
  skill.isActive = true;
  skill.createdAt = event.block.timestamp;
  skill.save();
}

export function handleSkillDeactivated(event: SkillDeactivatedEvent): void {
  let sid = event.params.skillId.toString();
  let skill = Skill.load(sid);
  if (skill != null) {
    skill.isActive = false;
    skill.save();
  }
}
