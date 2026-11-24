import { useEffect, useRef, useState } from 'react';
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

import { AIAgent, type Balances } from '../../agent';
import { Harness } from '../../harness/core';
import { createOnblocToolSource } from '../../harness/mcp';
import {
  DEFAULT_GENERATE_SETTINGS,
  TEMPERATURE_RANGE,
  type CallRecord,
  type GenerateSettings,
} from '../../llm/core';
import {
  DEFAULT_MODEL_ID,
  LLMOnDevice,
  MAX_OUTPUT_TOKENS_RANGE,
  useLlm,
  type RuntimeStatus,
} from '../../llm/device';
import { FIXTURE } from '../wallet/fixture';
import type { MockWalletSdk, WalletState } from '../wallet/mockWalletSdk';
import { createOnblocMockWallet } from '../wallet/onblocWallet';
import { ApprovalModal } from './ApprovalModal';
import { useApprovalPrompt } from './useApprovalPrompt';
import { DEFAULT_ONBLOC_ACCOUNT, DEFAULT_ONBLOC_MCP_URL, resolveOnblocSettings } from './onblocSettings';

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

const EMPTY_WALLET: WalletState = { balances: {}, allowances: {} };

// One model for the app: a loaded model holds its memory.
const llm = new LLMOnDevice();

export default function PlaygroundScreen() {
  const { status, run, start, stop, load, unload, remove } = useLlm(llm);
  const approvalPrompt = useApprovalPrompt();
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
  // The mock wallet shown in Settings; `key` is the address it was created for.
  const [walletView, setWalletView] = useState<{ key: string; state: WalletState } | null>(null);
  // Prompt that started the last run, shown as the user message.
  const [submittedPrompt, setSubmittedPrompt] = useState<string | null>(null);
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
  const wallet = onbloc && walletView?.key === onbloc.account ? walletView.state : EMPTY_WALLET;
  const [preparing, setPreparing] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [keyboardShown, setKeyboardShown] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);
  // Wallet kept across runs, so a transfer shows up in later balance lookups. One per address.
  const walletRef = useRef<{ key: string; sdk: MockWalletSdk } | null>(null);
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

  // Show a transfer or approval as soon as its tool call finishes, not only at the end of the run.
  useEffect(() => {
    if (walletRef.current) {
      setWalletView({ key: walletRef.current.key, state: walletRef.current.sdk.inspect() });
    }
  }, [run.calls]);

  const onResetWallet = () => {
    walletRef.current = null;
    setWalletView(null);
  };

  const temperatureValue = parseBounded(temperature, TEMPERATURE_RANGE);
  const maxTokensValue = parseBounded(maxTokens, MAX_OUTPUT_TOKENS_RANGE, true);

  const busy = status.state === 'downloading' || status.state === 'loading';
  const ready = status.state === 'ready';
  const canRun =
    ready &&
    (!onblocMode || onbloc !== undefined) &&
    !preparing &&
    !run.running &&
    prompt.trim() !== '' &&
    temperatureValue !== null &&
    maxTokensValue !== null;

  /** The mock wallet funded with the account's Onbloc balances; null (reason shown) if they cannot be read. */
  const ensureOnblocWallet = async (config: NonNullable<typeof onbloc>) => {
    if (walletRef.current?.key === config.account) return walletRef.current.sdk;
    setPreparing(true);
    try {
      const sdk = await createOnblocMockWallet({
        onbloc: config,
        requestApproval: approvalPrompt.requestApproval,
      });
      walletRef.current = { key: config.account, sdk };
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
    if (temperatureValue === null || maxTokensValue === null || (onblocMode && !onbloc)) return;
    setSetupError(null);
    // Load the balances before the prompt is sent, so a failure keeps the prompt in the composer.
    const onblocWallet = onbloc && useTools ? await ensureOnblocWallet(onbloc) : null;
    if (onbloc && useTools && !onblocWallet) return;
    setSubmittedPrompt(prompt);
    // The prompt is now the user message in the chat: clear the composer.
    setPrompt('');
    const settings: GenerateSettings = {
      prompt,
      // With the wallet on the agent brings its own system prompt; with no Onbloc settings it is a plain chat.
      system:
        onbloc && !onblocWallet
          ? 'Wallet tools are disabled. Do not claim to have checked wallet data.'
          : undefined,
      temperature: temperatureValue,
      maxOutputTokens: maxTokensValue,
      reasoning: thinking ? 'provider-default' : 'none',
    };
    await start((signal) => {
      if (!onbloc || !onblocWallet) return llm.generate(settings, { signal });
      // The agent reads through Onbloc, acts on the wallet, stays within the harness budget and
      // checks its answer against what the tools returned.
      const harness = new Harness({ toolSources: [createOnblocToolSource(onbloc)] });
      return new AIAgent({ llm, harness, wallet: onblocWallet }).run(settings, { signal });
    });
    if (onbloc && onblocWallet) setWalletView({ key: onbloc.account, state: onblocWallet.inspect() });
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

          <Text style={styles.label}>MCP URL (api-v3)</Text>
          <TextInput
            style={[styles.input, onblocSettings.endpointError !== null && styles.invalid]}
            value={mcpUrl}
            onChangeText={setMcpUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="https://.../mcp"
            editable={!preparing}
          />
          {onblocSettings.endpointError !== null && (
            <Text style={styles.error}>{onblocSettings.endpointError}</Text>
          )}
          <Text style={styles.label}>My address</Text>
          <TextInput
            style={[styles.input, onblocSettings.accountError !== null && styles.invalid]}
            value={myAddress}
            onChangeText={setMyAddress}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="g1..."
            editable={!preparing}
          />
          {onblocSettings.accountError !== null && (
            <Text style={styles.error}>{onblocSettings.accountError}</Text>
          )}
          {onblocMode ? (
            <>
              <Text style={styles.muted}>
                Reads: Onbloc api-v3 (mainnet). transfer, approve and sign: mock wallet funded from the
                Onbloc balances.
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
              <Switch value={useTools} onValueChange={setUseTools} />
              <Text style={styles.switchLabel}>Wallet tools (Onbloc reads + mock wallet actions)</Text>
            </View>
          )}
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
        {onblocMode && !onbloc && <Text style={styles.error}>
          Fix the MCP URL and My address in Settings.
        </Text>}
        {preparing && <Text style={styles.muted}>Loading balances from Onbloc...</Text>}
        {setupError !== null && <Text style={styles.error}>{setupError}</Text>}
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

            {(run.calls.length > 0 || run.metrics !== null) && onblocMode && useTools && (
              <CallLog calls={run.calls} />
            )}

            {run.running && run.text === '' && <Text style={styles.muted}>Generating...</Text>}
            <Text style={styles.output} selectable>
              {run.text}
            </Text>
            {run.aborted && <Text style={styles.muted}>(stopped)</Text>}

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
          onChangeText={setPrompt}
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
  const approvals = wallet.allowances[activeAddress] ?? [];

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
      <Text style={styles.label}>Approvals given (you)</Text>
      {approvals.length === 0 && <Text style={styles.muted}>None</Text>}
      {approvals.map((approval) => (
        <Text key={`${approval.spender}:${approval.token}`} style={styles.mono}>
          {labelOf(approval.spender)}: {approval.amount} {approval.token}
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
  callRow: { gap: 2 },
});
