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

    expect(wallet.getBalance({ token: 'GNOT' })).toMatchObject({
      status: 'ok',
      account: 1,
      balance: '10',
    });
    expect(wallet.getBalance({ token: 'GNOT', account: 2 })).toMatchObject({
      balance: '1.5',
    });
  });

  it('errors for an unknown account', () => {
    expect(new MockWallet().getBalance({ token: 'GNOT', account: 9 })).toMatchObject({
      status: 'error',
      code: 'unknown_account',
    });
  });
});

describe('MockWallet.transfer', () => {
  it('stops at pending approval with a normalized amount and does not move funds', () => {
    const wallet = new MockWallet();

    const result = wallet.transfer({ to, amount: '0.50', token: 'GNOT' });

    expect(result).toMatchObject({
      status: 'pending_approval',
      from: acc1.address,
      to,
      amount: '0.5',
      token: 'GNOT',
    });
    expect(wallet.getBalance({ token: 'GNOT' })).toMatchObject({ balance: '10' });
  });

  it.each([
    ['not-an-address', '1', 'invalid_address'],
    [to, '0', 'invalid_amount'],
    [to, '-1', 'invalid_amount'],
    [to, 'half', 'invalid_amount'],
    [to, '0.0000001', 'invalid_amount'], // finer than 6 decimals
    [to, '10.000001', 'insufficient_balance'],
  ])('rejects to=%p amount=%p with %s', (address, amount, code) => {
    const result = new MockWallet().transfer({ to: address, amount, token: 'GNOT' });

    expect(result).toMatchObject({ status: 'error', code });
  });

  it('allows spending exactly the whole balance', () => {
    expect(new MockWallet().transfer({ to, amount: '10', token: 'GNOT' })).toMatchObject({
      status: 'pending_approval',
    });
  });

  it('checks the balance of the chosen account', () => {
    const result = new MockWallet().transfer({
      to,
      amount: '2',
      token: 'GNOT',
      account: acc2.index,
    });

    expect(result).toMatchObject({
      code: 'insufficient_balance',
      available: '1.5',
    });
  });
});

describe('MockWallet.signMessage', () => {
  it('stops at pending approval', () => {
    expect(new MockWallet().signMessage({ message: 'hello' })).toMatchObject({
      status: 'pending_approval',
      signer: acc1.address,
    });
  });

  it('rejects a blank message', () => {
    expect(new MockWallet().signMessage({ message: '  ' })).toMatchObject({
      code: 'empty_message',
    });
  });
});

describe('MockWallet call log', () => {
  it('records every call including failures, in order, and reset clears it', () => {
    const wallet = new MockWallet();

    wallet.getBalance({ token: 'GNOT' });
    wallet.transfer({ to: 'bad', amount: '1', token: 'GNOT' });

    expect(wallet.calls.map((c) => [c.tool, c.result.status])).toEqual([
      ['get_balance', 'ok'],
      ['transfer', 'error'],
    ]);
    wallet.reset();
    expect(wallet.calls).toEqual([]);
  });
});
