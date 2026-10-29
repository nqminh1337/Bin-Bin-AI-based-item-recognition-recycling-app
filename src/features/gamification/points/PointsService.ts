import { FirestoreClient } from '@services/FirestoreClient';
import { FIRESTORE_COLLECTIONS, generateId } from '@utils/index';
import { where } from 'firebase/firestore';
import { POINT_REASONS, STREAK_MILESTONE_DAYS } from './constants';
import { calculateStreakProgress } from './streakLogic';
import type { Milestone, PointsLedgerEntry, Streak, WeeklyActivityDay } from './types';

export class PointsService {
  // FR-33: kerbside items: caller awards points immediately at identification,
  // no drop-off confirmation needed. (Contrast FR-73: depot-only items call
  // this only after the user confirms physical drop-off.)
  static async addPoints(userId: string, points: number, reason: string): Promise<PointsLedgerEntry> {
    const entry: PointsLedgerEntry = {
      entryId: generateId(),
      userId,
      points,
      reason,
      createdAt: new Date().toISOString(),
    };

    await FirestoreClient.setDocument(FIRESTORE_COLLECTIONS.POINTS_LEDGER, entry.entryId, entry);

    return entry;
  }

  static async getBalance(userId: string): Promise<number> {
    if (!userId) {
      throw new Error('A user ID is required to retrieve points balance.');
    }

    const entries = await FirestoreClient.queryCollection<PointsLedgerEntry>(
      FIRESTORE_COLLECTIONS.POINTS_LEDGER,
      where('userId', '==', userId)
    );

    return entries.reduce((total, entry) => total + entry.points, 0);
  }

  // Profile: count confirmed correct sorts recorded for this user.
  static async getTotalItemsSorted(userId: string): Promise<number> {
    if (!userId) {
      throw new Error('A user ID is required to retrieve items sorted.');
    }

    const entries = await FirestoreClient.queryCollection<PointsLedgerEntry>(
      FIRESTORE_COLLECTIONS.POINTS_LEDGER,
      where('userId', '==', userId)
    );

    return entries.filter((entry) => entry.reason === POINT_REASONS.CORRECT_SORT).length;
  }

  static async getStreak(userId: string): Promise<Streak> {
    if (!userId) {
      throw new Error('A user ID is required to retrieve streak.');
    }

    const entries = await FirestoreClient.queryCollection<PointsLedgerEntry>(
      FIRESTORE_COLLECTIONS.POINTS_LEDGER,
      where('userId', '==', userId)
    );

    // Share the same FR-36/37 calculation with FR-39 milestone checks.
    return calculateStreakProgress(entries).streak;
  }

  // FR-38: a day is completed when the user has at least one correct sort.
  // Use local calendar dates, so the seven-day window matches the Profile UI.
  static async getWeeklyActivity(userId: string): Promise<WeeklyActivityDay[]> {
    if (!userId) {
      throw new Error('A user ID is required to retrieve weekly activity.');
    }

    const entries = await FirestoreClient.queryCollection<PointsLedgerEntry>(
      FIRESTORE_COLLECTIONS.POINTS_LEDGER,
      where('userId', '==', userId)
    );

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const toLocalDate = (date: Date): string =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    const activeDates = new Set(
      entries
        .filter((entry) => entry.reason === POINT_REASONS.CORRECT_SORT)
        .map((entry) => new Date(entry.createdAt))
        .filter((date) => !Number.isNaN(date.getTime()) && date.getTime() <= now.getTime())
        .map(toLocalDate)
    );

    // Earliest day first, ending with today
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(today);
      day.setDate(today.getDate() - (6 - index));
      const date = toLocalDate(day);
      return { date, completed: activeDates.has(date) };
    });
  }

  // FR-39: flag exact matches for the current streak, and retain the first
  // achievement timestamp for milestones reached during any past streak.
  // FR-40 can use this result to determine which reward to present.
  static async checkMilestones(userId: string): Promise<Milestone[]> {
    if (!userId) {
      throw new Error('A user ID is required to check streak milestones.');
    }

    const entries = await FirestoreClient.queryCollection<PointsLedgerEntry>(
      FIRESTORE_COLLECTIONS.POINTS_LEDGER,
      where('userId', '==', userId)
    );
    const { streak, achievedAtByThreshold } = calculateStreakProgress(entries);

    return STREAK_MILESTONE_DAYS.map((days) => ({
      milestoneId: `streak-${days}`,
      label: `${days}-day streak`,
      thresholdDays: days,
      achievedAt: achievedAtByThreshold.get(days) ?? null,
      isCurrentMatch: streak.currentStreakDays === days,
    }));
  }

  // FR-40: return a milestone only if this newly saved correct-sort entry was
  // the first sort to unlock it. Later sorts on the same day return null.
  static async getUnlockedStreakMilestone(userId: string, entryId: string): Promise<number | null> {
    if (!userId || !entryId) {
      throw new Error('A user ID and ledger entry ID are required to check a milestone unlock.');
    }

    const entries = await FirestoreClient.queryCollection<PointsLedgerEntry>(
      FIRESTORE_COLLECTIONS.POINTS_LEDGER,
      where('userId', '==', userId)
    );
    const { milestoneEntryIdByThreshold } = calculateStreakProgress(entries);
    return STREAK_MILESTONE_DAYS.find((days) => milestoneEntryIdByThreshold.get(days) === entryId) ?? null;
  }
}
