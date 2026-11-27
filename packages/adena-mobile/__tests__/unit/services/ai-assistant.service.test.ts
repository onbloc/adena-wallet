import type { GenerateEvent, PreparedTransaction } from 'adena-ai-llm-poc';
import type { ChatSession, LLM } from 'adena-ai-llm-poc/llm';

import { createContainer } from '../../../src/di/container';
import { AiRunEvent, AiTransferDraft } from '../../../src/domain/ai';
import { AiLibrary } from '../../../src/infrastructure/ai/ai-library';
import { StorageAccountRepository } from '../../../src/repositories/account.repository';
import { StorageAiChatRepository } from '../../../src/repositories/ai-chat.repository';
import { AiProvider, StorageAiSettingsRepository } from '../../../src/repositories/ai-settings.repository';
import { MemorySecureStore } from '../../../src/security/memory-secure-store';
import { AccountService } from '../../../src/services/account.service';
import { AiAssistantService } from '../../../src/services/ai-assistant.service';
import { AiWalletService } from '../../../src/services/ai-wallet.service';
import { TokenService } from '../../../src/services/token.service';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';
import { fakeOnblocMcp, loadRealAiLibrary } from '../../helpers/ai-library';
import { GNO_NETWORK, makeAccount, networkById } from '../../helpers/service-fakes';

const account = makeAccount();
const scope = { accountId: account.id, networkId: GNO_NETWORK.id };
const ONYX_NETWORK = networkById('onyx-1');
const OWNER = 'g1axehvc90taqzngkg8amdfw7q6lfyjekfkc4n7v';
const done: GenerateEvent = { type: 'done', aborted: false, warnings: [], messages: [], metrics: { totalMs: 1, ttftMs: null } };

async function collect(events: AsyncIterable<AiRunEvent>): Promise<AiRunEvent[]> {
  const result: AiRunEvent[] = [];

  for await (const event of events) {
    result.push(event);
  }

  return result;
}

async function setup() {
  const base = await loadRealAiLibrary();
  const store = new MemoryKeyValueStore();
  const secure = new MemorySecureStore();
  const settings = new StorageAiSettingsRepository(store, secure);

  await settings.saveApiKey('sk-first-same');
  const chats = new StorageAiChatRepository(store);

  type Options = { session: ChatSession; onTransaction(prepared: PreparedTransaction): void };
  let execute = async function* (options: Options, prompt: string): AsyncGenerator<GenerateEvent> {
    options.session.complete(prompt, 'answer');
    yield { type: 'text', delta: 'answer' };
    yield done;
  };
  const agents: FakeAgent[] = [];
  const runSettings: Record<string, unknown>[] = [];

  class FakeAgent {
    clearPending = jest.fn();
    reset = jest.fn(() => this.options.session.reset());
    constructor(readonly options: Options) {
      agents.push(this);
    }

    run(settings: { prompt: string }): AsyncGenerator<GenerateEvent> {
      runSettings.push(settings);
      return execute(this.options, settings.prompt);
    }
  }
  const createRemote = jest.fn(() => ({ kind: 'remote', contextTokens: 4096 }));
  const localModel = {
    kind: 'local',
    contextTokens: 4096,
    status: { state: 'ready' },
    subscribe: jest.fn(() => () => {}),
    load: jest.fn(),
    unload: jest.fn(),
    remove: jest.fn(),
  };
  const createLocal = jest.fn(() => localModel);
  const library: AiLibrary = {
    agent: { ...base.agent, AIAgent: FakeAgent } as unknown as AiLibrary['agent'],
    harness: base.harness,
    onbloc: base.onbloc,
    llm: base.llm,
    remote: { ...base.remote, createLLMRemote: createRemote } as unknown as AiLibrary['remote'],
    device: { createLLM: createLocal } as unknown as AiLibrary['device'],
  };
  const loadLibrary = jest.fn(async () => library);
  const wallet = { createSdk: jest.fn(() => ({})), getTokenSymbols: jest.fn(async () => ['GNOT']) };
  const service = new AiAssistantService(settings, chats, wallet as unknown as AiWalletService,
    { getAddress: () => 'g1owner' } as unknown as AccountService, loadLibrary);
  const run = (signal?: AbortSignal) => collect(service.run({ prompt: 'question', account, network: GNO_NETWORK, signal }));

  return {
    service,
    settings,
    chats,
    agents,
    runSettings,
    run,
    library,
    loadLibrary,
    createRemote,
    createLocal,
    wallet,
    setExecute: (next: typeof execute): void => { execute = next; },
  };
}

