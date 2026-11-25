import React, { ReactElement } from 'react';
import { Pressable, PressableStateCallbackType, StyleProp, ViewStyle } from 'react-native';

import { sizes, ThemeColors, useThemeColors } from '../../../theme';
import { Icon, IconName } from '../icon';
import { styles } from './icon-button.styles';

export type IconButtonVariant = 'plain' | 'surface' | 'primary';

export interface IconButtonProps {
  icon: IconName;
  accessibilityLabel: string;
  onPress?: () => void;
  variant?: IconButtonVariant;
  disabled?: boolean;
  size?: number;
  testID?: string;
}

const variants = (colors: ThemeColors): Record<IconButtonVariant, { background: string; pressed: string; icon: string }> => ({
  plain: { background: 'transparent', pressed: colors.background.pressed, icon: colors.icon.primary },
  surface: { background: colors.action.secondary, pressed: colors.action.secondaryPressed, icon: colors.icon.primary },
  primary: { background: colors.action.primary, pressed: colors.action.primaryPressed, icon: colors.text.inverse },
});

// 44 x 44 target with a 24px glyph.
export const IconButton = ({
  icon,
  accessibilityLabel,
  onPress,
  variant = 'plain',
  disabled = false,
  size = sizes.touchTarget,
  testID,
}: IconButtonProps): ReactElement => {
  const colors = useThemeColors();
  const palette = variants(colors)[variant];

  const stylePressable = ({ pressed }: PressableStateCallbackType): StyleProp<ViewStyle> => [
    styles.base,
    { width: size, height: size },
    {
      backgroundColor: disabled
        ? variant === 'plain' ? 'transparent' : colors.action.disabled
        : pressed ? palette.pressed : palette.background,
    },
  ];

  return (
    <Pressable
      testID={testID}
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={Math.max(0, (sizes.touchTarget - size) / 2)}
      onPress={onPress}
      style={stylePressable}
    >
      <Icon name={icon} size={size < sizes.touchTarget ? 20 : sizes.icon} color={disabled ? colors.text.disabled : palette.icon} />
    </Pressable>
  );
};
