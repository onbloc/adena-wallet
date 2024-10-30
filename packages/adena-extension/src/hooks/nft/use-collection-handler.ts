import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';

interface UseNFTCollectionHandlerReturn {
  pinCollection: (packagePath: string) => Promise<boolean>;
  unpinCollection: (packagePath: string) => Promise<boolean>;
  visibleCollection: (packagePath: string) => Promise<boolean>;
  hideCollection: (packagePath: string) => Promise<boolean>;
}

export const useNFTCollectionHandler = (): UseNFTCollectionHandlerReturn => {
  const { currentAccount } = useCurrentAccount();
  const { tokenService } = useAdenaContext();

  const pinCollection = async (packagePath: string): Promise<boolean> => {
    if (!currentAccount) {
      return false;
    }

    const pinnedCollections = await tokenService.getAccountGRC721PinnedPackages(currentAccount.id);
    return tokenService.saveAccountGRC721PinnedPackages(currentAccount.id, [
      ...pinnedCollections,
      packagePath,
    ]);
  };

  const unpinCollection = async (packagePath: string): Promise<boolean> => {
    if (!currentAccount) {
      return false;
    }

    const pinnedCollections = await tokenService.getAccountGRC721PinnedPackages(currentAccount.id);
    return tokenService.saveAccountGRC721PinnedPackages(
      currentAccount.id,
      pinnedCollections.filter((path) => path !== packagePath),
    );
  };

  const visibleCollection = async (packagePath: string): Promise<boolean> => {
    if (!currentAccount) {
      return false;
    }

    const collections = await tokenService.getAccountGRC721Collections(currentAccount.id);
    const changedCollections = collections.map((collection) => {
      if (collection.packagePath !== packagePath) {
        return collection;
      }
      return {
        ...collection,
        display: true,
      };
    });

    return tokenService.saveAccountGRC721Collections(currentAccount.id, changedCollections);
  };

  const hideCollection = async (packagePath: string): Promise<boolean> => {
    if (!currentAccount) {
      return false;
    }

    const collections = await tokenService.getAccountGRC721Collections(currentAccount.id);
    const changedCollections = collections.map((collection) => {
      if (collection.packagePath !== packagePath) {
        return collection;
      }
      return {
        ...collection,
        display: false,
      };
    });

    return tokenService.saveAccountGRC721Collections(currentAccount.id, changedCollections);
  };

  return { pinCollection, unpinCollection, visibleCollection, hideCollection };
};
