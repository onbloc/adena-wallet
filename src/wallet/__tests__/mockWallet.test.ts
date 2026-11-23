import { ToolName, TokenSymbol, WalletErrorCode, WalletStatus } from '../constants';
import { FIXTURE, isValidAddress, MockWallet } from '../mockWallet';

const [acc1, acc2] = FIXTURE.accounts;
const to = FIXTURE.recipient;

describe('fixtures', () => {
  it('uses addresses that pass the wallet address check', () => {
    const all = [
      ...FIXTURE.accounts.map((a) => a.address),
      ...FIXTURE.contacts.map((c) => c.address),
      FIXTURE.recipient,
    ];
    expect(all.filter((address) => !isValidAddress(address))).toEqual([]);
  });
});

describe('isValidAddress', () => {
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

describe('MockWallet.getBalance', () => {
  it('defaults to account 1 and returns a canonical decimal', () => {
    const wallet = new MockWallet();

    expect(wallet.getBalance({ token: TokenSymbol.Gnot })).toMatchObject({
      status: WalletStatus.Ok,
      account: 1,
      balance: '10',
    });
    expect(wallet.getBalance({ token: TokenSymbol.Gnot, account: 2 })).toMatchObject({
      balance: '1.5',
    });
  });

  it('errors for an unknown account', () => {
    expect(
      new MockWallet().getBalance({ token: TokenSymbol.Gnot, account: 9 })
    ).toMatchObject({
      status: WalletStatus.Error,
      code: WalletErrorCode.UnknownAccount,
    });
  });
});

describe('MockWallet.transfer', () => {
  it('stops at pending approval with a normalized amount and does not move funds', () => {
    const wallet = new MockWallet();

    const result = wallet.transfer({ to, amount: '0.50', token: TokenSymbol.Gnot });

    expect(result).toMatchObject({
      status: WalletStatus.PendingApproval,
      from: acc1.address,
      to,
      amount: '0.5',
      token: TokenSymbol.Gnot,
    });
    expect(wallet.getBalance({ token: TokenSymbol.Gnot })).toMatchObject({ balance: '10' });
  });

  it.each([
    ['not-an-address', '1', WalletErrorCode.InvalidAddress],
    [to, '0', WalletErrorCode.InvalidAmount],
    [to, '-1', WalletErrorCode.InvalidAmount],
    [to, 'half', WalletErrorCode.InvalidAmount],
    [to, '0.0000001', WalletErrorCode.InvalidAmount], // finer than 6 decimals
    [to, '10.000001', WalletErrorCode.InsufficientBalance],
  ])('rejects to=%p amount=%p with %s', (address, amount, code) => {
    const result = new MockWallet().transfer({
      to: address,
      amount,
      token: TokenSymbol.Gnot,
    });

    expect(result).toMatchObject({ status: WalletStatus.Error, code });
  });

  it('allows spending exactly the whole balance', () => {
    expect(
      new MockWallet().transfer({ to, amount: '10', token: TokenSymbol.Gnot })
    ).toMatchObject({ status: WalletStatus.PendingApproval });
  });

  it('checks the balance of the chosen account', () => {
    const result = new MockWallet().transfer({
      to,
      amount: '2',
      token: TokenSymbol.Gnot,
      account: acc2.index,
    });

    expect(result).toMatchObject({
      code: WalletErrorCode.InsufficientBalance,
      available: '1.5',
    });
  });
});

describe('MockWallet.signMessage', () => {
  it('stops at pending approval', () => {
    expect(new MockWallet().signMessage({ message: 'hello' })).toMatchObject({
      status: WalletStatus.PendingApproval,
      signer: acc1.address,
    });
  });

  it('rejects a blank message', () => {
    expect(new MockWallet().signMessage({ message: '  ' })).toMatchObject({
      code: WalletErrorCode.EmptyMessage,
    });
  });
});

describe('MockWallet call log', () => {
  it('records every call including failures, in order, and reset clears it', () => {
    const wallet = new MockWallet();

    wallet.getBalance({ token: TokenSymbol.Gnot });
    wallet.transfer({ to: 'bad', amount: '1', token: TokenSymbol.Gnot });

    expect(wallet.calls.map((c) => [c.tool, c.result.status])).toEqual([
      [ToolName.GetBalance, WalletStatus.Ok],
      [ToolName.Transfer, WalletStatus.Error],
    ]);
    wallet.reset();
    expect(wallet.calls).toEqual([]);
  });
});
