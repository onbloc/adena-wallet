import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { IconButton, IconName } from '../../atoms';
import { styles } from './bottom-navigation.styles';

export interface BottomNavigationItem<T extends string> {
  key: T;
  icon: IconName;
  label: string;
  disabled?: boolean;
}

export interface BottomNavigationProps<T extends string> {
  items: BottomNavigationItem<T>[];
  selected: T;
  onSelect: (key: T) => void;
  primaryAction?: { icon: IconName; label: string; onPress: () => void };
}

// Three destinations plus a distinct primary action; the host supplies the safe area.
export const BottomNavigation = <T extends string>({ items, selected, onSelect, primaryAction }: BottomNavigationProps<T>): ReactElement => (
  <View style={styles.bar} accessibilityRole='tablist'>
    <View style={styles.destinations}>
      {items.map((item) => {
        const handlePress = (): void => onSelect(item.key);

        return (
          <IconButton
            key={item.key}
            icon={item.icon}
            accessibilityLabel={item.label}
            variant={item.key === selected ? 'surface' : 'plain'}
            disabled={item.disabled}
            onPress={handlePress}
          />
        );
      })}
    </View>
    {primaryAction && (
      <IconButton
        icon={primaryAction.icon}
        accessibilityLabel={primaryAction.label}
        variant='primary'
        size={48}
        onPress={primaryAction.onPress}
      />
    )}
  </View>
);
