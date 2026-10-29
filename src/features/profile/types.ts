import type { MaterialType } from '@features/gamification/pet';

/**
 * Domain types for the profile feature: achievements, stats, weekly recap.
 */

export interface Achievement {
  achievementId: string;
  label: string;
  description: string;
  achievedAt: string | null;
}

export interface UserStats {
  userId: string;
  totalItemsSorted: number;
  totalPoints: number;
  currentStreakDays: number;
}

export interface WeeklyRecap {
  weekStartDate: string; // 'YYYY-MM-DD', local Monday
  itemsSorted: number;
  pointsEarned: number;
  topBinCategory: string | null;

  rankStart: number | null;
  rankEnd: number | null;
  byMaterial: Partial<Record<MaterialType, number>>;
}

/** profileWeeklySnapshots/{userId}_{weekStartDate}: this user's rank at the end of a given week. */
export interface WeeklySnapshot {
  userId: string;
  weekStartDate: string;
  rank: number | null;
}
