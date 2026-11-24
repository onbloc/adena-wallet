import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Text } from '../../atoms';
import { styles } from './mnemonic-grid.styles';

// Word positions are fixed, so the position number is the stable identity.
interface MnemonicCell {
  number: number;
  word: string;
}

export interface MnemonicGridProps {
  words: string[];
  // Shows dots in place of every word, e.g. before the phrase is revealed.
  masked?: boolean;
}

const MASK = '••••••';

const toCells = (words: string[]): MnemonicCell[] => words.map((word, position) => ({ number: position + 1, word }));

export const MnemonicGrid = ({ words, masked = false }: MnemonicGridProps): ReactElement => (
  <View style={styles.grid} accessibilityLabel={masked ? 'Recovery phrase hidden' : 'Recovery phrase'}>
    {toCells(words).map(cell => (
      <View key={cell.number} style={styles.cell}>
        <Text variant='meta' color='secondary' tabular style={styles.index}>{cell.number}</Text>
        <Text variant='row' selectable={false}>{masked ? MASK : cell.word}</Text>
      </View>
    ))}
  </View>
);
