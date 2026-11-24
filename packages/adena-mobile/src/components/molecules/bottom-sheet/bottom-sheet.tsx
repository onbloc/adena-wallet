import React, { PropsWithChildren, ReactElement, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Modal, Platform, Pressable, View } from 'react-native';
import { AvoidSoftInputView } from 'react-native-avoid-softinput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { motion, sizes, spacing } from '../../../theme';
import { IconButton, Text } from '../../atoms';
import { styles } from './bottom-sheet.styles';

export interface BottomSheetProps {
  visible: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  dismissible?: boolean;
  // Runs once the sheet is fully gone, e.g. before presenting a system picker.
  onDismissed?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Keeps the action below a focused field (e.g. the confirm button) above the keyboard too.
const KEYBOARD_AVOID_OFFSET = sizes.control + spacing.space24;

// 24px top radius / 24px side inset. Host-independent: supplies its own scrim and safe area.
// The scrim fades over the whole screen while only the sheet slides, so the backdrop
// never trails the sheet on its way up.
export const BottomSheet = ({ visible, title, description, onClose, dismissible = true, onDismissed, children }: PropsWithChildren<BottomSheetProps>): ReactElement => {
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  const onDismissedRef = useRef(onDismissed);

  useEffect(() => {
    onDismissedRef.current = onDismissed;
  });
  // Stays mounted after `visible` turns false until the exit animation ends.
  const [mounted, setMounted] = useState(visible);

  if (visible && !mounted) {
    setMounted(true);
  }

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: motion.transition,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (finished && !visible) {
        setMounted(false);

        // iOS reports through Modal.onDismiss once the presented controller is gone.
        if (Platform.OS !== 'ios') {
          onDismissedRef.current?.();
        }
      }
    });
    return (): void => animation.stop();
  }, [progress, visible]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [Dimensions.get('window').height, 0] });

  return (
    <Modal visible={mounted} transparent animationType='none' onRequestClose={dismissible ? onClose : undefined} onDismiss={onDismissed} statusBarTranslucent>
      {/* The modal is its own window, so KeyboardAvoidingView never sees the Android IME; this view tracks it natively. */}
      <View style={styles.root}>
        <AnimatedPressable
          style={[styles.scrim, { opacity: progress }]}
          accessibilityLabel='Close'
          disabled={!dismissible}
          onPress={onClose}
        />
        <AvoidSoftInputView style={styles.keyboardAvoider} avoidOffset={KEYBOARD_AVOID_OFFSET} easing='easeOut'>
          <Animated.View
            style={[styles.sheet, { paddingBottom: insets.bottom + spacing.space20, transform: [{ translateY }] }]}
            accessibilityViewIsModal
          >
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text variant='title' style={styles.title} accessibilityRole='header'>{title}</Text>
              {dismissible && <IconButton icon='close' variant='primary' accessibilityLabel='Close' onPress={onClose} />}
            </View>
            {description && <Text variant='body' color='secondary'>{description}</Text>}
            <View style={styles.content}>{children}</View>
          </Animated.View>
        </AvoidSoftInputView>
      </View>
    </Modal>
  );
};
