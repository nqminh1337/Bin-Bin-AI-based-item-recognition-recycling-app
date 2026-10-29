import { TabBarIcon } from '@components/TabBarIcon';
import {
  DisposalService,
  MapCanvas,
  MATERIAL_LABELS,
  useWalkingRoute,
  WALKING_SPEED_MPS,
  type DisposalInstruction,
  type ManeuverIcon,
  type MapPin,
} from '@features/disposal';
import { formatDistance, haversineKm } from '@features/geolocation';
import { colors, radii, spacing, typography } from '@theme/index';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'ready'; instruction: DisposalInstruction };

const MANEUVER_ICONS: Record<ManeuverIcon, React.ComponentProps<typeof TabBarIcon>['name']> = {
  depart: 'navigate',
  arrive: 'flag',
  left: 'arrow-back',
  right: 'arrow-forward',
  straight: 'arrow-up',
  uturn: 'arrow-undo',
  roundabout: 'sync',
};

// "Route to the Bin" (proto screen 05): depot-only items.
// FR-71: turn-by-turn walking directions (next-turn card + full step list).
// FR-72: ETA and distance, kept current as the user walks.
// FR-30: MAPS hands off to the device's map app.
// FR-73: points are awarded here, on "I dropped it off", and nowhere earlier.
// FR-74/75: "Save for later" stashes the item until drop-off is confirmed.
export default function RouteToBinScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { itemId, label, zoneId } = useLocalSearchParams<{ itemId: string; label?: string; zoneId: string }>();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    if (!itemId || !zoneId) {
      setState({ kind: 'error' });
      return;
    }
    let cancelled = false;
    DisposalService.getInstructionsForItem({ itemId, label: label ?? itemId }, zoneId)
      .then((instruction) => {
        if (cancelled) return;
        setState(instruction && !instruction.kerbsideAccepted && instruction.nearestDropOff
          ? { kind: 'ready', instruction }
          : { kind: 'error' });
      })
      .catch(() => !cancelled && setState({ kind: 'error' }));
    return () => {
      cancelled = true;
    };
  }, [itemId, label, zoneId]);

  const location = state.kind === 'ready' ? state.instruction.nearestDropOff!.location : null;
  const { status, here, route, progress } = useWalkingRoute(location, location?.name ?? '');

  const pins = useMemo<MapPin[]>(
    () => (location ? [{ id: location.locationId, coordinate: { latitude: location.latitude, longitude: location.longitude }, label: location.name }] : []),
    [location]
  );

  const handleConfirm = () => {
    if (state.kind !== 'ready') return;
    const { instruction } = state;
    Alert.alert('Confirm drop-off', `Did you drop the ${instruction.itemLabel.toLowerCase()} at ${instruction.nearestDropOff!.location.name}?`, [
      { text: 'Not yet', style: 'cancel' },
      {
        text: 'Yes, I dropped it off',
        onPress: async () => {
          setBusy(true);
          try {
            const { pointsAwarded, newlyUnlockedSkin, streakMilestoneDays } = await DisposalService.confirmDropOff(instruction);
            if (pointsAwarded > 0) {
              router.replace({
                pathname: '/points-awarded',
                params: {
                  points: String(pointsAwarded),
                  ...(newlyUnlockedSkin ? { skinId: newlyUnlockedSkin } : {}),
                  ...(streakMilestoneDays ? { milestoneDays: String(streakMilestoneDays) } : {}),
                },
              });
            } else {
              router.dismissTo('/(tabs)');
            }
          } catch {
            Alert.alert('Couldn’t save', 'Check your connection and try again.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleSaveForLater = async () => {
    if (state.kind !== 'ready') return;
    setBusy(true);
    try {
      await DisposalService.saveForLater(state.instruction);
      Alert.alert('Saved to your stash', 'No points yet. Tap the bag on the map when you get there, then confirm the drop-off.', [
        { text: 'OK', onPress: () => router.dismissTo('/(tabs)') },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const topBar = (title?: string, subtitle?: string) => (
    <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back">
        <TabBarIcon name="chevron-back" color={colors.textPrimary} size={22} />
      </Pressable>
      <View style={styles.topBarBody}>
        {title && <Text style={styles.topTitle} numberOfLines={1}>{title}</Text>}
        {subtitle && <Text style={styles.topSubtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>
    </View>
  );

  if (state.kind === 'loading') {
    return (
      <View style={styles.screen}>
        {topBar()}
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  if (state.kind === 'error' || !location) {
    return (
      <View style={styles.screen}>
        {topBar('Nothing to route')}
        <View style={styles.center}>
          <Text style={styles.emptyBody}>This item doesn’t need a drop-off, or we couldn’t find a depot for it.</Text>
          <Pressable style={[styles.primary, styles.primaryStretch]} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back">
            <Text style={styles.primaryText}>Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const { instruction } = state;
  const material = MATERIAL_LABELS[instruction.material].toLowerCase();
  const arrived = progress?.arrived ?? false;

  // FR-72: follow the route when there is one; otherwise straight-line from
  // wherever we last saw the user (or the disposal screen's estimate).
  const remainingM =
    progress?.remainingM ??
    (here ? haversineKm(here, location) * 1000 : instruction.nearestDropOff!.distanceKm !== null ? instruction.nearestDropOff!.distanceKm * 1000 : null);
  const etaS = progress?.etaS ?? (remainingM !== null ? remainingM / WALKING_SPEED_MPS : null);

  // FR-71: next-turn card.
  const nextStep = route && progress ? route.steps[progress.nextStepIndex] : null;
  let turnIcon: React.ComponentProps<typeof TabBarIcon>['name'] = 'navigate';
  let turnTitle = `Head to ${location.name}`;
  let turnSubtitle = location.address;
  if (arrived) {
    turnIcon = 'flag';
    turnTitle = 'You’ve arrived';
    turnSubtitle = `Drop it in the ${instruction.binLabel.toLowerCase()}`;
  } else if (nextStep && progress) {
    turnIcon = MANEUVER_ICONS[nextStep.icon];
    turnTitle = nextStep.instruction;
    turnSubtitle = progress.distanceToNextM < 15 ? 'Now' : `In ${formatDistance(progress.distanceToNextM)}`;
  } else if (status === 'locating' || status === 'routing') {
    turnSubtitle = 'Finding a walking route…';
  } else if (status === 'unavailable') {
    turnSubtitle = 'Couldn’t load turn-by-turn directions, use MAPS instead';
  } else if (status === 'no_location') {
    turnSubtitle = 'Turn on location for turn-by-turn directions';
  }

  return (
    <View style={styles.screen}>
      {topBar(location.name, `${instruction.binLabel} · ${material} only · ${location.hours}`)}

      <View style={styles.content}>
        <Pressable
          style={styles.turnCard}
          onPress={() => route && setShowSteps((v) => !v)}
          disabled={!route}
          accessibilityRole="button"
          accessibilityLabel={`${turnTitle}. ${turnSubtitle}`}
          accessibilityHint={route ? (showSteps ? 'Show map' : 'Show step list') : undefined}
        >
          <View style={styles.turnIcon}>
            <TabBarIcon name={turnIcon} color={colors.textOnDark} size={20} />
          </View>
          <View style={styles.turnBody}>
            <Text style={styles.turnTitle} numberOfLines={2}>{turnTitle}</Text>
            <Text style={styles.turnSubtitle} numberOfLines={2}>{turnSubtitle}</Text>
          </View>
          {route && (
            <View style={styles.stepsToggle}>
              <TabBarIcon name={showSteps ? 'map-outline' : 'list'} color={colors.textOnDark} size={18} />
            </View>
          )}
        </Pressable>

        <View style={styles.mapWrap}>
          {showSteps && route ? (
            <ScrollView contentContainerStyle={styles.stepList}>
              <Text style={styles.eyebrow}>DIRECTIONS · {route.steps.length} STEPS</Text>
              {route.steps.map((step, i) => {
                const done = !!progress && (arrived || i < progress.nextStepIndex);
                const next = !!progress && !arrived && i === progress.nextStepIndex;
                return (
                  <View key={i} style={[styles.stepRow, next && styles.stepRowNext]}>
                    <TabBarIcon name={MANEUVER_ICONS[step.icon]} color={done ? colors.textMuted : colors.textPrimary} size={18} />
                    <Text style={[styles.stepText, done && styles.stepTextDone]}>{step.instruction}</Text>
                    {step.distanceM > 0 && <Text style={styles.stepDistance}>{formatDistance(step.distanceM)}</Text>}
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <MapCanvas pins={pins} here={here} path={route?.path} selectedId={location.locationId} />
          )}
        </View>

        {/* FR-72: live ETA + distance. */}
        <View style={styles.etaCard}>
          <View style={styles.etaBlock}>
            <Text style={styles.etaValue}>
              {arrived ? 'Here' : etaS !== null ? `${Math.max(1, Math.round(etaS / 60))} min` : '-'}
            </Text>
            <Text style={styles.etaLabel}>
              {remainingM === null
                ? 'distance unavailable'
                : `${formatDistance(remainingM)} · ${route ? 'walking' : 'straight line'}`}
            </Text>
          </View>
          <View style={styles.etaDivider} />
          <View style={[styles.etaBlock, { flex: 1.3 }]}>
            <Text style={styles.etaBin}>Drop in the {instruction.binLabel.toLowerCase()}</Text>
            <Text style={styles.etaLabel} numberOfLines={2}>{instruction.prepSteps.join(' · ')}</Text>
          </View>
          <Pressable
            style={styles.mapsPill}
            onPress={() => DisposalService.openDirections(location).catch(() => {})}
            accessibilityRole="button"
            accessibilityLabel="Open in Maps"
          >
            <Text style={styles.mapsPillText}>MAPS</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.primary, busy && styles.disabled]}
          onPress={handleConfirm}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="I dropped it off"
          accessibilityState={{ disabled: busy, busy }}
        >
          {busy ? <ActivityIndicator color={colors.textOnDark} /> : <Text style={styles.primaryText}>I dropped it off</Text>}
        </Pressable>
        <Pressable
          onPress={handleSaveForLater}
          disabled={busy}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Save for later, add to my stash"
        >
          <Text style={styles.footerLink}>Save for later · add to my stash</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.md },
  content: { flex: 1, padding: spacing.lg, gap: spacing.md },

  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: spacing.xs },
  backButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  topBarBody: { flex: 1 },
  topTitle: { ...typography.cardTitle, color: colors.textPrimary },
  topSubtitle: { ...typography.caption, color: colors.textSecondary },

  turnCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.dark, borderRadius: radii.lg, padding: spacing.lg },
  turnIcon: { width: 40, height: 40, borderRadius: radii.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' },
  turnBody: { flex: 1, gap: 2 },
  turnTitle: { ...typography.body, fontWeight: '700', color: colors.textOnDark },
  turnSubtitle: { ...typography.caption, color: 'rgba(255,255,255,0.75)' },
  stepsToggle: { width: 32, height: 32, borderRadius: radii.pill, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },

  mapWrap: { flex: 1, borderRadius: radii.lg, overflow: 'hidden', backgroundColor: colors.surface },
  stepList: { padding: spacing.lg, gap: spacing.xs },
  eyebrow: { ...typography.eyebrow, fontSize: 10, letterSpacing: 1.4, color: colors.textMuted, marginBottom: spacing.xs },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radii.md },
  stepRowNext: { backgroundColor: colors.background },
  stepText: { flex: 1, ...typography.body, fontSize: 15, color: colors.textPrimary },
  stepTextDone: { color: colors.textMuted },
  stepDistance: { ...typography.caption, color: colors.textSecondary },

  etaCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg },
  etaBlock: { flex: 1, gap: 2 },
  etaDivider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.divider },
  etaValue: { ...typography.sectionTitle, color: colors.textPrimary },
  etaLabel: { ...typography.caption, color: colors.textSecondary },
  etaBin: { ...typography.label, color: colors.textPrimary },
  mapsPill: { borderWidth: 1, borderColor: colors.textPrimary, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2 },
  mapsPillText: { ...typography.eyebrow, fontSize: 10, letterSpacing: 1.2, color: colors.textPrimary },

  footer: { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background },
  footerLink: { ...typography.caption, textAlign: 'center', color: colors.textSecondary },
  primary: { backgroundColor: colors.dark, borderRadius: radii.pill, paddingVertical: 16, alignItems: 'center' },
  primaryStretch: { alignSelf: 'stretch' },
  primaryText: { ...typography.body, fontWeight: '600', color: colors.textOnDark },
  disabled: { opacity: 0.6 },
  emptyBody: { ...typography.body, fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
});
