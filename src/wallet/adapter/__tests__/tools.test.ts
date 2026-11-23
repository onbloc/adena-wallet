import {
  ApprovalPolicy,
  SignRequestType,
  TokenSymbol,
  ToolName,
  WalletErrorCode,
  WalletStatus,
} from '../../constants';
import { INVALID_ADDRESS_LENGTH_MESSAGE } from '../../sdk/address';
import { autoApproval } from '../../sdk/approval';
import { ACTIVE_ADDRESS, FIXTURE } from '../../sdk/fixture';
import { MockWalletSdk } from '../../sdk/mockWalletSdk';
import type { ApprovalHandler, SignRequest } from '../../sdk/types';
import { createWalletTools, type ToolResult } from '../tools';

const to = FIXTURE.recipient;
const gnot = TokenSymbol.Gnot;
const other = FIXTURE.contacts[0].address;

function setup(requestApproval: ApprovalHandler = autoApproval(ApprovalPolicy.Approve), secret?: string) {
  const sdk = new MockWalletSdk({ requestApproval, secret });
  const tools = createWalletTools({ sdk, activeAddress: ACTIVE_ADDRESS });
  return { sdk, tools };
}

// Runs a tool the way the AI SDK does, minus schema parsing.
type Tool = { execute?: unknown };
const run = (tool: Tool, input: unknown, abortSignal?: AbortSignal) =>
  (tool.execute as (input: unknown, options: unknown) => Promise<ToolResult>)(input, {
    toolCallId: 'call',
    messages: [],
    abortSignal,
  });

describe('get_balance', () => {
  it("returns the user's own balances", async () => {
    const { tools } = setup();

    expect(await run(tools[ToolName.GetBalance], {})).toEqual({
      status: WalletStatus.Ok,
      address: ACTIVE_ADDRESS,
      balances: { GNOT: '10', GNS: '250' },
    });
  });

  it('takes no model arguments, so the model cannot redirect it to another address', () => {
    const { tools } = setup();
    const schema = tools[ToolName.GetBalance].inputSchema as unknown as {
      parse(value: unknown): object;
    };

    expect(schema.parse({ address: other })).toEqual({});
  });
});

describe('get_address_balance', () => {
  it('looks up the address the model names, including what was sent to it', async () => {
    const { tools } = setup();
    await run(tools[ToolName.Transfer], { to, amount: '0.5', token: gnot });

    expect(await run(tools[ToolName.GetAddressBalance], { address: to })).toEqual({
      status: WalletStatus.Ok,
      address: to,
      balances: { GNOT: '0.5', GNS: '0' },
    });
    expect(await run(tools[ToolName.GetBalance], {})).toMatchObject({
      address: ACTIVE_ADDRESS,
      balances: { GNOT: '9.5' },
    });
  });

  it.each(['', to.slice(0, -1), to + 'q'])(
    'turns the wrong-length address %p into an error result with the length message',
    async (address) => {
      const { tools } = setup();

      expect(await run(tools[ToolName.GetAddressBalance], { address })).toEqual({
        status: WalletStatus.Error,
        code: WalletErrorCode.InvalidAddress,
        message: INVALID_ADDRESS_LENGTH_MESSAGE,
      });
    }
  );
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
    ['a malformed recipient', { ...input, to: 'alice' }, WalletErrorCode.InvalidAddress],
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
      await run(tools[ToolName.GetBalance], {}),
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
