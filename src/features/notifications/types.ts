/**
 * Domain types for the notifications feature: local reminders for
 * collection days and rule updates, plus the user's on/off preference.
 */

export type NotificationType = 'collection_day' | 'rule_update';

export interface ScheduledNotification {
  notificationId: string;
  type: NotificationType;
  title: string;
  body: string;
  scheduledFor: string;
  zoneId: string | null;
}

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';
