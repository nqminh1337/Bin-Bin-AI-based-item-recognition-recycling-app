import { POINT_REASONS, STREAK_MILESTONE_DAYS } from './constants';
import type { PointsLedgerEntry, Streak } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

interface StreakProgress {
  streak: Streak;
  achievedAtByThreshold: Map<number, string>;
  // Ledger entry responsible for the first unlock of each milestone.
  milestoneEntryIdByThreshold: Map<number, string>;
}

/**
 * Shared FR-36/37/39 streak calculation. A new *calendar day* increments the
 * streak only when the previous correct sort was within the last 24 hours.
 * Multiple sorts on one day do not increment it, but keep the window alive.
 */
export function calculateStreakProgress(
  entries: PointsLedgerEntry[],
  now: number = Date.now()
): StreakProgress {
  const sorts = entries
    .filter((entry) => entry.reason === POINT_REASONS.CORRECT_SORT)
    .filter((entry) => !Number.isNaN(new Date(entry.createdAt).getTime()))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const achievedAtByThreshold = new Map<number, string>();
  const milestoneEntryIdByThreshold = new Map<number, string>();
  if (sorts.length === 0) {
    return {
      streak: { currentStreakDays: 0, longestStreakDays: 0, lastActiveDate: '' },
      achievedAtByThreshold,
      milestoneEntryIdByThreshold,
    };
  }

  let currentRun = 0;
  let longestRun = 0;
  let previousSortTime: number | null = null;
  let previousCalendarDay: number | null = null;

  for (const entry of sorts) {
    const date = new Date(entry.createdAt);
    const sortTime = date.getTime();

    // Local calendar days, converted to stable UTC day numbers so daylight
    // saving transitions do not affect consecutive-day comparisons.
    const calendarDay = Math.floor(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS
    );

    if (
      previousSortTime === null ||
      sortTime - previousSortTime > DAY_MS ||
      (previousCalendarDay !== null && calendarDay > previousCalendarDay + 1)
    ) {
      currentRun = 1;
    } else if (previousCalendarDay !== null && calendarDay === previousCalendarDay + 1) {
      currentRun += 1;
    }
    // A later sort on the same day keeps the streak alive but does not add a day.

    longestRun = Math.max(longestRun, currentRun);
    if (
      STREAK_MILESTONE_DAYS.some((threshold) => threshold === currentRun) &&
      !achievedAtByThreshold.has(currentRun)
    ) {
      achievedAtByThreshold.set(currentRun, entry.createdAt);
      milestoneEntryIdByThreshold.set(currentRun, entry.entryId);
    }

    previousSortTime = sortTime;
    previousCalendarDay = calendarDay;
  }

  const isExpired = previousSortTime !== null && now - previousSortTime > DAY_MS;
  return {
    streak: {
      currentStreakDays: isExpired ? 0 : currentRun,
      longestStreakDays: longestRun,
      lastActiveDate: sorts[sorts.length - 1].createdAt,
    },
    achievedAtByThreshold,
    milestoneEntryIdByThreshold,
  };
}
