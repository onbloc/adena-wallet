import {
  GNO_CHAIN,
  ATOMONE_CHAIN,
  makeAtomOneNetworkProfiles,
  makeGnoNetworkProfiles,
} from '@common/utils/chain-utils';
import {getGrc20RegistryPaths} from '@common/utils/grc20reg-config';
import {GnoProvider} from '@common/provider/gno/gno-provider';
import {AdenaStorage} from '@common/storage/storage';
import {ChainRepository} from '@repositories/common/chain';
import {TokenRepository} from '@repositories/common/token';
import {WalletRepository} from '@repositories/wallet/wallet';
import {WalletAccountRepository} from '@repositories/wallet/wallet-account';
import {WalletAddressRepository} from '@repositories/wallet/wallet-address';
import {WalletEstablishRepository} from '@repositories/wallet/wallet-establish';
import {WalletEstablishAtomOneRepository} from '@repositories/wallet/wallet-establish-atomone';
import ATOMONE_CHAIN_DATA from '@resources/chains/atomone-chains.json';
import GNO_CHAIN_DATA from '@resources/chains/chains.json';
import {ChainService} from '@services/resource/chain';
import {TokenService} from '@services/resource/token';
import {TransactionService} from '@services/transaction/transaction';
import {WalletService} from '@services/wallet/wallet';
import {WalletAccountService} from '@services/wallet/wallet-account';
import {WalletAddressBookService} from '@services/wallet/wallet-address-book';
import {WalletBalanceService} from '@services/wallet/wallet-balance';
import {WalletEstablishService} from '@services/wallet/wallet-establish';
import {WalletEstablishAtomOneService} from '@services/wallet/wallet-establish-atomone';
import type {NetworkMetainfo} from '@types';
import {ChainRegistry, createChainRegistry} from 'adena-module';
import axios from 'axios';

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
  const walletRepository = new WalletRepository(local, session);
  const walletService = new WalletService(walletRepository);
  const addressRepository = new WalletAddressRepository(local);
  // Encrypted with the wallet password, so it reads only while unlocked.
  const addressBookService = new WalletAddressBookService(
    walletRepository,
    addressRepository,
  );
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
    walletRepository,
    walletService,
    addressRepository,
    addressBookService,
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
  // GRC20 balances in one registry query per chunk, as the extension does.
  balanceService.setRegistryPaths(getGrc20RegistryPaths(network.chainId));
  const transactionService = new TransactionService(
    base.walletService,
    gnoProvider,
    base.chainRegistry,
    null,
  );
  // NFTs (GRC721): the network's API server, the chain over ABCI, and session
  // storage for token URIs, as in the extension.
  const tokenService = new TokenService(
    new TokenRepository(
      AdenaStorage.local(),
      axios.create({}),
      network,
      gnoProvider,
      undefined,
      AdenaStorage.session(),
    ),
  );
  return {
    network,
    gnoProvider,
    tokenService,
    accountService,
    balanceService,
    transactionService,
  };
}

export type NetworkServices = ReturnType<typeof createNetworkServices>;
