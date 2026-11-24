import React, { ReactElement } from 'react';
import { Pressable, View } from 'react-native';

import { HapticKind } from '../../../domain/haptics';
import { useHaptics } from '../../../hooks/use-haptics';
import { Text } from '../../atoms';
import { styles } from './tabs.styles';

export interface TabItem<T extends string> {
  key: T;
  label: string;
  disabled?: boolean;
}

export interface TabsProps<T extends string> {
  items: TabItem<T>[];
  selected: T;
  onSelect: (key: T) => void;
}

// Section tabs: selection uses a 2px underline plus primary text.
export const Tabs = <T extends string>({ items, selected, onSelect }: TabsProps<T>): ReactElement => {
  const playHaptic = useHaptics();

  return (
    <View style={styles.row} accessibilityRole='tablist'>
      {items.map((item) => {
        const active = item.key === selected;

        const handlePress = (): void => {
          playHaptic(HapticKind.SELECTION);
          onSelect(item.key);
        };

        return (
          <Pressable
            key={item.key}
            accessibilityRole='tab'
            accessibilityState={{ selected: active, disabled: item.disabled }}
            disabled={item.disabled}
            onPress={handlePress}
            style={[styles.tab, active && styles.active]}
          >
            <Text variant='body' color={item.disabled ? 'disabled' : active ? 'primary' : 'secondary'} style={active ? styles.activeLabel : styles.label}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};
