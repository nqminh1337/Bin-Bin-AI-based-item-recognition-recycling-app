import { PetRepository, PetService } from '@features/gamification/pet';
import { LeaderboardService } from '@features/gamification/leaderboard';
import { PointsService } from '@features/gamification/points';
import { FirestoreClient } from '@services/FirestoreClient';
import { FIRESTORE_COLLECTIONS } from '@utils/index';
import { ACHIEVEMENTS } from './constants';
import { breakdownByMaterial, getLastCompletedWeek, rankChange as computeRankChange, topMaterial } from './recapLogic';
import type { Achievement, UserStats, WeeklyRecap, WeeklySnapshot } from './types';

export class ProfileService {
  /** FR-53 */
  static async getStats(userId: string): Promise<UserStats> {
    const [totalPoints, totalItemsSorted, streak] = await Promise.all([
      PointsService.getBalance(userId),
      PointsService.getTotalItemsSorted(userId),
      PointsService.getStreak(userId),
    ]);
    return { userId, totalItemsSorted, totalPoints, currentStreakDays: streak.currentStreakDays };
  }

  /** FR-54: the full 12-slot catalog, each marked with when it unlocked. achievedAt is best-effort (today's date), since criteria are evaluated live rather than event-sourced. */
  static async getAchievements(userId: string): Promise<Achievement[]> {
    const [itemsSorted, totalPoints, streak, weeklyActivity, pet] = await Promise.all([
      PointsService.getTotalItemsSorted(userId),
      PointsService.getBalance(userId),
      PointsService.getStreak(userId),
      PointsService.getWeeklyActivity(userId),
      PetService.getState(userId),
    ]);
    const ctx = { itemsSorted, totalPoints, streak, weeklyActivity, pet };
    const today = new Date().toISOString().slice(0, 10);
    return ACHIEVEMENTS.map(({ achievementId, label, description, isUnlocked }) => ({
      achievementId,
      label,
      description,
      achievedAt: isUnlocked(ctx) ? today : null,
    }));
  }

  /**
   * FR-56 / FR-57: recap for the most recently completed Mon-Sun week.
   * `zoneId` is optional — pass the user's current zone (from useZone()) to
   * get a rank and rank-change; without it the recap still works, just with
   * rankStart/rankEnd as null.
   */
  static async getWeeklyRecap(userId: string, zoneId: string | null, displayName: string): Promise<WeeklyRecap> {
    const { start, end, weekStartDate } = getLastCompletedWeek();

    const [pointsEntries, feedEvents, rankEnd] = await Promise.all([
      PointsService.getBalance(userId), // cumulative; itemsSorted/points earned are computed from per-event data below
      PetRepository.getFeedEvents(userId),
      ProfileService.getCurrentRank(userId, zoneId, displayName),
    ]);
    void pointsEntries;

    const byMaterial = breakdownByMaterial(feedEvents, start, end);
    const itemsSorted = Object.values(byMaterial).reduce((sum, n) => sum + (n ?? 0), 0);

    const previousSnapshot = await ProfileService.getSnapshot(userId, weekStartDate);
    const rankStart = previousSnapshot?.rank ?? null;

    // Snapshot this week's rank so *next* week's recap can report a change.
    await ProfileService.saveSnapshot({ userId, weekStartDate, rank: rankEnd });

    return {
      weekStartDate,
      itemsSorted,
      // Approximation: FR-33/FR-73 pay a fixed POINT_VALUES.CORRECT_SORT per
      // correct sort, so points earned this week = items sorted x that value.
      pointsEarned: itemsSorted * 10,
      topBinCategory: topMaterial(byMaterial),
      rankStart,
      rankEnd,
      byMaterial,
    };
  }

  private static async getCurrentRank(userId: string, zoneId: string | null, displayName: string): Promise<number | null> {
    if (!zoneId) return null;
    try {
      const balance = await PointsService.getBalance(userId);
      await LeaderboardService.syncLeaderboardEntry(userId, displayName, balance, zoneId);
      const board = await LeaderboardService.getLocalLeaderboard(zoneId);
      return board.entries.find((e) => e.userId === userId)?.rank ?? null;
    } catch {
      return null;
    }
  }

  private static snapshotDocId(userId: string, weekStartDate: string) {
    return `${userId}_${weekStartDate}`;
  }

  private static async getSnapshot(userId: string, weekStartDate: string): Promise<WeeklySnapshot | null> {
    // The *previous* week's snapshot is what tells us the starting rank.
    const prevMonday = new Date(`${weekStartDate}T00:00:00`);
    prevMonday.setDate(prevMonday.getDate() - 7);
    const prevKey = prevMonday.toISOString().slice(0, 10);
    return FirestoreClient.getDocument<WeeklySnapshot>(
      FIRESTORE_COLLECTIONS.PROFILE_WEEKLY_SNAPSHOTS,
      ProfileService.snapshotDocId(userId, prevKey),
    );
  }

  private static async saveSnapshot(snapshot: WeeklySnapshot): Promise<void> {
    await FirestoreClient.setDocument(
      FIRESTORE_COLLECTIONS.PROFILE_WEEKLY_SNAPSHOTS,
      ProfileService.snapshotDocId(snapshot.userId, snapshot.weekStartDate),
      snapshot,
    );
  }
}

export { computeRankChange as getRankChange };
