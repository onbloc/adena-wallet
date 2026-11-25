import { useEffect, useMemo, useRef, useState } from 'react';
import { fetch as expoFetch } from 'expo/fetch';
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

import { AIAgent, type AgentSettings, type PreparedTransaction } from '../../agent';
import { DEFAULT_BUDGET, Harness } from '../../harness/core';
import { createOnblocToolSource, GNO_MAINNET_CHAIN } from '../../harness/mcp';
import {
  chatSessionKey,
  DEFAULT_GENERATE_SETTINGS,
  TEMPERATURE_RANGE,
  type CallRecord,
  type LLM,
} from '../../llm/core';
import {
  DEFAULT_MODEL_ID,
  LLMOnDevice,
  MAX_OUTPUT_TOKENS_RANGE,
  useLlm,
  type RuntimeStatus,
} from '../../llm/device';
import { createLLM } from '../../llm/createLlm';
import { REMOTE_MODEL } from '../../llm/remote';
import { FIXTURE } from '../wallet/fixture';
import type { MockWalletSdk, WalletState } from '../wallet/mockWalletSdk';
import { createOnblocMockWallet } from '../wallet/onblocWallet';
import { TOKEN_SYMBOLS, type Balances } from '../wallet/tokens';
import {
  ARGUMENT_SCENARIOS,
  ENGLISH_SCENARIOS,
  FOLLOW_UP_SCENARIOS,
  KOREAN_SCENARIOS,
  READ_SCENARIOS,
  REPEAT_SCENARIOS,
  ROUTING_SCENARIOS,
  SCENARIOS,
  TYPO_SCENARIOS,
} from '../scenario/scenarios';
import { describeTransaction } from './describeTransaction';
import { useChatSession } from './useChatSession';
import { usePreparationHistory } from './usePreparationHistory';
import { BenchmarkLog } from './BenchmarkLog';
import { BENCHMARK_RUNS_RANGE, DEFAULT_BENCHMARK_RUNS, REPEAT_SETTINGS, useBenchmark } from './useBenchmark';
import { DEFAULT_ONBLOC_ACCOUNT, DEFAULT_ONBLOC_MCP_URL, resolveOnblocSettings } from './onblocSettings';
import { describeRuntime } from './describeRuntime';
import { LLM_SOURCES, resolveLlmSettings, type LlmSource } from './llmSettings';

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

const json = (value: unknown) => JSON.stringify(value) ?? 'undefined';
const compact = (text: string, max: number) => {
  const flat = text.replace(/\s+/g, ' ');
  return flat.length > max ? `${flat.slice(0, max)}...` : flat;
};

const EMPTY_WALLET: WalletState = { balances: {} };

// One on-device model for the app: a loaded model holds its memory. A hosted model is built from Settings.
const local = new LLMOnDevice();

// Hosted requests stream through expo/fetch; the key is entered in Settings and kept in memory only.
const LLM_SETTINGS_ENV = { fetch: expoFetch };

const LLM_SOURCE_LABELS: Record<LlmSource, string> = {
  device: 'On-device',
  openai: 'OpenAI',
};

/** The scenarios the Benchmark button runs, chosen in Settings. */
const BENCHMARK_SETS = {
  en: { label: 'English', scenarios: ENGLISH_SCENARIOS },
  ko: { label: 'Korean', scenarios: KOREAN_SCENARIOS },
  all: { label: 'Both', scenarios: SCENARIOS },
  typo: { label: 'Typos', scenarios: TYPO_SCENARIOS },
  args: { label: 'Arguments', scenarios: ARGUMENT_SCENARIOS },
  route: { label: 'Routing', scenarios: ROUTING_SCENARIOS },
  reads: { label: 'Reads', scenarios: READ_SCENARIOS },
  follow: { label: 'Follow-ups', scenarios: FOLLOW_UP_SCENARIOS },
  repeat: { label: 'Repeat', scenarios: REPEAT_SCENARIOS },
} as const;

