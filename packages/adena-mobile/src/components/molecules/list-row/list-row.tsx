import React, { ReactElement, ReactNode } from 'react';
import { Pressable, PressableStateCallbackType, StyleProp, View, ViewStyle } from 'react-native';

import { useThemeColors } from '../../../theme';
import { Icon, IconName, Text, TextColor } from '../../atoms';
import { useStyles } from './list-row.styles';

export interface ListRowProps {
  label: string;
  description?: string;
  value?: string;
  valueColor?: TextColor;
  leadingIcon?: IconName;
  leading?: ReactNode;
  trailing?: ReactNode;
  showChevron?: boolean;
  disabled?: boolean;
  destructive?: boolean;
  onPress?: () => void;
  testID?: string;
}

export const ListRow = ({
  label,
  description,
  value,
  valueColor = 'secondary',
  leadingIcon,
  leading,
  trailing,
  showChevron,
  disabled = false,
  destructive = false,
  onPress,
  testID,
}: ListRowProps): ReactElement => {
  const styles = useStyles();
  const colors = useThemeColors();
  const chevron = showChevron ?? Boolean(onPress);
  const labelColor: TextColor = disabled ? 'disabled' : destructive ? 'error' : 'primary';
  const content = (
    <>
      {leading}
      {leadingIcon && <Icon name={leadingIcon} size={20} color={disabled ? colors.text.disabled : colors.icon.secondary} />}
      <View style={styles.texts}>
        <Text variant='row' color={labelColor} numberOfLines={1}>{label}</Text>
        {description && <Text variant='meta' color={disabled ? 'disabled' : 'secondary'} numberOfLines={1}>{description}</Text>}
      </View>
      {value !== undefined && <Text variant='meta' color={disabled ? 'disabled' : valueColor} numberOfLines={1}>{value}</Text>}
      {trailing}
      {chevron && <Icon name='chevronRight' size={20} color={disabled ? colors.text.disabled : colors.icon.primary} />}
    </>
  );

  if (!onPress) {
    return <View testID={testID} style={[styles.row, styles.idle]}>{content}</View>;
  }

  const stylePressable = ({ pressed }: PressableStateCallbackType): StyleProp<ViewStyle> => [styles.row, { backgroundColor: pressed ? colors.background.pressed : colors.background.subtle }];

  return (
    <Pressable
      testID={testID}
      accessibilityRole='button'
      accessibilityLabel={[label, description, value].filter(Boolean).join(', ')}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={stylePressable}
    >
      {content}
    </Pressable>
  );
};
