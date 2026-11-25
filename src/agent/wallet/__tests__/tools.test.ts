import { ACCOUNT, FRIEND, RECIPIENT, fakeWallet, type FakeWalletOptions } from '../../testing/fakeWallet';
import { ToolName, TransactionType, WalletErrorCode, WalletStatus } from '../constants';
import { WalletError, type PreparedTransaction } from '../port';
import { createWalletTools, type ToolResult } from '../tools';
import { Harness, type PolicyEvent, type WalletTool } from '../../../harness/core';

function setup(options: FakeWalletOptions = {}) {
  const wallet = fakeWallet(options);
  const prepared: PreparedTransaction[] = [];
  const tools = createWalletTools({
    sdk: wallet,
    account: ACCOUNT,
    contacts: [FRIEND],
    userText: `${RECIPIENT} ${FRIEND.alias} bob`,
    onTransaction: (transaction) => {
      prepared.push(transaction);
    },
  });
  return { tools: tools as Required<Omit<typeof tools, 'get_approvals'>>, all: tools, prepared, wallet };
}

// Exercises the validated wallet adapter without the model.
const run = async (tool: WalletTool, input: unknown): Promise<ToolResult> => {
  const decision = await tool.execute(input, new AbortController().signal);
  if (decision.kind !== 'result') throw new Error(`Unexpected wallet decision: ${decision.kind}`);
  return decision.value as ToolResult;
};

const input = { to: RECIPIENT, amount: '0.5', token: 'gnot' };
const refusals = [
  WalletErrorCode.InvalidAddress,
  WalletErrorCode.InvalidAmount,
  WalletErrorCode.InsufficientBalance,
  WalletErrorCode.UnknownToken,
  WalletErrorCode.AmbiguousToken,
  WalletErrorCode.UnsupportedToken,
  WalletErrorCode.WalletFailed,
];

describe('transfer', () => {
  it("asks the wallet for the user's account as sender, whatever the model says", async () => {
    const { tools, wallet } = setup();

    await run(tools[ToolName.Transfer], { ...input, from: 'g1someoneelse' });

    expect(wallet.calls).toEqual([{ method: 'transfer', params: { from: ACCOUNT, ...input } }]);
  });

  it('hands the transaction to the app and tells the model only what the wallet resolved', async () => {
    const { tools, prepared } = setup();

    const result = await run(tools[ToolName.Transfer], { ...input, to: RECIPIENT.toUpperCase() });

    expect(result).toEqual({
      status: WalletStatus.Prepared,
      from: ACCOUNT,
      to: RECIPIENT,
      amount: '0.5',
      token: 'GNOT',
      message: expect.stringContaining('nothing was sent'),
    });
    expect(prepared).toEqual([
      {
        summary: expect.objectContaining({ type: TransactionType.Transfer, from: ACCOUNT, to: RECIPIENT }),
        tx: { fake: 'transfer' },
      },
    ]);
    expect(JSON.stringify(result)).not.toContain('"tx"');
  });

  it.each(refusals)('turns a wallet refusal (%s) into an error result and prepares nothing', async (code) => {
    const { tools, prepared } = setup({ failWith: new WalletError(code, 'because') });

    expect(await run(tools[ToolName.Transfer], input)).toEqual({
      status: WalletStatus.Error,
      code,
      message: 'because',
    });
    expect(prepared).toEqual([]);
  });

  it('transports only bounded, valid ambiguity candidates', async () => {
    const ids = ['gno.land/r/a/token', 'gno.land/r/b/token'];
    const { tools } = setup({ failWith: new WalletError(WalletErrorCode.AmbiguousToken, 'choose', ids) });
    expect(await run(tools[ToolName.Transfer], input)).toMatchObject({ candidateIds: ids });
    for (const invalid of [[ids[0], ids[0]], [ids[0], 'bad id'], Array(21).fill(ids[0])]) {
      const invalidTools = setup({ failWith: new WalletError(WalletErrorCode.AmbiguousToken, 'choose', invalid) }).tools;
      expect(await run(invalidTools[ToolName.Transfer], input)).not.toHaveProperty('candidateIds');
    }
  });

  it('lets a failure that is not a wallet refusal fail the call', async () => {
    const { tools } = setup({ failWith: new Error('wallet crashed') });

    await expect(run(tools[ToolName.Transfer], input)).rejects.toThrow('wallet crashed');
  });

  it('does not let the model choose the sending account', () => {
    const { tools } = setup();
    const definition = tools[ToolName.Transfer].definition;
    if (!('inputSchema' in definition)) throw new Error('Expected a wallet schema');
    const schema = definition.inputSchema as unknown as { shape: Record<string, unknown> };

    expect(Object.keys(schema.shape).sort()).toEqual(['amount', 'to', 'token']);
  });

  it('fails the call when the app cannot take the transaction', async () => {
    const tools = createWalletTools({
      sdk: fakeWallet(),
      account: ACCOUNT,
      contacts: [],
      userText: RECIPIENT,
      onTransaction: () => {
        throw new Error('app is gone');
      },
    });

    await expect(run(tools[ToolName.Transfer], input)).rejects.toThrow('app is gone');
  });
});

