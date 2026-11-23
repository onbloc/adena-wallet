import { fromBase64 } from '@cosmjs/encoding';

import { StorageAccountRepository } from '../../../src/repositories/account.repository';
import { AccountService } from '../../../src/services/account.service';
import { BalanceService } from '../../../src/services/balance.service';
import { KeyringSession } from '../../../src/services/keyring-session';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';
import { COSMOS_NETWORK, createFakeRegistry, fakeAddress, GNO_NETWORK, makeAccount } from '../../helpers/service-fakes';

describe('BalanceService', () => {
  it('reads the native balance of the account address through the network family chain', async () => {
    const { registry, modules } = createFakeRegistry();
    const service = new BalanceService(registry, new AccountService(new StorageAccountRepository(new MemoryKeyValueStore()), new KeyringSession(), registry));
    const account = makeAccount();
    const balance = { denom: 'uatone', symbol: 'ATONE', decimals: 6, amount: '5' };

    modules.cosmos.chain.getNativeBalance.mockResolvedValue(balance);
    await expect(service.getNativeBalance(account, COSMOS_NETWORK)).resolves.toBe(balance);
    expect(modules.cosmos.chain.getNativeBalance).toHaveBeenCalledWith(fakeAddress(fromBase64(account.publicKey), COSMOS_NETWORK), COSMOS_NETWORK);
    expect(modules.gno.chain.getNativeBalance).not.toHaveBeenCalled();
  });

  it('propagates chain errors', async () => {
    const { registry, modules } = createFakeRegistry();
    const service = new BalanceService(registry, new AccountService(new StorageAccountRepository(new MemoryKeyValueStore()), new KeyringSession(), registry));

    modules.gno.chain.getNativeBalance.mockRejectedValue(new Error('rpc down'));
    await expect(service.getNativeBalance(makeAccount(), GNO_NETWORK)).rejects.toThrow('rpc down');
  });
});
