import React, { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';

import { IconButton, Text } from '../../atoms';
import { styles } from './top-bar.styles';

export interface TopBarProps {
  title?: string;
  onBack?: () => void;
  // Root pages use the large title style; drill-down pages show a back action.
  variant?: 'root' | 'drillDown';
  trailing?: ReactNode;
  leading?: ReactNode;
}

export const TopBar = ({ title, onBack, variant = onBack ? 'drillDown' : 'root', trailing, leading }: TopBarProps): ReactElement => (
  <View style={styles.bar}>
    {onBack && <IconButton icon='arrowLeft' accessibilityLabel='Back' onPress={onBack} />}
    {leading}
    {title !== undefined && (
      <Text variant={variant === 'root' ? 'title' : 'section'} numberOfLines={1} accessibilityRole='header' style={styles.title}>
        {title}
      </Text>
    )}
    <View style={styles.trailing}>{trailing}</View>
  </View>
);