async function setupNetworkAssistant({ foreignOutput = false, waitForBalance }: {
  foreignOutput?: boolean;
  waitForBalance?: { started: () => void; gate: Promise<void> };
} = {}) {
  const base = await loadRealAiLibrary();
  const store = new MemoryKeyValueStore();
  const secure = new MemorySecureStore();
  const accounts = new StorageAccountRepository(store);

  accounts.saveAccounts([account, makeAccount({ id: 'account-2' })]);
  accounts.setCurrentAccountId(account.id);
  const settings = new StorageAiSettingsRepository(store, secure);

  await settings.saveApiKey('test-key');
  const intent = JSON.stringify({ route: 'lookup', requests: [{ target: 'balance', request: { kind: 'one', asset: { kind: 'symbol', value: 'GNOT' } } }] });
  const llm: LLM = {
    kind: 'remote',
    contextTokens: 32768,
    async* generate() {
      yield { type: 'text', delta: intent };
      yield { ...done, finishReason: 'stop', messages: [{ role: 'assistant', content: intent }] };
    },
  };
  const mainnet = fakeOnblocMcp([{
    name: 'get_native_balance', output: { address: OWNER, network: 'gnoland-1', denom: 'ugnot', balance: '11000000' },
  }]);
  const onyx = fakeOnblocMcp([{
    name: 'get_native_balance', output: { address: OWNER, network: foreignOutput ? 'gnoland-1' : 'onyx-1', denom: 'ugnot', balance: '22000000' },
  }]);
  const endpoints: string[] = [];
  const fetcher: typeof fetch = async (url, init) => {
    endpoints.push(String(url));
    const request = init?.method === 'POST' ? JSON.parse(String(init.body)) : undefined;

    if (request?.method === 'tools/call' && waitForBalance) {
      waitForBalance.started();
      await waitForBalance.gate;
    }

    switch (String(url)) {
      case 'https://dev-gnoscan-v2.api.onbloc.xyz/mcp': return mainnet.fetcher(url, init);
      case 'https://dev-testnet-gnoscan-v2.api.onbloc.xyz/mcp': return onyx.fetcher(url, init);
      default: throw new Error(`Unexpected endpoint: ${String(url)}`);
    }
  };
  const library: AiLibrary = {
    agent: base.agent,
    harness: base.harness,
    onbloc: base.onbloc,
    llm: base.llm,
    get device() { return base.device; },
    remote: { ...base.remote, createLLMRemote: () => llm },
  };
  const container = createContainer({ keyValueStore: store, secureStore: secure, aiLibraryLoader: async () => library, aiFetch: fetcher }, {
    tokenService: { getTokenList: async () => [] } as unknown as TokenService,
  });

  jest.spyOn(container.accountService, 'getAddress').mockReturnValue(OWNER);
  const run = () => collect(container.aiAssistantService.run({
    prompt: 'What is my GNOT balance?',
    account: container.accountService.getCurrentAccount()!,
    network: container.networkService.getCurrentNetwork(),
  }));

  return { container, run, endpoints, mainnet, onyx };
}

