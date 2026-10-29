/**
 * Domain types for the leaderboard feature: friends/local ranked lists.
 */

export type LeaderboardScope =  'local' ;

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  points: number;
  rank: number;
  zoneId: string;
}

export interface Leaderboard {
  scope: LeaderboardScope;
  entries: LeaderboardEntry[];
  generatedAt: string;
}
