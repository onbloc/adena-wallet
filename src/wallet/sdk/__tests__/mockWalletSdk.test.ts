import {
  SignRequestType,
  TokenSymbol,
  WalletErrorCode,
  WalletStatus,
} from '../../constants';
import { INVALID_ADDRESS_LENGTH_MESSAGE, isValidAddress } from '../address';
import { FIXTURE } from '../fixture';
import { MockWalletSdk } from '../mockWalletSdk';
import type { SignRequest, TextMessage } from '../types';

const [acc1] = FIXTURE.accounts;
const other = FIXTURE.contacts[0].address;
const to = FIXTURE.recipient;
const gnot = TokenSymbol.Gnot;

/** An SDK whose popup answers `approve` and records what it was shown. */
function makeSdk(approve = true, secret?: string) {
  const shown: SignRequest[] = [];
  const sdk = new MockWalletSdk({
    secret,
    requestApproval: async (request) => {
      shown.push(request);
      return approve;
    },
  });
  return { sdk, shown };
}

const send = (amount: string, token: TokenSymbol = gnot) => ({
  from: acc1.address,
  to,
  amount,
  token,
});

describe('fixtures and address check', () => {
  it('uses addresses that pass the wallet address check', () => {
    const all = [
      ...FIXTURE.accounts.map((a) => a.address),
      ...FIXTURE.contacts.map((c) => c.address),
      FIXTURE.recipient,
    ];
    expect(all.filter((address) => !isValidAddress(address))).toEqual([]);
  });

  it.each([
    '',
    'g1',
    acc1.address.slice(1), // wrong prefix
    acc1.address + 'q', // too long
    acc1.address.slice(0, -1), // too short
    'G1' + acc1.address.slice(2), // uppercase
    'g1' + 'b'.repeat(38), // 'b' is not in the bech32 charset
  ])('rejects %p', (address) => {
    expect(isValidAddress(address)).toBe(false);
  });
});

describe('getBalance', () => {
  it('returns every token as a canonical decimal', async () => {
    const { sdk } = makeSdk();

    expect(await sdk.getBalance(acc1.address)).toEqual({ GNOT: '10', GNS: '250' });
  });

  it('returns zeros for a valid address the wallet has never seen', async () => {
    expect(await makeSdk().sdk.getBalance(to)).toEqual({ GNOT: '0', GNS: '0' });
  });

  it('rejects a malformed address', async () => {
    await expect(makeSdk().sdk.getBalance('alice')).rejects.toMatchObject({
      code: WalletErrorCode.InvalidAddress,
    });
  });

  it.each([
    ['empty', ''],
    ['too short', acc1.address.slice(0, -1)],
    ['too long', acc1.address + 'q'],
  ])('tells the user the address length is invalid when it is %s', async (_label, address) => {
    await expect(makeSdk().sdk.getBalance(address)).rejects.toMatchObject({
      code: WalletErrorCode.InvalidAddress,
      message: INVALID_ADDRESS_LENGTH_MESSAGE,
    });
  });

  it('keeps the generic message for a right-length address in the wrong format', async () => {
    await expect(makeSdk().sdk.getBalance('G1' + acc1.address.slice(2))).rejects.toMatchObject({
      code: WalletErrorCode.InvalidAddress,
      message: 'Not a valid g1... address',
    });
  });
});

describe('transfer', () => {
  it('builds a message with a normalized amount and moves no funds', async () => {
    const { sdk, shown } = makeSdk();

    const message = await sdk.transfer(send('0.50'));

    expect(message).toMatchObject({
      type: SignRequestType.Transfer,
      from: acc1.address,
      to,
      amount: '0.5',
      token: gnot,
      nonce: 0,
    });
    expect(await sdk.getBalance(acc1.address)).toEqual({ GNOT: '10', GNS: '250' });
    expect(shown).toEqual([]);
  });

  it('gives each message a new nonce', async () => {
    const { sdk } = makeSdk();

    const first = await sdk.transfer(send('1'));
    const second = await sdk.transfer(send('1'));

    expect([first.nonce, second.nonce]).toEqual([0, 1]);
  });

  it.each([
    ['sender is not an account of the wallet', { from: to, to, amount: '1' }, WalletErrorCode.UnknownAccount],
    ['recipient is malformed', { from: acc1.address, to: 'alice', amount: '1' }, WalletErrorCode.InvalidAddress],
    ['amount is zero', { ...send('0') }, WalletErrorCode.InvalidAmount],
    ['amount is negative', { ...send('-1') }, WalletErrorCode.InvalidAmount],
    ['amount is not a number', { ...send('half') }, WalletErrorCode.InvalidAmount],
    ['amount is finer than 6 decimals', { ...send('0.0000001') }, WalletErrorCode.InvalidAmount],
    ['balance is too low', { ...send('10.000001') }, WalletErrorCode.InsufficientBalance],
  ])('refuses when %s', async (_label, params, code) => {
    const { sdk } = makeSdk();

    await expect(sdk.transfer({ token: gnot, ...params })).rejects.toMatchObject({ code });
  });

  it('allows spending exactly the whole balance', async () => {
    await expect(makeSdk().sdk.transfer(send('10'))).resolves.toMatchObject({ amount: '10' });
  });

  it('tells the user the recipient address length is invalid, without asking to sign', async () => {
    const { sdk, shown } = makeSdk();

    await expect(sdk.transfer({ ...send('1'), to: to.slice(0, -1) })).rejects.toMatchObject({
      code: WalletErrorCode.InvalidAddress,
      message: INVALID_ADDRESS_LENGTH_MESSAGE,
    });
    expect(shown).toEqual([]);
  });
});

