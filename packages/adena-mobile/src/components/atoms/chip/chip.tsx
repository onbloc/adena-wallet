import React, { ReactElement } from 'react';
import { Pressable, PressableStateCallbackType, StyleProp, ViewStyle } from 'react-native';

import { sizes, useThemeColors } from '../../../theme';
import { Icon, IconName } from '../icon';
import { Text } from '../text';
import { styles } from './chip.styles';

export interface ChipProps {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  trailingIcon?: IconName;
  onPress?: () => void;
}

// 32px visible surface inside a 44px hit area.
export const Chip = ({ label, selected = false, disabled = false, trailingIcon, onPress }: ChipProps): ReactElement => {
  const colors = useThemeColors();
  const textColor = disabled ? colors.text.disabled : selected ? colors.text.inverse : colors.text.primary;

  const stylePressable = ({ pressed }: PressableStateCallbackType): StyleProp<ViewStyle> => [
    styles.base,
    {
      backgroundColor: disabled
        ? colors.action.disabled
        : selected ? colors.action.primary : pressed ? colors.action.secondaryPressed : colors.action.secondary,
    },
  ];

  return (
    <Pressable
      accessibilityRole='button'
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      hitSlop={(sizes.touchTarget - sizes.chip) / 2}
      onPress={onPress}
      style={stylePressable}
    >
      <Text variant='meta' style={{ color: textColor }}>{label}</Text>
      {trailingIcon && <Icon name={trailingIcon} size={16} color={textColor} />}
    </Pressable>
  );
};
