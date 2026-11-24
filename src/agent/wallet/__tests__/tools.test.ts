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

  it('leaves a name that is not a contact for the wallet to refuse', async () => {
    const { tools, wallet } = setup();

    await run(tools[ToolName.Transfer], { ...input, to: 'bob' });

    expect(wallet.calls[0].params.to).toBe('bob');
  });
});

describe('createWalletTools', () => {
  it('offers approve only if the wallet implements it', () => {
    expect(Object.keys(setup({ approve: false }).all)).toEqual([ToolName.Transfer]);
    expect(Object.keys(setup().all).sort()).toEqual([ToolName.Approve, ToolName.Transfer]);
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

  it('preserves and audits a prepared result handed to the app after cancellation', async () => {
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
    const events: PolicyEvent[] = [];
    const controller = new AbortController();
    const started = await new Harness({ audit: event => { events.push(event); } }).startRun({
      account: ACCOUNT, chainId: 'test-chain', operationId: 'late', scope: 'prepare-wallet',
      purpose: 'mainnet-read', walletTools: all, signal: controller.signal,
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

it('does not call a failed app handoff a cancellation merely because it failed late', async () => {
  const wallet = fakeWallet();
  const received: PreparedTransaction[] = [];
  const entered = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  const walletTools = createWalletTools({
    sdk: wallet, account: ACCOUNT, contacts: [],
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
