import AsyncStorage from '@react-native-async-storage/async-storage';
import { ASYNC_STORAGE_KEYS } from '@utils/constants';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as NotificationsModule from 'expo-notifications';
import { Platform } from 'react-native';
import type { NotificationPermissionStatus, NotificationType, ScheduledNotification } from './types';

// Local-only notifications (no backend/FCM push token flow). FR-60 "affected
// users receive a notification" is implemented as: whichever client calls
// scheduleRuleUpdateAlert() (e.g. after DisposalService.reportIncorrectGuidance
// resolves, or an admin re-seeds a rule) gets a local notification. There's
// no server watching for rule changes and fanning this out to other users'
// devices; that would need a push backend, out of scope for this prototype.

// Expo Go on Android ships without expo-notifications' push native modules
// (removed in SDK 53), and merely importing the package there crashes the app
// on launch ("Cannot find native module 'ExpoTopicSubscriptionModule'"). So
// the package is only loaded on first use, and never in Android Expo Go,
// where notifications are unavailable. iOS Expo Go and dev builds are unaffected.
const isAndroidExpoGo =
  Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const UNAVAILABLE_MESSAGE = 'Notifications aren’t available in Expo Go on Android. Use a development build.';

let notificationsModule: typeof NotificationsModule | null = null;

function loadNotifications(): typeof NotificationsModule | null {
  if (isAndroidExpoGo) return null;
  if (!notificationsModule) {
    notificationsModule = require('expo-notifications') as typeof NotificationsModule;
    notificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  }
  return notificationsModule;
}

function requireNotifications(): typeof NotificationsModule {
  const Notifications = loadNotifications();
  if (!Notifications) throw new Error(UNAVAILABLE_MESSAGE);
  return Notifications;
}

const COLLECTION_CHANNEL = 'collection-reminders';
const RULE_UPDATE_CHANNEL = 'rule-updates';

// FR-59: how long before the collection date the reminder fires.
const COLLECTION_REMINDER_LEAD_HOURS = 18; // ~6pm the evening before a morning collection

let channelsReady = false;

function toPermissionStatus(status: NotificationsModule.PermissionStatus): NotificationPermissionStatus {
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

export class NotificationService {
  /** False in Android Expo Go, where every scheduling call throws UNAVAILABLE_MESSAGE. */
  static readonly isAvailable = !isAndroidExpoGo;

  private static async ensureChannels(): Promise<void> {
    if (channelsReady || Platform.OS !== 'android') return;
    const Notifications = requireNotifications();
    await Notifications.setNotificationChannelAsync(COLLECTION_CHANNEL, {
      name: 'Collection reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.setNotificationChannelAsync(RULE_UPDATE_CHANNEL, {
      name: 'Disposal rule updates',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    channelsReady = true;
  }

  static async requestPermission(): Promise<NotificationPermissionStatus> {
    const Notifications = requireNotifications();
    const existing = await Notifications.getPermissionsAsync();
    if (existing.status === Notifications.PermissionStatus.GRANTED) return 'granted';
    const requested = await Notifications.requestPermissionsAsync();
    await NotificationService.ensureChannels();
    return toPermissionStatus(requested.status);
  }

  static async getPermissionStatus(): Promise<NotificationPermissionStatus> {
    const Notifications = loadNotifications();
    if (!Notifications) return 'denied';
    const current = await Notifications.getPermissionsAsync();
    return toPermissionStatus(current.status);
  }

  /** FR-61: persisted on/off choice, independent of OS permission status. */
  static async isPushEnabled(): Promise<boolean> {
    const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.PUSH_NOTIFICATIONS_ENABLED);
    return raw === 'true';
  }

  static async setPushEnabled(enabled: boolean): Promise<void> {
    if (enabled) requireNotifications();
    await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.PUSH_NOTIFICATIONS_ENABLED, String(enabled));
    if (enabled) {
      const status = await NotificationService.requestPermission();
      if (status !== 'granted') {
        // Permission refused at the OS level; don't silently claim success.
        await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.PUSH_NOTIFICATIONS_ENABLED, 'false');
        throw new Error('Notification permission was not granted.');
      }
    } else {
      await loadNotifications()?.cancelAllScheduledNotificationsAsync();
    }
  }

  // FR-59
  static async scheduleCollectionReminder(zoneId: string, forDate: string): Promise<ScheduledNotification> {
    if (!(await NotificationService.isPushEnabled())) {
      throw new Error('Push notifications are turned off.');
    }
    const Notifications = requireNotifications();
    await NotificationService.ensureChannels();

    const collectionAt = new Date(forDate);
    // iOS throws (NSInternalInconsistencyException) if the trigger date has already
    // passed — e.g. tapping this after 1pm, when the 18h lead time for a 7am
    // collection already fell in the past. Clamp so it always fires shortly.
    const leadFireAt = collectionAt.getTime() - COLLECTION_REMINDER_LEAD_HOURS * 60 * 60 * 1000;
    const fireAt = new Date(Math.max(leadFireAt, Date.now() + 5000));
    const title = 'Collection day tomorrow';
    const body = 'Bins go out tonight — check what your zone takes before you sort.';

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { type: 'collection_day' satisfies NotificationType, zoneId } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt, channelId: COLLECTION_CHANNEL },
    });

    return { notificationId, type: 'collection_day', title, body, scheduledFor: fireAt.toISOString(), zoneId };
  }

  // FR-60
  static async scheduleRuleUpdateAlert(zoneId: string, message: string): Promise<ScheduledNotification> {
    if (!(await NotificationService.isPushEnabled())) {
      throw new Error('Push notifications are turned off.');
    }
    const Notifications = requireNotifications();
    await NotificationService.ensureChannels();

    const title = 'Disposal guidance updated';
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: { title, body: message, data: { type: 'rule_update' satisfies NotificationType, zoneId } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: RULE_UPDATE_CHANNEL },
    });

    return { notificationId, type: 'rule_update', title, body: message, scheduledFor: new Date().toISOString(), zoneId };
  }

  static async cancelNotification(notificationId: string): Promise<void> {
    await loadNotifications()?.cancelScheduledNotificationAsync(notificationId);
  }

  static async listScheduled(type?: NotificationType): Promise<ScheduledNotification[]> {
    const Notifications = loadNotifications();
    if (!Notifications) return [];
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled
      .filter((n) => !type || n.content.data?.type === type)
      .map((n) => ({
        notificationId: n.identifier,
        type: (n.content.data?.type as NotificationType) ?? 'rule_update',
        title: n.content.title ?? '',
        body: n.content.body ?? '',
        scheduledFor:
          n.trigger && 'value' in n.trigger ? new Date(n.trigger.value as number).toISOString() : new Date().toISOString(),
        zoneId: (n.content.data?.zoneId as string) ?? null,
      }));
  }
}
