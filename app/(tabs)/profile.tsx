import { TabBarIcon } from '@components/TabBarIcon';
import { useAuthSession } from '@services/useAuthSession';
import { border, colors, palette, radii, spacing, typography } from '@theme/index';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { PointsService, type WeeklyActivityDay } from '@features/gamification/points';
import { MATERIAL_ORDER, PetPlaceholder, SKINS, computeLevel, usePet } from '@features/gamification/pet';
import { Achievement, ProfileService } from '@features/profile';
import { useRouter } from 'expo-router';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// Icons shown per achievement id; label/description/unlock status come from ProfileService.
const ACHIEVEMENT_ICONS: Record<string, React.ComponentProps<typeof TabBarIcon>['name']> = {
  'first-sort': 'flag-outline',
  'ten-items': 'trending-up-outline',
  'fifty-items': 'layers-outline',
  'hundred-items': 'ribbon-outline',
  'streak-seven': 'flame-outline',
  'glass-master': 'wine-outline',
  'recycle-hero': 'trophy-outline',
  'perfect-week': 'calendar-outline',
  'bin-bin-friend': 'paw-outline',
  'material-master': 'shapes-outline',
  'eco-expert': 'leaf-outline',
  'collector': 'color-palette-outline',
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuthSession();
  const { pet } = usePet();

  const [achievements, setAchievements] = useState<Achievement[]>([]);

  const [points, setPoints] = useState(0);
  const [items, setItems] = useState(0);
  const [streak, setStreak] = useState(0);
  const [weeklyActivity, setWeeklyActivity] = useState<WeeklyActivityDay[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(true);

  const loadPointsStats = useCallback(async () => {
    if (!user?.uid) {
      setPoints(0);
      setItems(0);
      setStreak(0);
      setWeeklyActivity([]);
      setAchievements([]);
      setWeeklyLoading(false);
      return;
    }

    setWeeklyLoading(true);
    try {
      const [balance, itemCount, streakData, activity, achievementList] = await Promise.all([
        PointsService.getBalance(user.uid),
        PointsService.getTotalItemsSorted(user.uid),
        PointsService.getStreak(user.uid),
        PointsService.getWeeklyActivity(user.uid),
        ProfileService.getAchievements(user.uid),
      ]);

      setPoints(balance);
      setItems(itemCount);
      setStreak(streakData.currentStreakDays);
      setWeeklyActivity(activity);
      setAchievements(achievementList);
    } catch (error) {
      console.error('Failed to load profile points stats:', error);
      setItems(0);
      setWeeklyActivity([]);
      setAchievements([]);
    } finally {
      setWeeklyLoading(false);
    }
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      void loadPointsStats();
    }, [loadPointsStats])
  );

  const displayName = useMemo(
    () => user?.displayName?.trim() || user?.email?.split('@')[0] || 'Recycler',
    [user],
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{displayName.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.profileHeading}>
          <Text style={styles.eyebrow}>PROFILE</Text>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.subtitle}>Keeping the bins happy since 2026</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{points.toLocaleString()}</Text>
          <Text style={styles.statLabel}>TOTAL POINTS</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{items}</Text>
          <Text style={styles.statLabel}>ITEMS SORTED</Text>
        </View>
      </View>

      <View style={styles.streakCard}>
        <View style={styles.streakSummaryRow}>
          <View style={styles.streakDescription}>
            <Text style={styles.cardTitle}>Current streak</Text>
            <Text style={styles.mutedOnDark}>Keep sorting to unlock the 7-day achievement.</Text>
          </View>
          <View style={styles.streakValueBox}>
            <Text style={styles.streakValue}>{streak}</Text>
            <Text style={styles.streakDays}>days</Text>
          </View>
        </View>

        <View style={styles.weeklyDivider} />
        <View style={styles.weeklyHeading}>
          <Text style={styles.weeklyTitle}>Last 7 days</Text>
          {weeklyActivity.length === 7 && (
            <Text style={styles.weeklySummary}>
              {weeklyActivity.filter((day) => day.completed).length} of 7 active
            </Text>
          )}
        </View>
        {weeklyLoading ? (
          <Text style={styles.weeklySummary}>Loading weekly activity...</Text>
        ) : weeklyActivity.length === 7 ? (
          <View style={styles.weeklyRow}>
            {weeklyActivity.map((day) => {
              const label = new Date(`${day.date}T12:00:00`).toLocaleDateString('en-AU', {
                weekday: 'short',
              });
              return (
                <View
                  key={day.date}
                  style={styles.weeklyDay}
                  accessible
                  accessibilityLabel={`${label}, ${day.completed ? 'sort completed' : 'no sort'}`}
                >
                  <Text style={styles.weeklyDayLabel}>{label}</Text>
                  <View style={[styles.weeklyMarker, day.completed && styles.weeklyMarkerComplete]}>
                    <Text style={styles.weeklyMarkerText}>{day.completed ? '✓' : '–'}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.weeklySummary}>
            {user?.uid ? 'Weekly activity unavailable.' : 'Sign in to view weekly activity.'}
          </Text>
        )}
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <Text style={styles.muted}>Unlocked badges and your next goals.</Text>
        </View>
        <Text style={styles.count}>{achievements.filter((item) => item.achievedAt !== null).length} / {achievements.length}</Text>
      </View>

      <View style={styles.achievementGrid}>
        {achievements.map((achievement) => {
          const unlocked = achievement.achievedAt !== null;
          const handlePress = () =>
            Alert.alert(
              achievement.label,
              unlocked
                ? `${achievement.description}\n\nUnlocked ${new Date(achievement.achievedAt!).toLocaleDateString()}.`
                : `Locked. To unlock: ${achievement.description}`,
            );
          return (
            <Pressable
              key={achievement.achievementId}
              onPress={handlePress}
              style={[styles.achievement, !unlocked && styles.achievementLocked]}
            >
              <View style={[styles.badge, !unlocked && styles.badgeLocked]}>
                <TabBarIcon
                  name={ACHIEVEMENT_ICONS[achievement.achievementId] ?? 'star-outline'}
                  color={unlocked ? colors.textOnDark : palette.gray400}
                  size={24}
                />
                {!unlocked && (
                  <View style={styles.lockBadge}>
                    <TabBarIcon name="lock-closed" color={palette.gray600} size={10} />
                  </View>
                )}
              </View>
              <Text style={[styles.achievementLabel, !unlocked && styles.lockedText]} numberOfLines={2}>
                {achievement.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles.petCard} onPress={() => router.navigate('/pet')}>
        <PetPlaceholder skinId={pet?.equippedSkinId ?? null} size={48} />
        <View style={{ flex: 1 }}>
          <Text style={styles.petCardTitle}>Bin Bin · Lvl {pet ? computeLevel(pet) : 1}</Text>
          <Text style={styles.muted}>
            {pet?.equippedSkinId ? `${SKINS[pet.equippedSkinId].name} equipped` : 'No skin equipped'}
            {' · '}{pet?.unlockedSkinIds.length ?? 0} / {MATERIAL_ORDER.length} skins
          </Text>
        </View>
      </Pressable>

      <Pressable style={[styles.secondaryButton, styles.weekRecapButton]} onPress={() => router.push('/weekly-recap')}>
        <Text style={styles.secondaryButtonText}>Your week in trash</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl + 2,
    backgroundColor: colors.background,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg - 1,
  },
  avatarText: {
    color: colors.textOnDark,
    fontSize: 28,
    fontWeight: '700',
  },
  profileHeading: {
    flex: 1,
  },
  eyebrow: {
    ...typography.eyebrow,
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  name: {
    ...typography.title,
    color: colors.textPrimary,
    marginTop: 1,
  },
  subtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 3,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: border.width,
    borderColor: border.color,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  petCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: border.width,
    borderColor: border.color,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  petCardTitle: {
    ...typography.cardTitle,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 25,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.textSecondary,
    marginTop: 5,
  },
  cardTitle: {
    ...typography.cardTitle,
    fontSize: 16,
    color: colors.textOnDark,
    marginBottom: 2,
  },
  muted: {
    ...typography.small,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  mutedOnDark: {
    ...typography.small,
    lineHeight: 17,
    color: palette.gray400,
  },
  streakCard: {
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.dark,
    marginBottom: spacing.xxl + 1,
  },
  streakSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakDescription: {
    flex: 1,
    marginRight: spacing.md,
  },
  weeklyDivider: {
    height: 1,
    backgroundColor: palette.gray600,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  weeklyHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm + 2,
  },
  weeklyTitle: {
    color: colors.textOnDark,
    fontSize: 12,
    fontWeight: '700',
  },
  weeklySummary: {
    color: palette.gray400,
    fontSize: 10,
  },
  weeklyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weeklyDay: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  weeklyDayLabel: {
    color: palette.gray400,
    fontSize: 10,
  },
  weeklyMarker: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: palette.gray600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weeklyMarkerComplete: {
    backgroundColor: colors.primary,
  },
  weeklyMarkerText: {
    color: colors.textOnDark,
    fontSize: 15,
    fontWeight: '700',
  },
  streakValueBox: {
    alignItems: 'center',
    minWidth: 55,
  },
  streakValue: {
    color: colors.textOnDark,
    fontSize: 28,
    fontWeight: '700',
  },
  streakDays: {
    color: palette.gray400,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.md - 1,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  count: {
    ...typography.small,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm + 2,
  },
  achievement: {
    width: '31.8%',
    minHeight: 118,
    backgroundColor: colors.surface,
    borderWidth: border.width,
    borderColor: border.color,
    borderRadius: radii.lg,
    padding: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementLocked: {
    backgroundColor: palette.gray50,
  },
  badge: {
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  badgeLocked: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: palette.gray200,
    shadowOpacity: 0,
    elevation: 0,
  },
  lockBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: border.width,
    borderColor: border.color,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementLabel: {
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
    fontWeight: '700',
    color: colors.textPrimary,
  },
  lockedText: {
    color: colors.textSecondary,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: border.width,
    borderColor: border.color,
    borderRadius: radii.pill,
    paddingVertical: 13,
    alignItems: 'center',
  },
  weekRecapButton: {
    marginTop: spacing.xl,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
});
