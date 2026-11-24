import { isAppError } from '../src/core/errors';
import { getNativeTokenFor } from '../src/resources';
import { createTestContainer, TEST_MNEMONIC, TEST_PASSWORD } from './helpers/test-container';

const RECIPIENT = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

describe('TransactionService', () => {
  const setup = async () => {
    const env = createTestContainer();
    const account = await env.container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
    const network = env.container.networkService.getCurrentNetwork();
    const address = env.container.accountService.getAddress(account, network);

    return { ...env, account, network, address, token: getNativeTokenFor(network) };
  };

  it('estimates the fee from simulated gas and the chain gas price', async () => {
    const { container, account, network, token } = await setup();
    const draft = await container.transactionService.createTransferDraft({ account, network, token, toAddress: RECIPIENT, amount: '1000' });
    const priced = await container.transactionService.withEstimatedFee(draft, account, network);

    // (100000 simulated + 230 fee-size headroom) gas * 1.1 (AVERAGE) at 1ugnot / 1000 gas.
    expect(priced.fee).toEqual({ gasWanted: '110253', gasFee: '111ugnot' });
  });

  it('fills MAX for the fee coin minus the padded fee, and the full balance otherwise', async () => {
    const { container, account, network, token } = await setup();
    // AVERAGE: 110253 gas at 1ugnot / 1000 gas = 111ugnot, padded 1.2x = 133ugnot.
    const max = await container.transactionService.maxTransferAmount({ account, network, token, toAddress: RECIPIENT, balance: '1000000' });

    expect(max).toBe('999867');
    const grc20 = { ...token, id: 'gno.land/r/demo/foo.FOO', type: 'grc20' as const, denom: 'foo', isNative: false };

    expect(await container.transactionService.maxTransferAmount({ account, network, token: grc20, toAddress: RECIPIENT, balance: '500' })).toBe('500');
  });

  it('counts the storage deposit when checking the fee coin balance', async () => {
    const { container, account, network, address, gno, token } = await setup();

    // Exactly amount (1000) + fee (111).
    gno.state.balances[address] = '1111ugnot';
    const draft = await container.transactionService.withEstimatedFee(
      await container.transactionService.createTransferDraft({ account, network, token, toAddress: RECIPIENT, amount: '1000' }),
      account,
      network,
    );

    await expect(container.transactionService.assertSufficientFunds(draft, account, network, { token, amount: '1000' })).resolves.toBeUndefined();
    const error = await container.transactionService.assertSufficientFunds(draft, account, network, { token, amount: '1000' }, '1').catch((e: unknown) => e);

    expect(isAppError(error, 'INSUFFICIENT_BALANCE')).toBe(true);
  });

  it('rejects transfers the balance cannot cover', async () => {
    const { container, account, network, address, gno, token } = await setup();

    gno.state.balances[address] = '1000ugnot';
    const draft = await container.transactionService.withEstimatedFee(
      await container.transactionService.createTransferDraft({ account, network, token, toAddress: RECIPIENT, amount: '1000' }),
      account,
      network,
    );
    const error = await container.transactionService.assertSufficientFunds(draft, account, network, { token, amount: '1000' }).catch((e: unknown) => e);

    expect(isAppError(error, 'INSUFFICIENT_BALANCE')).toBe(true);
  });

  it('signs and broadcasts through the chain adapter', async () => {
    const { container, account, network, gno, token } = await setup();
    const draft = await container.transactionService.withEstimatedFee(
      await container.transactionService.createTransferDraft({ account, network, token, toAddress: RECIPIENT, amount: '1000' }),
      account,
      network,
    );

    await expect(container.transactionService.signAndBroadcast(draft, account, network)).resolves.toMatchObject({ hash: 'HASH', height: '42' });
    expect(gno.state.broadcasts).toHaveLength(1);
  });

  it('refuses to sign when the RPC reports a different chain', async () => {
    const { container, account, network, gno, token } = await setup();

    gno.state.chainId = 'other-chain';
    const draft = await container.transactionService.createTransferDraft({ account, network, token, toAddress: RECIPIENT, amount: '1' });
    const error = await container.transactionService.sign({ ...draft, fee: { gasWanted: '1', gasFee: '1ugnot' } }, account, network).catch((e: unknown) => e);

    expect(isAppError(error, 'NETWORK_MISMATCH')).toBe(true);
  });

  it('cannot sign while the wallet is locked', async () => {
    const { container, account, network, token } = await setup();

    container.walletService.lock();
    const draft = await container.transactionService.createTransferDraft({ account, network, token, toAddress: RECIPIENT, amount: '1' });
    const error = await container.transactionService.sign(draft, account, network).catch((e: unknown) => e);

    expect(isAppError(error, 'WALLET_LOCKED')).toBe(true);
  });
});
