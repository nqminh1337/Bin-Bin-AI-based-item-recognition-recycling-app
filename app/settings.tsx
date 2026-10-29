import { TabBarIcon } from '@components/TabBarIcon';
import { useZone, ZonePickerModal } from '@features/geolocation';
import { AuthService } from '@services/AuthService';
import { border, colors, radii, spacing, typography } from '@theme/index';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface SettingsRow {
  icon: React.ComponentProps<typeof TabBarIcon>['name'];
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
}

// Settings hub, reached from the gear icon on Profile. Keeps account-level
// actions (notifications, council, sign out) out of the Profile scroll body.
export default function SettingsScreen() {
  const router = useRouter();
  const { zone, setManualZone, useDeviceLocation } = useZone();
  const [pickerOpen, setPickerOpen] = useState(false);

  const rows: SettingsRow[] = [
    {
      icon: 'notifications-outline',
      title: 'Notifications',
      subtitle: 'Collection reminders and disposal rule updates',
      onPress: () => router.push('/notifications'),
    },
    {
      icon: 'location-outline',
      title: 'Council / location',
      subtitle: zone ? zone.councilName : 'No council set',
      onPress: () => setPickerOpen(true),
    },
    {
      icon: 'log-out-outline',
      title: 'Sign out',
      onPress: () => AuthService.signOut(),
      danger: true,
    },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} contentInsetAdjustmentBehavior="automatic">
        {rows.map((row) => (
          <Pressable key={row.title} style={styles.row} onPress={row.onPress} accessibilityRole="button" accessibilityLabel={row.title}>
            <View style={[styles.iconWrap, row.danger && styles.iconWrapDanger]}>
              <TabBarIcon name={row.icon} color={row.danger ? colors.danger : colors.textPrimary} size={20} />
            </View>
            <View style={styles.rowBody}>
              <Text style={[styles.rowTitle, row.danger && styles.rowTitleDanger]}>{row.title}</Text>
              {row.subtitle ? (
                <Text style={styles.rowSubtitle} numberOfLines={1}>
                  {row.subtitle}
                </Text>
              ) : null}
            </View>
            {!row.danger && <TabBarIcon name="chevron-forward" color={colors.textMuted} size={18} />}
          </Pressable>
        ))}
      </ScrollView>

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
  screen: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: spacing.xl, gap: spacing.md, backgroundColor: colors.background },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: border.width,
    borderColor: border.color,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDanger: { backgroundColor: colors.background },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { ...typography.label, color: colors.textPrimary },
  rowTitleDanger: { color: colors.danger },
  rowSubtitle: { ...typography.caption, color: colors.textSecondary },
});
