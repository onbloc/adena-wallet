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

    const addedCollections = collections.filter(
      (c1) =>
        !storedCollections.find(
          (c2) => c1.packagePath === c2.packagePath && c1.networkId === c2.networkId,
        ),
    );

    return tokenService.saveAccountGRC721Collections(currentAccount.id, currentNetwork.chainId, [
      ...storedCollections,
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
