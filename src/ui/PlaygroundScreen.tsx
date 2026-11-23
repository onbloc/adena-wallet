import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
} from 'react-native';

import type { CallRecord } from '../llm/calls';
import {
  DEFAULT_GENERATE_SETTINGS,
  DEFAULT_MODEL_ID,
  MAX_OUTPUT_TOKENS_RANGE,
  MAX_STEPS,
  TEMPERATURE_RANGE,
} from '../llm/config';
import type { RuntimeStatus } from '../llm/runtime';
import { useLlm } from '../llm/useLlm';
import { createWalletTools } from '../wallet/adapter/tools';
import { ApprovalPolicy } from '../wallet/constants';
import { evaluateScenario, type Verdict } from '../wallet/evaluate';
import { snapshotBalances, WATCHED } from '../wallet/observation';
import { buildSystemPrompt } from '../wallet/prompts';
import { SCENARIOS, type Scenario } from '../wallet/scenarios';
import { autoApproval } from '../wallet/sdk/approval';
import { ACTIVE_ADDRESS, FIXTURE } from '../wallet/sdk/fixture';
import { MockWalletSdk, type ApprovalRecord } from '../wallet/sdk/mockWalletSdk';
import type { Allowance, Balances } from '../wallet/sdk/types';
import { ApprovalModal } from './ApprovalModal';
import { useApprovalPrompt } from './useApprovalPrompt';

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

const DEFAULT_SYSTEM = buildSystemPrompt({ contacts: FIXTURE.contacts });

const json = (value: unknown) => JSON.stringify(value) ?? 'undefined';
const compact = (text: string, max: number) => {
  const flat = text.replace(/\s+/g, ' ');
  return flat.length > max ? `${flat.slice(0, max)}...` : flat;
};

/** What a finished run left behind in the wallet. */
type WalletSnapshot = {
  approvals: readonly ApprovalRecord[];
  balances: Record<string, Balances>;
  allowances: readonly Allowance[];
};

/** Balances of a wallet nobody has used yet. */
const initialBalances = () =>
  snapshotBalances(new MockWalletSdk({ requestApproval: autoApproval(ApprovalPolicy.Reject) }));

