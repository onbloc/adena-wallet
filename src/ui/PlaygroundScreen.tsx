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
  MAX_OUTPUT_TOKENS_RANGE,
  MAX_STEPS,
  TEMPERATURE_RANGE,
} from '../llm/config';
import type { CallRecord } from '../llm/calls';
import type { RuntimeStatus } from '../llm/runtime';
import { useLlm } from '../llm/useLlm';
import { evaluateScenario, type Verdict } from '../wallet/evaluate';
import { MockWallet } from '../wallet/mockWallet';
import { buildSystemPrompt } from '../wallet/prompts';
import { SCENARIOS, type Scenario } from '../wallet/scenarios';
import { createWalletTools } from '../wallet/tools';

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

// One wallet for the screen; reset before every run.
const wallet = new MockWallet();
const DEFAULT_SYSTEM = buildSystemPrompt(wallet);

const json = (value: unknown) => JSON.stringify(value) ?? 'undefined';
const compact = (text: string, max: number) => {
  const flat = text.replace(/\s+/g, ' ');
  return flat.length > max ? `${flat.slice(0, max)}...` : flat;
};

export default function PlaygroundScreen() {
  const { status, run, start, stop, load, unload, remove } = useLlm();
  const [system, setSystem] = useState(DEFAULT_SYSTEM);
  const [prompt, setPrompt] = useState('');
  const [temperature, setTemperature] = useState(
    String(DEFAULT_GENERATE_SETTINGS.temperature)
  );
  const [maxTokens, setMaxTokens] = useState(
    String(DEFAULT_GENERATE_SETTINGS.maxOutputTokens)
  );
  const [thinking, setThinking] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [useTools, setUseTools] = useState(true);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  // The scenario that was selected when the last run started.
  const [ranScenario, setRanScenario] = useState<Scenario | null>(null);

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

  const scenario = SCENARIOS.find((item) => item.id === scenarioId) ?? null;
  const verdict: Verdict | null =
    ranScenario !== null &&
    !run.running &&
    run.metrics !== null &&
    !run.aborted &&
    run.error === null
      ? evaluateScenario(ranScenario, run.calls, run.text)
      : null;

  const selectScenario = (item: Scenario) => {
    setScenarioId(item.id);
    setPrompt(item.prompt);
  };
  const onPromptChange = (text: string) => {
    setPrompt(text);
    if (scenario && text !== scenario.prompt) setScenarioId(null);
  };

  const onRun = () => {
    if (temperatureValue === null || maxTokensValue === null) return;
    wallet.reset();
    setRanScenario(useTools ? scenario : null);
    void start({
      prompt,
      system: system.trim() === '' ? undefined : system,
      temperature: temperatureValue,
      maxOutputTokens: maxTokensValue,
      reasoning: thinking ? 'provider-default' : 'none',
      tools: useTools ? createWalletTools(wallet) : undefined,
      maxSteps: useTools ? MAX_STEPS : undefined,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>On-device LLM Playground</Text>

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

      <Text style={styles.label}>Scenarios</Text>
      <View style={styles.chips}>
        {SCENARIOS.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => selectScenario(item)}
            style={[styles.chip, item.id === scenarioId && styles.chipActive]}
          >
            <Text style={[styles.chipText, item.id === scenarioId && styles.chipTextActive]}>
              {item.title}
            </Text>
          </Pressable>
        ))}
      </View>
      {scenario && <ScenarioExpectation scenario={scenario} />}

      <Text style={styles.label}>Prompt</Text>
      <TextInput style={styles.input} value={prompt} onChangeText={onPromptChange} multiline />

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
        <Switch value={thinking} onValueChange={setThinking} />
        <Text style={styles.switchLabel}>Thinking (reasoning)</Text>
      </View>

      <View style={styles.rowCenter}>
        <Switch value={useTools} onValueChange={setUseTools} />
        <Text style={styles.switchLabel}>Wallet tools (mock, max {MAX_STEPS} steps)</Text>
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

      {(run.calls.length > 0 || run.metrics !== null) && useTools && (
        <CallLog calls={run.calls} />
      )}

      <Text style={styles.label}>
        Output{run.aborted ? ' (stopped)' : ''}
      </Text>
      <Text style={styles.output} selectable>
        {run.text}
      </Text>

      {verdict && ranScenario && <VerdictView scenario={ranScenario} verdict={verdict} />}

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

function ScenarioExpectation({ scenario }: { scenario: Scenario }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Expected</Text>
      {scenario.calls.map((call, index) => (
        <Text key={index} style={styles.mono}>
          {index + 1}. {call.tool}({json(call.args ?? {})})
        </Text>
      ))}
      {scenario.forbid?.map((tool) => (
        <Text key={tool} style={styles.mono}>
          never call {tool}
        </Text>
      ))}
      {scenario.answerMentions?.map((word) => (
        <Text key={word} style={styles.mono}>
          {`answer mentions "${word}"`}
        </Text>
      ))}
    </View>
  );
}

function CallLog({ calls }: { calls: CallRecord[] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Tool calls ({calls.length})</Text>
      {calls.length === 0 && <Text style={styles.muted}>The model made no tool call.</Text>}
      {calls.map((call, index) => (
        <View key={call.id} style={styles.callRow}>
          <Text style={[styles.mono, call.invalid && styles.error]}>
            #{index + 1} {call.name}({json(call.input)}){call.invalid ? '  [INVALID]' : ''}
          </Text>
          {call.error !== undefined && (
            <Text style={styles.error}>{compact(call.error, 300)}</Text>
          )}
          {call.output !== undefined && (
            <Text style={styles.mono}>-&gt; {json(call.output)}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

function VerdictView({ scenario, verdict }: { scenario: Scenario; verdict: Verdict }) {
  return (
    <View style={styles.card}>
      <Text style={verdict.pass ? styles.ok : styles.error}>
        {verdict.pass ? 'PASS' : 'FAIL'} - {scenario.title}
      </Text>
      {verdict.checks.map((check) => (
        <Text key={check.name} style={[styles.mono, !check.pass && styles.error]}>
          {check.pass ? '[ok]' : '[x]'} {check.name}
          {check.pass ? '' : `\n    ${compact(check.detail, 300)}`}
        </Text>
      ))}
    </View>
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
  ok: { color: '#15803d', fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  chipActive: { backgroundColor: '#2563eb' },
  chipText: { color: '#2563eb', fontSize: 12 },
  chipTextActive: { color: '#fff' },
  callRow: { gap: 2 },
});
