import { useMemo } from 'react';

import { useContainer } from '../di/container-provider';
import { Account } from '../domain/account';
import { Network } from '../domain/network';
import { useSessionStore } from '../stores/session.store';

// Current account/network view for containers; recomputed when the session revision changes.
export interface WalletSnapshot {
  revision: number;
  network: Network;
  networks: Network[];
  account: Account | null;
  accounts: Account[];
  address: string;
}

export const useWalletSnapshot = (): WalletSnapshot => {
  const { accountService, networkService } = useContainer();
  const revision = useSessionStore(state => state.revision);

  return useMemo(() => {
    const network = networkService.getCurrentNetwork();
    const account = accountService.getCurrentAccount();

    return {
      revision,
      network,
      networks: networkService.getNetworks(),
      account,
      accounts: accountService.getAccounts(),
      address: account ? accountService.getAddress(account, network) : '',
    };
  }, [accountService, networkService, revision]);
};