describe('AiAssistantService', () => {
  it('persists completed turns through the real chat-session serializer without loading device code', async () => {
    const env = await setup();

    expect(await env.run()).toEqual([{ type: 'text', delta: 'answer' }, { type: 'done', aborted: false, warnings: [] }]);
    expect(await env.service.getTurns(scope)).toEqual([{ prompt: 'question', answer: 'answer' }]);
    expect(env.chats.load(scope)).toContain('question');
    await env.service.getConfig();
    expect(env.createLocal).not.toHaveBeenCalled();
  });

  it('reuses the configured agent without clearing its clarification between normal turns', async () => {
    const env = await setup();

    await env.run();
    await env.run();
    expect(env.agents).toHaveLength(1);
    expect(env.createRemote).toHaveBeenCalledTimes(1);
    expect(env.agents[0].clearPending).not.toHaveBeenCalled();
  });

  it('runs the agent without reasoning at the playground temperature, not at the model default effort', async () => {
    const env = await setup();

    await env.run();

    expect(env.runSettings).toEqual([{ prompt: 'question', temperature: 0.2, maxOutputTokens: 512, reasoning: 'none' }]);
  });

  it('tells the model what became of a prepared transfer without showing it in the transcript', async () => {
    const env = await setup();
    const draft = {
      id: 'prepared',
      amount: '1000000',
      toAddress: OWNER,
      token: { decimals: 6, symbol: 'GNOT' },
      network: { networkName: 'Gno.land Mainnet' },
    } as unknown as AiTransferDraft;
    const seen: string[] = [];

    env.setExecute(async function* (options, prompt) {
      seen.push(...options.session.messages(prompt).map(message => String(message.content)));
      options.session.complete(prompt, 'answer');
      yield done;
    });
    await env.run();
    env.service.recordTransferOutcome(scope, draft, 'unconfirmed');

    expect(await env.service.getTurns(scope)).toEqual([{ prompt: 'question', answer: 'answer' }]);
    expect(env.chats.load(scope)).toContain('[Wallet event]');

    await env.run();
    expect(seen.join('\n')).toContain(`[Wallet event] The transfer of 1 GNOT to ${OWNER} on Gno.land Mainnet was signed but its outcome is unknown`);
  });

  it('queues a transfer outcome that arrives mid-turn until the turn ends', async () => {
    const env = await setup();
    const draft = { id: 'prepared', amount: '1000000', toAddress: OWNER, token: { decimals: 6, symbol: 'GNOT' }, network: { networkName: 'Gno.land Mainnet' } } as unknown as AiTransferDraft;
    const turns: number[] = [];

    await env.run();
    env.setExecute(async function* (options, prompt) {
      env.service.recordTransferOutcome(scope, draft, 'sent');
      turns.push(options.session.turns.length);
      options.session.complete(prompt, 'answer');
      yield done;
    });
    await env.run();

    expect(turns).toEqual([1]);
    expect(env.chats.load(scope)).toContain('[Wallet event]');
    expect(await env.service.getTurns(scope)).toHaveLength(2);
  });

  it('replaces cached credentials even when length and last four characters are identical', async () => {
    const env = await setup();

    await env.run();
    await env.service.saveConfig({ apiKey: 'sk-other-same' });
    await env.run();
    expect(env.agents).toHaveLength(2);
    expect(env.createRemote.mock.calls).toHaveLength(2);
    expect(env.createRemote).toHaveBeenLastCalledWith(expect.objectContaining({ apiKey: 'sk-other-same' }));
    expect(env.chats.load(scope)).not.toContain('sk-');
  });

  it('does not publish settings when secure credential persistence fails', async () => {
    const env = await setup();

    jest.spyOn(env.settings, 'saveApiKey').mockRejectedValueOnce(new Error('keychain unavailable'));
    await expect(env.service.saveConfig({ provider: AiProvider.LOCAL, apiKey: 'new-key' })).rejects.toThrow('keychain unavailable');
    expect(env.settings.get().provider).toBe(AiProvider.OPENAI);
  });

  it.each(['clear', 'reset', 'remove', 'background', 'abort'] as const)('does not resurrect snapshots after %s during a turn', async (mode) => {
    const env = await setup();
    const started = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();

    env.setExecute(async function* (options, prompt) {
      started.resolve();
      await release.promise;
      options.session.complete(prompt, 'late answer');
      options.onTransaction({ tx: { id: 'late' }, summary: {} } as PreparedTransaction);
      yield { type: 'text', delta: 'late answer' };
      yield done;
    });
    const controller = new AbortController();
    const pending = env.run(controller.signal);

    await started.promise;

    if (mode === 'clear') env.service.clearPending(scope);

    if (mode === 'reset') env.service.reset(scope);

    if (mode === 'remove') env.service.removeAccount(account.id);

    if (mode === 'background') env.service.clearAllPending();

    if (mode === 'abort') controller.abort();

    release.resolve();
    expect(await pending).toEqual([{ type: 'done', aborted: true, warnings: [] }]);
    expect(env.chats.load(scope)).toBeUndefined();

    expect(await env.service.getTurns(scope)).toEqual([]);
  });

  it('cancels pre-agent loading so reset cannot recreate a removed conversation', async () => {
    const env = await setup();
    const loading = Promise.withResolvers<AiLibrary>();

    env.loadLibrary.mockReturnValueOnce(loading.promise);
    const pending = env.run();

    env.service.reset(scope);
    loading.resolve(env.library);
    expect(await pending).toEqual([{ type: 'done', aborted: true, warnings: [] }]);
    expect(env.agents).toHaveLength(0);
    expect(env.chats.load(scope)).toBeUndefined();
  });

  it('cancels pending credential reads before constructing a remote provider', async () => {
    const env = await setup();
    const loading = Promise.withResolvers<string | null>();
    const started = Promise.withResolvers<void>();

    jest.spyOn(env.settings, 'getApiKey').mockImplementationOnce(() => {
      started.resolve();
      return loading.promise;
    });
    const pending = env.run();

    await started.promise;
    env.service.clearPending(scope);
    loading.resolve('stale-key');
    await pending;
    expect(env.agents).toHaveLength(0);
    expect(env.createRemote).not.toHaveBeenCalled();
  });

  it('cancels pending token setup before creating an agent', async () => {
    const env = await setup();
    const loading = Promise.withResolvers<string[]>();
    const started = Promise.withResolvers<void>();

    env.wallet.getTokenSymbols.mockImplementationOnce(() => {
      started.resolve();
      return loading.promise;
    });
    const pending = env.run();

    await started.promise;
    env.service.clearAllPending();
    loading.resolve(['GNOT']);
    await pending;
    expect(env.agents).toHaveLength(0);
  });

  it('loads exactly one device instance across concurrent callers', async () => {
    const env = await setup();
    const [first, second] = await Promise.all([env.service.getLocalModel(), env.service.getLocalModel()]);

    expect(env.createLocal).toHaveBeenCalledTimes(1);
    expect(first.getStatus()).toEqual({ state: 'ready' });
    expect(second.getStatus()).toEqual({ state: 'ready' });
  });

  it('forwards prepared drafts on every run, including when reusing the agent', async () => {
    const env = await setup();
    const draft = { id: 'prepared' } as AiTransferDraft;

    env.setExecute(async function* (options) {
      options.onTransaction({ tx: draft, summary: {} } as PreparedTransaction);
      yield done;
    });
    expect(await env.run()).toContainEqual({ type: 'draft', draft });
    expect(await env.run()).toContainEqual({ type: 'draft', draft });
  });

  it('routes real agent balance reads to the selected chain and keeps account/network history isolated', async () => {
    const env = await setupNetworkAssistant();
    const text = (events: AiRunEvent[]): string => events.flatMap(event => event.type === 'text' ? [event.delta] : []).join('');

    expect(text(await env.run())).toContain('11 GNOT');
    expect(env.endpoints.every(url => url === 'https://dev-gnoscan-v2.api.onbloc.xyz/mcp')).toBe(true);
    expect(env.mainnet.calls).toEqual([{ name: 'get_native_balance', arguments: { address: OWNER } }]);
    env.endpoints.splice(0);
    env.container.networkService.selectNetwork(ONYX_NETWORK.id);
    expect(env.container.aiAssistantService.isSupported(ONYX_NETWORK)).toBe(true);
    expect(await env.container.aiAssistantService.getTurns({ ...scope, networkId: ONYX_NETWORK.id })).toEqual([]);
    expect(text(await env.run())).toContain('22 GNOT');
    expect(env.endpoints.every(url => url === 'https://dev-testnet-gnoscan-v2.api.onbloc.xyz/mcp')).toBe(true);
    expect(env.onyx.calls).toEqual([{ name: 'get_native_balance', arguments: { address: OWNER } }]);
    expect(await env.container.aiAssistantService.getTurns(scope)).toEqual([
      expect.objectContaining({ answer: expect.stringContaining('11 GNOT') }),
    ]);
    env.container.accountService.selectAccount('account-2');
    expect(await env.container.aiAssistantService.getTurns({ networkId: ONYX_NETWORK.id, accountId: 'account-2' })).toEqual([]);
    expect(text(await env.run())).toContain('22 GNOT');
    env.container.accountService.selectAccount(account.id);
    expect(await env.container.aiAssistantService.getTurns({ ...scope, networkId: ONYX_NETWORK.id })).toHaveLength(1);
  });

  it('rejects a mainnet balance returned by the selected Onyx endpoint', async () => {
    const env = await setupNetworkAssistant({ foreignOutput: true });

    env.container.networkService.selectNetwork(ONYX_NETWORK.id);
    const events = await env.run();

    expect(events).not.toContainEqual(expect.objectContaining({ type: 'text', delta: expect.stringContaining('22 GNOT') }));
    expect(events).toContainEqual(expect.objectContaining({ type: 'text', delta: expect.stringContaining('Could not verify GNOT balance') }));
    expect(env.mainnet.calls).toEqual([]);
    expect(env.onyx.calls).toEqual([{ name: 'get_native_balance', arguments: { address: OWNER } }]);
  });

  it('discards an in-flight MCP result after switching networks', async () => {
    const started = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const env = await setupNetworkAssistant({ waitForBalance: { started: started.resolve, gate: release.promise } });
    const pending = env.run();

    await started.promise;

    env.container.networkService.selectNetwork(ONYX_NETWORK.id);
    release.resolve();
    const events = await pending;

    expect(events.filter(event => event.type === 'text' || event.type === 'draft')).toEqual([]);
    expect(events.at(-1)).toEqual({ type: 'done', aborted: true, warnings: [] });
    expect(await env.container.aiAssistantService.getTurns(scope)).toEqual([]);
  });

  it('does not leak queued drafts or text when selection changes between generator events', async () => {
    const env = await setup();
    const first = { id: 'first' } as AiTransferDraft;
    const second = { id: 'second' } as AiTransferDraft;

    env.setExecute(async function* (options) {
      options.onTransaction({ tx: first, summary: {} } as PreparedTransaction);
      options.onTransaction({ tx: second, summary: {} } as PreparedTransaction);
      yield { type: 'text', delta: 'old-chain text' };
      yield done;
    });
    const stream = env.service.run({ prompt: 'transfer', account, network: GNO_NETWORK });

    expect((await stream.next()).value).toEqual({ type: 'draft', draft: first });
    env.service.clearAllPending();
    expect(await collect(stream)).toEqual([{ type: 'done', aborted: true, warnings: [] }]);
  });

  it('refuses custom and noncanonical networks before loading the SDK', async () => {
    const env = await setup();

    for (const network of [
      { ...GNO_NETWORK, isCustom: true }, { ...GNO_NETWORK, id: 'spoof' },
      { ...GNO_NETWORK, family: 'cosmos' as const }, { ...GNO_NETWORK, isMainnet: false },
      { ...GNO_NETWORK, chainId: 'onyx-1' }, { ...ONYX_NETWORK, chainId: 'gnoland-1' },
      { ...ONYX_NETWORK, isCustom: true }, { ...ONYX_NETWORK, rpcUrl: 'https://spoof.test' },
      { ...GNO_NETWORK, fallbackRpcUrl: 'https://spoof.test' }, networkById('gnoswap'),
    ]) {
      expect(env.service.isSupported(network)).toBe(false);
      await expect(collect(env.service.run({ prompt: 'question', account, network }))).rejects.toThrow('only available on built-in Gno Mainnet and Onyx');
    }

    expect(env.loadLibrary).not.toHaveBeenCalled();
  });
});