describe('approve', () => {
  const approval = { spender: RECIPIENT, amount: '10', token: 'gns' };

  it('asks the wallet for an allowance from the user and tells the model only the summary', async () => {
    const { tools, prepared, wallet } = setup();

    const result = await run(tools[ToolName.Approve], approval);

    expect(wallet.calls).toEqual([{ method: 'approve', params: { from: ACCOUNT, ...approval } }]);
    expect(result).toEqual({
      status: WalletStatus.Prepared,
      from: ACCOUNT,
      spender: RECIPIENT,
      amount: '10',
      token: 'GNS',
      message: expect.stringContaining('nothing was sent'),
    });
    expect(prepared).toEqual([
      { summary: expect.objectContaining({ type: TransactionType.Allowance, spender: RECIPIENT }), tx: { fake: 'approve' } },
    ]);
  });

  it.each(refusals)('turns a wallet refusal (%s) into an error result and prepares nothing', async (code) => {
    const { tools, prepared } = setup({ failWith: new WalletError(code, 'because') });

    expect(await run(tools[ToolName.Approve], approval)).toEqual({
      status: WalletStatus.Error,
      code,
      message: 'because',
    });
    expect(prepared).toEqual([]);
  });
});

describe('get_approvals', () => {
  const allowances = [{ spender: RECIPIENT, token: 'GNS', amount: '5' }];

  it('is not offered when the wallet cannot list allowances', () => {
    expect(Object.keys(setup().all)).not.toContain(ToolName.GetApprovals);
  });

  it("lists the user's allowances", async () => {
    const { all } = setup({ allowances });

    expect(await run((all as Required<typeof all>)[ToolName.GetApprovals], {})).toEqual({
      status: WalletStatus.Ok,
      address: ACCOUNT,
      approvals: allowances,
    });
  });
});

describe('contact names', () => {
  it('turns a name, in any case, into its address for a transfer and an approval', async () => {
    const { tools, wallet } = setup();

    await run(tools[ToolName.Transfer], { ...input, to: ' Carol ' });
    await run(tools[ToolName.Approve], { spender: 'CAROL', amount: '1', token: 'gns' });

    expect(wallet.calls.map(({ params }) => params.to ?? params.spender)).toEqual([FRIEND.address, FRIEND.address]);
  });

  it.each([
    [ToolName.Transfer, { ...input, to: 'bob' }],
    [ToolName.Approve, { spender: 'bob', amount: '1', token: 'gns' }],
  ])('asks for a known contact or address without calling the wallet for %s', async (name, params) => {
    const { tools, wallet, prepared } = setup();
    expect(await run(tools[name], params)).toMatchObject({
      status: WalletStatus.Error,
      code: WalletErrorCode.InvalidAddress,
      message: expect.stringContaining('No contact matches'),
    });
    expect(wallet.calls).toEqual([]);
    expect(prepared).toEqual([]);
  });
});

