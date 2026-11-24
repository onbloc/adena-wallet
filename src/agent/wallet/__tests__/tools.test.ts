import { ACCOUNT, FRIEND, RECIPIENT, fakeWallet, type FakeWalletOptions } from '../../testing/fakeWallet';
import { ToolName, TransactionType, WalletErrorCode, WalletStatus } from '../constants';
import { WalletError, type PreparedTransaction } from '../port';
import { createWalletTools, type ToolResult } from '../tools';

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

// Runs a tool the way the AI SDK does, minus schema parsing.
type Tool = { execute?: unknown };
const run = (tool: Tool, input: unknown) =>
  (tool.execute as (input: unknown, options: unknown) => Promise<ToolResult>)(input, {
    toolCallId: 't',
    messages: [],
  });

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
    const schema = tools[ToolName.Transfer].inputSchema as unknown as { shape: Record<string, unknown> };

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
