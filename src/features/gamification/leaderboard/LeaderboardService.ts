import { FirestoreClient } from '@services/FirestoreClient';
import { FIRESTORE_COLLECTIONS } from '@utils/index';
import { where } from 'firebase/firestore';

import type { Leaderboard, LeaderboardEntry } from './types';

export class LeaderboardService {
  static async syncLeaderboardEntry(
    userId: string,
    displayName: string,
    points: number,
    zoneId: string
  ): Promise<LeaderboardEntry> {
    if (!userId) {
      throw new Error('A user ID is required to sync leaderboard entry.');
    }

    if (!zoneId) {
      throw new Error('A zone ID is required to sync leaderboard entry.');
    }

    const entry: LeaderboardEntry = {
      userId,
      displayName,
      points,
      rank: 0,
      zoneId,
    };

    // Deterministic document ID: exactly one leaderboard document per user.
    await FirestoreClient.setDocument(
      FIRESTORE_COLLECTIONS.LEADERBOARD,
      userId,
      entry
    );

    return entry;
  }

  static async getLocalLeaderboard(
    zoneId: string
  ): Promise<Leaderboard> {
    if (!zoneId) {
      throw new Error('A zone ID is required to retrieve local leaderboard.');
    }

    const entries =
      await FirestoreClient.queryCollection<LeaderboardEntry>(
        FIRESTORE_COLLECTIONS.LEADERBOARD,
        where('zoneId', '==', zoneId)
      );

    const rankedEntries = [...entries]
      .sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }

        return a.displayName.localeCompare(b.displayName);
      })
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

    return {
      scope: 'local',
      entries: rankedEntries,
      generatedAt: new Date().toISOString(),
    };
  }
}