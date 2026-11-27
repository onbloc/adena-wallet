import { useEffect, useMemo, useRef, useState } from 'react';
import { fetch as expoFetch } from 'expo/fetch';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AIAgent, type AgentSettings, type PreparedTransaction } from '../../agent';
import { DEFAULT_BUDGET, Harness } from '../../harness/core';
import { createOnblocToolSource, GNO_MAINNET_CHAIN } from '../../harness/mcp';
import {
  chatSessionKey,
  DEFAULT_GENERATE_SETTINGS,
  TEMPERATURE_RANGE,
  type LLM,
} from '../../llm/core';
import {
  createLLM,
  DEFAULT_MODEL_ID,
  MAX_OUTPUT_TOKENS_RANGE,
  useLlm,
} from '../../llm/device';
import { REMOTE_MODEL } from '../../llm/remote';
import { FIXTURE } from '../wallet/fixture';
import type { MockWalletSdk, WalletState } from '../wallet/mockWalletSdk';
import { createOnblocMockWallet } from '../wallet/onblocWallet';
import { TOKEN_SYMBOLS, type Balances } from '../wallet/tokens';
import { useChatSession } from './useChatSession';
import { usePreparationHistory } from './usePreparationHistory';
import { BENCHMARK_RUNS_RANGE, DEFAULT_BENCHMARK_RUNS, REPEAT_SETTINGS, useBenchmark } from './useBenchmark';
import { DEFAULT_ONBLOC_ACCOUNT, DEFAULT_ONBLOC_MCP_URL, resolveOnblocSettings } from './onblocSettings';
import { describeRuntime } from './describeRuntime';
import { resolveLlmSettings, type LlmSource } from './llmSettings';
import { Button } from './PlaygroundButton';
import { ModelHeader, ModelSettings, modelControlsBlocked } from './PlaygroundModel';
import { BENCHMARK_SETS, BenchmarkSettings, GenerationSettings } from './PlaygroundSettings';
import { PlaygroundTranscript } from './PlaygroundTranscript';
import { styles } from './playgroundStyles';

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

const EMPTY_WALLET: WalletState = { balances: {} };

// One on-device model for the app: a loaded model holds its memory. A hosted model is built from Settings.
const local = createLLM({ kind: 'local' });

// Hosted requests stream through expo/fetch; the key is entered in Settings and kept in memory only.
const LLM_SETTINGS_ENV = { fetch: expoFetch };


export default function PlaygroundScreen() {
  const { status, run, start, stop, load, unload, remove } = useLlm(local);
  const [llmSource, setLlmSource] = useState<LlmSource>('device');
  const [apiKey, setApiKey] = useState('');
  const llmSettings = useMemo(() => resolveLlmSettings(llmSource, apiKey, LLM_SETTINGS_ENV), [llmSource, apiKey]);
  const remote = llmSettings.remote;
  const remoteMode = llmSource !== 'device';
  const llm: LLM = useMemo(() => (remote ? createLLM({ kind: 'remote', ...remote }) : local), [remote]);
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
  // Wallet kept across runs, so later runs reuse the loaded balances. One per address.
  const walletRef = useRef<{ key: string; sdk: MockWalletSdk } | null>(null);
  const agentRef = useRef<{
    scope: string;
    agent: AIAgent;
    handoff: { current: (transaction: PreparedTransaction) => Promise<void> };
  } | null>(null);
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

  const lifecycleBlocked = modelControlsBlocked(status, { preparing, running: run.running, benchmarking: bench.running });
  const ready = remoteMode ? remote !== null : status.state === 'ready';
  const canRun =
    ready && !lifecycleBlocked &&
    session.ready &&
    (!allowTransactionPreparation || preparation.ready) &&
    (!onblocMode || onbloc !== undefined) &&
    prompt.trim() !== '' &&
    temperatureValue !== null &&
    maxTokensValue !== null;
  const canBenchmark = ready && !lifecycleBlocked && benchRunsValue !== null;

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
      const onTransaction = async ({ summary }: PreparedTransaction) => {
        // The persisted record is bound to this run's original scope, even after a switch.
        await preparation.record(summary.type);
        setPrepared((list) =>
          displayedRun.current === view && visibleScope.current === view.scope ? [...list, summary] : list
        );
      };
      let entry = agentRef.current;
      if (!entry || entry.scope !== scopeKey || entry.agent.llm !== llm ||
        entry.agent.session !== history || entry.agent.wallet !== (onblocWallet ?? undefined)) {
        const harness = new Harness({
          toolSources: onbloc && useTools ? [createOnblocToolSource(onbloc)] : [],
          budget: { ...DEFAULT_BUDGET, maxTokens: 2 * llm.contextTokens, timeoutMs: 5 * 60_000 },
        });
        const handoff = { current: onTransaction };
        const agent = onblocWallet
          ? new AIAgent({ llm, harness, wallet: onblocWallet, onTransaction: tx => handoff.current(tx), session: history, tokenSymbols: TOKEN_SYMBOLS })
          : new AIAgent({ llm, harness, session: history });
        entry = { scope: scopeKey, agent, handoff };
        agentRef.current = entry;
      } else {
        entry.handoff.current = onTransaction;
      }
      return session.run(entry.agent, settings, {
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
    if (!canBenchmark || benchRunsValue === null) return;
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
      <ModelHeader status={status} remoteMode={remoteMode} remoteReady={remote !== null}
        blocked={lifecycleBlocked} load={load} />

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
          <ModelSettings status={status} source={llmSource} apiKey={apiKey}
            keyError={llmSettings.keyError} blocked={lifecycleBlocked}
            onSourceChange={setLlmSource} onApiKeyChange={setApiKey} unload={unload} remove={remove} />

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

          <GenerationSettings temperature={temperature} temperatureValue={temperatureValue}
            setTemperature={setTemperature} maxTokens={maxTokens} maxTokensValue={maxTokensValue}
            setMaxTokens={setMaxTokens} thinking={thinking} setThinking={setThinking} />

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
          <BenchmarkSettings benchRuns={benchRuns} benchRunsValue={benchRunsValue} setBenchRuns={setBenchRuns}
            benchSet={benchSet} setBenchSet={setBenchSet} running={bench.running} />
        </ScrollView>
      )}

      <PlaygroundTranscript
        chat={chat} onblocMode={onblocMode} onbloc={!!onbloc} useTools={useTools}
        allowTransactionPreparation={allowTransactionPreparation} preparing={preparing}
        setupError={setupError} session={session} preparation={preparation} run={run} bench={bench}
        submittedPrompt={submittedPrompt} remembered={remembered} prepared={prepared}
      />

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
