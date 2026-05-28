/**
 * Order Reminder — local push notifications via expo-notifications.
 *
 * Schedules an optional "dinner reminder" notification so the user gets
 * prompted at the right meal time rather than forgetting to order.
 *
 * Permissions are requested on first use. If the user declines, the
 * function resolves silently without scheduling.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Notification handler must be set at module level (once, on app start) in
// _layout.tsx — this file only creates/cancels scheduled notifications.

const CHANNEL_ID = 'mealbuddy_reminders';
const STORAGE_KEY_PREFIX = 'mealbuddy_reminder_';

// ── Permission helper ─────────────────────────────────────────────────────────

async function ensurePermission(): Promise<boolean> {
  // Android 8+ needs a channel first before the permission prompt appears
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'MealBuddy Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250],
    });
  }

  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;

  const { status: requested } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true },
  });
  return requested === 'granted';
}

// ── Compute next meal trigger ─────────────────────────────────────────────────

/**
 * Returns a Date for the next dinner slot (6:30 PM today or tomorrow).
 * If current time is already past 6:30 PM, schedules for tomorrow.
 */
function nextDinnerDate(): Date {
  const now = new Date();
  const candidate = new Date(now);
  candidate.setHours(18, 30, 0, 0);
  if (candidate.getTime() <= now.getTime() + 5 * 60 * 1000) {
    // Already past (or within 5 min) — push to tomorrow
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Schedules a "tonight's order" reminder notification.
 * Returns the notification identifier, or null if permission was denied.
 */
export async function scheduleOrderReminder(
  food: string,
  restaurantName: string,
  platform: string,
): Promise<string | null> {
  try {
    const granted = await ensurePermission();
    if (!granted) return null;

    const triggerDate = nextDinnerDate();

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🍽️ ${food.charAt(0).toUpperCase() + food.slice(1)} ka time!`,
        body: `MealBuddy found ${restaurantName} on ${platform}. Ready to order?`,
        data: { food, restaurantName, platform },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
    });

    return identifier;
  } catch {
    return null;
  }
}

/**
 * Cancels a previously scheduled reminder by its identifier.
 */
export async function cancelOrderReminder(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // no-op — reminder may have already fired
  }
}

/**
 * Returns a human-readable string for when the reminder is set.
 * e.g. "Today at 6:30 PM" or "Tomorrow at 6:30 PM"
 */
export function getReminderLabel(date: Date = nextDinnerDate()): string {
  const now = new Date();
  const isToday = date.getDate() === now.getDate();
  const hh = date.getHours() % 12 || 12;
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
  return `${isToday ? 'Today' : 'Tomorrow'} at ${hh}:${mm} ${ampm}`;
}

export { nextDinnerDate };
