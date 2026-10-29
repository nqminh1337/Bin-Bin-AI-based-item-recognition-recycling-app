import { NotificationService, UNAVAILABLE_MESSAGE, type ScheduledNotification } from '@features/notifications';
import { useZone } from '@features/geolocation';
import { border, colors, radii, spacing, typography } from '@theme/index';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

// Notifications settings (FR-59/61 Should, FR-60 Could).
export default function NotificationsScreen() {
  const { zone } = useZone();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [scheduled, setScheduled] = useState<ScheduledNotification[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [isEnabled, list] = await Promise.all([
        NotificationService.isPushEnabled(),
        NotificationService.listScheduled(),
      ]);
      setEnabled(isEnabled);
      setScheduled(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (next: boolean) => {
    setBusy(true);
    try {
      await NotificationService.setPushEnabled(next);
      setEnabled(next);
      if (!next) setScheduled([]);
    } catch {
      Alert.alert('Permission needed', 'Enable notifications for Bin Bin in your device settings, then try again.');
    } finally {
      setBusy(false);
    }
  };

  // FR-59: in the full app this is scheduled automatically once a zone's
  // collection schedule is known; this button demonstrates/tests the flow
  // until that trigger exists.
  const handleScheduleReminder = async () => {
    if (!zone) {
      Alert.alert('No zone set', 'Set your council zone on the Map tab first.');
      return;
    }
    const nextCollection = new Date();
    nextCollection.setDate(nextCollection.getDate() + 1);
    nextCollection.setHours(7, 0, 0, 0);
    setBusy(true);
    try {
      await NotificationService.scheduleCollectionReminder(zone.zoneId, nextCollection.toISOString());
      await load();
    } catch (e) {
      Alert.alert('Couldn’t schedule reminder', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async (notificationId: string) => {
    await NotificationService.cancelNotification(notificationId);
    load();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} contentInsetAdjustmentBehavior="automatic">
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Push notifications</Text>
          <Text style={styles.muted}>
            {NotificationService.isAvailable ? 'Collection-day reminders and disposal rule updates.' : UNAVAILABLE_MESSAGE}
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={handleToggle}
          disabled={busy || !NotificationService.isAvailable}
          accessibilityLabel="Push notifications"
          accessibilityRole="switch"
        />
      </View>

      {enabled && (
        <>
          <Pressable
            style={styles.secondaryButton}
            onPress={handleScheduleReminder}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Schedule tomorrow's collection reminder"
            accessibilityState={{ disabled: busy, busy }}
          >
            <Text style={styles.secondaryButtonText}>Schedule tomorrow’s collection reminder</Text>
          </Pressable>

          <Text style={styles.sectionTitle}>Scheduled</Text>
          {scheduled.length === 0 ? (
            <Text style={styles.muted}>Nothing scheduled yet.</Text>
          ) : (
            scheduled.map((n) => (
              <View key={n.notificationId} style={styles.scheduledRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{n.title}</Text>
                  <Text style={styles.muted}>{new Date(n.scheduledFor).toLocaleString()}</Text>
                </View>
                <Pressable
                  onPress={() => handleCancel(n.notificationId)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Cancel ${n.title}`}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  container: { flexGrow: 1, padding: spacing.xl, gap: spacing.lg, backgroundColor: colors.background },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderWidth: border.width, borderColor: border.color, borderRadius: radii.lg, padding: spacing.lg },
  rowTitle: { ...typography.label, color: colors.textPrimary },
  muted: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  sectionTitle: { ...typography.sectionTitle, color: colors.textPrimary, marginTop: spacing.md },
  secondaryButton: { backgroundColor: colors.surface, borderWidth: border.width, borderColor: border.color, borderRadius: radii.pill, paddingVertical: 13, alignItems: 'center' },
  secondaryButtonText: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  scheduledRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderWidth: border.width, borderColor: border.color, borderRadius: radii.lg, padding: spacing.lg },
  cancelText: { color: colors.danger, fontSize: 12, fontWeight: '700' },
});
