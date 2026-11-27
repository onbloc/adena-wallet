import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Text } from '../../atoms';
import { useStyles } from './mnemonic-grid.styles';

// Word positions are fixed, so the position number is the stable identity.
interface MnemonicCell {
  number: number;
  word: string;
}

export interface MnemonicGridProps {
  words: string[];
  // Shows dots in place of every word, e.g. before the phrase is revealed.
  masked?: boolean;
  // 'surface' cells stand out when the grid sits on a subtle card.
  cellTone?: 'subtle' | 'surface';
}

const MASK = '••••••';

const toCells = (words: string[]): MnemonicCell[] => words.map((word, position) => ({ number: position + 1, word }));

export const MnemonicGrid = ({ words, masked = false, cellTone = 'subtle' }: MnemonicGridProps): ReactElement => {
  const styles = useStyles();

  return (
    <View style={styles.grid} accessibilityLabel={masked ? 'Recovery phrase hidden' : 'Recovery phrase'}>
      {toCells(words).map(cell => (
        <View key={cell.number} style={[styles.cell, cellTone === 'surface' && styles.surfaceCell]}>
          <Text variant='meta' color='secondary' tabular style={styles.index}>{cell.number}</Text>
          <Text variant='row' selectable={false}>{masked ? MASK : cell.word}</Text>
        </View>
      ))}
    </View>
  );
};