describe('createWalletTools', () => {
  it('offers approve only if the wallet implements it', () => {
    expect(Object.keys(setup({ approve: false }).all)).toEqual([ToolName.Transfer]);
    expect(Object.keys(setup().all).sort()).toEqual([ToolName.Approve, ToolName.Transfer]);
  });
});

it.each([ToolName.Transfer, ToolName.Approve])('converts whole ugnot base units for %s without changing other tokens', async name => {
  const { tools, wallet } = setup();
  const target = name === ToolName.Transfer ? { to: RECIPIENT } : { spender: RECIPIENT };
  await run(tools[name], { ...target, amount: '1000000', token: 'ugnot' });
  expect(wallet.calls[0].params).toEqual(expect.objectContaining({ amount: '1', token: 'GNOT' }));
  await run(tools[name], { ...target, amount: '1', token: 'other-token' });
  expect(wallet.calls[1].params).toEqual(expect.objectContaining({ amount: '1', token: 'other-token' }));
  const invalid = await run(tools[name], { ...target, amount: '1.5', token: 'ugnot' });
  expect(invalid).toEqual(expect.objectContaining({ status: WalletStatus.Error, code: WalletErrorCode.InvalidAmount }));
  expect(wallet.calls).toHaveLength(2);
});

describe('trusted recipient authorization', () => {
  it.each([
    ['Send 1 GNOT', ToolName.Transfer, { ...input, to: FRIEND.alias }],
    ['Send 1 GNOT', ToolName.Transfer, input],
    ['Approve 1 GNOT', ToolName.Approve, { spender: FRIEND.alias, amount: '1', token: 'gns' }],
    ['Approve 1 GNOT', ToolName.Approve, { spender: RECIPIENT, amount: '1', token: 'gns' }],
    ['Send 1 GNOT to Caroline', ToolName.Transfer, { ...input, to: FRIEND.alias }],
    [`Send 1 GNOT to ${RECIPIENT}xyz`, ToolName.Transfer, input],
    ['Send to xcarol에게', ToolName.Transfer, { ...input, to: FRIEND.alias }],
    ['Send to carol2에게', ToolName.Transfer, { ...input, to: FRIEND.alias }],
    [`${RECIPIENT}에게다른사람`, ToolName.Transfer, input],
    ['carol에게다른사람', ToolName.Transfer, { ...input, to: FRIEND.alias }],
  ])('rejects an unmentioned target in %p', async (userText, name, params) => {
    const wallet = fakeWallet();
    const onTransaction = jest.fn();
    const walletTools = createWalletTools({ sdk: wallet, account: ACCOUNT, contacts: [FRIEND], userText, onTransaction });
    const started = await new Harness().startRun({
      account: ACCOUNT, chainId: 'test-chain', operationId: 'target-guard', scope: 'prepare-wallet', walletTools,
    });
    expect(await started.dispatch({ name, input: params })).toEqual({ kind: 'denied', code: 'TARGET_CHANGED' });
    expect(wallet.calls).toEqual([]);
    expect(onTransaction).not.toHaveBeenCalled();
    started.close();
  });

  it.each([
    [`Send to ${RECIPIENT}`, ToolName.Transfer, { ...input, to: RECIPIENT }, RECIPIENT],
    ['Send to CAROL', ToolName.Transfer, { ...input, to: FRIEND.alias }, FRIEND.address],
    ['Send to Carol', ToolName.Transfer, { ...input, to: FRIEND.address }, FRIEND.address],
    [`Send to ${FRIEND.address}`, ToolName.Transfer, { ...input, to: FRIEND.alias }, FRIEND.address],
    ['Approve Carol', ToolName.Approve, { spender: FRIEND.address, amount: '1', token: 'gns' }, FRIEND.address],
    ['carol에게 보내줘', ToolName.Transfer, { ...input, to: FRIEND.alias }, FRIEND.address],
    ['carol이 사용할 수 있게 승인해', ToolName.Approve, { spender: FRIEND.alias, amount: '1', token: 'gns' }, FRIEND.address],
    [`${RECIPIENT}에게 보내줘`, ToolName.Transfer, input, RECIPIENT],
  ])('allows a target explicitly named in %p', async (userText, name, params, expectedAddress) => {
    const wallet = fakeWallet();
    const onTransaction = jest.fn();
    const walletTools = createWalletTools({ sdk: wallet, account: ACCOUNT, contacts: [FRIEND], userText, onTransaction });
    const started = await new Harness().startRun({
      account: ACCOUNT, chainId: 'test-chain', operationId: 'explicit-target', scope: 'prepare-wallet', walletTools,
    });
    expect(await started.dispatch({ name, input: params }))
      .toEqual({ kind: 'result', value: expect.objectContaining({ status: WalletStatus.Prepared }) });
    expect(wallet.calls).toHaveLength(1);
    expect(wallet.calls[0].params.to ?? wallet.calls[0].params.spender).toBe(expectedAddress);
    expect(onTransaction).toHaveBeenCalledTimes(1);
    started.close();
  });

  it('does not infer an address from an ambiguous contact name', async () => {
    const wallet = fakeWallet();
    const onTransaction = jest.fn();
    const walletTools = createWalletTools({
      sdk: wallet, account: ACCOUNT, userText: `Send to ${FRIEND.alias}`, onTransaction,
      contacts: [FRIEND, { alias: FRIEND.alias.toUpperCase(), address: RECIPIENT }],
    });
    const started = await new Harness().startRun({
      account: ACCOUNT, chainId: 'test-chain', operationId: 'ambiguous-contact', scope: 'prepare-wallet', walletTools,
    });
    expect(await started.dispatch({ name: ToolName.Transfer, input: { ...input, to: FRIEND.alias } }))
      .toEqual({ kind: 'denied', code: 'TARGET_CHANGED' });
    expect(await started.dispatch({ name: ToolName.Transfer, input: { ...input, to: FRIEND.address } }))
      .toEqual({ kind: 'denied', code: 'TARGET_CHANGED' });
    expect(wallet.calls).toEqual([]);
    expect(onTransaction).not.toHaveBeenCalled();
    started.close();
  });
});

