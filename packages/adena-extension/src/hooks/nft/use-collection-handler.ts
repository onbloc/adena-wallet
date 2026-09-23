import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useNetwork } from '@hooks/use-network';
import { GRC721CollectionModel } from '@types';

interface UseNFTCollectionHandlerReturn {
  addCollections: (collections: GRC721CollectionModel[]) => Promise<boolean>;
  pinCollection: (packagePath: string) => Promise<boolean>;
  unpinCollection: (packagePath: string) => Promise<boolean>;
  showCollection: (packagePath: string) => Promise<boolean>;
  hideCollection: (packagePath: string) => Promise<boolean>;
}

export const useNFTCollectionHandler = (): UseNFTCollectionHandlerReturn => {
  const { tokenService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const { currentNetwork } = useNetwork();

  const addCollections = async (collections: GRC721CollectionModel[]): Promise<boolean> => {
    if (!currentAccount) {
      return false;
    }

    if (collections.length === 0) {
      return true;
    }

    const storedCollections = await tokenService.getAccountGRC721Collections(
      currentAccount.id,
      currentNetwork.chainId,
    );

    const isSameCollection = (a: GRC721CollectionModel, b: GRC721CollectionModel): boolean =>
      a.packagePath === b.packagePath && a.networkId === b.networkId;

    // Refresh stored entries from the chain so capability flags cannot go
    // stale; the user-owned `display` flag is preserved.
    const refreshedCollections = storedCollections.map((stored) => {
      const fetched = collections.find((collection) => isSameCollection(collection, stored));
      if (!fetched) {
        return stored;
      }

      return { ...stored, ...fetched, display: stored.display };
    });

    const addedCollections = collections
      .filter(
        (collection) => !storedCollections.find((stored) => isSameCollection(collection, stored)),
      )
      .map((collection) => ({ ...collection, display: true }));

    return tokenService.saveAccountGRC721Collections(currentAccount.id, currentNetwork.chainId, [
      ...refreshedCollections,
      ...addedCollections,
    ]);
  };

  const pinCollection = async (packagePath: string): Promise<boolean> => {
    if (!currentAccount) {
      return false;
    }

    const pinnedCollections = await tokenService.getAccountGRC721PinnedPackages(
      currentAccount.id,
      currentNetwork.chainId,
    );
    return tokenService.saveAccountGRC721PinnedPackages(currentAccount.id, currentNetwork.chainId, [
      ...pinnedCollections,
      packagePath,
    ]);
  };

  const unpinCollection = async (packagePath: string): Promise<boolean> => {
    if (!currentAccount) {
      return false;
    }

    const pinnedCollections = await tokenService.getAccountGRC721PinnedPackages(
      currentAccount.id,
      currentNetwork.chainId,
    );
    return tokenService.saveAccountGRC721PinnedPackages(
      currentAccount.id,
      currentNetwork.chainId,
      pinnedCollections.filter((path) => path !== packagePath),
    );
  };

  const showCollection = async (packagePath: string): Promise<boolean> => {
    if (!currentAccount) {
      return false;
    }

    const collections = await tokenService.getAccountGRC721Collections(
      currentAccount.id,
      currentNetwork.chainId,
    );
    const changedCollections = collections.map((collection) => {
      if (collection.packagePath !== packagePath) {
        return collection;
      }
      return {
        ...collection,
        display: true,
      };
    });

    return tokenService.saveAccountGRC721Collections(
      currentAccount.id,
      currentNetwork.chainId,
      changedCollections,
    );
  };

  const hideCollection = async (packagePath: string): Promise<boolean> => {
    if (!currentAccount) {
      return false;
    }

    const collections = await tokenService.getAccountGRC721Collections(
      currentAccount.id,
      currentNetwork.chainId,
    );
    const changedCollections = collections.map((collection) => {
      if (collection.packagePath !== packagePath) {
        return collection;
      }
      return {
        ...collection,
        display: false,
      };
    });

    return tokenService.saveAccountGRC721Collections(
      currentAccount.id,
      currentNetwork.chainId,
      changedCollections,
    );
  };

  return { addCollections, pinCollection, unpinCollection, showCollection, hideCollection };
};
