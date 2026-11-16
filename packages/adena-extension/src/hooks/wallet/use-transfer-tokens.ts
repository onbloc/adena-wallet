import { useAdenaContext } from '@hooks/use-context';
import { GRC20TokenModel, TokenModel } from '@types';

export interface UseTransferTokenReturn {
  fetchTransferTokens: (address: string) => Promise<{
    grc20Packages: TokenModel[];
  }>;
}

export const useTransferTokens = (): UseTransferTokenReturn => {
  const { tokenService } = useAdenaContext();

  const fetchTransferTokens = async (
    address: string,
  ): Promise<{
    grc20Packages: TokenModel[];
  }> => {
    // GRC721 discovery is deliberately not here: it is an indexer/RPC walk that
    // only the NFT screen needs, and awaiting it delayed the main screen's
    // token list. useSyncGRC721Collections runs it where it is used.
    //
    // API-backed networks return the held GRC20 tokens directly (identity as a
    // token path); null means no API URL, so fall back to registry discovery.
    const accountGRC20Tokens: GRC20TokenModel[] | null = await tokenService
      .fetchAccountGRC20Tokens(address)
      .catch(() => null);

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
    };
  };

  return {
    fetchTransferTokens,
  };
};