describe('wallet dispatch policy', () => {
  it('offers allowance reads in read-only scope and blocks preparation before calling the wallet', async () => {
    const { all, wallet, prepared } = setup({ allowances: [{ spender: RECIPIENT, token: 'GNS', amount: '5' }] });
    const events: PolicyEvent[] = [];
    const harness = new Harness({ audit: event => { events.push(event); } });
    const started = await harness.startRun({
      account: ACCOUNT, chainId: 'test-chain', operationId: 'read', scope: 'read-only',
      purpose: 'mainnet-read', walletTools: all,
    });

    expect(started.tools.map(tool => tool.name)).toEqual([ToolName.GetApprovals]);
    expect(await started.dispatch({ name: ToolName.Transfer, input })).toEqual({ kind: 'denied', code: 'OUT_OF_SCOPE' });
    expect(await started.dispatch({ name: ToolName.Approve, input: { spender: RECIPIENT, amount: '1', token: 'gns' } }))
      .toEqual({ kind: 'denied', code: 'OUT_OF_SCOPE' });
    expect(await started.dispatch({ name: ToolName.GetApprovals, input: {} })).toEqual({
      kind: 'result', value: { status: WalletStatus.Ok, address: ACCOUNT, approvals: [{ spender: RECIPIENT, token: 'GNS', amount: '5' }] },
    });
    expect(wallet.calls).toEqual([]);
    expect(prepared).toEqual([]);
    expect(events.map(event => [event.tool, event.decision, event.denial])).toEqual([
      [ToolName.Transfer, 'denied', 'OUT_OF_SCOPE'],
      [ToolName.Approve, 'denied', 'OUT_OF_SCOPE'],
      [ToolName.GetApprovals, 'result', undefined],
    ]);
    started.close();
  });

  it('blocks a concurrent preparation in read-only scope without touching the wallet', async () => {
    const wallet = fakeWallet();
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    wallet.getAllowances = async () => {
      entered.resolve();
      await release.promise;
      return [];
    };
    const onTransaction = jest.fn();
    const walletTools = createWalletTools({ sdk: wallet, account: ACCOUNT, contacts: [], userText: RECIPIENT, onTransaction });
    const started = await new Harness().startRun({
      account: ACCOUNT, chainId: 'test-chain', operationId: 'read-concurrent', scope: 'read-only', walletTools,
    });
    const read = started.dispatch({ name: ToolName.GetApprovals, input: {} });
    await entered.promise;
    const preparation = started.dispatch({ name: ToolName.Transfer, input });
    release.resolve();
    expect((await read).kind).toBe('result');
    expect(await preparation).toEqual({ kind: 'denied', code: 'OUT_OF_SCOPE' });
    expect(wallet.calls).toEqual([]);
    expect(onTransaction).not.toHaveBeenCalled();
    started.close();
  });

  it('shares the call budget between allowance reads and preparation', async () => {
    const { all, wallet, prepared } = setup({ allowances: [] });
    const started = await new Harness().startRun({
      account: ACCOUNT, chainId: 'test-chain', operationId: 'budget', scope: 'prepare-wallet',
      purpose: 'mainnet-read', walletTools: all, budget: { maxToolCalls: 1 },
    });

    expect((await started.dispatch({ name: ToolName.GetApprovals, input: {} })).kind).toBe('result');
    expect(await started.dispatch({ name: ToolName.Transfer, input })).toEqual({ kind: 'denied', code: 'BUDGET_EXHAUSTED' });
    expect(await started.dispatch({ name: ToolName.Approve, input: { spender: RECIPIENT, amount: '1', token: 'gns' } }))
      .toEqual({ kind: 'denied', code: 'BUDGET_EXHAUSTED' });
    expect(wallet.calls).toEqual([]);
    expect(prepared).toEqual([]);
    started.close();
  });

  it('denies invalid inputs and cancellation without starting preparation', async () => {
    const { all, wallet, prepared } = setup({ allowances: [] });
    const controller = new AbortController();
    const started = await new Harness().startRun({
      account: ACCOUNT, chainId: 'test-chain', operationId: 'cancel', scope: 'prepare-wallet',
      purpose: 'mainnet-read', walletTools: all, signal: controller.signal,
    });

    expect(await started.dispatch({ name: ToolName.Transfer, input: { ...input, amount: 5 } }))
      .toEqual({ kind: 'denied', code: 'INVALID_INPUT' });
    controller.abort();
    expect(await started.dispatch({ name: ToolName.Transfer, input })).toEqual({ kind: 'denied', code: 'CANCELLED' });
    expect(await started.dispatch({ name: ToolName.GetApprovals, input: {} })).toEqual({ kind: 'denied', code: 'CANCELLED' });
    expect(wallet.calls).toEqual([]);
    expect(prepared).toEqual([]);
  });

  it.each([
    [ToolName.Transfer, input],
    [ToolName.Approve, { spender: RECIPIENT, amount: '10', token: 'gns' }],
  ])('drops %s before handoff when cancellation occurs during preparation', async (name, params) => {
    const wallet = fakeWallet();
    const prepared: PreparedTransaction[] = [];
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    if (name === ToolName.Transfer) {
      const transfer = wallet.transfer.bind(wallet);
      wallet.transfer = async args => {
        const transaction = await transfer(args);
        entered.resolve();
        await release.promise;
        return transaction;
      };
    } else {
      const approve = wallet.approve!.bind(wallet);
      wallet.approve = async args => {
        const transaction = await approve(args);
        entered.resolve();
        await release.promise;
        return transaction;
      };
    }
    const all = createWalletTools({
      sdk: wallet, account: ACCOUNT, contacts: [FRIEND], userText: RECIPIENT,
      onTransaction: transaction => { prepared.push(transaction); },
    });
    const events: PolicyEvent[] = [];
    const controller = new AbortController();
    const started = await new Harness({ audit: event => { events.push(event); } }).startRun({
      account: ACCOUNT, chainId: 'test-chain', operationId: 'before-handoff', scope: 'prepare-wallet',
      purpose: 'mainnet-read', walletTools: all, signal: controller.signal,
    });

    const pending = started.dispatch({ name, input: params });
    await entered.promise;
    controller.abort();
    expect(await pending).toEqual({ kind: 'denied', code: 'CANCELLED' });
    release.resolve();
    expect(prepared).toHaveLength(0);
    expect(wallet.calls).toHaveLength(1);
    expect(events.map(event => [event.tool, event.decision, event.denial]))
      .toEqual([[name, 'denied', 'CANCELLED']]);
  });

  it('preserves and audits a result when cancellation occurs after handoff begins', async () => {
    const wallet = fakeWallet();
    const prepared: PreparedTransaction[] = [];
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const walletTools = createWalletTools({
      sdk: wallet, account: ACCOUNT, contacts: [], userText: RECIPIENT,
      onTransaction: async transaction => {
        prepared.push(transaction);
        entered.resolve();
        await release.promise;
      },
    });
    const events: PolicyEvent[] = [];
    const controller = new AbortController();
    const started = await new Harness({ audit: event => { events.push(event); } }).startRun({
      account: ACCOUNT, chainId: 'test-chain', operationId: 'after-handoff', scope: 'prepare-wallet',
      purpose: 'mainnet-read', walletTools, signal: controller.signal,
    });

    const pending = started.dispatch({ name: ToolName.Transfer, input });
    await entered.promise;
    controller.abort();
    release.resolve();
    expect(await pending).toEqual({
      kind: 'result', value: expect.objectContaining({ status: WalletStatus.Prepared, to: RECIPIENT }),
    });
    expect(prepared).toHaveLength(1);
    expect(wallet.calls).toHaveLength(1);
    expect(events.map(event => [event.tool, event.decision, event.denial]))
      .toEqual([[ToolName.Transfer, 'result', undefined]]);
    expect(await started.dispatch({ name: ToolName.Transfer, input })).toEqual({ kind: 'denied', code: 'CANCELLED' });
    expect(wallet.calls).toHaveLength(1);
  });
});

