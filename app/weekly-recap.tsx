import { MATERIAL_LABEL, MATERIAL_ORDER } from '@features/gamification/pet';
import { useZone } from '@features/geolocation';
import { formatWeekRange, getRankChange, ProfileService, type WeeklyRecap } from '@features/profile';
import { useAuthSession } from '@services/useAuthSession';
import { border, colors, palette, radii, spacing, typography } from '@theme/index';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

type LoadState = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; recap: WeeklyRecap };

// Weekly Recap (proto screen 12). FR-56/57/58.
export default function WeeklyRecapScreen() {
  const { user } = useAuthSession();
  const { zone } = useZone();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const load = useCallback(() => {
    if (!user) return;
    setState({ kind: 'loading' });
    const displayName = user.displayName ?? user.email ?? 'Recycler';
    ProfileService.getWeeklyRecap(user.uid, zone?.zoneId ?? null, displayName)
      .then((recap) => setState({ kind: 'ready', recap }))
      .catch(() => setState({ kind: 'error' }));
  }, [user, zone?.zoneId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleShare = () => {
    if (state.kind !== 'ready') return;
    const { recap } = state;
    const change = getRankChange(recap.rankStart, recap.rankEnd);
    const rankLine = recap.rankEnd !== null ? `Rank #${recap.rankEnd}${change ? (change > 0 ? ` (up ${change})` : change < 0 ? ` (down ${-change})` : '') : ''}. ` : '';
    Share.share({
      message: `My week in trash: ${recap.itemsSorted} items sorted, ${recap.pointsEarned} points. ${rankLine}♻️ Bin Bin`,
    }).catch(() => {});
  };

  if (state.kind === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (state.kind === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Couldn’t load your recap. Check your connection and try again.</Text>
        <Pressable style={styles.retry} onPress={load} accessibilityRole="button" accessibilityLabel="Try again">
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const { recap } = state;
  const change = getRankChange(recap.rankStart, recap.rankEnd);
  const fed = MATERIAL_ORDER.filter((m) => (recap.byMaterial[m] ?? 0) > 0).sort(
    (a, b) => (recap.byMaterial[b] ?? 0) - (recap.byMaterial[a] ?? 0),
  );
  const maxFed = Math.max(1, ...fed.map((m) => recap.byMaterial[m] ?? 0));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back">
        <Text style={styles.backText}>‹ Back</Text>
      </Pressable>

      <Text style={styles.eyebrow}>LAST WEEK · {formatWeekRange(recap.weekStartDate)}</Text>
      <Text style={styles.title}>Your week in trash</Text>

      <View style={styles.statsCard}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{recap.itemsSorted}</Text>
          <Text style={styles.statLabel}>ITEMS SORTED</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{recap.pointsEarned}</Text>
          <Text style={styles.statLabel}>POINTS</Text>
        </View>
        <View style={styles.stat}>
          <View style={styles.rankRow}>
            <Text style={styles.statValue}>{recap.rankEnd ?? '–'}</Text>
            {change ? (
              <Text style={styles.delta}>{change > 0 ? `▲${change}` : `▼${-change}`}</Text>
            ) : null}
          </View>
          <Text style={styles.statLabel}>RANK</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Fed to Bin Bin</Text>
        {fed.length === 0 ? (
          <Text style={styles.muted}>Nothing sorted this week. Scan an item to start feeding Bin Bin.</Text>
        ) : (
          fed.map((m) => (
            <View key={m} style={styles.feedRow}>
              <Text style={styles.feedName}>{MATERIAL_LABEL[m]}</Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${((recap.byMaterial[m] ?? 0) / maxFed) * 100}%` }]} />
              </View>
              <Text style={styles.feedCount}>{recap.byMaterial[m]}</Text>
            </View>
          ))
        )}
      </View>

      <Pressable style={styles.primary} onPress={handleShare} accessibilityRole="button" accessibilityLabel="Share recap">
        <Text style={styles.primaryText}>Share recap</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.background, padding: spacing.xl },
  container: { flexGrow: 1, padding: spacing.xl, paddingBottom: spacing.xxxl, backgroundColor: colors.background, gap: spacing.lg },
  backButton: { alignSelf: 'flex-start', paddingVertical: 20, paddingRight: spacing.md },
  backText: { ...typography.label, color: colors.textPrimary },
  eyebrow: { ...typography.eyebrow, color: colors.textSecondary },
  title: { ...typography.title, color: colors.textPrimary, marginTop: -4 },
  statsCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.surface, borderWidth: border.width, borderColor: border.color, borderRadius: radii.xl, padding: spacing.lg },
  stat: { gap: spacing.xs },
  rankRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  statValue: { fontSize: 28, fontWeight: '700', color: colors.textPrimary },
  statLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1, color: colors.textSecondary },
  delta: { fontSize: 11, fontWeight: '700', color: colors.accent },
  card: { backgroundColor: colors.surface, borderWidth: border.width, borderColor: border.color, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.md },
  sectionTitle: { ...typography.sectionTitle, color: colors.textPrimary },
  feedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  feedName: { width: 90, fontSize: 13, color: colors.textPrimary },
  track: { flex: 1, height: 7, borderRadius: radii.pill, backgroundColor: palette.gray200, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.accent },
  feedCount: { width: 26, textAlign: 'right', fontSize: 11, color: colors.textSecondary },
  muted: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
  primary: { backgroundColor: colors.dark, borderRadius: radii.pill, paddingVertical: 16, alignItems: 'center' },
  primaryText: { ...typography.body, fontWeight: '600', color: colors.textOnDark },
  retry: { borderWidth: border.width, borderColor: border.color, borderRadius: radii.pill, paddingVertical: 10, paddingHorizontal: spacing.lg },
  retryText: { ...typography.label, color: colors.textPrimary },
});