export default function PlaygroundScreen() {
  const { status, run, start, stop, load, unload, remove } = useLlm();
  const approvalPrompt = useApprovalPrompt();
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
  const [balances, setBalances] = useState<Record<string, Balances> | null>(null);
  const [snapshot, setSnapshot] = useState<WalletSnapshot | null>(null);
  // Prompt that started the last run, shown as the user message.
  const [submittedPrompt, setSubmittedPrompt] = useState<string | null>(null);
  const [tab, setTab] = useState<'chat' | 'settings'>('chat');
  const [keyboardShown, setKeyboardShown] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);
  // Wallet kept across free-prompt runs, so a transfer shows up in later balance lookups.
  const walletRef = useRef<MockWalletSdk | null>(null);
  const chat = tab === 'chat';

  // Drops the home-indicator padding while the keyboard covers it.
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', () =>
      setKeyboardShown(true)
    );
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      setKeyboardShown(false)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Initial balances, before any run.
  useEffect(() => {
    void initialBalances().then(setBalances);
  }, []);

  const onResetWallet = () => {
    walletRef.current = null;
    void initialBalances().then(setBalances);
  };

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
    snapshot !== null &&
    !run.running &&
    run.metrics !== null &&
    !run.aborted &&
    run.error === null
      ? evaluateScenario(ranScenario, {
          calls: run.calls,
          answer: run.text,
          approvals: snapshot.approvals,
          balances: snapshot.balances,
          allowances: snapshot.allowances,
        })
      : null;

  const selectScenario = (item: Scenario) => {
    setScenarioId(item.id);
    setPrompt(item.prompt);
  };
  const onPromptChange = (text: string) => {
    setPrompt(text);
    if (scenario && text !== scenario.prompt) setScenarioId(null);
  };

  const onRun = async () => {
    if (temperatureValue === null || maxTokensValue === null) return;
    setSubmittedPrompt(prompt);
    // Scenarios start from a fresh wallet so they are judged on the same balances;
    // free prompts continue on the session wallet.
    const scenarioRun = useTools && scenario !== null;
    if (scenarioRun || walletRef.current === null) {
      walletRef.current = new MockWalletSdk({ requestApproval: approvalPrompt.requestApproval });
    }
    const sdk = walletRef.current;
    setRanScenario(scenarioRun ? scenario : null);
    setSnapshot(null);
    setBalances(await snapshotBalances(sdk));

    await start({
      prompt,
      system: system.trim() === '' ? undefined : system,
      temperature: temperatureValue,
      maxOutputTokens: maxTokensValue,
      reasoning: thinking ? 'provider-default' : 'none',
      tools: useTools ? createWalletTools({ sdk, activeAddress: ACTIVE_ADDRESS }) : undefined,
      maxSteps: useTools ? MAX_STEPS : undefined,
    });

    const after = await snapshotBalances(sdk);
    setBalances(after);
    setSnapshot({
      approvals: [...sdk.approvals],
      balances: after,
      allowances: await sdk.getAllowances(ACTIVE_ADDRESS),
    });
  };

  const sendDisabled = !run.running && !canRun;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.title}>On-device LLM Playground</Text>
        <View style={styles.headerRow}>
          <Text style={[styles.status, styles.flex]} numberOfLines={2}>
            {describeStatus(status)}
          </Text>
          <Button label="Load" onPress={() => void load()} disabled={busy || ready} />
        </View>
        {status.state === 'downloading' && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${status.percentage}%` }]} />
          </View>
        )}
      </View>

      <View style={styles.tabs}>
        {(['chat', 'settings'] as const).map((id) => (
          <Pressable
            key={id}
            onPress={() => setTab(id)}
            style={[styles.tab, tab === id && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === id && styles.tabTextActive]}>
              {id === 'chat' ? 'Chat' : 'Settings'}
            </Text>
          </Pressable>
        ))}
      </View>

      {!chat && (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.settingsContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.mono}>{DEFAULT_MODEL_ID}</Text>
          <View style={styles.row}>
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

          <BalancesCard balances={balances} />
          <View style={styles.row}>
            <Button label="Reset wallet" onPress={onResetWallet} disabled={run.running} />
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
        </ScrollView>
      )}

      <ScrollView
        ref={scrollRef}
        style={[styles.flex, !chat && styles.hidden]}
        contentContainerStyle={styles.transcript}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onContentSizeChange={() => {
          if (run.running) scrollRef.current?.scrollToEnd({ animated: true });
        }}
      >
        {submittedPrompt === null ? (
          <Text style={styles.muted}>Send a prompt to start.</Text>
        ) : (
          <>
            <View style={styles.userBubble}>
              <Text style={styles.userText} selectable>
                {submittedPrompt}
              </Text>
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

            {run.running && run.text === '' && <Text style={styles.muted}>Generating...</Text>}
            <Text style={styles.output} selectable>
              {run.text}
            </Text>
            {run.aborted && <Text style={styles.muted}>(stopped)</Text>}

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
          </>
        )}
      </ScrollView>

      <View style={[styles.composer, keyboardShown && styles.composerKeyboard, !chat && styles.hidden]}>
        <TextInput
          style={styles.composerInput}
          value={prompt}
          onChangeText={onPromptChange}
          placeholder="Ask anything"
          placeholderTextColor="#999"
          multiline
        />
        <View style={styles.composerFooter}>
          {(temperatureValue === null || maxTokensValue === null) && (
            <Text style={[styles.error, styles.flex]}>Check Temperature / Max tokens in Settings</Text>
          )}
          <Pressable
            onPress={() => (run.running ? stop() : void onRun())}
            disabled={sendDisabled}
            style={[styles.sendButton, sendDisabled && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>{run.running ? 'Stop' : 'Run'}</Text>
          </Pressable>
        </View>
      </View>

      <ApprovalModal
        request={approvalPrompt.current}
        onApprove={approvalPrompt.approve}
        onReject={approvalPrompt.reject}
      />
    </KeyboardAvoidingView>
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

const formatBalances = (balances: Balances) =>
  Object.entries(balances)
    .map(([token, amount]) => `${amount} ${token}`)
    .join(', ');

function BalancesCard({ balances }: { balances: Record<string, Balances> | null }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Wallet balances (mock)</Text>
      {balances === null && <Text style={styles.muted}>Loading...</Text>}
      {balances !== null &&
        WATCHED.map((watched) => (
          <Text key={watched.address} style={styles.mono}>
            {watched.label}
            {watched.address === ACTIVE_ADDRESS ? ' (you)' : ''}: {formatBalances(balances[watched.address])}
          </Text>
        ))}
    </View>
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
      {scenario.approvalRequests !== undefined && (
        <Text style={styles.mono}>
          signing popups: {scenario.approvalRequests}
          {scenario.approvalRequests > 0
            ? ` (press ${scenario.approval === ApprovalPolicy.Reject ? 'Reject' : 'Approve'})`
            : ''}
        </Text>
      )}
      {scenario.balances?.map((expected) => (
        <Text key={`${expected.address}:${expected.token}`} style={styles.mono}>
          {`balance ${expected.address.slice(0, 8)}... = ${expected.amount} ${expected.token}`}
        </Text>
      ))}
    </View>
  );
}

function CallLog({ calls }: { calls: CallRecord[] }) {
  const [open, setOpen] = useState(false);
  const invalid = calls.filter((call) => call.invalid).length;
  return (
    <View style={styles.card}>
      <Pressable onPress={() => setOpen((value) => !value)}>
        <Text style={styles.label}>
          {open ? '▾' : '▸'} Tool calls ({calls.length})
          {invalid > 0 ? ` - ${invalid} invalid` : ''}
        </Text>
      </Pressable>
      {open && calls.length === 0 && <Text style={styles.muted}>The model made no tool call.</Text>}
      {open &&
        calls.map((call, index) => (
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
  screen: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 8, gap: 6 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  // Chat stays mounted behind the settings tab, so scroll position and folds survive.
  hidden: { display: 'none' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderColor: 'transparent' },
  tabActive: { borderColor: '#2563eb' },
  tabText: { fontSize: 15, color: '#666' },
  tabTextActive: { color: '#2563eb', fontWeight: '700' },
  settingsContent: { padding: 16, gap: 8 },
  transcript: { padding: 16, gap: 8, flexGrow: 1 },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  userText: { fontSize: 15 },
  composer: {
    marginHorizontal: 12,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 24,
    padding: 12,
    backgroundColor: '#fff',
  },
  composerKeyboard: { marginBottom: 8 },
  composerInput: {
    minHeight: 72,
    maxHeight: 180,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  composerFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  sendButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 18,
  },
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
