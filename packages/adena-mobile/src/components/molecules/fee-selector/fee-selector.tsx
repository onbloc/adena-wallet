import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { FeeTier } from '../../../domain/fee';
import { Chip, Text } from '../../atoms';
import { InlineAlert } from '../inline-alert';
import { TextField } from '../text-field';
import { styles } from './fee-selector.styles';

export interface FeeOptionView {
  tier: FeeTier;
  label: string;
  feeLabel: string;
}

export interface FeeSelectorProps {
  options: FeeOptionView[];
  selected: FeeTier;
  onSelect: (tier: FeeTier) => void;
  customAdjustment: string;
  onChangeCustomAdjustment: (value: string) => void;
  tooLow: boolean;
}

// Slow / Average / Fast tiers from one simulation, plus a custom gas multiplier.
export const FeeSelector = ({ options, selected, onSelect, customAdjustment, onChangeCustomAdjustment, tooLow }: FeeSelectorProps): ReactElement => {
  const current = options.find(option => option.tier === selected);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant='meta' color='secondary'>Network fee</Text>
        {current && <Text variant='row' tabular>{current.feeLabel}</Text>}
      </View>
      <View style={styles.chips}>
        {options.map((option) => {
          const handlePress = (): void => onSelect(option.tier);

          return (
            <Chip key={option.tier} label={option.label} selected={option.tier === selected} onPress={handlePress} />
          );
        })}
      </View>
      {selected === FeeTier.CUSTOM && (
        <TextField
          label='Gas multiplier'
          value={customAdjustment}
          onChangeText={onChangeCustomAdjustment}
          keyboardType='decimal-pad'
          returnKeyType='done'
          submitBehavior='blurAndSubmit'
          helper='Applied to the simulated gas usage, e.g. 1.5'
        />
      )}
      {tooLow && <InlineAlert tone='warning' title='Network fee too low' description='The gas budget is below the simulated usage.' />}
    </View>
  );
};
