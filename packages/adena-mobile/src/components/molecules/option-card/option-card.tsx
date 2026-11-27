import React, { ReactElement } from 'react';
import { Pressable, View } from 'react-native';

import { useThemeColors } from '../../../theme';
import { Icon, IconName, Text } from '../../atoms';
import { useStyles } from './option-card.styles';

export interface OptionCardProps {
  icon: IconName;
  title: string;
  description?: string;
  // Without a handler the card is informational and shows no chevron.
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
}

export const OptionCard = ({ icon, title, description, onPress, disabled = false, testID }: OptionCardProps): ReactElement => {
  const styles = useStyles();
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ disabled }}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, disabled && styles.disabled]}
      testID={testID}
    >
      <View style={styles.iconBox}>
        <Icon name={icon} size={24} color={colors.icon.primary} />
      </View>
      <View style={styles.texts}>
        <Text variant='section'>{title}</Text>
        {description && <Text variant='meta' color='secondary' style={styles.description}>{description}</Text>}
      </View>
      {onPress && <Icon name='chevronRight' size={20} color={colors.icon.primary} />}
    </Pressable>
  );
};