describe('sign a transfer', () => {
  it('moves the funds once the user approves, and shows the popup the exact message', async () => {
    const { sdk, shown } = makeSdk(true);
    const message = await sdk.transfer(send('0.5'));

    const result = await sdk.sign(message);

    expect(result).toMatchObject({ status: WalletStatus.Signed });
    expect(shown).toEqual([message]);
    expect(await sdk.getBalance(acc1.address)).toMatchObject({ GNOT: '9.5' });
    expect(await sdk.getBalance(to)).toMatchObject({ GNOT: '0.5' });
    expect(sdk.approvals).toEqual([{ request: message, approved: true }]);
  });

  it('adds up what approved transfers sent to the same address, per token', async () => {
    const { sdk } = makeSdk(true);

    await sdk.sign(await sdk.transfer(send('0.5')));
    await sdk.sign(await sdk.transfer(send('1.25')));
    await sdk.sign(await sdk.transfer(send('7', TokenSymbol.Gns)));

    expect(await sdk.getBalance(to)).toEqual({ GNOT: '1.75', GNS: '7' });
    expect(await sdk.getBalance(acc1.address)).toEqual({ GNOT: '8.25', GNS: '243' });
  });

  it('leaves the balances alone when the user rejects', async () => {
    const { sdk } = makeSdk(false);
    const message = await sdk.transfer(send('0.5'));

    const result = await sdk.sign(message);

    expect(result).toEqual({ status: WalletStatus.Rejected });
    expect(await sdk.getBalance(acc1.address)).toMatchObject({ GNOT: '10' });
    expect(await sdk.getBalance(to)).toMatchObject({ GNOT: '0' });
    expect(sdk.approvals[0].approved).toBe(false);
  });

  it('refuses to apply the same message twice', async () => {
    const { sdk, shown } = makeSdk();
    const message = await sdk.transfer(send('1'));
    await sdk.sign(message);

    await expect(sdk.sign(message)).rejects.toMatchObject({ code: WalletErrorCode.AlreadyApplied });

    expect(await sdk.getBalance(acc1.address)).toMatchObject({ GNOT: '9' });
    expect(shown).toHaveLength(1);
  });

  it('applies a message once even if it is signed twice while a popup is open', async () => {
    const { promise: gate, resolve: release } = Promise.withResolvers<void>();
    const sdk = new MockWalletSdk({
      requestApproval: async () => {
        await gate;
        return true;
      },
    });
    const message = await sdk.transfer(send('1'));

    const first = sdk.sign(message);
    const second = sdk.sign(message);
    release();
    const results = await Promise.allSettled([first, second]);

    expect(results.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect(await sdk.getBalance(acc1.address)).toMatchObject({ GNOT: '9' });
  });

  it('refuses a message that was altered after the wallet created it, without asking the user', async () => {
    const { sdk, shown } = makeSdk();
    const message = await sdk.transfer(send('1'));

    await expect(sdk.sign({ ...message, amount: '9' })).rejects.toMatchObject({
      code: WalletErrorCode.InvalidMessage,
    });
    await expect(sdk.sign({ ...message, to: other })).rejects.toMatchObject({
      code: WalletErrorCode.InvalidMessage,
    });

    expect(shown).toEqual([]);
    expect(await sdk.getBalance(acc1.address)).toMatchObject({ GNOT: '10' });
  });

  it('refuses a message the wallet never created', async () => {
    const { sdk, shown } = makeSdk();

    await expect(
      sdk.sign({ type: SignRequestType.Transfer, chainId: 'gnoland-1', nonce: 7, ...send('1') })
    ).rejects.toMatchObject({ code: WalletErrorCode.InvalidMessage });

    expect(shown).toEqual([]);
  });

  it('re-checks the balance at signing time and does not ask for a transfer that can no longer happen', async () => {
    const { sdk, shown } = makeSdk();
    const first = await sdk.transfer(send('6'));
    const second = await sdk.transfer(send('6')); // fine alone: 10 >= 6
    await sdk.sign(first);

    await expect(sdk.sign(second)).rejects.toMatchObject({
      code: WalletErrorCode.InsufficientBalance,
    });

    expect(shown).toHaveLength(1);
    expect(await sdk.getBalance(acc1.address)).toMatchObject({ GNOT: '4' });
  });

  it('does not ask the user when the call is already aborted', async () => {
    const { sdk, shown } = makeSdk();
    const message = await sdk.transfer(send('1'));
    const controller = new AbortController();
    controller.abort();

    await expect(sdk.sign(message, { signal: controller.signal })).rejects.toThrow();

    expect(shown).toEqual([]);
    expect(await sdk.getBalance(acc1.address)).toMatchObject({ GNOT: '10' });
  });
});

describe('sign a text message', () => {
  const text = (value: string, signer = acc1.address): TextMessage => ({
    type: SignRequestType.Message,
    signer,
    text: value,
  });

  it('signs after approval and shows the popup the text', async () => {
    const { sdk, shown } = makeSdk(true);

    const result = await sdk.sign(text('hello'));

    expect(result).toMatchObject({ status: WalletStatus.Signed });
    expect(shown).toEqual([text('hello')]);
  });

  it('returns rejected when the user declines', async () => {
    expect(await makeSdk(false).sdk.sign(text('hello'))).toEqual({
      status: WalletStatus.Rejected,
    });
  });

  it.each([
    ['blank text', text('  '), WalletErrorCode.EmptyMessage],
    ['a signer that is not an account of the wallet', text('hi', to), WalletErrorCode.UnknownAccount],
  ])('refuses %s without asking the user', async (_label, request, code) => {
    const { sdk, shown } = makeSdk();

    await expect(sdk.sign(request)).rejects.toMatchObject({ code });

    expect(shown).toEqual([]);
  });
});

describe('private key', () => {
  it('never appears in anything the SDK returns, throws, shows or logs', async () => {
    const secret = 'TOP-SECRET-KEY-0123456789';
    const { sdk, shown } = makeSdk(true, secret);
    const seen: unknown[] = [];
    const record = async (run: () => Promise<unknown>) => {
      try {
        seen.push(await run());
      } catch (error) {
        // Error fields (name, message) are not enumerable: copy them explicitly.
        seen.push(
          error instanceof Error
            ? Object.assign({}, error, { name: error.name, message: error.message })
            : error
        );
      }
    };

    await record(() => sdk.getBalance(acc1.address));
    await record(() => sdk.getBalance('bad'));
    const message = await sdk.transfer(send('1'));
    seen.push(message);
    await record(() => sdk.sign(message));
    await record(() => sdk.sign(message)); // already applied
    await record(() => sdk.transfer(send('999')));
    await record(() =>
      sdk.sign({ type: SignRequestType.Message, signer: acc1.address, text: 'hello' })
    );
    seen.push(shown, sdk.approvals, sdk);

    expect(JSON.stringify(seen)).not.toContain(secret);
  });
});

describe('allowances', () => {
  const gns = TokenSymbol.Gns;
  const give = (amount: string, token: TokenSymbol = gns, spender = other) => ({
    from: acc1.address,
    spender,
    amount,
    token,
  });

  it('stores nothing until the user signs', async () => {
    const { sdk, shown } = makeSdk();

    await sdk.approve(give('5'));

    expect(await sdk.getAllowances(acc1.address)).toEqual([]);
    expect(shown).toEqual([]);
  });

  it('stores the allowance once the user approves, shows the exact message, and moves no funds', async () => {
    const { sdk, shown } = makeSdk(true);
    const message = await sdk.approve(give('5'));

    const result = await sdk.sign(message);

    expect(result).toMatchObject({ status: WalletStatus.Signed });
    expect(shown).toEqual([message]);
    expect(await sdk.getAllowances(acc1.address)).toEqual([
      { spender: other, token: gns, amount: '5' },
    ]);
    expect(await sdk.getBalance(acc1.address)).toEqual({ GNOT: '10', GNS: '250' });
  });

  it('stores nothing when the user rejects', async () => {
    const { sdk } = makeSdk(false);

    const result = await sdk.sign(await sdk.approve(give('5')));

    expect(result).toEqual({ status: WalletStatus.Rejected });
    expect(await sdk.getAllowances(acc1.address)).toEqual([]);
  });

  it('replaces the allowance for the same spender and token and keeps the others', async () => {
    const { sdk } = makeSdk(true);

    for (const params of [
      give('5'),
      give('7'),
      give('1', gnot),
      give('2', gns, to),
    ]) {
      await sdk.sign(await sdk.approve(params));
    }

    expect(await sdk.getAllowances(acc1.address)).toEqual([
      { spender: other, token: gns, amount: '7' },
      { spender: other, token: gnot, amount: '1' },
      { spender: to, token: gns, amount: '2' },
    ]);
  });

  it('allows an amount above the balance, like ERC-20', async () => {
    const { sdk } = makeSdk(true);

    await sdk.sign(await sdk.approve(give('1000')));

    expect(await sdk.getAllowances(acc1.address)).toEqual([
      { spender: other, token: gns, amount: '1000' },
    ]);
  });

  it.each([
    ['owner is not an account of the wallet', { ...give('5'), from: to }, WalletErrorCode.UnknownAccount],
    ['spender is malformed', give('5', gns, to.toUpperCase()), WalletErrorCode.InvalidAddress],
    ['spender has the wrong length', give('5', gns, to.slice(0, -1)), WalletErrorCode.InvalidAddress],
    ['amount is zero', give('0'), WalletErrorCode.InvalidAmount],
    ['amount is negative', give('-1'), WalletErrorCode.InvalidAmount],
    ['amount is not a number', give('lots'), WalletErrorCode.InvalidAmount],
  ])('refuses when %s, without asking to sign', async (_label, params, code) => {
    const { sdk, shown } = makeSdk();

    await expect(sdk.approve(params)).rejects.toMatchObject({ code });
    expect(shown).toEqual([]);
  });

  it('tells the user the spender address length is invalid', async () => {
    await expect(makeSdk().sdk.approve(give('5', gns, to.slice(0, -1)))).rejects.toMatchObject({
      message: INVALID_ADDRESS_LENGTH_MESSAGE,
    });
  });

  it('refuses a message that was altered after the wallet created it, without asking the user', async () => {
    const { sdk, shown } = makeSdk();
    const message = await sdk.approve(give('5'));

    await expect(sdk.sign({ ...message, amount: '500' })).rejects.toMatchObject({
      code: WalletErrorCode.InvalidMessage,
    });
    await expect(sdk.sign({ ...message, spender: to })).rejects.toMatchObject({
      code: WalletErrorCode.InvalidMessage,
    });

    expect(shown).toEqual([]);
    expect(await sdk.getAllowances(acc1.address)).toEqual([]);
  });

  it('refuses a transfer message dressed up as an approval, and the other way around', async () => {
    const { sdk, shown } = makeSdk(true);
    const transfer = await sdk.transfer(send('1'));
    const approval = await sdk.approve(give('5'));

    await expect(
      sdk.sign({ ...approval, type: SignRequestType.Transfer, to: other } as never)
    ).rejects.toMatchObject({ code: WalletErrorCode.InvalidMessage });
    await expect(
      sdk.sign({ ...transfer, type: SignRequestType.Allowance, spender: to } as never)
    ).rejects.toMatchObject({ code: WalletErrorCode.InvalidMessage });

    expect(shown).toEqual([]);
  });

  it('applies an approval only once', async () => {
    const { sdk } = makeSdk(true);
    const message = await sdk.approve(give('5'));
    await sdk.sign(message);

    await expect(sdk.sign(message)).rejects.toMatchObject({
      code: WalletErrorCode.AlreadyApplied,
    });
  });

  it('numbers transfers and approvals from one sequence per account', async () => {
    const { sdk } = makeSdk();

    const first = await sdk.transfer(send('1'));
    const second = await sdk.approve(give('5'));
    const third = await sdk.transfer(send('1'));

    expect([first.nonce, second.nonce, third.nonce]).toEqual([0, 1, 2]);
  });

  it('lists allowances per owner and rejects a malformed owner', async () => {
    const { sdk } = makeSdk();

    expect(await sdk.getAllowances(other)).toEqual([]);
    await expect(sdk.getAllowances('alice')).rejects.toMatchObject({
      code: WalletErrorCode.InvalidAddress,
    });
  });
});
