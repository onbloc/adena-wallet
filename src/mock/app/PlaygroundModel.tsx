import { Text, TextInput, View } from 'react-native';

import { DEFAULT_MODEL_ID, type RuntimeStatus } from '../../llm/device';
import { DEFAULT_REMOTE_MODEL } from '../../llm/remote';
import { LLM_SOURCES, type LlmSource } from './llmSettings';
import { Button } from './PlaygroundButton';
import { styles } from './playgroundStyles';

const LLM_SOURCE_LABELS: Record<LlmSource, string> = { device: 'On-device', openai: 'OpenAI' };

export function modelLifecycleBusy(status: RuntimeStatus) {
  return status.state === 'downloading' || status.state === 'loading' || status.state === 'unloading';
}

function describeStatus(status: RuntimeStatus): string {
  switch (status.state) {
    case 'idle': return 'Not loaded';
    case 'downloading': return `Downloading ${status.percentage.toFixed(0)}%`;
    case 'loading': return 'Loading into memory...';
    case 'unloading': return 'Unloading from memory...';
    case 'ready': return `Ready (loaded in ${(status.loadMs / 1000).toFixed(2)}s)`;
    case 'error': return `Error: ${status.message}`;
  }
}

type Activity = { preparing: boolean; running: boolean; benchmarking: boolean };

export function modelControlsBlocked(status: RuntimeStatus, activity: Activity) {
  return modelLifecycleBusy(status) || activity.preparing || activity.running || activity.benchmarking;
}

type HeaderProps = {
  status: RuntimeStatus;
  remoteMode: boolean;
  remoteReady: boolean;
  blocked: boolean;
  load: () => Promise<void>;
};

export function ModelHeader({ status, remoteMode, remoteReady, blocked, load }: HeaderProps) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{remoteMode ? 'Hosted' : 'On-device'} LLM Playground</Text>
      <View style={styles.headerRow}>
        <Text style={[styles.status, styles.flex]} numberOfLines={2}>
          {remoteMode
            ? remoteReady ? `Ready (openai: ${DEFAULT_REMOTE_MODEL})` : 'Set the API key in Settings'
            : describeStatus(status)}
        </Text>
        {!remoteMode && <Button label="Load" onPress={() => { if (!blocked && status.state !== 'ready') void load(); }} disabled={blocked || status.state === 'ready'} />}
      </View>
      {!remoteMode && status.state === 'downloading' && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${status.percentage}%` }]} />
        </View>
      )}
    </View>
  );
}

type ModelSettingsProps = {
  status: RuntimeStatus;
  source: LlmSource;
  apiKey: string;
  keyError: string | null;
  blocked: boolean;
  onSourceChange: (source: LlmSource) => void;
  onApiKeyChange: (key: string) => void;
  unload: () => Promise<void>;
  remove: () => Promise<void>;
};

export function ModelSettings({ status, source, apiKey, keyError, blocked, onSourceChange, onApiKeyChange, unload, remove }: ModelSettingsProps) {
  return (
    <>
      <Text style={styles.label}>Model</Text>
      <View style={styles.wrapRow}>
        {LLM_SOURCES.map((id) => (
          <Button key={id} label={`${source === id ? '● ' : ''}${LLM_SOURCE_LABELS[id]}`}
            onPress={() => { if (!blocked) onSourceChange(id); }} disabled={blocked} />
        ))}
      </View>
      {source !== 'device' ? (
        <>
          <Text style={styles.mono}>{DEFAULT_REMOTE_MODEL}</Text>
          <Text style={styles.label}>API key</Text>
          <TextInput style={[styles.input, keyError !== null && styles.invalid]} value={apiKey}
            onChangeText={(value) => { if (!blocked) onApiKeyChange(value); }} secureTextEntry
            autoCapitalize="none" autoCorrect={false} autoComplete="off" placeholder="sk-..." editable={!blocked} />
          {keyError !== null && <Text style={styles.error}>{keyError}</Text>}
          <Text style={styles.muted}>
            The key stays in memory and is sent only to OpenAI. Runs and benchmarks are billed by
            OpenAI.
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.mono}>{DEFAULT_MODEL_ID}</Text>
          <View style={styles.row}>
            <Button label="Unload" onPress={() => { if (!blocked && status.state !== 'idle') void unload(); }} disabled={blocked || status.state === 'idle'} />
            <Button label="Delete file" onPress={() => { if (!blocked) void remove(); }} disabled={blocked} />
          </View>
        </>
      )}
    </>
  );
}
