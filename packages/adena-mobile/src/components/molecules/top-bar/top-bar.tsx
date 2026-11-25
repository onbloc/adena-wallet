import React, { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';

import { IconButton, Text } from '../../atoms';
import { styles } from './top-bar.styles';

export interface TopBarProps {
  title?: string;
  onBack?: () => void;
  // Root and drill-down pages share the title scale; 'large' is the bold modal title (e.g. Send to).
  variant?: 'root' | 'drillDown' | 'large';
  trailing?: ReactNode;
  leading?: ReactNode;
}

export const TopBar = ({ title, onBack, variant = onBack ? 'drillDown' : 'root', trailing, leading }: TopBarProps): ReactElement => (
  <View style={styles.bar}>
    {onBack && <IconButton icon='arrowLeft' accessibilityLabel='Back' onPress={onBack} />}
    {leading}
    {title !== undefined && (
      <Text variant={variant === 'large' ? 'largeTitle' : 'title'} numberOfLines={1} accessibilityRole='header' style={[styles.title, !onBack && !leading && styles.titleFlush]}>
        {title}
      </Text>
    )}
    <View style={styles.trailing}>{trailing}</View>
  </View>
);
