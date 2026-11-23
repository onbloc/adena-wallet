import { fromBase64 } from '@cosmjs/encoding';

import { StorageAccountRepository } from '../../../src/repositories/account.repository';
import { AccountService } from '../../../src/services/account.service';
import { ActivityService } from '../../../src/services/activity.service';
import { KeyringSession } from '../../../src/services/keyring-session';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';
import { COSMOS_NETWORK, createFakeRegistry, fakeAddress, GNO_NETWORK, makeAccount } from '../../helpers/service-fakes';

const setup = () => {
  const { registry, modules } = createFakeRegistry();
  const accountService = new AccountService(new StorageAccountRepository(new MemoryKeyValueStore()), new KeyringSession(), registry);

  return { service: new ActivityService(registry, accountService), modules };
};

describe('ActivityService', () => {
  it('asks the network family history repository whether history is supported', () => {
    const { service, modules } = setup();

    modules.cosmos.history.isSupported.mockReturnValue(false);
    expect(service.isSupported(GNO_NETWORK)).toBe(true);
    expect(service.isSupported(COSMOS_NETWORK)).toBe(false);
    expect(modules.gno.history.isSupported).toHaveBeenCalledWith(GNO_NETWORK);
  });

  it('loads activities for the account address on the given network with the cursor', async () => {
    const { service, modules } = setup();
    const account = makeAccount();
    const page = { items: [], cursor: null, hasNext: false };

    modules.gno.history.getActivities.mockResolvedValue(page);
    await expect(service.getActivities(account, GNO_NETWORK, { kind: 'all' }, 'cursor-1')).resolves.toBe(page);
    expect(modules.gno.history.getActivities).toHaveBeenCalledWith(
      fakeAddress(fromBase64(account.publicKey), GNO_NETWORK), GNO_NETWORK, { kind: 'all' }, 'cursor-1');
  });
});
