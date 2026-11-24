import React, { PropsWithChildren, ReactElement, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { motion, spacing } from '../../../theme';
import { IconButton, Text } from '../../atoms';
import { styles } from './bottom-sheet.styles';

export interface BottomSheetProps {
  visible: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  dismissible?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// 24px top radius / 24px side inset. Host-independent: supplies its own scrim and safe area.
// The scrim fades over the whole screen while only the sheet slides, so the backdrop
// never trails the sheet on its way up.
export const BottomSheet = ({ visible, title, description, onClose, dismissible = true, children }: PropsWithChildren<BottomSheetProps>): ReactElement => {
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
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
      }
    });
    return (): void => animation.stop();
  }, [progress, visible]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [Dimensions.get('window').height, 0] });

  return (
    <Modal visible={mounted} transparent animationType='none' onRequestClose={dismissible ? onClose : undefined} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <AnimatedPressable
          style={[styles.scrim, { opacity: progress }]}
          accessibilityLabel='Close'
          disabled={!dismissible}
          onPress={onClose}
        />
        <Animated.View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.space24), transform: [{ translateY }] }]}
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
      </KeyboardAvoidingView>
    </Modal>
  );
};