it('preserves a handoff already in progress when the run times out', async () => {
  jest.useFakeTimers();
  try {
    const wallet = fakeWallet();
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const onTransaction = jest.fn(async () => {
      entered.resolve();
      await release.promise;
    });
    const walletTools = createWalletTools({ sdk: wallet, account: ACCOUNT, contacts: [], userText: RECIPIENT, onTransaction });
    const events: PolicyEvent[] = [];
    const started = await new Harness({ audit: event => { events.push(event); } }).startRun({
      account: ACCOUNT, chainId: 'test-chain', operationId: 'timeout-handoff', scope: 'prepare-wallet',
      walletTools, budget: { timeoutMs: 10 },
    });
    const pending = started.dispatch({ name: ToolName.Transfer, input });
    await entered.promise;
    jest.advanceTimersByTime(10);
    release.resolve();
    expect(await pending).toEqual({
      kind: 'result', value: expect.objectContaining({ status: WalletStatus.Prepared }),
    });
    expect(onTransaction).toHaveBeenCalledTimes(1);
    expect(events.map(event => [event.tool, event.decision, event.denial]))
      .toEqual([[ToolName.Transfer, 'result', undefined]]);
  } finally {
    jest.useRealTimers();
  }
});

it('does not start preparation after the run deadline', async () => {
  jest.useFakeTimers();
  try {
    const { all, wallet, prepared } = setup();
    const started = await new Harness().startRun({
      account: ACCOUNT, chainId: 'test-chain', operationId: 'timeout', scope: 'prepare-wallet',
      purpose: 'mainnet-read', walletTools: all, budget: { timeoutMs: 10 },
    });
    jest.advanceTimersByTime(10);

    expect(await started.dispatch({ name: ToolName.Transfer, input })).toEqual({ kind: 'denied', code: 'CANCELLED' });
    expect(wallet.calls).toEqual([]);
    expect(prepared).toEqual([]);
  } finally {
    jest.useRealTimers();
  }
});

