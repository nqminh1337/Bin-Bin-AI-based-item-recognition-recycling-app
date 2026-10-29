/**
 * Domain types for the points feature: a points ledger, daily streaks,
 * and milestones.
 */

export interface PointsLedgerEntry {
  entryId: string;
  userId: string;
  points: number;
  reason: string;
  createdAt: string;
}

export interface Streak {
  currentStreakDays: number;
  longestStreakDays: number;
  lastActiveDate: string;
}

export interface WeeklyActivityDay {
  date: string;
  completed: boolean;
}

export interface Milestone {
  milestoneId: string;
  label: string;
  thresholdDays: number;
  // The first correct sort that completed this milestone, across all streaks.
  achievedAt: string | null;
  // True only while the current, unexpired streak equals this threshold.
  isCurrentMatch: boolean;
}
