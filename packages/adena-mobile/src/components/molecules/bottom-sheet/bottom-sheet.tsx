import React, { PropsWithChildren, ReactElement, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Modal, Platform, Pressable, View } from 'react-native';
import { AvoidSoftInputView, SoftInputEvent } from 'react-native-avoid-softinput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { motion, spacing } from '../../../theme';
import { IconButton, Text } from '../../atoms';
import { useStyles } from './bottom-sheet.styles';
import { SheetKeyboardContext, useSheetKeyboard } from './sheet-keyboard';

export interface BottomSheetProps {
  visible: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  dismissible?: boolean;
  // Runs once the sheet is fully gone, e.g. before presenting a system picker.
  onDismissed?: () => void;
  // Runs once the open animation settles; focusing a field here keeps the keyboard from racing the slide.
  onOpened?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// 24px top radius / 24px side inset. Host-independent: supplies its own scrim and safe area.
// The scrim fades over the whole screen while only the sheet slides, so the backdrop
// never trails the sheet on its way up.
export const BottomSheet = ({ visible, title, description, onClose, dismissible = true, onDismissed, onOpened, children }: PropsWithChildren<BottomSheetProps>): ReactElement => {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  const onDismissedRef = useRef(onDismissed);
  const onOpenedRef = useRef(onOpened);

  useEffect(() => {
    onDismissedRef.current = onDismissed;
    onOpenedRef.current = onOpened;
  });
  // Stays mounted after `visible` turns false until the exit animation ends.
  const [mounted, setMounted] = useState(visible);

  if (visible && !mounted) {
    setMounted(true);
  }

  const keyboard = useSheetKeyboard(mounted, insets.bottom);
  const { dismissOwnKeyboard } = keyboard;
  const wasVisibleRef = useRef(visible);

  useEffect(() => {
    // The keyboard leaves with the sheet instead of lingering over the screen below.
    if (wasVisibleRef.current && !visible) {
      dismissOwnKeyboard();
    }

    wasVisibleRef.current = visible;

    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: motion.transition,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (finished && visible) {
        onOpenedRef.current?.();
      }

      if (finished && !visible) {
        setMounted(false);

        // iOS reports through Modal.onDismiss once the presented controller is gone.
        if (Platform.OS !== 'ios') {
          onDismissedRef.current?.();
        }
      }
    });
    return (): void => animation.stop();
  }, [dismissOwnKeyboard, progress, visible]);

  const slide = progress.interpolate({ inputRange: [0, 1], outputRange: [Dimensions.get('window').height, 0] });
  const translateY = Animated.subtract(slide, keyboard.lift);
  // Android reports the IME of the modal's own window through this view; it applies no offset itself.
  const KeyboardSource = Platform.OS === 'android' ? AvoidSoftInputView : View;
  const keyboardSourceProps = Platform.OS === 'android'
    ? { enabled: false, onSoftInputHeightChange: (event: SoftInputEvent): void => keyboard.onAndroidHeight(event.nativeEvent.softInputHeight) }
    : {};

  return (
    <Modal visible={mounted} transparent animationType='none' onRequestClose={dismissible ? onClose : undefined} onDismiss={onDismissed} statusBarTranslucent>
      <View style={styles.root}>
        <AnimatedPressable
          style={[styles.scrim, { opacity: progress }]}
          accessibilityLabel='Close'
          disabled={!dismissible}
          onPress={onClose}
        />
        <KeyboardSource style={styles.keyboardAvoider} {...keyboardSourceProps}>
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
            <SheetKeyboardContext value={keyboard.handle}>
              <View style={styles.content}>{children}</View>
            </SheetKeyboardContext>
          </Animated.View>
        </KeyboardSource>
      </View>
    </Modal>
  );
};
