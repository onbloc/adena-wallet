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
import {WalletEstablishAtomOneRepository} from '@repositories/wallet/wallet-establish-atomone';
import ATOMONE_CHAIN_DATA from '@resources/chains/atomone-chains.json';
import GNO_CHAIN_DATA from '@resources/chains/chains.json';
import {ChainService} from '@services/resource/chain';
import {TransactionService} from '@services/transaction/transaction';
import {WalletService} from '@services/wallet/wallet';
import {WalletAccountService} from '@services/wallet/wallet-account';
import {WalletBalanceService} from '@services/wallet/wallet-balance';
import {WalletEstablishService} from '@services/wallet/wallet-establish';
import {WalletEstablishAtomOneService} from '@services/wallet/wallet-establish-atomone';
import type {NetworkMetainfo} from '@types';
import {ChainRegistry, createChainRegistry} from 'adena-module';

import {bundledResourceClient} from '../platform/bundled-resources';

export {bundledResourceClient};

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
  // AtomOne (Cosmos) connections are kept apart from Gno ones, as in the
  // extension, so each can be revoked on its own.
  const establishAtomOneService = new WalletEstablishAtomOneService(
    new WalletEstablishAtomOneRepository(local),
    chainRegistry,
  );
  return {
    chainRegistry,
    walletService,
    chainService,
    accountRepository,
    establishService,
    establishAtomOneService,
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
