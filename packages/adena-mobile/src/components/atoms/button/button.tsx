import React, { ReactElement } from 'react';
import { Pressable, PressableStateCallbackType, StyleProp, View, ViewStyle } from 'react-native';

import { HapticKind } from '../../../domain/haptics';
import { useHaptics } from '../../../hooks/use-haptics';
import { sizes, ThemeColors, useThemeColors } from '../../../theme';
import { Icon, IconName } from '../icon';
import { Spinner } from '../spinner';
import { Text } from '../text';
import { styles } from './button.styles';

export type ButtonTone = 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'destructiveOutline' | 'destructiveText';
export type ButtonSize = 'default' | 'compact';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  tone?: ButtonTone;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  leadingIcon?: IconName;
  trailingIcon?: IconName;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  // Light tap on press; on by default for the primary and destructive (key) actions.
  haptic?: boolean;
}

const tones = (colors: ThemeColors): Record<ButtonTone, { background: string; pressed: string; text: string }> => ({
  primary: { background: colors.action.primary, pressed: colors.action.primaryPressed, text: colors.text.inverse },
  secondary: { background: colors.action.secondary, pressed: colors.action.secondaryPressed, text: colors.text.primary },
  tertiary: { background: 'transparent', pressed: colors.action.secondaryPressed, text: colors.text.primary },
  destructive: { background: colors.status.error, pressed: colors.status.error, text: colors.text.inverse },
  destructiveOutline: { background: 'transparent', pressed: colors.background.pressed, text: colors.status.error },
  destructiveText: { background: 'transparent', pressed: colors.background.pressed, text: colors.status.error },
});

export const Button = ({
  label,
  onPress,
  tone = 'primary',
  size = 'default',
  disabled = false,
  loading = false,
  loadingLabel = 'Submitting…',
  leadingIcon,
  trailingIcon,
  fullWidth = true,
  style,
  testID,
  haptic = tone === 'primary' || tone === 'destructive',
}: ButtonProps): ReactElement => {
  const colors = useThemeColors();
  const palette = tones(colors)[tone];
  const playHaptic = useHaptics();
  const inactive = disabled && !loading;
  const textColor = inactive ? colors.text.disabled : palette.text;

  const stylePressable = ({ pressed }: PressableStateCallbackType): StyleProp<ViewStyle> => [
    styles.base,
    { height: size === 'compact' ? sizes.controlCompact : sizes.control },
    fullWidth ? styles.fullWidth : styles.hug,
    { backgroundColor: inactive ? colors.action.disabled : pressed ? palette.pressed : palette.background },
    tone === 'destructive' && pressed && styles.destructivePressed,
    tone === 'destructiveOutline' && { borderWidth: 1.5, borderColor: inactive ? colors.action.disabled : colors.status.error },
    style,
  ];

  const handlePress = (): void => {
    if (haptic) {
      playHaptic(HapticKind.IMPACT);
    }

    onPress?.();
  };

  return (
    <Pressable
      testID={testID}
      accessibilityRole='button'
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={handlePress}
      style={stylePressable}
    >
      {loading
        ? <View style={styles.leading}><Spinner tone={tone === 'primary' || tone === 'destructive' ? 'inverse' : 'primary'} /></View>
        : leadingIcon && <View style={styles.leading}><Icon name={leadingIcon} color={textColor} size={20} /></View>}
      <Text variant='button' numberOfLines={1} style={{ color: textColor }}>
        {loading ? loadingLabel : label}
      </Text>
      {!loading && trailingIcon && (
        <View style={styles.trailing}><Icon name={trailingIcon} color={textColor} size={20} /></View>
      )}
    </Pressable>
  );
};
