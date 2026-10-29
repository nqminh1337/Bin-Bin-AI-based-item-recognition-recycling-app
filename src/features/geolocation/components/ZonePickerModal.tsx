import { TabBarIcon } from '@components/TabBarIcon';
import { colors, radii, spacing, typography } from '@theme/index';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GeolocationService } from '../GeolocationService';
import type { CouncilZone } from '../types';
import type { DeviceZoneResult } from '../useZone';

interface ZonePickerModalProps {
  visible: boolean;
  currentZoneId: string | null;
  onSelect: (zone: CouncilZone) => void;
  onUseDeviceLocation: () => Promise<DeviceZoneResult>;
  onClose: () => void;
}

type LocateState = { kind: 'idle' } | { kind: 'locating' } | DeviceZoneResult;

/** How long "You're in X" stays up before the picker closes itself. */
const FOUND_CLOSE_DELAY_MS = 1500;

// FR-22: search/select a council. Selection is applied by the caller
// (useZone.setManualZone) so it takes effect immediately and persists (FR-23).
// "Use my location" stays open while it works and says what it found (or why
// it couldn't), so the tap never disappears without feedback.
export function ZonePickerModal({
  visible,
  currentZoneId,
  onSelect,
  onUseDeviceLocation,
  onClose,
}: ZonePickerModalProps) {
  const [search, setSearch] = useState('');
  const [locate, setLocate] = useState<LocateState>({ kind: 'idle' });
  const results = useMemo(() => GeolocationService.searchZones(search), [search]);

  // Bumped per lookup and on every open, so a slow lookup from an earlier
  // opening can't overwrite the current state.
  const attempt = useRef(0);
  // Callers pass a fresh onClose each render; don't let that restart the timer below.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Start fresh on every open and close.
  useEffect(() => {
    attempt.current++;
    setLocate({ kind: 'idle' });
  }, [visible]);

  // Leave "You're in X" on screen long enough to read, then close.
  useEffect(() => {
    if (locate.kind !== 'found') return;
    const timer = setTimeout(() => onCloseRef.current(), FOUND_CLOSE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [locate]);

  const handleUseLocation = async () => {
    if (locate.kind === 'locating' || locate.kind === 'found') return;
    if (locate.kind === 'permission_denied') {
      // Once denied, asking again won't show the prompt; Settings is the way back.
      Linking.openSettings().catch(() => {});
      return;
    }
    // Android can switch location on from a dialog, then carry straight on; iOS goes to Settings.
    if (locate.kind === 'services_off' && !(await GeolocationService.fixAccess('services_off'))) return;
    const id = ++attempt.current;
    setLocate({ kind: 'locating' });
    const result = await onUseDeviceLocation().catch((): DeviceZoneResult => ({ kind: 'error' }));
    if (id === attempt.current) setLocate(result);
  };

  let locateIcon: React.ReactNode = <TabBarIcon name="locate" color={colors.primary} size={20} />;
  let locateTitle = 'Use my location';
  let locateSubtitle = 'Detect council from GPS';
  let failed = false;
  switch (locate.kind) {
    case 'locating':
      locateIcon = <ActivityIndicator size="small" color={colors.primary} />;
      locateSubtitle = 'Finding your council…';
      break;
    case 'found':
      locateIcon = <TabBarIcon name="checkmark-circle" color={colors.primary} size={20} />;
      locateTitle = `You’re in ${locate.zone.councilName}`;
      locateSubtitle = `${locate.zone.state} · now using your location`;
      break;
    case 'not_found':
      failed = true;
      locateSubtitle = 'Couldn’t match your location to a council. Pick yours below.';
      break;
    case 'permission_denied':
      failed = true;
      locateSubtitle = 'Location is off for Bin Bin. Tap to open Settings, or pick below.';
      break;
    case 'services_off':
      failed = true;
      locateSubtitle =
        Platform.OS === 'android'
          ? 'Your phone’s location is switched off. Tap to turn it on, or pick below.'
          : 'Location Services are off. Turn them on in Settings › Privacy & Security, or pick below.';
      break;
    case 'error':
      failed = true;
      locateSubtitle = 'Couldn’t get your location. Check GPS is on and tap to try again.';
      break;
  }
  if (failed) locateIcon = <TabBarIcon name="alert-circle-outline" color={colors.danger} size={20} />;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose your council</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>Done</Text>
          </Pressable>
        </View>

        <TextInput
          style={styles.search}
          placeholder="Search council, suburb or state"
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="words"
          clearButtonMode="while-editing"
        />

        <Pressable
          style={[styles.row, styles.locationRow, locate.kind === 'found' && styles.locationRowFound]}
          onPress={handleUseLocation}
          disabled={locate.kind === 'locating' || locate.kind === 'found'}
          accessibilityRole="button"
        >
          <View style={styles.locationIcon}>{locateIcon}</View>
          <View style={styles.rowBody} accessibilityLiveRegion="polite">
            <Text style={styles.rowTitle}>{locateTitle}</Text>
            <Text style={[styles.rowSubtitle, failed && styles.rowSubtitleError]}>{locateSubtitle}</Text>
          </View>
        </Pressable>

        <FlatList
          data={results}
          keyExtractor={(z) => z.zoneId}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={styles.empty}>No councils match “{search}”.</Text>}
          renderItem={({ item }) => {
            const selected = item.zoneId === currentZoneId;
            return (
              <Pressable
                style={[styles.row, selected && styles.rowSelected]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{item.councilName}</Text>
                  <Text style={styles.rowSubtitle}>{item.state}</Text>
                </View>
                {selected && <TabBarIcon name="checkmark" color={colors.primary} size={20} />}
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { ...typography.sectionTitle, color: colors.textPrimary },
  close: { ...typography.label, fontSize: 16, color: colors.primary },
  search: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  locationRow: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderBottomWidth: 0,
    borderWidth: 1,
    borderColor: colors.surface,
    marginBottom: spacing.sm,
  },
  locationRowFound: { borderColor: colors.primary },
  locationIcon: { width: 20, alignItems: 'center' },
  rowSelected: { backgroundColor: colors.surface, borderRadius: radii.md },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { ...typography.body, fontWeight: '500', color: colors.textPrimary },
  rowSubtitle: { ...typography.caption, color: colors.textSecondary },
  rowSubtitleError: { color: colors.danger },
  empty: { ...typography.body, fontSize: 14, textAlign: 'center', color: colors.textSecondary, padding: spacing.xxl },
});
