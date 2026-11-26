import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Text } from '../../atoms';
import { useStyles } from './spend-meter.styles';

export interface SpendMeterProps {
  // 0..1 share of the limit already spent.
  ratio: number;
  usedLabel: string;
  limitLabel: string;
  caption?: string;
}

export const SpendMeter = ({ ratio, usedLabel, limitLabel, caption }: SpendMeterProps): ReactElement => {
  const styles = useStyles();
  const clamped = Math.min(Math.max(ratio, 0), 1);

  return (
    <View style={styles.root}>
      <View style={styles.amounts}>
        <Text variant='row' tabular>{usedLabel}</Text>
        <Text variant='meta' color='secondary' tabular>{`/ ${limitLabel}`}</Text>
      </View>
      <View
        style={styles.track}
        accessibilityRole='progressbar'
        accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      >
        <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
      </View>
      {caption && <Text variant='meta' color='secondary'>{caption}</Text>}
    </View>
  );
};
