import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  DEFAULT_GENERATE_SETTINGS,
  DEFAULT_MODEL_ID,
  GENERATION_MODE,
  MAX_OUTPUT_TOKENS_RANGE,
  STRUCTURED_SCHEMA,
  TEMPERATURE_RANGE,
} from '../llm/config';
import { tryParseJson } from '../llm/generate';
import type { RuntimeStatus } from '../llm/runtime';
import { useLlm } from '../llm/useLlm';

const structured = GENERATION_MODE === 'structured';

/** Parses user input; null when empty, non-numeric, non-integer (if required) or out of range. */
function parseBounded(
  input: string,
  { min, max }: { min: number; max: number },
  integer = false
): number | null {
  const value = Number(input);
  if (input.trim() === '' || !Number.isFinite(value)) return null;
  if (integer && !Number.isInteger(value)) return null;
  return value >= min && value <= max ? value : null;
}

function describeStatus(status: RuntimeStatus): string {
  switch (status.state) {
    case 'idle':
      return 'Not loaded';
    case 'downloading':
      return `Downloading ${status.percentage.toFixed(0)}%`;
    case 'loading':
      return 'Loading into memory...';
    case 'ready':
      return `Ready (loaded in ${(status.loadMs / 1000).toFixed(2)}s)`;
    case 'error':
      return `Error: ${status.message}`;
  }
}

const fmt = (value: number | null | undefined, unit: string, digits = 0) =>
  value === null || value === undefined ? '-' : `${value.toFixed(digits)} ${unit}`;

