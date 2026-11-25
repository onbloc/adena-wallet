import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useMemo, useState } from 'react';

import { NetworkSwitchPrompt, SearchCollectionView, SearchPage, SearchTokenView, SearchWalletView } from '../../../components/pages';
import { useContainer } from '../../../di/container-provider';
import { Network } from '../../../domain/network';
import { Token } from '../../../domain/token';
import { useDebouncedValue } from '../../../hooks/use-debounced-value';
import { useNftImages } from '../../../hooks/use-nft-images';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';
import { toAvatarColor } from '../../../presenters/account.presenter';
import { useNftCollectionsQuery } from '../../../queries/nft.queries';
import { useTokenListQuery, useTokenRegistryQuery } from '../../../queries/token.queries';
import { NftService } from '../../../services/nft.service';
import { useSessionStore } from '../../../stores/session.store';

const SEARCH_DEBOUNCE_MS = 200;

type Destination = { kind: 'token'; token: Token; network: Network; inWallet: boolean }
  | { kind: 'account'; accountId: string }
  | { kind: 'contact'; address: string; network?: Network };

interface SearchResult<T> {
  view: T;
  destination: Destination;
}

interface PendingSwitch {
  network: Network;
  destination: Destination;
  prompt: NetworkSwitchPrompt;
}

const networkLabel = (network: Network): string => `${network.chainName} ${network.networkName}`;

const includes = (needle: string, ...values: (string | undefined)[]): boolean =>
  values.some(value => value?.toLowerCase().includes(needle));