export default function PlaygroundScreen() {
  const { status, run, start, stop, load, unload, remove } = useLlm(local);
  const [llmSource, setLlmSource] = useState<LlmSource>('device');
  const [apiKey, setApiKey] = useState('');
  const llmSettings = useMemo(() => resolveLlmSettings(llmSource, apiKey, LLM_SETTINGS_ENV), [llmSource, apiKey]);
  const remote = llmSettings.remote;
  const remoteMode = llmSource !== 'device';
  const llm: LLM = useMemo(() => (remote ? createLLM(remote) : local), [remote]);
  const bench = useBenchmark(llm);
  const [benchRuns, setBenchRuns] = useState(String(DEFAULT_BENCHMARK_RUNS));
  const [benchSet, setBenchSet] = useState<keyof typeof BENCHMARK_SETS>('all');
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
  const [allowTransactionPreparation, setAllowTransactionPreparation] = useState(false);
  // The mock wallet shown in Settings; `key` is the address it was created for.
  const [walletView, setWalletView] = useState<{ key: string; state: WalletState } | null>(null);
  // Prompt that started the last run, shown as the user message.
  const [submittedPrompt, setSubmittedPrompt] = useState<string | null>(null);
  const [remembered, setRemembered] = useState(false);
  // Only the summary is retained in memory; transaction objects are never persisted.
  const [prepared, setPrepared] = useState<PreparedTransaction['summary'][]>([]);
  const [tab, setTab] = useState<'chat' | 'settings'>('chat');
  // Editable Onbloc settings, in memory only. Clear both fields for a plain chat without the wallet.
  const [mcpUrl, setMcpUrl] = useState(DEFAULT_ONBLOC_MCP_URL);
  const [myAddress, setMyAddress] = useState(DEFAULT_ONBLOC_ACCOUNT);
  const onblocSettings = resolveOnblocSettings(mcpUrl, myAddress, __DEV__ ? true : undefined);
  const onblocMode = onblocSettings.enabled;
  const onbloc =
    onblocMode && onblocSettings.endpointError === null && onblocSettings.accountError === null
      ? {
          endpoint: onblocSettings.endpoint,
          account: onblocSettings.account,
          fetcher: expoFetch,
          ...(__DEV__ ? { allowLoopbackHttp: true as const } : {}),
        }
      : undefined;
  const walletScope = onbloc && {
    mode: 'onbloc' as const, endpoint: onbloc.endpoint, chainId: GNO_MAINNET_CHAIN, account: onbloc.account,
  };
  const scope = walletScope && useTools ? walletScope : { mode: 'plain' as const };
  const scopeKey = chatSessionKey(scope);
  const walletKey = walletScope && chatSessionKey(walletScope);
  const session = useChatSession(scope);
  const preparation = usePreparationHistory(walletScope);
  const wallet = walletKey && walletView?.key === walletKey ? walletView.state : EMPTY_WALLET;
  const [preparing, setPreparing] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [keyboardShown, setKeyboardShown] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);
  // Wallet kept across runs, so later runs reuse the loaded balances. One per address.
  const walletRef = useRef<{ key: string; sdk: MockWalletSdk } | null>(null);
  const visibleScope = useRef(scopeKey);
  const displayedRun = useRef<{ scope: string } | null>(null);
  const chat = tab === 'chat';

  useEffect(() => {
    visibleScope.current = scopeKey;
  }, [scopeKey]);
  useEffect(() => () => { displayedRun.current = null; }, []);

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

  const onResetWallet = () => {
    walletRef.current = null;
    setWalletView(null);
  };

  const clearDisplayedRun = () => {
    displayedRun.current = null;
    setSubmittedPrompt(null);
    setRemembered(false);
    setPrepared([]);
  };

  const clearChat = () => {
    session.reset();
    clearDisplayedRun();
  };

  const temperatureValue = parseBounded(temperature, TEMPERATURE_RANGE);
  const maxTokensValue = parseBounded(maxTokens, MAX_OUTPUT_TOKENS_RANGE, true);
  const benchRunsValue = parseBounded(benchRuns, BENCHMARK_RUNS_RANGE, true);
  // The Repeat set (with an empty prompt box) samples at temperature 0.7 instead of 0.
  const repeatChosen = benchSet === 'repeat' && prompt.trim() === '';

  const busy = !remoteMode && (status.state === 'downloading' || status.state === 'loading');
  const ready = remoteMode ? remote !== null : status.state === 'ready';
  const canRun =
    ready &&
    session.ready &&
    (!allowTransactionPreparation || preparation.ready) &&
    (!onblocMode || onbloc !== undefined) &&
    !preparing &&
    !run.running &&
    !bench.running &&
    prompt.trim() !== '' &&
    temperatureValue !== null &&
    maxTokensValue !== null;
  const canBenchmark = ready && !preparing && !run.running && !bench.running && benchRunsValue !== null;

  /** The mock wallet funded with the account's Onbloc balances; null (reason shown) if they cannot be read. */
  const ensureOnblocWallet = async (config: NonNullable<typeof onbloc>) => {
    const key = chatSessionKey({ mode: 'onbloc', endpoint: config.endpoint, chainId: GNO_MAINNET_CHAIN, account: config.account });
    if (walletRef.current?.key === key) return walletRef.current.sdk;
    setPreparing(true);
    try {
      const sdk = await createOnblocMockWallet({ onbloc: config });
      walletRef.current = { key, sdk };
      setWalletView({ key, state: sdk.inspect() });
      return sdk;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      setSetupError(`Could not load balances from Onbloc: ${reason}`);
      return null;
    } finally {
      setPreparing(false);
    }
  };

  const onRun = async () => {
    if (!canRun || temperatureValue === null || maxTokensValue === null || (onblocMode && !onbloc)) return;
    const text = prompt.trim();
    if (!text) return;
    const history = session.history;
    if (!history) return;
    setSetupError(null);
    // The read-only agent needs no mock wallet. Fund one only when preparation is enabled.
    const onblocWallet = onbloc && useTools && allowTransactionPreparation
      ? await ensureOnblocWallet(onbloc) : null;
    if (onbloc && useTools && allowTransactionPreparation && !onblocWallet) return;
    if (visibleScope.current !== scopeKey) return;
    const view = { scope: scopeKey };
    displayedRun.current = view;
    setSubmittedPrompt(text);
    setRemembered(false);
    setPrepared([]);
    // The prompt is now the user message in the chat: clear the composer.
    setPrompt('');
    const settings: AgentSettings = {
      prompt: text,
      // The agent brings its own system prompt; this only says when the wallet tools are switched off.
      system:
        onbloc && !useTools
          ? 'Wallet tools are disabled. Do not claim to have checked wallet data.'
          : undefined,
      temperature: temperatureValue,
      maxOutputTokens: maxTokensValue,
      reasoning: thinking ? 'provider-default' : 'none',
    };
    const previousTurn = session.turns.at(-1);
    await start((signal) => {
      const harness = new Harness({
        toolSources: onbloc && useTools ? [createOnblocToolSource(onbloc)] : [],
        budget: { ...DEFAULT_BUDGET, maxTokens: 2 * llm.contextTokens, timeoutMs: 5 * 60_000 },
      });
      const onTransaction = async ({ summary }: PreparedTransaction) => {
        // The persisted record is bound to this run's original scope, even after a switch.
        await preparation.record(summary.type);
        setPrepared((list) =>
          displayedRun.current === view && visibleScope.current === view.scope ? [...list, summary] : list
        );
      };
      const agent = onblocWallet
        ? new AIAgent({ llm, harness, wallet: onblocWallet, onTransaction, session: history, tokenSymbols: TOKEN_SYMBOLS })
        : new AIAgent({ llm, harness, session: history });
      return session.run(agent, settings, {
        account: useTools ? onbloc?.account : undefined, signal, allowTransactionPreparation: !!onblocWallet,
      });
    });
    if (displayedRun.current === view && visibleScope.current === view.scope) {
      const lastTurn = session.turns.at(-1);
      setRemembered(lastTurn !== undefined && lastTurn !== previousTurn && lastTurn.prompt === text);
    }
  };

  const sendDisabled = !run.running && !canRun;
  const benchDisabled = !bench.running && !canBenchmark;

  /** The benchmark header lines about the model; never the API key. */
  const describeLlm = () =>
    remote
      ? ['provider: openai', `model: ${REMOTE_MODEL}`, `context: ${llm.contextTokens} tokens (hosted)`]
      : [
          `model: ${DEFAULT_MODEL_ID}`,
          `context: n_ctx ${local.contextTokens}`,
          ...describeRuntime(local.runtimeInfo(), status.state === 'ready' ? status.loadMs : undefined),
        ];

  /** An empty prompt box runs every scenario; text in it runs that prompt alone. */
  const onBenchmark = () => {
    if (benchRunsValue === null) return;
    const text = prompt.trim();
    void bench.start(
      text === '' ? { kind: 'scenarios', scenarios: BENCHMARK_SETS[benchSet].scenarios } : { kind: 'prompt', prompt: text },
      benchRunsValue,
      describeLlm(),
      repeatChosen ? REPEAT_SETTINGS : undefined
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{remoteMode ? 'Hosted' : 'On-device'} LLM Playground</Text>
        <View style={styles.headerRow}>
          <Text style={[styles.status, styles.flex]} numberOfLines={2}>
            {remoteMode
              ? remote ? `Ready (openai: ${REMOTE_MODEL})` : 'Set the API key in Settings'
              : describeStatus(status)}
          </Text>
          {!remoteMode && <Button label="Load" onPress={() => void load()} disabled={busy || ready} />}
        </View>
        {!remoteMode && status.state === 'downloading' && (
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
          <Text style={styles.label}>Model</Text>
          <View style={styles.wrapRow}>
            {LLM_SOURCES.map((id) => (
              <Button
                key={id}
                label={`${llmSource === id ? '● ' : ''}${LLM_SOURCE_LABELS[id]}`}
                onPress={() => setLlmSource(id)}
                disabled={run.running || bench.running}
              />
            ))}
          </View>
          {remoteMode ? (
            <>
              <Text style={styles.mono}>{REMOTE_MODEL}</Text>
              <Text style={styles.label}>API key</Text>
              <TextInput
                style={[styles.input, llmSettings.keyError !== null && styles.invalid]}
                value={apiKey}
                onChangeText={setApiKey}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                placeholder="sk-..."
                editable={!run.running && !bench.running}
              />
              {llmSettings.keyError !== null && <Text style={styles.error}>{llmSettings.keyError}</Text>}
              <Text style={styles.muted}>
                The key stays in memory and is sent only to OpenAI. Runs and benchmarks are billed by
                OpenAI.
              </Text>
            </>
          ) : (
            <>
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
            </>
          )}

          <Text style={styles.label}>MCP URL (api-v3)</Text>
          <TextInput
            style={[styles.input, onblocSettings.endpointError !== null && styles.invalid]}
            value={mcpUrl}
            onChangeText={value => { clearDisplayedRun(); setAllowTransactionPreparation(false); setMcpUrl(value); }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="https://.../mcp"
            editable={!preparing && !run.running}
          />
          {onblocSettings.endpointError !== null && (
            <Text style={styles.error}>{onblocSettings.endpointError}</Text>
          )}
          <Text style={styles.label}>My address</Text>
          <TextInput
            style={[styles.input, onblocSettings.accountError !== null && styles.invalid]}
            value={myAddress}
            onChangeText={value => { clearDisplayedRun(); setAllowTransactionPreparation(false); setMyAddress(value); }}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="g1..."
            editable={!preparing && !run.running}
          />
          {onblocSettings.accountError !== null && (
            <Text style={styles.error}>{onblocSettings.accountError}</Text>
          )}
          {onblocMode ? (
            <>
              <Text style={styles.muted}>
                Reads use Onbloc api-v3 (mainnet). When enabled, transaction preparation uses a
                mock wallet funded from Onbloc balances; it never signs or sends.
              </Text>
              {onbloc && <BalancesCard wallet={wallet} activeAddress={onbloc.account} />}
              <View style={styles.row}>
                <Button label="Reset wallet" onPress={onResetWallet} disabled={run.running || preparing} />
              </View>
            </>
          ) : (
            <Text style={styles.muted}>
              No wallet: plain chat. Fill in both fields to enable the wallet tools.
            </Text>
          )}

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

          {onblocMode && (
            <View style={styles.rowCenter}>
              <Switch value={useTools} disabled={preparing || run.running} onValueChange={value => {
                clearDisplayedRun();
                setUseTools(value);
                if (!value) setAllowTransactionPreparation(false);
              }} />
              <Text style={styles.switchLabel}>Onbloc read tools</Text>
            </View>
          )}
          {onblocMode && (
            <View style={styles.rowCenter}>
              <Switch
                accessibilityLabel="Allow transaction preparation"
                value={allowTransactionPreparation}
                disabled={!onbloc || !useTools || preparing || run.running}
                onValueChange={setAllowTransactionPreparation}
              />
              <Text style={styles.switchLabel}>Allow mock transaction preparation</Text>
            </View>
          )}
          <View style={styles.row}>
            <Button label="Clear conversation" onPress={clearChat}
              disabled={preparing || run.running || !session.turns.length} />
          </View>
          <Text style={styles.label}>Benchmark runs ({BENCHMARK_RUNS_RANGE.min}-{BENCHMARK_RUNS_RANGE.max})</Text>
          <TextInput
            style={[styles.input, benchRunsValue === null && styles.invalid]}
            value={benchRuns}
            onChangeText={setBenchRuns}
            keyboardType="number-pad"
            editable={!bench.running}
          />
          <Text style={styles.label}>Benchmark scenarios</Text>
          <View style={styles.wrapRow}>
            {(Object.keys(BENCHMARK_SETS) as (keyof typeof BENCHMARK_SETS)[]).map((id) => (
              <Button
                key={id}
                label={`${benchSet === id ? '● ' : ''}${BENCHMARK_SETS[id].label} (${BENCHMARK_SETS[id].scenarios.length})`}
                onPress={() => setBenchSet(id)}
                disabled={bench.running}
              />
            ))}
          </View>
          <Text style={styles.muted}>
            Benchmark button: with an empty prompt box it runs the chosen scenarios this many times; with
            text in the box it runs that prompt (any language) this many times and counts the different
            transactions. Fixed: temperature 0, 512 output tokens, no thinking, a mock wallet and fake
            Onbloc reads (no network). Repeat samples at temperature 0.7 instead, to measure how often
            the model gets its hard cases right: set Benchmark runs to 30-100.
          </Text>
        </ScrollView>
      )}

      <ScrollView
        ref={scrollRef}
        style={[styles.flex, !chat && styles.hidden]}
        contentContainerStyle={styles.transcript}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onContentSizeChange={() => {
          if (chat) scrollRef.current?.scrollToEnd({ animated: run.running });
        }}
      >
        {onblocMode && !onbloc && <Text style={styles.error}>
          Fix the MCP URL and My address in Settings.
        </Text>}
        {onbloc && useTools && (
          <Text style={styles.muted}>
            {allowTransactionPreparation
              ? 'Transaction preparation enabled. Nothing is signed or sent.'
              : 'Read-only. Enable transaction preparation in Settings to prepare transfers or approvals.'}
          </Text>
        )}
        {preparing && <Text style={styles.muted}>Loading balances from Onbloc...</Text>}
        {setupError !== null && <Text style={styles.error}>{setupError}</Text>}
        {session.error && (
          <View>
            <Text style={styles.error}>{session.error}</Text>
            <Button label={session.ready ? 'Retry saving conversation' : 'Retry loading conversation'} onPress={session.retry} />
          </View>
        )}
        {!session.ready && !session.error && <Text style={styles.muted}>Loading conversation...</Text>}
        {preparation.error && (
          <View>
            <Text style={styles.error}>{preparation.error}</Text>
            <Button label={preparation.ready ? 'Retry saving preparation status' : 'Retry loading preparation status'} onPress={preparation.retry} />
          </View>
        )}
        {!preparation.ready && !preparation.error && <Text style={styles.muted}>Loading preparation history...</Text>}
        {preparation.prepared.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.label}>Preparation history</Text>
            {preparation.prepared.map((kind, index) => (
              <Text key={index} style={styles.mono}>
                {kind === 'transfer' ? 'Transfer' : 'Approval'} prepared.
              </Text>
            ))}
            <Text style={styles.muted}>
              This app did not sign or send these transactions. Later wallet activity is unknown.
              Transaction details were not saved and are not restored.
            </Text>
          </View>
        )}
        {session.turns.slice(0, submittedPrompt !== null && remembered ? -1 : undefined).map((turn, index) => (
          <View key={index}>
            <View style={styles.userBubble}><Text style={styles.userText} selectable>{turn.prompt}</Text></View>
            <Text style={styles.output} selectable>{turn.answer}</Text>
          </View>
        ))}
        {submittedPrompt === null && session.ready && !session.turns.length && (
          <Text style={styles.muted}>Send a prompt to start.</Text>
        )}
        {submittedPrompt !== null && (
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

            {(run.calls.length > 0 || run.metrics !== null) && onblocMode && useTools && (
              <CallLog calls={run.calls} />
            )}

            {run.running && run.text === '' && <Text style={styles.muted}>Generating...</Text>}
            <Text style={styles.output} selectable>
              {run.text}
            </Text>
            {run.aborted && <Text style={styles.muted}>(stopped)</Text>}

            {prepared.map((summary, index) => (
              <TransactionCard key={index} summary={summary} />
            ))}

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
        {bench.total > 0 && (
          <BenchmarkLog
            tail={bench.tail}
            total={bench.total}
            running={bench.running}
            getText={bench.text}
            onClear={bench.clear}
          />
        )}
      </ScrollView>

      <View style={[styles.composer, keyboardShown && styles.composerKeyboard, !chat && styles.hidden]}>
        <TextInput
          style={styles.composerInput}
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Ask anything"
          placeholderTextColor="#999"
          multiline
        />
        <View style={styles.composerFooter}>
          {(temperatureValue === null || maxTokensValue === null) && (
            <Text style={[styles.error, styles.flex]}>Check Temperature / Max tokens in Settings</Text>
          )}
          {benchRunsValue === null && (
            <Text style={[styles.error, styles.flex]}>Check Benchmark runs in Settings</Text>
          )}
          <Pressable
            onPress={() => (bench.running ? bench.stop() : onBenchmark())}
            disabled={benchDisabled}
            style={[styles.benchButton, benchDisabled && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>{bench.running ? 'Stop benchmark' : 'Benchmark'}</Text>
          </Pressable>
          <Pressable
            onPress={() => (run.running ? stop() : void onRun())}
            disabled={sendDisabled}
            style={[styles.sendButton, sendDisabled && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>{run.running ? 'Stop' : 'Run'}</Text>
          </Pressable>
        </View>
      </View>
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

/** The name of a contact, else a shortened address. */
const labelOf = (address: string) =>
  FIXTURE.contacts.find((contact) => contact.address === address)?.alias ??
  `${address.slice(0, 8)}...${address.slice(-6)}`;

function BalancesCard({ wallet, activeAddress }: { wallet: WalletState; activeAddress: string }) {
  // The own address first, then every other address the wallet holds something for.
  const addresses = [
    activeAddress,
    ...Object.keys(wallet.balances).filter((address) => address !== activeAddress),
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Mock wallet (funded from Onbloc)</Text>
      {addresses.map((address) => {
        const balances = wallet.balances[address];
        return (
          <Text key={address} style={styles.mono}>
            {address === activeAddress ? 'My address (you)' : labelOf(address)}:{' '}
            {balances ? formatBalances(balances) : 'loaded on the first run'}
          </Text>
        );
      })}
    </View>
  );
}

function TransactionCard({ summary }: { summary: PreparedTransaction['summary'] }) {
  const { title, rows } = describeTransaction(summary);
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{title}</Text>
      {rows.map(([label, value]) => (
        <Text key={label} style={styles.mono} selectable>
          {label}: {value}
        </Text>
      ))}
      <Text style={styles.muted}>Not signed. Sign it in your wallet.</Text>
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
  benchButton: {
    backgroundColor: '#6b7280',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  sendButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 18,
  },
  title: { fontSize: 20, fontWeight: '700' },
  card: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, gap: 6 },
  row: { flexDirection: 'row', gap: 8 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  callRow: { gap: 2 },
});
