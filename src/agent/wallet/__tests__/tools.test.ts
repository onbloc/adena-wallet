import {
  ApprovalPolicy,
  SignRequestType,
  TokenSymbol,
  ToolName,
  WalletErrorCode,
  WalletStatus,
} from '../constants';
import { autoApproval } from '../../../mock/wallet/approval';
import { ACTIVE_ADDRESS, FIXTURE } from '../../../mock/wallet/fixture';
import { MockWalletSdk } from '../../../mock/wallet/mockWalletSdk';
import type { ApprovalHandler, SignRequest } from '../port';
import { createWalletTools, type ToolResult } from '../tools';

const to = FIXTURE.recipient;
const gnot = TokenSymbol.Gnot;
const other = FIXTURE.contacts[0].address;

function setup(requestApproval: ApprovalHandler = autoApproval(ApprovalPolicy.Approve), secret?: string) {
  const sdk = new MockWalletSdk({ requestApproval, secret });
  const tools = createWalletTools({ sdk, activeAddress: ACTIVE_ADDRESS, contacts: FIXTURE.contacts });
  // The mock wallet implements every optional method, so every tool is offered.
  return { sdk, tools: tools as Required<typeof tools> };
}

// Runs a tool the way the AI SDK does, minus schema parsing.
type Tool = { execute?: unknown };
const run = (tool: Tool, input: unknown, abortSignal?: AbortSignal) =>
  (tool.execute as (input: unknown, options: unknown) => Promise<ToolResult>)(input, {
    toolCallId: 'call',
    messages: [],
    abortSignal,
  });

describe('transfer', () => {
  const input = { to, amount: '0.5', token: gnot };

  it('has the harness pass the wallet-created message to be signed, from the injected account', async () => {
    const shown: unknown[] = [];
    const { sdk, tools } = setup(async (request) => {
      shown.push(request);
      return true;
    });

    const result = await run(tools[ToolName.Transfer], input);

    expect(shown).toEqual([
      expect.objectContaining({ type: SignRequestType.Transfer, from: ACTIVE_ADDRESS, to, amount: '0.5' }),
    ]);
    expect(result).toEqual({
      status: WalletStatus.Signed,
      from: ACTIVE_ADDRESS,
      to,
      amount: '0.5',
      token: gnot,
    });
    expect(await sdk.getBalance(ACTIVE_ADDRESS)).toMatchObject({ GNOT: '9.5' });
    expect(await sdk.getBalance(to)).toMatchObject({ GNOT: '0.5' });
  });

  it('returns rejected and moves nothing when the user declines', async () => {
    const { sdk, tools } = setup(autoApproval(ApprovalPolicy.Reject));

    const result = await run(tools[ToolName.Transfer], input);

    expect(result).toMatchObject({ status: WalletStatus.Rejected });
    expect(await sdk.getBalance(ACTIVE_ADDRESS)).toMatchObject({ GNOT: '10' });
  });

  it.each([
    ['a malformed recipient', { ...input, to: 'bob' }, WalletErrorCode.InvalidAddress],
    ['an amount that is not a number', { ...input, amount: 'half' }, WalletErrorCode.InvalidAmount],
    ['more than the balance', { ...input, amount: '11' }, WalletErrorCode.InsufficientBalance],
  ])('turns %s into an error result without showing a popup', async (_label, bad, code) => {
    const { sdk, tools } = setup();

    const result = await run(tools[ToolName.Transfer], bad);

    expect(result).toMatchObject({ status: WalletStatus.Error, code });
    expect(sdk.approvals).toEqual([]);
  });

  it('does not let the model choose the sending account', () => {
    const { tools } = setup();

    // The tool's input schema is a zod object here; parsing drops unknown keys.
    const schema = tools[ToolName.Transfer].inputSchema as unknown as {
      parse(value: unknown): object;
    };
    const parsed = schema.parse({ ...input, from: other });

    expect(parsed).not.toHaveProperty('from');
  });

  it('passes the abort signal on to the popup', async () => {
    let received: AbortSignal | undefined;
    const { tools } = setup(async (_request, options) => {
      received = options.signal;
      return true;
    });
    const controller = new AbortController();

    await run(tools[ToolName.Transfer], input, controller.signal);

    expect(received).toBe(controller.signal);
  });

  it('lets unexpected failures through as real errors, not as results', async () => {
    const { tools } = setup(async () => {
      throw new Error('popup crashed');
    });

    await expect(run(tools[ToolName.Transfer], input)).rejects.toThrow('popup crashed');
  });
});

