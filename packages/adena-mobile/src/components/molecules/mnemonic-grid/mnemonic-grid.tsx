import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Text } from '../../atoms';
import { styles } from './mnemonic-grid.styles';

// Word positions are fixed, so the position number is the stable identity.
interface MnemonicCell {
  number: number;
  word: string;
}

const toCells = (words: string[]): MnemonicCell[] => words.map((word, position) => ({ number: position + 1, word }));

export const MnemonicGrid = ({ words }: { words: string[] }): ReactElement => (
  <View style={styles.grid} accessibilityLabel='Recovery phrase'>
    {toCells(words).map(cell => (
      <View key={cell.number} style={styles.cell}>
        <Text variant='meta' color='secondary' tabular style={styles.index}>{cell.number}</Text>
        <Text variant='row' selectable={false}>{cell.word}</Text>
      </View>
    ))}
  </View>
);
