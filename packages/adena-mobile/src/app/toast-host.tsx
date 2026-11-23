import React, { ReactElement, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Toast } from '../components/molecules';
import { useToastStore } from '../stores/toast.store';
import { sizes } from '../theme';

const TOAST_DURATION_MS = 3000;

export const ToastHost = (): ReactElement | null => {
  const { toast, dismiss } = useToastStore();
  const insets = useSafeAreaInsets();

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
    <View pointerEvents='box-none' style={[styles.host, { bottom: insets.bottom + sizes.bottomNavigation }]}>
      <Toast key={toast.id} message={toast.message} tone={toast.tone} onDismiss={dismiss} />
    </View>
  );
};

const styles = StyleSheet.create({
  host: { position: 'absolute', left: sizes.screenInset, right: sizes.screenInset },
});