it('does not hand a transaction to the app after the deadline, even before the timer callback runs', async () => {
  jest.useFakeTimers();
  try {
    const { all, wallet, prepared } = setup();
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const transfer = wallet.transfer.bind(wallet);
    wallet.transfer = async params => {
      const transaction = await transfer(params);
      entered.resolve();
      await release.promise;
      return transaction;
    };
    const started = await new Harness().startRun({
      account: ACCOUNT, chainId: 'test-chain', operationId: 'deadline', scope: 'prepare-wallet',
      walletTools: all, budget: { timeoutMs: 10 },
    });
    const pending = started.dispatch({ name: ToolName.Transfer, input });
    await entered.promise;
    jest.setSystemTime(Date.now() + 10);
    release.resolve();
    expect(await pending).toEqual({ kind: 'denied', code: 'CANCELLED' });
    expect(prepared).toEqual([]);
    started.close();
  } finally {
    jest.useRealTimers();
  }
});

it('reports cancellation if wallet preparation fails after cancellation and before handoff', async () => {
  const { all, wallet, prepared } = setup();
  const entered = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  wallet.transfer = async () => {
    entered.resolve();
    await release.promise;
    throw new WalletError(WalletErrorCode.WalletFailed, 'cancelled by wallet');
  };
  const controller = new AbortController();
  const started = await new Harness().startRun({
    account: ACCOUNT, chainId: 'test-chain', operationId: 'failed-before-handoff', scope: 'prepare-wallet',
    walletTools: all, signal: controller.signal,
  });
  const pending = started.dispatch({ name: ToolName.Transfer, input });
  await entered.promise;
  controller.abort();
  release.resolve();
  expect(await pending).toEqual({ kind: 'denied', code: 'CANCELLED' });
  expect(prepared).toEqual([]);
});

