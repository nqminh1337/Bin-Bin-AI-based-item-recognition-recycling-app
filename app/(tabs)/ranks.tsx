import { LeaderboardService } from '@features/gamification/leaderboard';
import { PointsService } from '@features/gamification/points';
import { useZone } from '@features/geolocation';
import { useAuthSession } from '@services/useAuthSession';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { LeaderboardEntry } from '@features/gamification/leaderboard';

export default function RanksScreen() {
  const { user } = useAuthSession();
  const { zone } = useZone();

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async () => {
    if (!user?.uid || !zone?.zoneId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get the current user's real balance from the Points feature.
      const balance = await PointsService.getBalance(user.uid);

      const displayName =
        user.displayName ??
        user.email ??
        'Bin Bin User';

      // Keep this user's deterministic leaderboard document up to date.
      await LeaderboardService.syncLeaderboardEntry(
        user.uid,
        displayName,
        balance,
        zone.zoneId
      );

      // Load everyone in the same zone and derive their ranks.
      const leaderboard =
        await LeaderboardService.getLocalLeaderboard(zone.zoneId);

      setEntries(leaderboard.entries);
    } catch (err) {
      console.error('Failed to load local leaderboard:', err);
      setError('Unable to load local leaderboard.');
    } finally {
      setLoading(false);
    }
  }, [user, zone]);

  useFocusEffect(
    useCallback(() => {
      void loadLeaderboard();
    }, [loadLeaderboard])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text>Loading local leaderboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Local Leaderboard</Text>

      <Text style={styles.subtitle}>
        {zone?.councilName ?? 'No local zone selected'}
      </Text>

      {error && (
        <Text style={styles.error}>
          {error}
        </Text>
      )}

      {!error && entries.length === 0 && (
        <Text style={styles.empty}>
          No leaderboard entries in this area yet.
        </Text>
      )}

      <FlatList
        data={entries}
        keyExtractor={(item) => item.userId}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rank}>
              #{item.rank}
            </Text>

            <View style={styles.userInfo}>
              <Text style={styles.name}>
                {item.displayName}
              </Text>
            </View>

            <Text style={styles.points}>
              {item.points} pts
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
  },

  subtitle: {
    fontSize: 15,
    color: '#666',
    marginTop: 4,
    marginBottom: 20,
  },

  error: {
    color: '#b00020',
    marginBottom: 16,
  },

  empty: {
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
  },

  list: {
    gap: 10,
    paddingBottom: 24,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    borderRadius: 12,
  },

  rank: {
    width: 45,
    fontSize: 18,
    fontWeight: '700',
  },

  userInfo: {
    flex: 1,
  },

  name: {
    fontSize: 16,
    fontWeight: '600',
  },

  points: {
    fontSize: 16,
    fontWeight: '700',
  },
});