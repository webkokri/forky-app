import { isRunningInExpoGo } from 'expo';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from '@/api';

type NotificationsModule = typeof import('expo-notifications');

/**
 * expo-notifications needs native code that some Expo Go builds don't contain (importing it then throws
 * "Cannot find native module …"). It is therefore loaded lazily and everything here degrades quietly:
 * without it the app still shows order updates as in-app banners (see RealtimeProvider).
 */
let mod: NotificationsModule | null | undefined;
export function notifications(): NotificationsModule | null {
  if (mod !== undefined) return mod;
  // Expo Go (the preview app) lacks parts of this module — never even attempt to load it there (nor on web, where it only logs warnings). Installed builds have it.
  // `isRunningInExpoGo()` is the same test expo-notifications itself uses; the executionEnvironment check is kept as a second signal.
  if (Platform.OS === 'web' || isRunningInExpoGo() || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    mod = null;
    return mod;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m = require('expo-notifications') as NotificationsModule;
    m.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
    });
    mod = m;
  } catch {
    mod = null;
  }
  return mod;
}

const CHANNEL = 'orders';

async function ensureChannel(N: NotificationsModule) {
  if (Platform.OS !== 'android') return;
  await N.setNotificationChannelAsync(CHANNEL, {
    name: 'Order updates',
    importance: N.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 150, 250],
    lightColor: '#FF6819',
  }).catch(() => {});
}

/** Asks for notification permission once (returns whether it is granted). */
export async function askNotificationPermission(): Promise<boolean> {
  const N = notifications();
  if (!N) return false;
  try {
    await ensureChannel(N);
    const cur = await N.getPermissionsAsync();
    if (cur.granted) return true;
    if (!cur.canAskAgain) return false;
    return (await N.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

const shown = new Set<string>();

/** Shows a phone notification right now. Returns false when the notifications module is unavailable (the caller then shows an in-app banner). */
export async function showLocalNotification(n: { key?: string; title: string; body?: string; data?: Record<string, unknown> }): Promise<boolean> {
  const N = notifications();
  if (!N) return false;
  if (n.key) {
    if (shown.has(n.key)) return true;
    shown.add(n.key);
    if (shown.size > 200) shown.clear();
  }
  try {
    await ensureChannel(N);
    await N.scheduleNotificationAsync({
      content: { title: n.title, body: n.body, data: n.data ?? {}, sound: 'default', ...(Platform.OS === 'android' ? { channelId: CHANNEL } : {}) },
      trigger: null,
    });
    return true;
  } catch {
    return false;
  }
}

/** Listen for taps on notifications (opens the order). Returns an unsubscribe function. */
export function onNotificationTap(fn: (data: { orderId?: string } | undefined) => void): () => void {
  const N = notifications();
  if (!N) return () => {};
  try {
    const sub = N.addNotificationResponseReceivedListener((r) => fn(r.notification.request.content.data as { orderId?: string } | undefined));
    return () => sub.remove();
  } catch {
    return () => {};
  }
}

/**
 * Registers this phone for background push. The server sends through Firebase Cloud Messaging, so this needs the
 * Android build to include the Firebase config (google-services.json); without it the call fails quietly and
 * notifications still arrive in real time while the app is open or recently used.
 */
export async function registerForPush(): Promise<boolean> {
  const N = notifications();
  if (!N || Platform.OS !== 'android' || !Device.isDevice) return false;
  try {
    if (!(await askNotificationPermission())) return false;
    const t = await N.getDevicePushTokenAsync();
    if (typeof t.data !== 'string' || !t.data) return false;
    await api.registerDevice({ token: t.data, platform: 'android', app: 'customer', appVersion: Constants.expoConfig?.version });
    return true;
  } catch {
    return false;
  }
}
