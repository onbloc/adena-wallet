import { useCallback, useSyncExternalStore } from 'react';

import { useContainer } from '../di/container-provider';
import { Preferences } from '../repositories/preference.repository';

type PreferenceKey = Exclude<keyof Preferences, 'biometricUnlockEnabled'>;

// Live value of one preference; re-renders whenever it changes through PreferenceService.
export const usePreference = <K extends PreferenceKey>(key: K): Preferences[K] => {
  const { preferenceService } = useContainer();
  const subscribe = useCallback((listener: () => void) => preferenceService.subscribe(listener), [preferenceService]);
  const getSnapshot = useCallback(() => preferenceService.get()[key], [key, preferenceService]);

  return useSyncExternalStore(subscribe, getSnapshot);
};
