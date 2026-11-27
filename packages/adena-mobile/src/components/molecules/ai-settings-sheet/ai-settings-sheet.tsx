import React, { ReactElement } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';

import { Button, Radio, Text } from '../../atoms';
import { BottomSheet } from '../bottom-sheet';
import { InlineAlert } from '../inline-alert';
import { TabItem, Tabs } from '../tabs';
import { TextField } from '../text-field';
import { useStyles } from './ai-settings-sheet.styles';

export type AiProvider = 'openai' | 'local';
export type AiLocalState = 'idle' | 'downloading' | 'loading' | 'ready' | 'error';

export interface AiSettingsSheetProps {
  visible: boolean;
  provider: AiProvider;
  onChangeProvider: (provider: AiProvider) => void;
  apiKey: string;
  hasApiKey: boolean;
  onChangeApiKey: (value: string) => void;
  onRemoveApiKey: () => void;
  model: string;
  modelOptions: { value: string; label: string }[];
  onChangeModel: (value: string) => void;
  local: { state: AiLocalState; percentage?: number; message?: string };
  onLoadLocal: () => void;
  onUnloadLocal: () => void;
  onRemoveLocal: () => void;
  saving: boolean;
  error?: string;
  onSave: () => void;
  onClose: () => void;
}

const PROVIDERS: TabItem<AiProvider>[] = [
  { key: 'openai', label: 'OpenAI' },
  { key: 'local', label: 'On-device' },
];

const LOCAL_LABELS: Record<AiLocalState, string> = {
  idle: 'Not loaded',
  downloading: 'Downloading',
  loading: 'Loading into memory',
  ready: 'Ready',
  error: 'Failed',
};

// Clamped so a stray value never overflows the track.
const toPercent = (value: number | undefined): number => value !== undefined && Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 0;

// Provider choice, hosted API key and model, or on-device model lifecycle.
export const AiSettingsSheet = (props: AiSettingsSheetProps): ReactElement => {
  const styles = useStyles();
  const { height } = useWindowDimensions();
  const { local } = props;
  const busy = local.state === 'downloading' || local.state === 'loading';
  const percent = toPercent(local.percentage);

  return (
    <BottomSheet visible={props.visible} title='AI settings' onClose={props.onClose} dismissible={!props.saving}>
      <View collapsable={false} style={styles.bodyFrame}>
        <ScrollView style={[styles.body, { maxHeight: Math.round(height * 0.55) }]} contentInsetAdjustmentBehavior='never' keyboardShouldPersistTaps='handled' contentContainerStyle={styles.content} nestedScrollEnabled>
          <Tabs items={PROVIDERS} selected={props.provider} onSelect={props.onChangeProvider} />
          {props.provider === 'openai'
            ? (
                <>
                  <TextField
                    label='OpenAI API key'
                    value={props.apiKey}
                    onChangeText={props.onChangeApiKey}
                    placeholder={props.hasApiKey ? 'Saved. Enter a new key to replace it.' : 'sk-…'}
                    secure
                    sensitive
                    returnKeyType='done'
                    submitBehavior='blurAndSubmit'
                    helper='Stored in the device keychain. Prompts and wallet data are sent to OpenAI.'
                    testID='ai-settings-api-key'
                  />
                  <View accessibilityRole='radiogroup' style={styles.models}>
                    <Text variant='meta' color='secondary'>Model</Text>
                    {props.modelOptions.map(option => (
                      <Radio key={option.value} label={option.label} selected={option.value === props.model} onSelect={() => props.onChangeModel(option.value)} />
                    ))}
                  </View>
                  {props.hasApiKey && (
                    <Button label='Remove API key' tone='destructiveText' onPress={props.onRemoveApiKey} testID='ai-settings-remove-key' />
                  )}
                </>
              )
            : (
                <>
                  <Text variant='meta' color='secondary'>The AI model runs on this device. About 1.4 GB download. Public blockchain MCP calls still use the network and may send wallet addresses and query parameters.</Text>
                  <View style={styles.status} testID='ai-settings-local-status'>
                    <Text variant='row'>
                      {LOCAL_LABELS[local.state]}
                      {local.state === 'downloading' ? ` ${percent}%` : ''}
                    </Text>
                    {local.state === 'downloading' && (
                      <View style={styles.track} accessible accessibilityLabel='Model download' accessibilityRole='progressbar' accessibilityValue={{ min: 0, max: 100, now: percent }}>
                        <View style={[styles.fill, { width: `${percent}%` }]} />
                      </View>
                    )}
                    {local.message && <Text variant='meta' color={local.state === 'error' ? 'error' : 'secondary'}>{local.message}</Text>}
                  </View>
                  <View style={styles.buttons}>
                    {local.state === 'ready'
                      ? <Button label='Unload' tone='secondary' onPress={props.onUnloadLocal} testID='ai-settings-unload' />
                      : <Button label='Download & load' tone='secondary' disabled={busy} onPress={props.onLoadLocal} testID='ai-settings-load' />}
                    <Button label='Delete' tone='destructiveOutline' disabled={busy} onPress={props.onRemoveLocal} testID='ai-settings-delete' />
                  </View>
                </>
              )}
        </ScrollView>
        {props.error && <InlineAlert tone='error' title={props.error} />}
        <Button label='Save' loading={props.saving} loadingLabel='Saving…' onPress={props.onSave} testID='ai-settings-save' />
      </View>
    </BottomSheet>
  );
};
