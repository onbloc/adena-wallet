import React, { ReactElement } from 'react';
import { Pressable, PressableStateCallbackType, StyleProp, View, ViewStyle } from 'react-native';

import { Text } from '../../atoms';
import { useStyles } from './range-selector.styles';

export interface RangeSelectorProps<T extends string> {
  options: T[];
  selected: T;
  onSelect: (value: T) => void;
}

// Evenly spread pill selector (1H / 1D / 1W / 1M / 1Y) from the token details design.
export const RangeSelector = <T extends string>({ options, selected, onSelect }: RangeSelectorProps<T>): ReactElement => {
  const styles = useStyles();

  return (
    <View style={styles.row} accessibilityRole='tablist'>
      {options.map((option) => {
        const active = option === selected;

        const handlePress = (): void => onSelect(option);

        const stylePressable = ({ pressed }: PressableStateCallbackType): StyleProp<ViewStyle> => [styles.pill, active ? styles.active : pressed && styles.pressed];

        return (
          <Pressable
            key={option}
            accessibilityRole='tab'
            accessibilityState={{ selected: active }}
            onPress={handlePress}
            style={stylePressable}
          >
            <Text variant='tab' color={active ? 'inverse' : 'primary'}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};
