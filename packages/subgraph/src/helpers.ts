import { BigInt } from '@graphprotocol/graph-ts';
import { PlatformStat } from '../generated/schema';

export function updatePlatformStat(field: string, increment: boolean, timestamp: BigInt = BigInt.zero()): void {
  let stat = PlatformStat.load('platform');
  if (!stat) {
    stat = new PlatformStat('platform');
    stat.totalAgents = 0;
    stat.totalActiveAgents = 0;
    stat.totalServices = 0;
    stat.totalJobs = 0;
    stat.totalReviews = 0;
    stat.totalSkills = 0;
    stat.totalBlacklistedAgents = 0;
    stat.totalDisputes = 0;
    stat.updatedAt = timestamp;
  }

  if (field == 'totalAgents') stat.totalAgents += increment ? 1 : -1;
  if (field == 'totalActiveAgents') stat.totalActiveAgents += increment ? 1 : -1;
  if (field == 'totalServices') stat.totalServices += increment ? 1 : -1;
  if (field == 'totalJobs') stat.totalJobs += increment ? 1 : -1;
  if (field == 'totalReviews') stat.totalReviews += increment ? 1 : -1;
  if (field == 'totalSkills') stat.totalSkills += increment ? 1 : -1;
  if (field == 'totalBlacklistedAgents') stat.totalBlacklistedAgents += increment ? 1 : -1;
  if (field == 'totalDisputes') stat.totalDisputes += increment ? 1 : -1;

  if (!timestamp.isZero()) {
    stat.updatedAt = timestamp;
  }
  stat.save();
}
