import { TabBarIcon } from '@components/TabBarIcon';
import { formatDistance } from '@features/geolocation';
import { colors, radii, spacing, typography } from '@theme/index';
import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DisposalService } from '../DisposalService';
import { DROP_OFF_KINDS } from '../data/dropOffKinds';
import { CouncilGuidelinesSheet } from './CouncilGuidelinesSheet';
import { MATERIAL_LABELS } from '../data/materialCatalog';
import type { DropOffKind, DropOffLocation } from '../types';

interface HubDetailSheetProps {
  /** null = closed */
  hub: DropOffLocation | null;
  distanceKm: number | null;
  onClose: () => void;
}

// FR-70: hours and accepted materials for a hub, opened from its pin or card.
export function HubDetailSheet({ hub, distanceKm, onClose }: HubDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  // Keep showing the last hub while the sheet slides closed.
  const last = useRef({ hub, distanceKm });
  if (hub) last.current = { hub, distanceKm };
  const shown = last.current;
  const kind = shown.hub ? (DROP_OFF_KINDS[shown.hub.kind] as (typeof DROP_OFF_KINDS)[DropOffKind] | undefined) : undefined;

  return (
    <Modal visible={!!hub} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        {shown.hub && (
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <View style={styles.placeThumb}>
                <TabBarIcon name="business-outline" color={colors.textSecondary} size={22} />
              </View>
              <View style={styles.headerBody}>
                <Text style={styles.name}>{shown.hub.name}</Text>
                <Text style={styles.meta}>
                  {shown.distanceKm !== null ? `${formatDistance(shown.distanceKm * 1000)} away · ` : ''}
                  {shown.hub.address}
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
                <TabBarIcon name="close" color={colors.textSecondary} size={22} />
              </Pressable>
            </View>

            {/* What sort of place this is. Optional-chained: docs seeded before `kind` existed lack it. */}
            {(kind || (shown.hub.pointsMultiplier ?? 1) > 1) && (
              <View style={styles.pills}>
                {kind && (
                  <View style={styles.kindPill}>
                    <Text style={styles.kindPillText}>{kind.label.toUpperCase()}</Text>
                  </View>
                )}
                {(shown.hub.pointsMultiplier ?? 1) > 1 && (
                  <View style={styles.multiplier}>
                    <Text style={styles.multiplierText}>{shown.hub.pointsMultiplier}× POINTS TODAY</Text>
                  </View>
                )}
              </View>
            )}
            {kind && <Text style={styles.blurb}>{kind.blurb}</Text>}

            <View style={styles.section}>
              <Text style={styles.eyebrow}>HOURS</Text>
              <Text style={styles.body}>{shown.hub.hours}</Text>
            </View>

            {shown.hub.note && (
              <View style={styles.section}>
                <Text style={styles.eyebrow}>GOOD TO KNOW</Text>
                <Text style={styles.body}>{shown.hub.note}</Text>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.eyebrow}>ACCEPTS</Text>
              <View style={styles.chips}>
                {shown.hub.acceptedMaterials.map((m) => (
                  <View key={m} style={styles.chip}>
                    <Text style={styles.chipText}>{MATERIAL_LABELS[m]}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* FR-30: hand off to the device's map app. */}
            <Pressable
              style={styles.primary}
              onPress={() => {
                if (shown.hub) DisposalService.openDirections(shown.hub).catch(() => {});
              }}
              accessibilityRole="button"
              accessibilityLabel="Directions"
            >
              <TabBarIcon name="navigate" color={colors.textOnDark} size={18} />
              <Text style={styles.primaryText}>Directions</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={() => setGuidelinesOpen(true)}>
              <TabBarIcon name="document-text-outline" color={colors.textPrimary} size={18} />
              <Text style={styles.secondaryText}>Show guidelines</Text>
            </Pressable>
          </View>
        )}
      </View>
      {/* Nested inside this Modal so it stacks on top on iOS. */}
      <CouncilGuidelinesSheet zoneId={guidelinesOpen && hub ? hub.zoneId : null} onClose={() => setGuidelinesOpen(false)} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border },

  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  placeThumb: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  headerBody: { flex: 1, gap: 2 },
  name: { ...typography.cardTitle, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary },

  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: -spacing.sm },
  kindPill: { borderWidth: 1, borderColor: colors.textPrimary, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  kindPillText: { ...typography.eyebrow, fontSize: 10, letterSpacing: 1.2, color: colors.textPrimary },
  blurb: { ...typography.caption, fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  multiplier: { alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  multiplierText: { ...typography.eyebrow, fontSize: 10, letterSpacing: 1.2, color: colors.textOnDark },

  section: { gap: spacing.sm },
  eyebrow: { ...typography.eyebrow, fontSize: 10, letterSpacing: 1.4, color: colors.textMuted },
  body: { ...typography.body, fontSize: 15, color: colors.textPrimary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: colors.background, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2 },
  chipText: { ...typography.label, color: colors.textPrimary },

  primary: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dark,
    borderRadius: radii.pill,
    paddingVertical: 16,
  },
  primaryText: { ...typography.body, fontWeight: '600', color: colors.textOnDark },
  secondary: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.textPrimary,
    borderRadius: radii.pill,
    paddingVertical: 14,
    marginTop: -spacing.sm,
  },
  secondaryText: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
});