it('retains an already handed-off transaction if auditing fails, and blocks queued preparations', async () => {
  const { all, wallet, prepared } = setup();
  const auditEntered = Promise.withResolvers<void>();
  const releaseAudit = Promise.withResolvers<void>();
  let auditCalls = 0;
  const audit = jest.fn(async () => {
    if (++auditCalls === 1) {
      auditEntered.resolve();
      await releaseAudit.promise;
      throw new Error('audit unavailable');
    }
  });
  const started = await new Harness({ audit }).startRun({
    account: ACCOUNT, chainId: 'test-chain', operationId: 'audit-failure', scope: 'prepare-wallet',
    walletTools: all,
  });
  const first = started.dispatch({ name: ToolName.Transfer, input });
  await auditEntered.promise;
  const second = started.dispatch({ name: ToolName.Transfer, input });
  await Promise.resolve();
  expect(wallet.calls).toHaveLength(1);
  releaseAudit.resolve();
  expect(await first).toEqual({
    kind: 'result', value: expect.objectContaining({ status: WalletStatus.Prepared }), auditFailed: true,
  });
  expect(await second).toEqual({ kind: 'denied', code: 'RUN_PAUSED' });
  expect(prepared).toHaveLength(1);
  expect(wallet.calls).toHaveLength(1);
  started.close();
});

it('does not call a failed app handoff a cancellation merely because it failed late', async () => {
  const wallet = fakeWallet();
  const received: PreparedTransaction[] = [];
  const entered = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  const walletTools = createWalletTools({
    sdk: wallet, account: ACCOUNT, contacts: [], userText: RECIPIENT,
    onTransaction: async transaction => {
      received.push(transaction);
      entered.resolve();
      await release.promise;
      throw new Error('app handoff failed');
    },
  });
  const controller = new AbortController();
  const events: PolicyEvent[] = [];
  const started = await new Harness({ audit: event => { events.push(event); } }).startRun({
    account: ACCOUNT, chainId: 'test-chain', operationId: 'handoff', scope: 'prepare-wallet',
    purpose: 'mainnet-read', walletTools, signal: controller.signal,
  });

  const pending = started.dispatch({ name: ToolName.Transfer, input });
  await entered.promise;
  controller.abort();
  release.resolve();
  expect(await pending).toEqual({ kind: 'denied', code: 'WALLET_UNAVAILABLE' });
  expect(received).toHaveLength(1);
  expect(wallet.calls).toHaveLength(1);
  expect(events.map(event => [event.tool, event.decision, event.denial]))
    .toEqual([[ToolName.Transfer, 'denied', 'WALLET_UNAVAILABLE']]);
});
