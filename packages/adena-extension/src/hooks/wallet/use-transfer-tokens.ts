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
    const [accountGRC20Tokens, grc721Collections]: [
      GRC20TokenModel[] | null,
      GRC721CollectionModel[],
    ] = await Promise.all([
      // API-backed networks return the held GRC20 tokens directly (identity as a
      // token path); null means no API URL, so fall back to registry discovery.
      tokenService.fetchAccountGRC20Tokens(address),
      // GRC721 is indexer/RPC-only and self-contained: exactly the collections
      // the account holds.
      tokenService.fetchAccountGRC721Collections(address).catch(() => []),
    ]).catch(() => [null, []]);

    let filteredGRC20Packages: TokenModel[];
    if (accountGRC20Tokens) {
      // Precise, self-contained: exactly the tokens the account holds.
      filteredGRC20Packages = accountGRC20Tokens;
    } else {
      // Indexer path: cross-reference the on-chain registry list by token path.
      // Transfer events carry the token id `{packagePath}.{symbol}.{sequence}`,
      // parsed to the token path, so sibling symbols in one realm stay distinct.
      const [deployedGRC20Tokens, transferTokenPaths] = await Promise.all([
        tokenService.fetchGRC20Tokens().catch((): GRC20TokenModel[] => []),
        tokenService.fetchAllTransferGRC20TokenPathsBy(address).catch((): string[] => []),
      ]);
      filteredGRC20Packages = deployedGRC20Tokens.filter((grc20Token) =>
        transferTokenPaths.includes(grc20Token.tokenId),
      );
    }

    return {
      grc20Packages: filteredGRC20Packages,
      grc721Packages: grc721Collections,
    };
  };

  return {
    fetchTransferTokens,
  };
};
