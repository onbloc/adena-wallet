import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

// Hides sensitive content once the app leaves the foreground, so the app-switcher snapshot cannot show it.
// Stays hidden until the user reveals it again.
export const useHideWhenInactive = (): { hidden: boolean; reveal: () => void } => {
  const [hidden, setHidden] = useState(() => AppState.currentState === 'inactive' || AppState.currentState === 'background');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'inactive' || state === 'background') {
        setHidden(true);
      }
    });

    return (): void => subscription.remove();
  }, []);

  const reveal = useCallback(() => setHidden(false), []);

  return { hidden, reveal };
};
