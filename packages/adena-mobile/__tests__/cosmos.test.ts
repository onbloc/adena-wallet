import { fromBase64, fromBech32, toBase64, toBech32 } from '@cosmjs/encoding';
import { calcFee, HDWalletKeyring, signCosmosDirect } from 'adena-module';
import { TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx';

import { isAppError } from '../src/core/errors';
import { deriveKeyPair } from '../src/crypto/key-pair';
import { mnemonicToSeed } from '../src/crypto/mnemonic';
import { computeFee, COSMOS_FEE_POLICY } from '../src/domain/fee';
import { createTestContainer, TEST_MNEMONIC, TEST_PASSWORD } from './helpers/test-container';

const REST = 'https://atomone-api.allinbits.com';
const RECIPIENT = toBech32('atone', fromBech32('g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5').data);

const setup = async () => {
  const env = createTestContainer();
  const account = await env.container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
  const network = env.container.networkService.selectNetwork('atomone-1');
  const address = env.container.accountService.getAddress(account, network);

  env.http
    .on(`${REST}/cosmos/base/tendermint/v1beta1/node_info`, { default_node_info: { network: 'atomone-1' } })
    .on(`${REST}/cosmos/auth/v1beta1/accounts/${address}`, { account: { '@type': '/cosmos.auth.v1beta1.BaseAccount', address, account_number: '12', sequence: '4' } })
    .on(`${REST}/cosmos/bank/v1beta1/balances/${address}`, { balances: [{ denom: 'uatone', amount: '5000000' }, { denom: 'uphoton', amount: '30000' }] })
    .on(`${REST}/cosmos/base/node/v1beta1/config`, { minimum_gas_price: '0.0225uatone,0.225uphoton' })
    .on(`${REST}/cosmos/tx/v1beta1/simulate`, { gas_info: { gas_used: '80000' } })
    .on(`${REST}/cosmos/tx/v1beta1/txs`, { tx_response: { txhash: 'ABC', code: 0, raw_log: '', height: '0' } });
  return { ...env, account, network, address };
};

describe('AtomOne (cosmos module)', () => {
  it('derives atone addresses from the same key as the Gno address', async () => {
    const { container, account, network, address } = await setup();
    const gno = container.accountService.getAddress(account, container.networkService.getNetwork('gnoland-1'));

    expect(address.startsWith('atone1')).toBe(true);
    expect(container.chainRegistry.forNetwork(network).isValidAddress(gno, network)).toBe(false);
    expect(fromBech32(address).data).toEqual(fromBech32(gno).data);
  });

  it('lists ATONE and PHOTON when an AtomOne network is selected, with LCD balances', async () => {
    const { container, account, network } = await setup();
    const tokens = await container.tokenService.getTokenList(account, network);

    expect(tokens.map(token => token.symbol)).toEqual(['ATONE', 'PHOTON']);
    await expect(container.tokenService.getBalances(account, network, tokens)).resolves.toEqual({ uatone: '5000000', uphoton: '30000' });
    expect(container.activityService.isSupported(network)).toBe(false);
    expect(container.nftService.isSupported(network)).toBe(false);
    expect(container.exploreService.getApps(network)).toHaveLength(0);
  });

  it('pays fees in PHOTON with the extension tier formula', async () => {
    const { container, account, network } = await setup();
    const atone = (await container.tokenService.getTokenList(account, network))[0];
    const draft = await container.transactionService.createTransferDraft({ account, network, token: atone, toAddress: RECIPIENT, amount: '1000000' });
    const estimate = await container.transactionService.estimateFee(draft, account, network);

    expect(estimate).toMatchObject({ gasUsed: '80000', gasPrice: '0.225', denom: 'uphoton' });

    for (const [tier, multiplier] of [['SLOW', 1], ['AVERAGE', 1.2], ['FAST', 1.5]] as const) {
      const reference = calcFee({ gasUsed: 80000, gasMultiplier: multiplier, minBaseGasPrice: '0.225', feeDenom: 'uphoton' });

      expect(computeFee(estimate, { tier, adjustment: 1 })).toMatchObject({ gasWanted: reference.gas, gasFee: `${reference.amount[0].amount}uphoton` });
    }

    expect(estimate.policy).toBe(COSMOS_FEE_POLICY);
  });

  it('signs SIGN_MODE_DIRECT byte-for-byte like adena-module and broadcasts in sync mode', async () => {
    const { container, account, network, address, http } = await setup();
    const atone = (await container.tokenService.getTokenList(account, network))[0];
    const draft = container.transactionService.applyFee(
      await container.transactionService.createTransferDraft({ account, network, token: atone, toAddress: RECIPIENT, amount: '1000000', memo: 'hi' }),
      { gasUsed: '80000', gasPrice: '0.225', denom: 'uphoton', policy: COSMOS_FEE_POLICY },
    );
    const signed = await container.transactionService.sign(draft, account, network);

    const reference = await signCosmosDirect({
      document: {
        chainId: 'atomone-1',
        fromAddress: address,
        msgs: [{ type: 'cosmos-sdk/MsgSend', value: { from_address: address, to_address: RECIPIENT, amount: [{ denom: 'uatone', amount: '1000000' }] } }],
        fee: { amount: [{ denom: 'uphoton', amount: draft.fee.gasFee.replace('uphoton', '') }], gas: draft.fee.gasWanted },
        memo: 'hi',
      },
      keyring: await HDWalletKeyring.fromMnemonic(TEST_MNEMONIC),
      cosmosProvider: { getAccount: async () => ({ address, accountNumber: '12', sequence: '4' }) } as never,
    });

    expect(signed.encoded).toBe(toBase64(reference.txBytes));
    expect(TxRaw.decode(fromBase64(signed.encoded)).signatures[0]).toHaveLength(64);

    await expect(container.transactionService.broadcast(signed, network)).resolves.toEqual({ hash: 'ABC', height: '0' });
    expect(http.calls).toContain(`${REST}/cosmos/tx/v1beta1/txs`);
  });

  it('checks PHOTON for the fee and ATONE for the amount separately', async () => {
    const { container, account, network, http, address } = await setup();

    http.on(`${REST}/cosmos/bank/v1beta1/balances/${address}`, { balances: [{ denom: 'uatone', amount: '5000000' }, { denom: 'uphoton', amount: '100' }] });
    const atone = (await container.tokenService.getTokenList(account, network))[0];
    const draft = { networkId: network.id, chainId: network.chainId, messages: [], memo: '', fee: { gasWanted: '104000', gasFee: '28080uphoton' } };
    const error = await container.transactionService.assertSufficientFunds(draft, account, network, { token: atone, amount: '1000' }).catch((e: unknown) => e);

    expect(isAppError(error, 'INSUFFICIENT_BALANCE')).toBe(true);
    expect((error as Error).message).toBe('Insufficient PHOTON for the network fee');
  });

  it('refuses Cosmos dApp messages over deep links', async () => {
    const { container, account, network } = await setup();
    const error = ((): unknown => {
      try {
        container.transactionService.createDraft(account, network, [{ type: 'cosmos-sdk/MsgSend', value: {} }], '');
      }
      catch (caught) {
        return caught;
      }
    })();

    expect(isAppError(error, 'UNSUPPORTED_MESSAGE')).toBe(true);
    expect((await deriveKeyPair(await mnemonicToSeed(TEST_MNEMONIC), 0)).publicKey).toHaveLength(33);
  });
});
