import { DisposalService, HubMap } from '@features/disposal';
import { PointsService } from '@features/gamification/points';
import { GeolocationService, useZone, ZonePickerModal, type ZoneStatus } from '@features/geolocation';
import { useAuthSession } from '@services/useAuthSession';
import { colors, radii, spacing, typography } from '@theme/index';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STATUS_COPY: Record<Exclude<ZoneStatus, 'resolved' | 'manual'>, string> = {
  loading: 'Finding council…',
  not_found: 'Council not found',
  permission_denied: 'Location off',
  services_off: 'GPS off',
  error: 'Location error',
};

// No council and no GPS: say why, and offer a way forward instead of an empty map.
const NO_ZONE_COPY: Partial<Record<ZoneStatus, { title: string; body: string; fix?: string }>> = {
  permission_denied: {
    title: 'Location is off for Bin Bin',
    body: 'Choose your council to see its hubs and bin rules, or allow location to find hubs near you.',
    fix: 'Open Settings',
  },
  services_off: {
    title: 'Your phone’s location is off',
    body: 'Choose your council to see its hubs and bin rules, or turn location on to find hubs near you.',
    fix: Platform.OS === 'android' ? 'Turn on location' : 'Open Settings',
  },
  not_found: {
    title: 'We couldn’t place you in a council',
    body: 'Choose your council to see its hubs and bin rules.',
  },
  error: {
    title: 'Couldn’t get your location',
    body: 'GPS may still be searching. Try again, or choose your council.',
    fix: 'Try again',
  },
};

// Home / Map tab (proto screen 01): stats pinned above a full-bleed map.
// FR-66: points balance and streak.
// FR-21/22: council chip in the search bar; tap to change.
// FR-67/68/69/70: hub search, pins, nearest-hub card, hub details (HubMap).
// FR-74/75: bag button on the map for items saved for a later drop-off.
export default function HomeScreen() {
  const { user } = useAuthSession();
  const { zone, status, setManualZone, useDeviceLocation } = useZone();
  const insets = useSafeAreaInsets();

  const [pickerOpen, setPickerOpen] = useState(false);

  const [pointsBalance, setPointsBalance] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [pointsLoading, setPointsLoading] = useState(true);
  const [pointsError, setPointsError] = useState<string | null>(null);
  const [stashCount, setStashCount] = useState(0);

  const userId = user?.uid ?? null;
  const noZone = zone ? null : NO_ZONE_COPY[status];

  const fixLocation = async () => {
    const access = await GeolocationService.getAccess().catch(() => 'ok' as const);
    if (await GeolocationService.fixAccess(access)) await useDeviceLocation();
  };

  // Back from Settings with location now allowed: find the council without another tap.
  useEffect(() => {
    if (zone || (status !== 'permission_denied' && status !== 'services_off')) return;
    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'active' && (await GeolocationService.getAccess().catch(() => null)) === 'ok') void useDeviceLocation();
    });
    return () => sub.remove();
  }, [zone, status, useDeviceLocation]);

  const loadPointsSummary = useCallback(async () => {
    if (!userId) {
      setPointsBalance(0);
      setStreakDays(0);
      setPointsLoading(false);
      return;
    }

    try {
      setPointsLoading(true);
      setPointsError(null);

      const [balance, streak] = await Promise.all([
        PointsService.getBalance(userId),
        PointsService.getStreak(userId),
      ]);

      setPointsBalance(balance);
      setStreakDays(streak.currentStreakDays);
    } catch (error) {
      console.error('Failed to load Home points summary:', error);
      setPointsError('Unable to load points and streak.');
    } finally {
      setPointsLoading(false);
    }
  }, [userId]);

  // Refresh whenever Home becomes the active tab so newly-awarded
  // points and streak changes appear without restarting the app.
  // The stash count refreshes too: a confirmed drop-off removes its item.
  useFocusEffect(
    useCallback(() => {
      void loadPointsSummary();
      void DisposalService.getStash().then((stash) => setStashCount(stash.length));
    }, [loadPointsSummary])
  );

  const councilChip = (
    <Pressable
      style={styles.councilChip}
      onPress={() => setPickerOpen(true)}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`Council: ${zone ? zone.councilName : STATUS_COPY[status as keyof typeof STATUS_COPY]}. Change location`}
    >
      <View style={[styles.councilDot, !zone && styles.councilDotOff]} />
      <Text style={styles.councilText} numberOfLines={1}>
        {zone ? zone.councilName : STATUS_COPY[status as keyof typeof STATUS_COPY]}
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* FR-66: points balance and recycling streak. */}
      <View style={[styles.statsRow, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>POINTS</Text>
          <Text style={styles.statValue}>{pointsLoading ? '-' : pointsBalance.toLocaleString()}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>STREAK</Text>
          <Text style={styles.statValue}>
            {pointsLoading ? '-' : streakDays}
            <Text style={styles.statUnit}> {streakDays === 1 ? 'day' : 'days'}</Text>
          </Text>
        </View>
      </View>

      {pointsError && <Text style={styles.pointsError}>{pointsError}</Text>}

      <View style={styles.mapWrap}>
        <HubMap
          zoneId={zone?.zoneId ?? null}
          searchAccessory={councilChip}
          stashCount={stashCount}
          onStashPress={() => router.push('/stash')}
        />
        {noZone && (
          <View style={styles.noZoneCard}>
            <Text style={styles.noZoneTitle}>{noZone.title}</Text>
            <Text style={styles.noZoneBody}>{noZone.body}</Text>
            <View style={styles.noZoneActions}>
              <Pressable style={styles.noZonePrimary} onPress={() => setPickerOpen(true)} accessibilityRole="button">
                <Text style={styles.noZonePrimaryText}>Choose council</Text>
              </Pressable>
              {noZone.fix && (
                <Pressable style={styles.noZoneSecondary} onPress={fixLocation} accessibilityRole="button">
                  <Text style={styles.noZoneSecondaryText}>{noZone.fix}</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </View>

      <ZonePickerModal
        visible={pickerOpen}
        currentZoneId={zone?.zoneId ?? null}
        onSelect={setManualZone}
        onUseDeviceLocation={useDeviceLocation}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  statLabel: { ...typography.eyebrow, fontSize: 10, color: colors.textMuted },
  statValue: { ...typography.sectionTitle, marginTop: spacing.xs, color: colors.textPrimary },
  statUnit: { ...typography.caption, color: colors.textSecondary, fontWeight: '400' },

  pointsError: { ...typography.caption, color: colors.danger, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },

  mapWrap: { flex: 1 },

  noZoneCard: {
    position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.lg,
    backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.xs,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  noZoneTitle: { ...typography.label, fontSize: 15, color: colors.textPrimary },
  noZoneBody: { ...typography.caption, lineHeight: 19, color: colors.textSecondary },
  noZoneActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  noZonePrimary: { flex: 1, alignItems: 'center', backgroundColor: colors.dark, borderRadius: radii.pill, paddingVertical: 12 },
  noZonePrimaryText: { ...typography.label, color: colors.textOnDark },
  noZoneSecondary: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: colors.textPrimary, borderRadius: radii.pill, paddingVertical: 11 },
  noZoneSecondaryText: { ...typography.label, color: colors.textPrimary },

  councilChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    maxWidth: 150,
    backgroundColor: colors.background,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  councilDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  councilDotOff: { backgroundColor: colors.textMuted },
  councilText: { ...typography.small, fontWeight: '600', color: colors.textPrimary },
});
