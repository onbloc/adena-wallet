import React, { ReactElement } from 'react';
import { Pressable, PressableStateCallbackType } from 'react-native';

import { colors, sizes } from '../../../theme';
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
  const textColor = disabled ? colors.text.disabled : selected ? colors.text.inverse : colors.text.primary;

  const stylePressable = ({ pressed }: PressableStateCallbackType): ({ height: 32; borderRadius: 8; paddingHorizontal: 12; flexDirection: 'row'; alignItems: 'center'; gap: 4; alignSelf: 'flex-start' } | { backgroundColor: '#F1F3F4' | '#E6E6E6' | '#121212' })[] => [
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
