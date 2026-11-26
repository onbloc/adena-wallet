import { getApps } from '@react-native-firebase/app';
import {
  AuthorizationStatus,
  deleteToken,
  getMessaging,
  getToken,
  hasPermission,
  isAutoInitEnabled,
  onMessage,
  onTokenRefresh,
  requestPermission,
  setAutoInitEnabled,
} from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';

import { NotificationPermission } from '../../domain/notification';
import { PushMessaging, UNAVAILABLE_PUSH_MESSAGING } from '../../services/notification.service';

const fromAuthorization = (status: number): NotificationPermission => {
  switch (status) {
    case AuthorizationStatus.AUTHORIZED:
    case AuthorizationStatus.PROVISIONAL:
    case AuthorizationStatus.EPHEMERAL:
      return NotificationPermission.GRANTED;
    case AuthorizationStatus.DENIED:
      return NotificationPermission.DENIED;
    default:
      return NotificationPermission.NOT_DETERMINED;
  }
};

const ANDROID_RUNTIME_PERMISSION_API = 33;

// Android 13+ needs POST_NOTIFICATIONS at runtime; FCM's requestPermission does not prompt there.
const requestAndroidPermission = async (): Promise<void> => {
  if (Platform.OS === 'android' && Number(Platform.Version) >= ANDROID_RUNTIME_PERMISSION_API) {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }
};

// FCM on both platforms. Without google-services.json / GoogleService-Info.plist no default app
// exists, and push stays unavailable instead of throwing.
export const createFirebasePushMessaging = (): PushMessaging => {
  if (getApps().length === 0) {
    return { ...UNAVAILABLE_PUSH_MESSAGING, platform: Platform.OS === 'android' ? 'android' : 'ios' };
  }

  const messaging = getMessaging();

  return {
    platform: Platform.OS === 'android' ? 'android' : 'ios',
    getPermission: async () => fromAuthorization(await hasPermission(messaging)),
    requestPermission: async (): Promise<NotificationPermission> => {
      await requestAndroidPermission();
      return fromAuthorization(await requestPermission(messaging));
    },
    // Auto-init is off in firebase.json, so no FCM id is created before the user opts in.
    getToken: async (): Promise<string> => {
      if (!isAutoInitEnabled(messaging)) {
        await setAutoInitEnabled(messaging, true);
      }

      return getToken(messaging);
    },
    deleteToken: async (): Promise<void> => {
      await deleteToken(messaging);
      await setAutoInitEnabled(messaging, false);
    },
    onTokenRefresh: listener => onTokenRefresh(messaging, listener),
    onForegroundMessage: (listener): (() => void) => onMessage(messaging, (message) => {
      const data: Record<string, string> = {};

      Object.entries(message.data ?? {}).forEach(([key, value]) => {
        if (typeof value === 'string') {
          data[key] = value;
        }
      });
      listener({ title: message.notification?.title, body: message.notification?.body, data });
    }),
  };
};
