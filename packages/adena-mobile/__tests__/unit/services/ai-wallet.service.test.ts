import type { TransferParams } from 'adena-ai-llm-poc';

import { AppError, AppErrorCode } from '../../../src/core/errors';
import { AiTransferDraft } from '../../../src/domain/ai';
import { ManagedToken, TokenSource } from '../../../src/domain/token';
import { AccountService } from '../../../src/services/account.service';
import { AddressBookService } from '../../../src/services/address-book.service';
import { AiWalletService } from '../../../src/services/ai-wallet.service';
import { TokenService } from '../../../src/services/token.service';
import { TransactionService } from '../../../src/services/transaction.service';
import { loadRealAiLibrary } from '../../helpers/ai-library';
import { GNO_NETWORK, makeAccount, makeToken, networkById } from '../../helpers/service-fakes';

const owner = 'g1owner';
const recipient = 'g1recipient';
const account = makeAccount();
const token: ManagedToken = { ...makeToken(), source: TokenSource.DEFAULT, visible: true };
const params: TransferParams = { from: owner, to: recipient, amount: '1.000001', token: 'FOO' };

async function setup(tokens = [token], network = GNO_NETWORK) {
  const library = await loadRealAiLibrary();
  const tokenService = {
    getTokenList: jest.fn(async () => tokens),
    getBalances: jest.fn(async () => Object.fromEntries(tokens.map(asset => [asset.id, '9007199254740993000000']))),
  };
  const transactionService = {
    createTransferDraft: jest.fn(async () => ({ messages: ['unsigned'] })),
    signAndBroadcast: jest.fn(),
  };
  const service = new AiWalletService(
    { getAddress: () => owner } as unknown as AccountService,
    tokenService as unknown as TokenService,
    transactionService as unknown as TransactionService,
    { getEntriesFor: () => [{ address: recipient, name: 'Friend' }] } as unknown as AddressBookService,
  );

  return { service, sdk: service.createSdk(library, account, network), tokenService, transactionService, library };
}

describe('AiWalletService', () => {
  it.each(['gnoland-1', 'onyx-1'])('prepares exact unsigned transfers bound to the selected network %s', async (networkId) => {
    const network = networkById(networkId);
    const asset = { ...token, networkId };
    const env = await setup([asset], network);
    const prepared = await env.sdk.transfer(params);

    expect(env.transactionService.createTransferDraft).toHaveBeenCalledWith({
      account, network, token: asset, toAddress: recipient, amount: '1000001',
    });
    expect(prepared.summary).toMatchObject({ chainId: network.chainId, from: owner, to: recipient, amount: '1.000001', token: 'FOO', packagePath: token.id });
    expect(prepared.tx).toMatchObject({ account, network, recipientName: 'Friend', amount: '1000001' });
    expect(env.transactionService.signAndBroadcast).not.toHaveBeenCalled();
    expect(Object.keys(env.sdk).sort()).toEqual(['getContacts', 'transfer']);
  });

  it('retains precision for integer amounts larger than Number.MAX_SAFE_INTEGER', async () => {
    const env = await setup();
    const prepared = await env.sdk.transfer({ ...params, amount: '9007199254740993' });

    expect((prepared.tx as AiTransferDraft).amount).toBe('9007199254740993000000');
    expect(prepared.summary.amount).toBe('9007199254740993');
  });

  it.each(['0', '-1', '1.0000001', '1e6', 'NaN'])('rejects invalid or inexact amount %s before preparing', async (amount) => {
    const env = await setup();

    await expect(env.sdk.transfer({ ...params, amount })).rejects.toMatchObject({ code: env.library.agent.WalletErrorCode.InvalidAmount });
    expect(env.transactionService.createTransferDraft).not.toHaveBeenCalled();
  });

  it('refuses another sender before reading wallet data', async () => {
    const env = await setup();

    await expect(env.sdk.transfer({ ...params, from: 'g1someoneelse' })).rejects.toThrow('selected account');
    expect(env.tokenService.getTokenList).not.toHaveBeenCalled();
  });

  it('refuses hidden tokens and resolves ambiguous symbols only by canonical registry key', async () => {
    const other = { ...token, id: 'gno.land/r/other/foo.FOO', pkgPath: 'gno.land/r/other/foo' };
    const env = await setup([token, other]);

    await expect(env.sdk.transfer(params)).rejects.toMatchObject({ code: env.library.agent.WalletErrorCode.AmbiguousToken });
    await expect(env.sdk.transfer({ ...params, token: other.id })).resolves.toMatchObject({ summary: { packagePath: other.id } });
    const hidden = await setup([{ ...token, visible: false }]);

    await expect(hidden.sdk.transfer(params)).rejects.toMatchObject({ code: hidden.library.agent.WalletErrorCode.UnknownToken });
  });

  it('keeps assets in one realm distinct by canonical registry key', async () => {
    const other = { ...token, id: `${token.pkgPath}.OTHER`, symbol: 'FOO' };
    const env = await setup([token, other]);

    await expect(env.sdk.transfer(params)).rejects.toMatchObject({
      code: env.library.agent.WalletErrorCode.AmbiguousToken,
      candidateIds: [token.id, other.id],
    });
    const prepared = await env.sdk.transfer({ ...params, token: other.id });

    expect(prepared.summary.packagePath).toBe(other.id);
    expect((prepared.tx as AiTransferDraft).token.id).toBe(other.id);
    await expect(env.sdk.transfer({ ...params, token: token.pkgPath! })).rejects.toMatchObject({
      code: env.library.agent.WalletErrorCode.UnknownToken,
    });
  });

  it('rejects insufficient balance before creating a draft', async () => {
    const env = await setup();

    env.tokenService.getBalances.mockResolvedValueOnce({ [token.id]: '1000000' });
    await expect(env.sdk.transfer(params)).rejects.toMatchObject({ code: env.library.agent.WalletErrorCode.InsufficientBalance });
    expect(env.transactionService.createTransferDraft).not.toHaveBeenCalled();
  });

  it('maps recipient validation errors from the existing transaction pipeline', async () => {
    const env = await setup();

    env.transactionService.createTransferDraft.mockRejectedValueOnce(new AppError(AppErrorCode.INVALID_ADDRESS));
    await expect(env.sdk.transfer(params)).rejects.toMatchObject({ code: env.library.agent.WalletErrorCode.InvalidAddress });
    expect(env.transactionService.signAndBroadcast).not.toHaveBeenCalled();
  });

  it('does no wallet reads when already aborted and discards a draft prepared after cancellation', async () => {
    const env = await setup();
    const controller = new AbortController();

    controller.abort();
    await expect(env.sdk.transfer(params, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(env.tokenService.getTokenList).not.toHaveBeenCalled();
    const active = new AbortController();

    env.transactionService.createTransferDraft.mockImplementationOnce(async () => {
      active.abort();
      return { messages: ['unsigned'] };
    });
    await expect(env.sdk.transfer(params, { signal: active.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(env.transactionService.signAndBroadcast).not.toHaveBeenCalled();
  });
});