describe('sign_message', () => {
  it('signs for the injected account after approval', async () => {
    const shown: unknown[] = [];
    const { tools } = setup(async (request) => {
      shown.push(request);
      return true;
    });

    const result = await run(tools[ToolName.SignMessage], { message: 'hello' });

    expect(result).toEqual({ status: WalletStatus.Signed });
    expect(shown).toEqual([
      { type: SignRequestType.Message, signer: ACTIVE_ADDRESS, text: 'hello' },
    ]);
  });

  it('returns rejected when the user declines', async () => {
    const { tools } = setup(autoApproval(ApprovalPolicy.Reject));

    expect(await run(tools[ToolName.SignMessage], { message: 'hello' })).toMatchObject({
      status: WalletStatus.Rejected,
    });
  });

  it('turns a blank message into an error result', async () => {
    const { tools } = setup();

    expect(await run(tools[ToolName.SignMessage], { message: ' ' })).toMatchObject({
      status: WalletStatus.Error,
      code: WalletErrorCode.EmptyMessage,
    });
  });
});

describe('what the model can see', () => {
  it('never includes the private key, signatures or message internals in any result', async () => {
    const secret = 'TOP-SECRET-KEY-0123456789';
    const { tools } = setup(autoApproval(ApprovalPolicy.Approve), secret);

    const results = [
      await run(tools[ToolName.GetApprovals], {}),
      await run(tools[ToolName.Transfer], { to, amount: '1', token: gnot }),
      await run(tools[ToolName.Transfer], { to: 'bad', amount: '1', token: gnot }),
      await run(tools[ToolName.SignMessage], { message: 'hello' }),
    ];

    const seen = JSON.stringify(results);
    expect(seen).not.toContain(secret);
    expect(seen).not.toContain('mock-sig');
    expect(seen).not.toContain('nonce');
  });
});

describe('approve', () => {
  const gns = TokenSymbol.Gns;
  const input = { spender: other, amount: '5.0', token: gns };

  it('has the harness pass the wallet-created allowance message to be signed, from the injected account', async () => {
    const shown: SignRequest[] = [];
    const { sdk, tools } = setup(async (request) => {
      shown.push(request);
      return true;
    });

    const result = await run(tools[ToolName.Approve], input);

    expect(result).toEqual({
      status: WalletStatus.Signed,
      from: ACTIVE_ADDRESS,
      spender: other,
      amount: '5',
      token: gns,
    });
    expect(shown).toEqual([
      expect.objectContaining({
        type: SignRequestType.Allowance,
        from: ACTIVE_ADDRESS,
        spender: other,
        amount: '5',
        token: gns,
      }),
    ]);
    expect(await sdk.getAllowances(ACTIVE_ADDRESS)).toEqual([
      { spender: other, token: gns, amount: '5' },
    ]);
  });

  it('returns rejected and stores nothing when the user declines', async () => {
    const { sdk, tools } = setup(autoApproval(ApprovalPolicy.Reject));

    const result = await run(tools[ToolName.Approve], input);

    expect(result).toMatchObject({ status: WalletStatus.Rejected });
    expect(await sdk.getAllowances(ACTIVE_ADDRESS)).toEqual([]);
  });

  it.each([
    ['a spender with the wrong length', { ...input, spender: to.slice(0, -1) }, WalletErrorCode.InvalidAddress],
    ['a zero amount', { ...input, amount: '0' }, WalletErrorCode.InvalidAmount],
  ])('turns %s into an error result without showing a popup', async (_label, bad, code) => {
    const shown: SignRequest[] = [];
    const { tools } = setup(async (request) => {
      shown.push(request);
      return true;
    });

    expect(await run(tools[ToolName.Approve], bad)).toMatchObject({
      status: WalletStatus.Error,
      code,
    });
    expect(shown).toEqual([]);
  });

  it('does not let the model choose the owner', () => {
    const { tools } = setup();
    const schema = tools[ToolName.Approve].inputSchema as unknown as {
      parse(value: unknown): object;
    };

    expect(schema.parse({ ...input, from: other })).not.toHaveProperty('from');
  });
});

