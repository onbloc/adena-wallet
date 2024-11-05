import { useAdenaContext } from '@hooks/use-context';
import { GRC20TokenModel, GRC721CollectionModel, TokenModel } from '@types';

export interface UseTransferTokenReturn {
  fetchTransferTokens: (address: string) => Promise<{
    grc20Packages: TokenModel[];
    grc721Packages: GRC721CollectionModel[];
  }>;
}

export const useTransferTokens = (): UseTransferTokenReturn => {
  const { tokenService } = useAdenaContext();

  const fetchTransferTokens = async (
    address: string,
  ): Promise<{
    grc20Packages: TokenModel[];
    grc721Packages: GRC721CollectionModel[];
  }> => {
    const [transferEventPackages, deployedGRC20Tokens, deployedCollections]: [
      string[],
      GRC20TokenModel[],
      GRC721CollectionModel[],
    ] = await Promise.all([
      tokenService.fetchAllTransferPackagesBy(address),
      tokenService.fetchGRC20Tokens(),
      tokenService.fetchGRC721Collections(),
    ]).catch(() => [[], [], []]);

    const filteredGRC20Packages = (deployedGRC20Tokens || []).filter((grc20Token) => {
      if (!transferEventPackages || transferEventPackages.length === 0) {
        return false;
      }

      return transferEventPackages.includes(grc20Token.pkgPath);
    });

    const filteredGRC721Packages = (deployedCollections || []).filter((grc721Token) => {
      if (!transferEventPackages || transferEventPackages.length === 0) {
        return false;
      }

      return transferEventPackages.includes(grc721Token.packagePath);
    });

    return {
      grc20Packages: filteredGRC20Packages,
      grc721Packages: filteredGRC721Packages,
    };
  };

  return {
    fetchTransferTokens,
  };
};
