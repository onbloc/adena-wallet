import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { useContainer } from '../di/container-provider';
import { NotificationPermission, NotificationSettings } from '../domain/notification';

// Live notification settings plus the OS permission, re-read when the app returns to the foreground
// (the user may have changed it in the system settings).
export const useNotificationSettings = (): { settings: NotificationSettings; permission: NotificationPermission | null; refreshPermission: () => void } => {
  const { notificationService } = useContainer();
  const subscribe = useCallback((listener: () => void) => notificationService.subscribe(listener), [notificationService]);
  // Serialized so the snapshot stays referentially stable between renders.
  const getSnapshot = useCallback(() => JSON.stringify(notificationService.getSettings()), [notificationService]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);
  const settings = useMemo(() => JSON.parse(snapshot) as NotificationSettings, [snapshot]);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);

  const refreshPermission = useCallback(() => {
    notificationService.getPermission().then(setPermission, () => setPermission(NotificationPermission.UNAVAILABLE));
  }, [notificationService]);

  useEffect(() => {
    refreshPermission();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshPermission();
      }
    });

    return (): void => subscription.remove();
  }, [refreshPermission]);

  return { settings, permission, refreshPermission };
};
