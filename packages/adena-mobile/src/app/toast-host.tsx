import React, { ReactElement, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingNavigationOffset, Toast } from '../components/molecules';
import { HapticKind } from '../domain/haptics';
import { useHaptics } from '../hooks/use-haptics';
import { useToastStore } from '../stores/toast.store';
import { sizes, spacing } from '../theme';

const TOAST_DURATION_MS = 3000;

export const ToastHost = (): ReactElement | null => {
  const { toast, dismiss } = useToastStore();
  const insets = useSafeAreaInsets();
  const playHaptic = useHaptics();

  // Success toasts confirm completed actions (send, copy, save), so they share one success haptic.
  useEffect(() => {
    if (toast?.tone === 'success') {
      playHaptic(HapticKind.SUCCESS);
    }
  }, [playHaptic, toast]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = setTimeout(dismiss, TOAST_DURATION_MS);

    return (): void => clearTimeout(timer);
  }, [dismiss, toast]);

  if (!toast) {
    return null;
  }

  return (
    <View pointerEvents='box-none' style={[styles.host, { bottom: getFloatingNavigationOffset(insets.bottom) + sizes.bottomNavigation + spacing.space8 }]}>
      <Toast key={toast.id} message={toast.message} tone={toast.tone} onDismiss={dismiss} />
    </View>
  );
};

const styles = StyleSheet.create({
  host: { position: 'absolute', left: sizes.screenInset, right: sizes.screenInset },
});
