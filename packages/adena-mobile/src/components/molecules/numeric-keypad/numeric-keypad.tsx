import React, { ReactElement } from 'react';
import { Pressable, PressableStateCallbackType, View } from 'react-native';

import { colors } from '../../../theme';
import { Icon, Text } from '../../atoms';
import { styles } from './numeric-keypad.styles';

export type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'backspace';

const ROWS: KeypadKey[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'backspace'],
];

export const NumericKeypad = ({ onKeyPress }: { onKeyPress: (key: KeypadKey) => void }): ReactElement => (
  <View style={styles.grid}>
    {ROWS.map(row => (
      <View key={row.join('')} style={styles.row}>
        {row.map((key) => {
          const handlePress = (): void => onKeyPress(key);

          const stylePressable = ({ pressed }: PressableStateCallbackType): (false | { flex: number; height: number; alignItems: 'center'; justifyContent: 'center'; borderRadius: 12 } | { backgroundColor: '#F1F3F4' })[] => [styles.key, pressed && styles.pressed];

          return (
            <Pressable
              key={key}
              accessibilityRole='keyboardkey'
              accessibilityLabel={key === 'backspace' ? 'Delete' : key === '.' ? 'Decimal point' : key}
              onPress={handlePress}
              style={stylePressable}
            >
              {key === 'backspace'
                ? <Icon name='backspace' color={colors.icon.primary} />
                : <Text variant='section' tabular>{key}</Text>}
            </Pressable>
          );
        })}
      </View>
    ))}
  </View>
);

// Applies a key to an amount string, enforcing one decimal point and a max precision.
export const applyKeypadKey = (current: string, key: KeypadKey, maxDecimals: number): string => {
  if (key === 'backspace') {
    return current.slice(0, -1);
  }

  if (key === '.') {
    if (maxDecimals === 0 || current.includes('.')) {
      return current;
    }

    return current === '' ? '0.' : `${current}.`;
  }

  const [, decimals] = current.split('.');

  if (decimals !== undefined && decimals.length >= maxDecimals) {
    return current;
  }

  if (current === '0') {
    return key;
  }

  return current.length >= 24 ? current : `${current}${key}`;
};
