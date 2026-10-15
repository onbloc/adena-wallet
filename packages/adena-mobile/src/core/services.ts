import {
  GNO_CHAIN,
  ATOMONE_CHAIN,
  makeAtomOneNetworkProfiles,
  makeGnoNetworkProfiles,
} from '@common/utils/chain-utils';
import {GnoProvider} from '@common/provider/gno/gno-provider';
import {AdenaStorage} from '@common/storage/storage';
import {ChainRepository} from '@repositories/common/chain';
import {WalletRepository} from '@repositories/wallet/wallet';
import {WalletAccountRepository} from '@repositories/wallet/wallet-account';
import {WalletEstablishRepository} from '@repositories/wallet/wallet-establish';
import ATOMONE_CHAIN_DATA from '@resources/chains/atomone-chains.json';
import GNO_CHAIN_DATA from '@resources/chains/chains.json';
import {ChainService} from '@services/resource/chain';
import {TransactionService} from '@services/transaction/transaction';
import {WalletService} from '@services/wallet/wallet';
import {WalletAccountService} from '@services/wallet/wallet-account';
import {WalletBalanceService} from '@services/wallet/wallet-balance';
import {WalletEstablishService} from '@services/wallet/wallet-establish';
import type {NetworkMetainfo} from '@types';
import {ChainRegistry, createChainRegistry} from 'adena-module';
import type {AxiosInstance} from 'axios';

/**
 * The extension reads the default network list over HTTP from its own origin
 * (`/resources/chains/*.json`). The app has no such origin, so the same files
 * are served from the bundle; any other request fails rather than going to
 * the network.
 */
const bundledResources: Record<string, unknown> = {
  '/resources/chains/chains.json': GNO_CHAIN_DATA,
  '/resources/chains/atomone-chains.json': ATOMONE_CHAIN_DATA,
};

export const bundledResourceClient = {
  get: async (url: string) => {
    if (!(url in bundledResources)) {
      throw new Error(`No bundled resource for ${url}`);
    }
    return {data: bundledResources[url]};
  },
} as unknown as AxiosInstance;

/** Services that do not depend on the selected network. */
export function createBaseServices() {
  const local = AdenaStorage.local();
  const session = AdenaStorage.session();
  const chainRegistry: ChainRegistry = createChainRegistry({
    chains: [GNO_CHAIN, ATOMONE_CHAIN],
    gnoNetworkProfiles: makeGnoNetworkProfiles(GNO_CHAIN_DATA),
    atomoneNetworkProfiles: makeAtomOneNetworkProfiles(ATOMONE_CHAIN_DATA),
  });
  const walletService = new WalletService(new WalletRepository(local, session));
  const chainService = new ChainService(
    new ChainRepository(local, bundledResourceClient),
  );
  const accountRepository = new WalletAccountRepository(local);
  const establishService = new WalletEstablishService(
    new WalletEstablishRepository(local),
    chainRegistry,
  );
  return {
    chainRegistry,
    walletService,
    chainService,
    accountRepository,
    establishService,
  };
}

export type BaseServices = ReturnType<typeof createBaseServices>;

/** Services bound to one Gno network; rebuilt when the user switches network. */
export function createNetworkServices(
  base: BaseServices,
  network: NetworkMetainfo,
) {
  const gnoProvider = new GnoProvider(
    network.rpcUrl,
    network.chainId,
    network.fallbackRPCUrl,
  );
  const accountService = new WalletAccountService(
    base.accountRepository,
    gnoProvider,
  );
  const balanceService = new WalletBalanceService(gnoProvider);
  const transactionService = new TransactionService(
    base.walletService,
    gnoProvider,
    base.chainRegistry,
    null,
  );
  return {
    network,
    gnoProvider,
    accountService,
    balanceService,
    transactionService,
  };
}

export type NetworkServices = ReturnType<typeof createNetworkServices>;