describe('get_approvals', () => {
  it('starts empty and lists what the user approved, oldest first', async () => {
    const { tools } = setup();

    expect(await run(tools[ToolName.GetApprovals], {})).toEqual({
      status: WalletStatus.Ok,
      address: ACTIVE_ADDRESS,
      approvals: [],
    });

    await run(tools[ToolName.Approve], { spender: other, amount: '5', token: TokenSymbol.Gns });
    await run(tools[ToolName.Approve], { spender: to, amount: '2', token: gnot });

    expect(await run(tools[ToolName.GetApprovals], {})).toEqual({
      status: WalletStatus.Ok,
      address: ACTIVE_ADDRESS,
      approvals: [
        { spender: other, token: TokenSymbol.Gns, amount: '5' },
        { spender: to, token: gnot, amount: '2' },
      ],
    });
  });
});

describe('address case in results', () => {
  it('shows the lowercase address, whatever case the model wrote', async () => {
    const { tools } = setup();

    expect(
      await run(tools[ToolName.Transfer], { to: to.toUpperCase(), amount: '1', token: gnot })
    ).toMatchObject({ status: WalletStatus.Signed, to });
    expect(
      await run(tools[ToolName.Approve], { spender: other.toUpperCase(), amount: '1', token: gnot })
    ).toMatchObject({ status: WalletStatus.Signed, spender: other });
  });
});

describe('contact names', () => {
  const alias = FIXTURE.contacts[0].alias;

  it.each([alias, ` ${alias.toUpperCase()} `])('sends to the address of the contact %p', async (name) => {
    const { sdk, tools } = setup();

    const result = await run(tools[ToolName.Transfer], { to: name, amount: '1', token: gnot });

    expect(result).toMatchObject({ status: WalletStatus.Signed, to: other });
    expect(await sdk.getBalance(other)).toMatchObject({ GNOT: '1' });
  });

  it('approves for the address of the contact', async () => {
    const { tools } = setup();

    await run(tools[ToolName.Approve], { spender: alias, amount: '5', token: TokenSymbol.Gns });

    expect(await run(tools[ToolName.GetApprovals], {})).toMatchObject({
      approvals: [{ spender: other, token: TokenSymbol.Gns, amount: '5' }],
    });
  });

  it('leaves a name that is no contact for the wallet to refuse', async () => {
    const { sdk, tools } = setup();

    const result = await run(tools[ToolName.Transfer], { to: 'bob', amount: '1', token: gnot });

    expect(result).toMatchObject({ status: WalletStatus.Error, code: WalletErrorCode.InvalidAddress });
    expect(sdk.approvals).toEqual([]);
  });
});

describe('createWalletTools', () => {
  it('has no balance tools, so Onbloc is the only source for balances', () => {
    const { tools } = setup();

    expect(Object.keys(tools).sort()).toEqual(
      [ToolName.Transfer, ToolName.Approve, ToolName.GetApprovals, ToolName.SignMessage].sort()
    );
  });

  it('offers approve and get_approvals only if the wallet implements them', () => {
    const mock = new MockWalletSdk({ requestApproval: autoApproval(ApprovalPolicy.Approve) });
    // A wallet that only sends and signs: the optional methods are left out.
    const minimal = {
      getActiveAddress: () => mock.getActiveAddress(),
      transfer: (params: Parameters<MockWalletSdk['transfer']>[0]) => mock.transfer(params),
      sign: (request: SignRequest) => mock.sign(request),
    };

    const tools = createWalletTools({ sdk: minimal, activeAddress: ACTIVE_ADDRESS, contacts: [] });

    expect(Object.keys(tools).sort()).toEqual([ToolName.SignMessage, ToolName.Transfer].sort());
  });
});
