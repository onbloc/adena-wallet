import type {GRC721CollectionModel, GRC721MetadataModel, GRC721Model} from '@types';
import {useCallback, useEffect, useState} from 'react';

import {
  mergeCollections,
  setCollectionDisplay,
  sortCollections,
  togglePinned,
} from './nft';
import {useWallet} from './wallet-context';

/**
 * The account's collections on the current network: stored list first, then
 * discovery from the network's API merged in (the extension's
 * useSyncGRC721Collections). Stored per account and chain ID, as there.
 */
export function useNftCollections() {
  const {net, account, address} = useWallet();
  const [collections, setCollections] = useState<GRC721CollectionModel[]>([]);
  const [pinned, setPinned] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const accountId = account?.id;
  const chainId = net?.network.chainId;

  const load = useCallback(
    async (discover: boolean) => {
      if (!net || !accountId || !chainId || !address) {
        return;
      }
      const service = net.tokenService;
      setLoading(true);
      try {
        const stored = await service
          .getAccountGRC721Collections(accountId, chainId)
          .catch(() => []);
        setCollections(stored);
        setPinned(
          await service
            .getAccountGRC721PinnedPackages(accountId, chainId)
            .catch(() => []),
        );
        if (discover) {
          const fetched = await service
            .fetchAccountGRC721Collections(address)
            .catch(() => []);
          if (fetched.length > 0) {
            const merged = mergeCollections(stored, fetched);
            await service.saveAccountGRC721Collections(
              accountId,
              chainId,
              merged,
            );
            setCollections(merged);
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [net, accountId, chainId, address],
  );

  useEffect(() => {
    load(true);
  }, [load]);

  const setDisplay = useCallback(
    async (packagePath: string, display: boolean) => {
      if (!net || !accountId || !chainId) {
        return;
      }
      const next = setCollectionDisplay(collections, packagePath, display);
      setCollections(next);
      await net.tokenService.saveAccountGRC721Collections(
        accountId,
        chainId,
        next,
      );
    },
    [net, accountId, chainId, collections],
  );

  const togglePin = useCallback(
    async (packagePath: string) => {
      if (!net || !accountId || !chainId) {
        return;
      }
      const next = togglePinned(pinned, packagePath);
      setPinned(next);
      await net.tokenService.saveAccountGRC721PinnedPackages(
        accountId,
        chainId,
        next,
      );
    },
    [net, accountId, chainId, pinned],
  );

  return {
    collections,
    shown: sortCollections(collections, pinned),
    pinned,
    loading,
    supported: !!net?.network.apiUrl,
    refresh: () => load(true),
    reload: () => load(false),
    setDisplay,
    togglePin,
  };
}

/** One async read keyed by its inputs; null while loading or on failure. */
function useRead<T>(
  read: (() => Promise<T>) | null,
  key: string,
): {data: T | null; done: boolean} {
  const [state, setState] = useState<{key: string; data: T | null}>({
    key: '',
    data: null,
  });
  useEffect(() => {
    if (!read) {
      return;
    }
    let cancelled = false;
    read()
      .catch(() => null)
      .then(data => {
        if (!cancelled) {
          setState({key, data});
        }
      });
    return () => {
      cancelled = true;
    };
    // `key` stands for everything `read` closes over.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return {
    data: read && state.key === key ? state.data : null,
    // Nothing to read (e.g. a realm without TokenURI) counts as done.
    done: !read || state.key === key,
  };
}

export function useNftTokenUri(
  packagePath: string,
  tokenId: string,
  enabled: boolean,
) {
  const {net} = useWallet();
  return useRead(
    net && enabled && tokenId
      ? () => net.tokenService.fetchGRC721TokenUri(packagePath, tokenId)
      : null,
    `${net?.network.id}:${packagePath}:${tokenId}:${enabled}`,
  );
}

export function useNftBalance(packagePath: string) {
  const {net, address} = useWallet();
  return useRead(
    net && address
      ? () => net.tokenService.fetchGRC721Balance(packagePath, address)
      : null,
    `${net?.network.id}:${address}:${packagePath}`,
  );
}

export function useNftTokens(collection: GRC721CollectionModel) {
  const {net, address} = useWallet();
  return useRead<GRC721Model[]>(
    net && address
      ? async () =>
          (
            await net.tokenService.fetchGRC721Tokens(
              collection.packagePath,
              address,
            )
          ).map(token => ({
            ...token,
            name: collection.name,
            symbol: collection.symbol,
            isTokenUri: collection.isTokenUri,
            isMetadata: collection.isMetadata,
          }))
      : null,
    `${net?.network.id}:${address}:${collection.packagePath}`,
  );
}

export function useNftMetadata(token: GRC721Model) {
  const {net} = useWallet();
  return useRead<GRC721MetadataModel>(
    net && token.isMetadata
      ? () =>
          net.tokenService.fetchGRC721TokenMetadata(
            token.packagePath,
            token.tokenId,
          )
      : null,
    `${net?.network.id}:${token.packagePath}:${token.tokenId}`,
  );
}
