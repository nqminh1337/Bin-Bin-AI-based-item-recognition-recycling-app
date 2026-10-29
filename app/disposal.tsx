import { TabBarIcon } from '@components/TabBarIcon';
import { CouncilGuidelinesSheet, DisposalService, MATERIAL_LABELS, type DisposalInstruction } from '@features/disposal';
import { useZone, ZonePickerModal } from '@features/geolocation';
import { colors, radii, spacing, typography } from '@theme/index';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'no_zone' }
  | { kind: 'no_rule' }
  | { kind: 'error' }
  | { kind: 'ready'; instruction: DisposalInstruction };

// "How to Recycle It Here" (proto screen 04): FR-24 to FR-32.
// Reached from the scan flow with ?itemId=&label=; zone comes from the
// geolocation feature unless overridden via ?zoneId= or the change-location link.
export default function DisposalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ itemId?: string; label?: string; zoneId?: string }>();
  const { zone, status: zoneStatus, setManualZone, useDeviceLocation } = useZone();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [submitting, setSubmitting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);

  const zoneId = params.zoneId ?? zone?.zoneId ?? null;
  const itemId = params.itemId ?? 'unknown';
  const label = params.label ?? params.itemId ?? 'Unknown item';

  useEffect(() => {
    if (!zoneId) {
      if (zoneStatus !== 'loading') setState({ kind: 'no_zone' });
      return;
    }
    let cancelled = false;
    setState({ kind: 'loading' });
    DisposalService.getInstructionsForItem({ itemId, label }, zoneId)
      .then((instruction) => {
        if (cancelled) return;
        setState(instruction ? { kind: 'ready', instruction } : { kind: 'no_rule' });
      })
      .catch(() => !cancelled && setState({ kind: 'error' }));
    return () => {
      cancelled = true;
    };
  }, [itemId, label, zoneId, zoneStatus]);

  // FR-32 (kerbside): "Got it" completes the scan and is the FR-33 points moment.
  const handleGotIt = async () => {
    if (state.kind !== 'ready') return;
    setSubmitting(true);
    try {
      const { pointsAwarded, newlyUnlockedSkin, streakMilestoneDays } = await DisposalService.completeGuidance(state.instruction);
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
      Alert.alert('Something went wrong', 'Your sort was noted but points may not have saved.');
      router.dismissTo('/(tabs)');
    } finally {
      setSubmitting(false);
    }
  };

  // FR-30  Route to the Bin, where FR-73 confirmation lives.
  const handleRoute = () => {
    if (state.kind !== 'ready') return;
    const { instruction } = state;
    router.push({
      pathname: '/route-to-bin',
      params: { itemId: instruction.itemId, label: instruction.itemLabel, zoneId: instruction.zoneId },
    });
  };

  // FR-31
  const handleReport = () => {
    if (state.kind !== 'ready') return;
    const { instruction } = state;
    Alert.alert('Report this guidance', 'Tell us if this rule looks wrong or out of date for your council.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Report',
        onPress: async () => {
          try {
            await DisposalService.reportIncorrectGuidance(instruction);
            Alert.alert('Thanks', 'We’ll review this rule.');
          } catch {
            Alert.alert('Couldn’t send report', 'Please try again later.');
          }
        },
      },
    ]);
  };

  const header = (
    <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back">
        <TabBarIcon name="chevron-back" color={colors.textPrimary} size={22} />
      </Pressable>
      <View style={styles.zonePill}>
        <View style={styles.zoneDot} />
        <Text style={styles.zonePillText} numberOfLines={1}>
          {(zone?.councilName ?? zoneId ?? 'No council').toUpperCase()}
          {zone?.state ? ` · ${zone.state} RULES` : ''}
        </Text>
      </View>
      <View style={styles.backButton} />
    </View>
  );

  if (state.kind === 'loading') {
    const loadingMessage = `Finding ${zone?.councilName ? `${zone.councilName}’s` : 'your local council’s'} guidelines for you`;
    return (
      <View style={styles.screen}>
        {header}
        <View style={styles.center}>
          <Text style={styles.loadingText} accessibilityLabel={`${loadingMessage}…`} accessibilityLiveRegion="polite">
            {loadingMessage}
            <LoadingDots />
          </Text>
        </View>
      </View>
    );
  }

  if (state.kind !== 'ready') {
    const copy = {
      no_zone: ['No council set', 'Choose your council so we can look up local rules.'],
      no_rule: ['No rule found', `We don’t have a disposal rule for “${label}” in this council yet.`],
      error: ['Couldn’t load guidance', 'Check your connection and try again.'],
    }[state.kind];
    return (
      <View style={styles.screen}>
        {header}
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>{copy[0]}</Text>
          <Text style={styles.emptyBody}>{copy[1]}</Text>
          <Pressable
            style={[styles.primary, styles.primaryStretch]}
            onPress={() => (state.kind === 'no_zone' ? setPickerOpen(true) : router.dismissTo('/(tabs)'))}
            accessibilityRole="button"
            accessibilityLabel={state.kind === 'no_zone' ? 'Choose council' : 'Back to home'}
          >
            <Text style={styles.primaryText}>{state.kind === 'no_zone' ? 'Choose council' : 'Back to home'}</Text>
          </Pressable>
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

  const { instruction } = state;
  const dropOff = instruction.nearestDropOff;
  const kerbside = instruction.kerbsideAccepted;

  return (
    <View style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.itemRow}>
          <View style={styles.itemThumb} />
          <View style={styles.itemBody}>
            <Text style={styles.itemLabel}>{instruction.itemLabel}</Text>
            <Text style={styles.itemMeta}>{MATERIAL_LABELS[instruction.material]}</Text>
          </View>
        </View>

        {/* FR-25/26: verdict leads with what NOT to do locally. */}
        <View style={[styles.verdict, kerbside ? styles.verdictYes : styles.verdictNo]}>
          <Text style={styles.eyebrow}>IN YOUR ZONE</Text>
          <Text style={styles.verdictTitle}>
            {kerbside
              ? `Yes, goes in your ${instruction.binLabel.toLowerCase()}.`
              : `Not accepted in kerbside bins: ${MATERIAL_LABELS[instruction.material].toLowerCase()} goes to a ${instruction.binLabel.toLowerCase()} here.`}
          </Text>
        </View>

        {/* FR-27/28 */}
        <View style={styles.card}>
          <Text style={styles.eyebrow}>PREP IT: {instruction.prepSteps.length} STEPS</Text>
          {instruction.prepSteps.map((step, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
          <Text style={styles.reason}>{instruction.reason}</Text>
        </View>

        {/* FR-29: depot row with ROUTE pill. */}
        {!kerbside && (
          <View style={styles.depotRow}>
            <View style={styles.placeThumb}>
              <TabBarIcon name="business-outline" color={colors.textSecondary} size={22} />
            </View>
            <View style={styles.itemBody}>
              {dropOff ? (
                <>
                  <Text style={styles.depotName}>{dropOff.location.name}</Text>
                  <Text style={styles.itemMeta} numberOfLines={2}>
                    {dropOff.distanceKm !== null ? `${dropOff.distanceKm.toFixed(1)} km · ` : ''}
                    {dropOff.location.hours} · takes {MATERIAL_LABELS[instruction.material].toLowerCase()}
                  </Text>
                </>
              ) : (
                <Text style={styles.itemMeta}>No drop-off point listed for this council yet.</Text>
              )}
            </View>
            {dropOff && (
              <Pressable
                style={styles.routePill}
                onPress={handleRoute}
                accessibilityRole="button"
                accessibilityLabel={`Route to ${dropOff.location.name}`}
              >
                <Text style={styles.routePillText}>ROUTE</Text>
              </Pressable>
            )}
          </View>
        )}

        <Pressable style={styles.guidelinesRow} onPress={() => setGuidelinesOpen(true)}>
          <TabBarIcon name="document-text-outline" color={colors.textPrimary} size={18} />
          <Text style={styles.guidelinesText}>Show {zone?.councilName ?? 'council'} guidelines</Text>
          <TabBarIcon name="chevron-forward" color={colors.textMuted} size={16} />
        </Pressable>

        {/* FR-31 */}
        <Pressable style={styles.reportButton} onPress={handleReport} hitSlop={8} accessibilityRole="button">
          <TabBarIcon name="flag-outline" color={colors.textSecondary} size={16} />
          <Text style={styles.reportText}>Report an issue with this guidance</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        {kerbside || !dropOff ? (
          <Pressable
            style={[styles.primary, submitting && styles.disabled]}
            onPress={handleGotIt}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel="Got it"
            accessibilityState={{ disabled: submitting, busy: submitting }}
          >
            {submitting ? <ActivityIndicator color={colors.textOnDark} /> : <Text style={styles.primaryText}>Got it</Text>}
          </Pressable>
        ) : (
          <Pressable style={styles.primary} onPress={handleRoute} accessibilityRole="button" accessibilityLabel="Show me the bin">
            <Text style={styles.primaryText}>Show me the bin</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => setPickerOpen(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="I'm somewhere else, change location"
        >
          <Text style={styles.footerLink}>I’m somewhere else, change location</Text>
        </Pressable>
      </View>

      <ZonePickerModal
        visible={pickerOpen}
        currentZoneId={zone?.zoneId ?? null}
        onSelect={(z) => {
          setManualZone(z);
          // Drop any ?zoneId= override so the freshly chosen council applies.
          router.setParams({ zoneId: undefined });
        }}
        onUseDeviceLocation={async () => {
          const result = await useDeviceLocation();
          if (result.kind === 'found') router.setParams({ zoneId: undefined });
          return result;
        }}
        onClose={() => setPickerOpen(false)}
      />
      <CouncilGuidelinesSheet zoneId={guidelinesOpen ? instruction.zoneId : null} onClose={() => setGuidelinesOpen(false)} />
    </View>
  );
}

/** One step per dot lighting up, plus a beat with none lit before it repeats. */
const DOT_STEPS = 4;

// "..." whose dots light up in turn, like a shine passing over them. Nested
// Text so the dots wrap with the sentence; static when Reduce Motion is on.
function LoadingDots() {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = setInterval(() => setStep((s) => (s + 1) % DOT_STEPS), 320);
    return () => clearInterval(timer);
  }, [reduceMotion]);

  const dotColor = (i: number) => {
    if (reduceMotion) return colors.textSecondary;
    if (i === step) return colors.primary;
    return i === step - 1 ? colors.textSecondary : colors.textMuted;
  };

  return (
    <Text style={styles.loadingDots}>
      {[0, 1, 2].map((i) => (
        <Text key={i} style={{ color: dotColor(i) }}>.</Text>
      ))}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.md },
  loadingText: { ...typography.body, fontSize: 15, fontWeight: '600', color: colors.textPrimary, textAlign: 'center' },
  loadingDots: { fontWeight: '800', letterSpacing: 2 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  backButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  zonePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  zoneDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  zonePillText: { ...typography.eyebrow, fontSize: 10, letterSpacing: 1.2, color: colors.textSecondary, flexShrink: 1 },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  itemThumb: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: colors.border },
  placeThumb: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  itemBody: { flex: 1, gap: 2 },
  itemLabel: { ...typography.cardTitle, color: colors.textPrimary },
  itemMeta: { ...typography.caption, color: colors.textSecondary },

  eyebrow: { ...typography.eyebrow, fontSize: 10, letterSpacing: 1.4, color: colors.textMuted },
  verdict: { borderRadius: radii.lg, padding: spacing.lg, gap: spacing.xs, borderWidth: 1 },
  verdictYes: { backgroundColor: colors.surface, borderColor: colors.primary },
  verdictNo: { backgroundColor: colors.surface, borderColor: colors.dark },
  verdictTitle: { ...typography.body, fontWeight: '700', lineHeight: 22, color: colors.textPrimary },

  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md },
  step: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  stepNumber: {
    width: 24, height: 24, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.textPrimary,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumberText: { ...typography.small, fontWeight: '700', color: colors.textPrimary },
  stepText: { flex: 1, ...typography.body, fontSize: 15, lineHeight: 21, color: colors.textPrimary },
  reason: { ...typography.caption, fontSize: 13, lineHeight: 19, color: colors.textSecondary, marginTop: spacing.xs },

  depotRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md,
  },
  depotName: { ...typography.label, fontSize: 15, color: colors.textPrimary },
  routePill: { borderWidth: 1, borderColor: colors.textPrimary, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2 },
  routePillText: { ...typography.eyebrow, fontSize: 10, letterSpacing: 1.2, color: colors.textPrimary },

  guidelinesRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md,
  },
  guidelinesText: { ...typography.label, fontSize: 15, color: colors.textPrimary, flex: 1 },
  reportButton: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: spacing.xs,
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  reportText: { ...typography.label, color: colors.textSecondary },

  footer: { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background },
  footerLink: { ...typography.caption, textAlign: 'center', color: colors.textSecondary },
  primary: { backgroundColor: colors.dark, borderRadius: radii.pill, paddingVertical: 16, alignItems: 'center' },
  primaryStretch: { alignSelf: 'stretch' },
  primaryText: { ...typography.body, fontWeight: '600', color: colors.textOnDark },
  disabled: { opacity: 0.6 },
  emptyTitle: { ...typography.cardTitle, color: colors.textPrimary },
  emptyBody: { ...typography.body, fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
});
