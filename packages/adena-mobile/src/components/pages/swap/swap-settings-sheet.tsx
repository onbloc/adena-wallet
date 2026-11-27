import React, { ReactElement, useRef, useState } from 'react';
import { Pressable, PressableStateCallbackType, ScrollView, StyleProp, TextInputInstance, View, ViewStyle } from 'react-native';

import { useThemeColors } from '../../../theme';
import { Button, Icon, Radio, Text } from '../../atoms';
import { BottomSheet, InlineAlert, TextField } from '../../molecules';
import { useStyles } from './swap.styles';

export interface SwapSettingsSheetProps {
  visible: boolean;
  autoSlippage: boolean;
  // e.g. "0.5%", the slippage Auto uses.
  autoSlippageLabel: string;
  // Current draft values for the rows, e.g. "0.50%" and "10 minutes".
  slippageValueLabel: string;
  deadlineValueLabel: string;
  slippageText: string;
  deadlineText: string;
  slippageError?: string;
  slippageWarning?: string;
  deadlineError?: string;
  slippageValid: boolean;
  deadlineValid: boolean;
  // Valid and different from the saved settings.
  canSave: boolean;
  onSelectAuto: () => void;
  onSelectCustom: () => void;
  onChangeSlippage: (value: string) => void;
  onChangeDeadline: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}

type SettingsView = 'main' | 'slippage' | 'deadline';

const TITLES: Record<SettingsView, string> = { main: 'Swap settings', slippage: 'Max slippage', deadline: 'Swap deadline' };

interface SettingRowProps {
  label: string;
  value: string;
  badge?: string;
  onPress: () => void;
  testID?: string;
}

// Label left; optional accent badge, value and chevron right.
const SettingRow = ({ label, value, badge, onPress, testID }: SettingRowProps): ReactElement => {
  const styles = useStyles();
  const colors = useThemeColors();
  const stylePressable = ({ pressed }: PressableStateCallbackType): StyleProp<ViewStyle> => [styles.settingRow, pressed && styles.settingRowPressed];

  return (
    <Pressable accessibilityRole='button' accessibilityLabel={`${label}, ${badge ? `${badge} ` : ''}${value}`} onPress={onPress} style={stylePressable} testID={testID}>
      <Text variant='row' style={styles.settingLabel}>{label}</Text>
      {badge && (
        <View style={styles.autoBadge} testID='swap-settings-auto-badge'>
          <Text variant='tab' style={styles.autoBadgeText}>{badge}</Text>
        </View>
      )}
      <Text variant='body' color='secondary' tabular>{value}</Text>
      <Icon name='chevronRight' size={18} color={colors.icon.secondary} />
    </Pressable>
  );
};

// Uniswap-style settings: two rows open second-level editors inside the same sheet; Save persists both.
export const SwapSettingsSheet = (props: SwapSettingsSheetProps): ReactElement => {
  const styles = useStyles();
  const [view, setView] = useState<SettingsView>('main');
  const slippageRef = useRef<TextInputInstance>(null);
  const deadlineRef = useRef<TextInputInstance>(null);

  const [wasVisible, setWasVisible] = useState(props.visible);

  // Every open starts on the rows (adjusted during render, not in an effect).
  if (props.visible !== wasVisible) {
    setWasVisible(props.visible);

    if (props.visible) {
      setView('main');
    }
  }

  const back = (): void => setView('main');

  const handleCustom = (): void => {
    props.onSelectCustom();
    setTimeout(() => slippageRef.current?.focus(), 0);
  };

  const backButton = <Button label='Back' tone='tertiary' size='compact' leadingIcon='arrowLeft' fullWidth={false} onPress={back} testID='swap-settings-back' />;

  return (
    <BottomSheet visible={props.visible} title={TITLES[view]} onClose={props.onClose}>
      <ScrollView keyboardShouldPersistTaps='handled' keyboardDismissMode='interactive' contentContainerStyle={styles.settingsContent}>
        {view === 'main' && (
          <>
            <View>
              <SettingRow
                label='Max slippage'
                badge={props.autoSlippage ? 'Auto' : undefined}
                value={props.slippageValueLabel}
                onPress={() => setView('slippage')}
                testID='swap-settings-slippage-row'
              />
              <SettingRow label='Swap deadline' value={props.deadlineValueLabel} onPress={() => setView('deadline')} testID='swap-settings-deadline-row' />
            </View>
            <Button
              label='Save'
              tone={props.canSave ? 'primary' : 'secondary'}
              disabled={!props.canSave}
              onPress={props.onSave}
              testID='swap-settings-save'
            />
          </>
        )}
        {view === 'slippage' && (
          <>
            {backButton}
            <Text variant='meta' color='secondary'>Your swap reverts if the price moves against you by more than this.</Text>
            <View style={styles.settingsOptions}>
              <Radio label={`Auto (${props.autoSlippageLabel})`} selected={props.autoSlippage} onSelect={props.onSelectAuto} />
              <Text variant='meta' color='secondary'>{`Auto uses ${props.autoSlippageLabel}, a safe default for most pairs.`}</Text>
              <Radio label='Custom' selected={!props.autoSlippage} onSelect={handleCustom} />
            </View>
            {!props.autoSlippage && (
              <TextField
                ref={slippageRef}
                label='Slippage (%)'
                value={props.slippageText}
                onChangeText={props.onChangeSlippage}
                placeholder={props.autoSlippageLabel.replace('%', '')}
                keyboardType='decimal-pad'
                returnKeyType='done'
                submitBehavior='blurAndSubmit'
                onSubmitEditing={props.slippageValid ? back : undefined}
                error={props.slippageError}
                testID='swap-settings-slippage'
              />
            )}
            {props.slippageWarning && !props.slippageError && <InlineAlert tone='warning' title={props.slippageWarning} />}
            <Button label='Done' disabled={!props.slippageValid} onPress={back} testID='swap-settings-done' />
          </>
        )}
        {view === 'deadline' && (
          <>
            {backButton}
            <Text variant='meta' color='secondary'>Your swap reverts if it is pending for longer than this.</Text>
            <TextField
              ref={deadlineRef}
              label='Minutes'
              value={props.deadlineText}
              onChangeText={props.onChangeDeadline}
              placeholder='10'
              keyboardType='number-pad'
              returnKeyType='done'
              submitBehavior='blurAndSubmit'
              onSubmitEditing={props.deadlineValid ? back : undefined}
              error={props.deadlineError}
              testID='swap-settings-deadline'
            />
            <Button label='Done' disabled={!props.deadlineValid} onPress={back} testID='swap-settings-done' />
          </>
        )}
      </ScrollView>
    </BottomSheet>
  );
};
