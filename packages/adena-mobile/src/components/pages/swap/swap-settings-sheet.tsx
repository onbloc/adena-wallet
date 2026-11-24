import React, { ReactElement, useRef } from 'react';
import { TextInputInstance, View } from 'react-native';

import { Button, Chip, Text } from '../../atoms';
import { BottomSheet, InlineAlert, TextField } from '../../molecules';
import { useStyles } from './swap.styles';

export interface SwapSettingsSheetProps {
  visible: boolean;
  autoSlippage: boolean;
  autoSlippageLabel: string;
  slippageText: string;
  deadlineText: string;
  slippageError?: string;
  slippageWarning?: string;
  deadlineError?: string;
  canSave: boolean;
  onSelectAuto: () => void;
  onSelectCustom: () => void;
  onChangeSlippage: (value: string) => void;
  onChangeDeadline: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}

// Only slippage and deadline, like the GnoSwap settings; values persist on Save.
export const SwapSettingsSheet = (props: SwapSettingsSheetProps): ReactElement => {
  const styles = useStyles();
  const slippageRef = useRef<TextInputInstance>(null);
  const deadlineRef = useRef<TextInputInstance>(null);

  const handleCustom = (): void => {
    props.onSelectCustom();
    slippageRef.current?.focus();
  };

  return (
    <BottomSheet visible={props.visible} title='Swap settings' onClose={props.onClose}>
      <View style={styles.settingsRow}>
        <Text variant='row'>Max. slippage</Text>
        <Text variant='meta' color='secondary'>Your swap reverts if the price moves against you by more than this.</Text>
        <View style={styles.settingsInline}>
          <Chip label={`Auto (${props.autoSlippageLabel})`} selected={props.autoSlippage} onPress={props.onSelectAuto} />
          <Chip label='Custom' selected={!props.autoSlippage} onPress={handleCustom} />
        </View>
        {!props.autoSlippage && (
          <TextField
            ref={slippageRef}
            label='Slippage (%)'
            value={props.slippageText}
            onChangeText={props.onChangeSlippage}
            placeholder='0.5'
            keyboardType='decimal-pad'
            returnKeyType='next'
            submitBehavior='submit'
            onSubmitEditing={() => deadlineRef.current?.focus()}
            error={props.slippageError}
            testID='swap-settings-slippage'
          />
        )}
        {props.slippageWarning && !props.slippageError && <InlineAlert tone='warning' title={props.slippageWarning} />}
      </View>
      <View style={styles.settingsRow}>
        <Text variant='row'>Transaction deadline</Text>
        <TextField
          ref={deadlineRef}
          label='Minutes'
          value={props.deadlineText}
          onChangeText={props.onChangeDeadline}
          placeholder='10'
          keyboardType='number-pad'
          returnKeyType='done'
          submitBehavior='blurAndSubmit'
          onSubmitEditing={props.canSave ? props.onSave : undefined}
          error={props.deadlineError}
          testID='swap-settings-deadline'
        />
      </View>
      <Button label='Save' disabled={!props.canSave} onPress={props.onSave} testID='swap-settings-save' />
    </BottomSheet>
  );
};