export default function PlaygroundScreen() {
  const { status, run, start, stop, load, unload, remove } = useLlm();
  const [system, setSystem] = useState('');
  const [prompt, setPrompt] = useState('');
  const [temperature, setTemperature] = useState(
    String(DEFAULT_GENERATE_SETTINGS.temperature)
  );
  const [maxTokens, setMaxTokens] = useState(
    String(DEFAULT_GENERATE_SETTINGS.maxOutputTokens)
  );
  const [thinking, setThinking] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);

  const temperatureValue = parseBounded(temperature, TEMPERATURE_RANGE);
  const maxTokensValue = parseBounded(maxTokens, MAX_OUTPUT_TOKENS_RANGE, true);

  const busy = status.state === 'downloading' || status.state === 'loading';
  const ready = status.state === 'ready';
  const canRun =
    ready &&
    !run.running &&
    prompt.trim() !== '' &&
    temperatureValue !== null &&
    maxTokensValue !== null;
  const parsedOutput =
    structured && !run.running && run.text !== '' ? tryParseJson(run.text) : null;

  const onRun = () => {
    if (temperatureValue === null || maxTokensValue === null) return;
    void start({
      prompt,
      system: system.trim() === '' ? undefined : system,
      temperature: temperatureValue,
      maxOutputTokens: maxTokensValue,
      reasoning: thinking ? 'provider-default' : 'none',
      schema: structured ? STRUCTURED_SCHEMA : undefined,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>
        On-device LLM Playground ({GENERATION_MODE})
      </Text>

      <View style={styles.card}>
        <Text style={styles.mono}>{DEFAULT_MODEL_ID}</Text>
        <Text style={styles.status}>{describeStatus(status)}</Text>
        {status.state === 'downloading' && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${status.percentage}%` }]} />
          </View>
        )}
        <View style={styles.row}>
          <Button label="Load" onPress={() => void load()} disabled={busy || ready} />
          <Button
            label="Unload"
            onPress={() => void unload()}
            disabled={busy || run.running || status.state === 'idle'}
          />
          <Button
            label="Delete file"
            onPress={() => void remove()}
            disabled={busy || run.running}
          />
        </View>
      </View>

      <Text style={styles.label}>System prompt (optional)</Text>
      <TextInput style={styles.input} value={system} onChangeText={setSystem} multiline />

      <Text style={styles.label}>Prompt</Text>
      <TextInput style={styles.input} value={prompt} onChangeText={setPrompt} multiline />

      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={styles.label}>
            Temperature ({TEMPERATURE_RANGE.min}-{TEMPERATURE_RANGE.max})
          </Text>
          <TextInput
            style={[styles.input, temperatureValue === null && styles.invalid]}
            value={temperature}
            onChangeText={setTemperature}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={styles.flex}>
          <Text style={styles.label}>
            Max tokens ({MAX_OUTPUT_TOKENS_RANGE.min}-{MAX_OUTPUT_TOKENS_RANGE.max})
          </Text>
          <TextInput
            style={[styles.input, maxTokensValue === null && styles.invalid]}
            value={maxTokens}
            onChangeText={setMaxTokens}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <View style={styles.rowCenter}>
        <Switch value={thinking && !structured} onValueChange={setThinking} disabled={structured} />
        <Text style={styles.switchLabel}>
          Thinking (reasoning){structured ? ' - disabled in structured mode' : ''}
        </Text>
      </View>

      <View style={styles.row}>
        <Button label="Run" onPress={onRun} disabled={!canRun} />
        <Button label="Stop" onPress={stop} disabled={!run.running} />
      </View>

      {run.error !== null && <Text style={styles.error}>{run.error}</Text>}
      {run.warnings.map((warning, index) => (
        <Text key={`${index}:${warning}`} style={styles.warning}>
          Warning: {warning}
        </Text>
      ))}

      <Text style={styles.label}>
        Output{run.aborted ? ' (stopped)' : ''}
      </Text>
      {parsedOutput && (
        <Text style={parsedOutput.valid ? styles.ok : styles.error}>
          {parsedOutput.valid ? 'Valid JSON' : `Invalid JSON: ${parsedOutput.error}`}
        </Text>
      )}
      <Text style={styles.output} selectable>
        {parsedOutput?.valid ? JSON.stringify(parsedOutput.value, null, 2) : run.text}
      </Text>

      {run.reasoning !== '' && (
        <>
          <Pressable onPress={() => setShowReasoning((value) => !value)}>
            <Text style={styles.link}>
              {showReasoning ? 'Hide' : 'Show'} reasoning ({run.reasoning.length} chars)
            </Text>
          </Pressable>
          {showReasoning && (
            <Text style={[styles.output, styles.muted]} selectable>
              {run.reasoning}
            </Text>
          )}
        </>
      )}

      {run.metrics && (
        <View style={styles.card}>
          <Text style={styles.mono}>TTFT: {fmt(run.metrics.ttftMs, 'ms')}</Text>
          <Text style={styles.mono}>Total: {fmt(run.metrics.totalMs, 'ms')}</Text>
          <Text style={styles.mono}>Output tokens: {run.metrics.outputTokens ?? '-'}</Text>
          <Text style={styles.mono}>Speed: {fmt(run.metrics.tokensPerSec, 'tok/s', 1)}</Text>
          {structured && (
            <Text style={styles.muted}>
              Structured output is not streamed: TTFT and speed are unavailable.
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function Button({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, disabled && styles.buttonDisabled]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingTop: 64, gap: 8 },
  title: { fontSize: 20, fontWeight: '700' },
  card: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, gap: 6 },
  row: { flexDirection: 'row', gap: 8 },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 8,
    minHeight: 40,
    textAlignVertical: 'top',
  },
  invalid: { borderColor: '#d33' },
  switchLabel: { fontSize: 14 },
  status: { fontSize: 14 },
  mono: { fontFamily: 'Courier', fontSize: 12 },
  progressTrack: { height: 6, backgroundColor: '#eee', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#2563eb' },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  buttonDisabled: { backgroundColor: '#9db7ec' },
  buttonText: { color: '#fff', fontWeight: '600' },
  output: { fontSize: 14, minHeight: 20 },
  muted: { color: '#666' },
  link: { color: '#2563eb', fontSize: 13 },
  error: { color: '#d33' },
  warning: { color: '#b45309' },
  ok: { color: '#15803d' },
});
