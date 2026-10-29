import { TabBarIcon } from '@components/TabBarIcon';
import { colors, radii, spacing, typography } from '@theme/index';
import { useRef } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCouncilGuideline } from '../data/councilGuidelines';
import type { CouncilGuideline, OrganicsService } from '../types';

interface CouncilGuidelinesSheetProps {
  /** null = closed */
  zoneId: string | null;
  onClose: () => void;
}

const ORGANICS_LABEL: Record<OrganicsService, string> = {
  fogo: 'FOOD SCRAPS COLLECTED',
  fogo_planned: 'FOOD SCRAPS: COMING SOON',
  garden_only: 'GARDEN WASTE ONLY',
};

const FREQUENCY_LABEL = { weekly: 'Weekly', fortnightly: 'Fortnightly' } as const;

// "Show guidelines": the council's bins, how often they go out, local tips,
// and links out to the council's own guide and bin-day lookup.
export function CouncilGuidelinesSheet({ zoneId, onClose }: CouncilGuidelinesSheetProps) {
  const insets = useSafeAreaInsets();
  const guideline = zoneId ? getCouncilGuideline(zoneId) : null;
  // Keep showing the last council while the sheet slides closed.
  const last = useRef<CouncilGuideline | null>(guideline);
  if (guideline) last.current = guideline;
  const shown = last.current;

  return (
    <Modal visible={!!zoneId} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerBody}>
              <Text style={styles.eyebrow}>COUNCIL GUIDELINES</Text>
              <Text style={styles.name}>{shown?.councilName ?? 'No guidelines yet'}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
              <TabBarIcon name="close" color={colors.textSecondary} size={22} />
            </Pressable>
          </View>

          {!shown ? (
            <Text style={styles.body}>We don’t have guidelines for this council yet. Check your council’s website for its bin rules.</Text>
          ) : (
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
              <View style={styles.pill}>
                <Text style={styles.pillText}>{ORGANICS_LABEL[shown.organics]}</Text>
              </View>
              {shown.organicsNote && <Text style={styles.caption}>{shown.organicsNote}</Text>}

              <View style={styles.section}>
                <Text style={styles.eyebrow}>YOUR BINS</Text>
                {shown.bins.map((bin) => (
                  <View key={bin.stream + bin.label} style={styles.binRow}>
                    <View style={[styles.lid, { backgroundColor: bin.lidColor }]} />
                    <View style={styles.headerBody}>
                      <Text style={styles.binLabel}>{bin.label}</Text>
                      {bin.note && <Text style={styles.caption}>{bin.note}</Text>}
                    </View>
                    <Text style={[styles.frequency, !bin.frequency && styles.frequencyUnknown]}>
                      {bin.frequency ? FREQUENCY_LABEL[bin.frequency] : 'See calendar'}
                    </Text>
                  </View>
                ))}
              </View>

              {shown.tips.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.eyebrow}>GOOD TO KNOW</Text>
                  {shown.tips.map((tip) => (
                    <View key={tip} style={styles.tipRow}>
                      <View style={styles.bullet} />
                      <Text style={styles.tipText}>{tip}</Text>
                    </View>
                  ))}
                </View>
              )}

              <Text style={styles.footnote}>
                Frequencies are for a standard house. Checked {new Date(shown.checkedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}.
              </Text>
            </ScrollView>
          )}

          {shown && (
            <View style={styles.actions}>
              <Pressable style={styles.primary} onPress={() => Linking.openURL(shown.guideUrl).catch(() => {})} accessibilityRole="link">
                <TabBarIcon name="open-outline" color={colors.textOnDark} size={18} />
                <Text style={styles.primaryText}>Open council guide</Text>
              </Pressable>
              <Pressable style={styles.secondary} onPress={() => Linking.openURL(shown.binDayUrl).catch(() => {})} accessibilityRole="link">
                <TabBarIcon name="calendar-outline" color={colors.textPrimary} size={18} />
                <Text style={styles.secondaryText}>Find my bin day</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: {
    maxHeight: '85%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  headerBody: { flex: 1, gap: 2 },
  name: { ...typography.cardTitle, color: colors.textPrimary },
  // Shrinks to fit, so a long council entry scrolls instead of pushing the link buttons off screen.
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { gap: spacing.lg },

  pill: { alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.textPrimary, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  pillText: { ...typography.eyebrow, fontSize: 10, letterSpacing: 1.2, color: colors.textPrimary },

  section: { gap: spacing.sm },
  eyebrow: { ...typography.eyebrow, fontSize: 10, letterSpacing: 1.4, color: colors.textMuted },
  body: { ...typography.body, fontSize: 15, color: colors.textPrimary },
  caption: { ...typography.caption, fontSize: 13, lineHeight: 19, color: colors.textSecondary },

  binRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.background, borderRadius: radii.md, padding: spacing.md },
  lid: { width: 22, height: 22, borderRadius: radii.sm },
  binLabel: { ...typography.label, color: colors.textPrimary },
  frequency: { ...typography.label, color: colors.textPrimary },
  frequencyUnknown: { color: colors.textMuted, fontWeight: '400' },

  tipRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  bullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.textSecondary, marginTop: 8 },
  tipText: { flex: 1, ...typography.body, fontSize: 14, lineHeight: 20, color: colors.textPrimary },
  footnote: { ...typography.small, color: colors.textMuted },

  actions: { gap: spacing.sm },
  primary: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.dark, borderRadius: radii.pill, paddingVertical: 16 },
  primaryText: { ...typography.body, fontWeight: '600', color: colors.textOnDark },
  secondary: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.textPrimary, borderRadius: radii.pill, paddingVertical: 14 },
  secondaryText: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
});
