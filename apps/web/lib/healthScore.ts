'use client';

export interface HealthFactors {
  rating: number;
  completionRate: number;
  activeServices: number;
  recentActivity: number;
}

export interface HealthScore {
  score: number;
  factors: HealthFactors;
  tier: 'gold' | 'silver' | 'bronze' | 'standard';
  breakdown: {
    ratingPoints: number;
    completionPoints: number;
    servicePoints: number;
    recencyPoints: number;
  };
}

const WEIGHTS = {
  rating: 0.4,
  completionRate: 0.35,
  activeServices: 0.15,
  recentActivity: 0.1,
};

export function calculateHealthScore(factors: HealthFactors): HealthScore {
  const { rating, completionRate, activeServices, recentActivity } = factors;

  const ratingPoints = Math.min(rating * 10, 100) * WEIGHTS.rating;
  const completionPoints = completionRate * 100 * WEIGHTS.completionRate;
  const servicePoints = Math.min(activeServices * 10, 100) * WEIGHTS.activeServices;
  const recencyPoints = Math.max(0, (30 - recentActivity) / 30) * 100 * WEIGHTS.recentActivity;

  const totalScore = Math.round(ratingPoints + completionPoints + servicePoints + recencyPoints);

  const tier = getTier(totalScore);

  return {
    score: totalScore,
    factors,
    tier,
    breakdown: {
      ratingPoints: Math.round(ratingPoints * 10) / 10,
      completionPoints: Math.round(completionPoints * 10) / 10,
      servicePoints: Math.round(servicePoints * 10) / 10,
      recencyPoints: Math.round(recencyPoints * 10) / 10,
    },
  };
}

export function getTier(score: number): 'gold' | 'silver' | 'bronze' | 'standard' {
  if (score >= 80) return 'gold';
  if (score >= 60) return 'silver';
  if (score >= 40) return 'bronze';
  return 'standard';
}

export function getTierColor(tier: 'gold' | 'silver' | 'bronze' | 'standard'): string {
  switch (tier) {
    case 'gold':
      return '#FFD700';
    case 'silver':
      return '#C0C0C0';
    case 'bronze':
      return '#CD7F32';
    default:
      return '#9CA3AF';
  }
}

export function getTierLabel(tier: 'gold' | 'silver' | 'bronze' | 'standard'): string {
  switch (tier) {
    case 'gold':
      return 'Top Agent';
    case 'silver':
      return 'Rising Star';
    case 'bronze':
      return 'Established';
    default:
      return 'Newcomer';
  }
}

export function formatScore(score: number): string {
  return score.toFixed(1);
}

export function getScoreColor(score: number): string {
  if (score >= 80) return '#22C55E';
  if (score >= 60) return '#3B82F6';
  if (score >= 40) return '#F59E0B';
  return '#6B7280';
}