// Searches data the wallet already loads (token lists, registry, collections) plus local accounts and contacts.
export const SearchScreen = ({ navigation }: NativeStackScreenProps<MainStackParamList, 'Search'>): ReactElement => {
  const { tokenService, accountService, accountPhotoService, addressBookService, networkService, chainRegistry, nftService } = useContainer();
  const { account, accounts, network, networks } = useWalletSnapshot();
  const bumpRevision = useSessionStore(state => state.bumpRevision);
  const [query, setQuery] = useState('');
  const [allNetworks, setAllNetworks] = useState(true);
  const [pending, setPending] = useState<PendingSwitch | null>(null);
  const needle = useDebouncedValue(query.trim().toLowerCase(), SEARCH_DEBOUNCE_MS);
  const tokenList = useTokenListQuery(account, network);
  const registry = useTokenRegistryQuery(network);
  const collectionsQuery = useNftCollectionsQuery(account, network);

  // Built-in networks plus the current one, even if it is custom.
  const scope = useMemo(
    () => (allNetworks ? networks.filter(item => !item.isCustom || item.id === network.id) : [network]),
    [allNetworks, network, networks],
  );

  const tokenResults: SearchResult<SearchTokenView>[] = useMemo(() => {
    if (!needle || !account) {
      return [];
    }

    return scope.flatMap((item) => {
      const current = item.id === network.id;
      const owned = current && tokenList.data ? tokenList.data : tokenService.getCachedTokenList(account, item);
      const registryOnly = current
        ? (registry.data?.pages ?? []).flatMap(page => page.tokens).filter(token => !owned.some(own => own.id === token.id))
        : [];

      return [...owned.map(token => ({ token, inWallet: true })), ...registryOnly.map(token => ({ token, inWallet: false }))]
        .filter(({ token }) => includes(needle, token.name, token.symbol))
        .map(({ token, inWallet }) => ({ token, inWallet, network: item }));
    }).map(({ token, inWallet, network: tokenNetwork }) => ({
      view: {
        key: `token:${tokenNetwork.id}:${token.id}`,
        name: token.name,
        symbol: token.symbol,
        localIcon: token.localIcon,
        imageUrl: token.imageUrl,
        caption: [token.symbol, tokenNetwork.id !== network.id && networkLabel(tokenNetwork), !inWallet && 'Not added'].filter(Boolean).join(' · '),
      },
      destination: { kind: 'token', token, network: tokenNetwork, inWallet },
    }));
  }, [account, needle, network.id, registry.data, scope, tokenList.data, tokenService]);

  const walletResults: SearchResult<SearchWalletView>[] = useMemo(() => {
    if (!needle) {
      return [];
    }

    const own = accounts
      .map(item => ({ item, address: accountService.getAddress(item, network) }))
      .filter(({ item, address }) => includes(needle, item.name, address))
      .map(({ item, address }): SearchResult<SearchWalletView> => ({
        view: { key: `account:${item.id}`, name: item.name, address, avatarColor: toAvatarColor(item), avatarPhoto: accountPhotoService.get(item.id) },
        destination: { kind: 'account', accountId: item.id },
      }));
    const contacts = (allNetworks ? addressBookService.getEntries() : addressBookService.getEntriesFor(network))
      .filter(entry => includes(needle, entry.name, entry.address))
      .map((entry): SearchResult<SearchWalletView> => {
        const validHere = chainRegistry.forNetwork(network).isValidAddress(entry.address, network);
        const home = validHere ? undefined : networks.find(item => chainRegistry.forNetwork(item).isValidAddress(entry.address, item));

        return {
          view: { key: `contact:${entry.id}`, name: entry.name, address: entry.address },
          destination: { kind: 'contact', address: entry.address, network: home },
        };
      });

    return [...own, ...contacts];
  }, [accountPhotoService, accountService, accounts, addressBookService, allNetworks, chainRegistry, needle, network, networks]);

  // Collections hidden on the home grid stay hidden here too.
  const matchedCollections = useMemo(
    () => (needle && account && collectionsQuery.data
      ? NftService.arrange(collectionsQuery.data, nftService.getPreferences(account, network)).filter(collection => includes(needle, collection.name, collection.symbol))
      : []),
    [account, collectionsQuery.data, needle, network, nftService],
  );
  const thumbnails = useNftImages(network, matchedCollections.map(collection => ({
    key: collection.id,
    packagePath: collection.packagePath,
    nftId: collection.thumbnailNftId,
    enabled: collection.supportsTokenUri,
  })));
  const collections: SearchCollectionView[] = matchedCollections.map(collection => ({
    key: collection.id,
    name: collection.name,
    caption: `${network.chainName} · NFT collection`,
    imageUri: thumbnails[collection.id]?.uri,
    imageLoading: thumbnails[collection.id]?.loading ?? false,
  }));

  const findDestination = (results: SearchResult<{ key: string }>[], key: string): Destination | undefined =>
    results.find(result => result.view.key === key)?.destination;

  const open = (destination: Destination): void => {
    switch (destination.kind) {
      case 'token':
        return destination.inWallet
          ? navigation.navigate('TokenDetails', { tokenId: destination.token.id })
          : navigation.navigate('AddToken', { query: destination.token.id });
      case 'account':
        return navigation.navigate('AccountSettings', { accountId: destination.accountId });
      case 'contact':
        return navigation.navigate('SendRecipient', { scannedAddress: destination.address });
    }
  };

  const openOrAskToSwitch = (destination: Destination, target: Network | undefined, subject: string): void => {
    if (!target || target.id === network.id) {
      open(destination);
      return;
    }

    setPending({
      network: target,
      destination,
      prompt: {
        title: `Switch to ${networkLabel(target)}?`,
        description: `${subject} is on ${networkLabel(target)}. Your wallet will switch to that network to continue.`,
      },
    });
  };

  const handleOpenToken = (key: string): void => {
    const destination = findDestination(tokenResults, key);

    if (destination?.kind === 'token') {
      openOrAskToSwitch(destination, destination.network, destination.token.symbol);
    }
  };

  const handleOpenWallet = (key: string): void => {
    const destination = findDestination(walletResults, key);

    if (destination?.kind === 'contact') {
      openOrAskToSwitch(destination, destination.network, 'This address');
    }
    else if (destination) {
      open(destination);
    }
  };

  const handleOpenCollection = (key: string): void => {
    const collection = matchedCollections.find(item => item.id === key);

    if (collection) {
      navigation.navigate('NftCollection', { collection });
    }
  };

  const handleConfirmSwitch = (): void => {
    if (!pending) {
      return;
    }

    networkService.selectNetwork(pending.network.id);
    bumpRevision();
    setPending(null);
    open(pending.destination);
  };

  const handleCancelSwitch = (): void => setPending(null);

  const handleToggleScope = (): void => setAllNetworks(value => !value);

  return (
    <SearchPage
      query={query}
      onChangeQuery={setQuery}
      scopeLabel={allNetworks ? 'All networks' : networkLabel(network)}
      onToggleScope={handleToggleScope}
      searching={needle.length > 0}
      tokens={tokenResults.map(result => result.view)}
      wallets={walletResults.map(result => result.view)}
      collections={collections}
      onOpenToken={handleOpenToken}
      onOpenWallet={handleOpenWallet}
      onOpenCollection={handleOpenCollection}
      networkSwitch={pending?.prompt}
      onConfirmNetworkSwitch={handleConfirmSwitch}
      onCancelNetworkSwitch={handleCancelSwitch}
      onBack={navigation.goBack}
    />
  );
};
