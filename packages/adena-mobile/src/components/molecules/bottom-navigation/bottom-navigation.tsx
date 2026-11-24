import React, { ReactElement, use } from 'react';
import { View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { HapticKind } from '../../../domain/haptics';
import { useHaptics } from '../../../hooks/use-haptics';
import { sizes, spacing } from '../../../theme';
import { IconButton, IconName } from '../../atoms';
import { ITEM_SIZE, styles } from './bottom-navigation.styles';

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

// Distance from the screen bottom to the floating navigation; keeps a gap on devices without a home indicator.
export const getFloatingNavigationOffset = (bottomInset: number): number => Math.max(bottomInset, spacing.space16);

// Bottom padding for content that scrolls underneath the floating navigation.
// Reads the context directly so pages still render (with no inset) outside a SafeAreaProvider.
export const useFloatingNavigationClearance = (): number => {
  const insets = use(SafeAreaInsetsContext);

  return getFloatingNavigationOffset(insets?.bottom ?? 0) + sizes.bottomNavigation + spacing.space24;
};

// Floating destination pill plus a distinct primary action; the host positions it over the content.
export const BottomNavigation = <T extends string>({ items, selected, onSelect, primaryAction }: BottomNavigationProps<T>): ReactElement => {
  const playHaptic = useHaptics();

  const handlePrimaryAction = (): void => {
    playHaptic(HapticKind.IMPACT);
    primaryAction?.onPress();
  };

  return (
    <View style={styles.bar} pointerEvents='box-none'>
      {items.length > 0 && (
        <View style={styles.destinations} accessibilityRole='tablist'>
          {items.map((item) => {
            const handlePress = (): void => {
              playHaptic(HapticKind.SELECTION);
              onSelect(item.key);
            };

            return (
              <IconButton
                key={item.key}
                icon={item.icon}
                accessibilityLabel={item.label}
                variant={item.key === selected ? 'surface' : 'plain'}
                size={ITEM_SIZE}
                disabled={item.disabled}
                onPress={handlePress}
              />
            );
          })}
        </View>
      )}
      {primaryAction && (
        <View style={styles.action}>
          <IconButton
            icon={primaryAction.icon}
            accessibilityLabel={primaryAction.label}
            variant='primary'
            size={sizes.bottomNavigation}
            onPress={handlePrimaryAction}
          />
        </View>
      )}
    </View>
  );
};
