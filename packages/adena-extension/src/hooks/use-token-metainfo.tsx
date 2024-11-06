import { useRecoilState } from 'recoil';

import { isGRC20TokenModel, isNativeTokenModel } from '@common/validation/validation-token';
import { useAdenaContext } from './use-context';
import { useCurrentAccount } from './use-current-account';
import { useNetwork } from './use-network';

import { TokenState } from '@states';
import { GRC20TokenModel, TokenModel } from '@types';
import { Account } from 'adena-module';
import BigNumber from 'bignumber.js';
import { useCallback, useMemo } from 'react';
import { useNFTCollectionHandler } from './nft/use-collection-handler';
import { useGRC20Tokens } from './use-grc20-tokens';
import { useTransferTokens } from './wallet/use-transfer-tokens';

interface GRC20Token {
  tokenId: string;
  name: string;
  symbol: string;
  path: string;
  decimals: number;
  chainId: string;
}

export type UseTokenMetainfoReturn = {
  tokenMetainfos: TokenModel[];
  allTokenMetainfos: TokenModel[];
  currentTokenMetainfos: TokenModel[];
  tokenLogoMap: Record<string, string | null>;
  getTokenAmount: (amount: { value: string; denom: string }) => { value: string; denom: string };
  initTokenMetainfos: (withTransferEvents?: boolean) => Promise<void>;
  updateTokenMetainfos: (account: Account, tokenMetainfos: TokenModel[]) => Promise<void>;
  addTokenMetainfo: (tokenMetainfo: GRC20TokenModel) => Promise<boolean>;
  addGRC20TokenMetainfo: ({
    tokenId,
    name,
    symbol,
    path,
    decimals,
  }: GRC20Token) => Promise<boolean>;
  addTokenMetainfos: (tokenMetainfos: TokenModel[]) => Promise<boolean>;
  convertDenom: (
    amount: string,
    denom: string,
    convertType?: 'COMMON' | 'MINIMAL',
  ) => { value: string; denom: string };
  getTokenImage: (token: TokenModel) => string | null;
  getTokenImageByDenom: (denom: string) => string | null;
  getTokenImageByPkgPath: (pkgPath: string) => string | null;
};

function makeTokenKeyByDenom(denom: string): string {
  return `${denom.toLowerCase()}`;
}

function makeTokenKeyByPackagePath(packagePath: string): string {
  return `${packagePath.toLowerCase()}`;
}

function makeTokenKey(token: TokenModel): string {
  if (isNativeTokenModel(token)) {
    return makeTokenKeyByDenom(token.denom);
  }
  if (isGRC20TokenModel(token)) {
    return makeTokenKeyByPackagePath(token.pkgPath);
  }
  return `${token.symbol}`;
}

export const useTokenMetainfo = (): UseTokenMetainfoReturn => {
  const { balanceService, tokenService } = useAdenaContext();
  const [tokenMetainfos, setTokenMetainfo] = useRecoilState(TokenState.tokenMetainfos);
  const { currentAccount } = useCurrentAccount();
  const { currentNetwork } = useNetwork();
  const { fetchTransferTokens } = useTransferTokens();
  const { addCollections } = useNFTCollectionHandler();
  const { data: grc20Tokens } = useGRC20Tokens();

  const allTokenMetainfos = useMemo(() => {
    if (!grc20Tokens || tokenMetainfos.length === 0) {
      return tokenMetainfos;
    }

    const remainTokens = grc20Tokens.filter(
      (token) =>
        !!token &&
        tokenMetainfos.findIndex(
          (meta) => isGRC20TokenModel(meta) && meta?.pkgPath !== token?.pkgPath,
        ),
    );
    return [...tokenMetainfos, ...remainTokens];
  }, [tokenMetainfos, grc20Tokens]);

  const currentTokenMetainfos = useMemo(() => {
    return tokenMetainfos.filter(
      (tokenMetainfo) => tokenMetainfo.main || tokenMetainfo.networkId === currentNetwork.networkId,
    );
  }, [tokenMetainfos, currentNetwork]);

  const tokenMetaMap = useMemo(() => {
    return allTokenMetainfos.reduce<{ [key in string]: TokenModel }>((acc, current) => {
      if (isNativeTokenModel(current)) {
        acc[current.denom] = current;
      }
      if (isGRC20TokenModel(current)) {
        acc[current.pkgPath] = current;
      }
      return acc;
    }, {});
  }, [allTokenMetainfos]);

  const tokenLogoMap = useMemo(() => {
    return currentTokenMetainfos.reduce<Record<string, string | null>>((accum, current) => {
      const key = makeTokenKey(current);
      accum[key] = current.image || null;
      return accum;
    }, {});
  }, [currentTokenMetainfos]);

  const initTokenMetainfos = async (withTransferEvents?: boolean): Promise<void> => {
    if (!currentAccount || !currentNetwork.apiUrl) {
      return;
    }

    if (withTransferEvents) {
      await setTokenMetainfo([]);
      const currentAddress = await currentAccount.getAddress(currentNetwork.addressPrefix);
      const transferTokens = await fetchTransferTokens(currentAddress).catch(() => null);
      if (transferTokens) {
        const storedGRC20Tokens = await tokenService.getTokenMetainfosByAccountId(
          currentAccount.id,
        );
        const storedCollections = await tokenService.getAccountGRC721Collections(
          currentAccount.id,
          currentNetwork.chainId,
        );

        const storedGRC20Packages = storedGRC20Tokens.map((grc20Token) => grc20Token.tokenId);
        const storedGRC721Packages = storedCollections.map(
          (grc721Token) => grc721Token.packagePath,
        );

        const filteredGRC20Packages = (transferTokens.grc20Packages || []).filter(
          (grc20Token) => !storedGRC20Packages.includes(grc20Token.tokenId),
        );
        const filteredGRC721Packages = (transferTokens.grc721Packages || []).filter(
          (grc721Token) => !storedGRC721Packages.includes(grc721Token.packagePath),
        );

        await addTokenMetainfos(filteredGRC20Packages);
        await addCollections(filteredGRC721Packages);
      }
    }

    await tokenService.initAccountTokenMetainfos(currentAccount.id);
    const tokenMetainfos = await tokenService.getTokenMetainfosByAccountId(currentAccount.id);
    setTokenMetainfo([...tokenMetainfos]);
  };

  const updateTokenMetainfos = async (
    account: Account,
    tokenMetainfos: TokenModel[],
  ): Promise<void> => {
    await tokenService.updateTokenMetainfosByAccountId(account.id, tokenMetainfos);
    setTokenMetainfo([...tokenMetainfos]);
  };

  const convertDenom = (
    amount: string,
    denom: string,
    convertType?: 'COMMON' | 'MINIMAL',
  ): { value: string; denom: string } => {
    if (tokenMetainfos) {
      const tokenMetainfo = tokenMetainfos
        .filter(isNativeTokenModel)
        .find(
          (tokenMetainfo) =>
            denom.toUpperCase() === tokenMetainfo.symbol.toUpperCase() ||
            denom.toUpperCase() === tokenMetainfo.denom.toUpperCase(),
        );

      if (tokenMetainfo) {
        return balanceService.convertDenom(amount, denom, tokenMetainfo, convertType);
      }
    }

    return {
      value: amount,
      denom,
    };
  };

  const getTokenAmount = useCallback(
    (amount: { value: string; denom: string }) => {
      const tokenMeta = tokenMetaMap[amount.denom];
      if (!tokenMeta) {
        const paths = amount.denom.split('/');
        return {
          ...amount,
          denom: paths.length > 0 ? paths[paths.length - 1] : amount.denom,
        };
      }
      const value = BigNumber(amount.value)
        .shiftedBy(tokenMeta.decimals * -1)
        .toString();
      const denom = tokenMeta.symbol;
      return {
        value,
        denom,
      };
    },
    [tokenMetaMap],
  );

  const getTokenImage = useCallback(
    (token: TokenModel): string | null => {
      const key = makeTokenKey(token);
      return tokenLogoMap[key] || null;
    },
    [tokenLogoMap],
  );

  const getTokenImageByDenom = useCallback(
    (denom: string): string | null => {
      const key = makeTokenKeyByDenom(denom);
      return tokenLogoMap[key] || null;
    },
    [tokenLogoMap],
  );

  const getTokenImageByPkgPath = useCallback(
    (packagePath: string): string | null => {
      const key = makeTokenKeyByPackagePath(packagePath);
      return tokenLogoMap[key] || null;
    },
    [tokenLogoMap],
  );

  const addTokenMetainfo = async (tokenMetainfo: GRC20TokenModel): Promise<boolean> => {
    if (!currentAccount) {
      return false;
    }
    const changedTokenMetainfo = {
      ...tokenMetainfo,
      image: getTokenImage(tokenMetainfo) ?? '',
    };

    const tokenMetainfos = await tokenService.getTokenMetainfosByAccountId(currentAccount.id);
    if (
      tokenMetainfos.find(
        (item) =>
          item.tokenId === changedTokenMetainfo.tokenId &&
          item.networkId === changedTokenMetainfo.networkId,
      )
    ) {
      return false;
    }

    await tokenService.updateTokenMetainfosByAccountId(currentAccount.id, [
      ...tokenMetainfos,
      changedTokenMetainfo,
    ]);
    const changedTokenMetainfos = await tokenService.getTokenMetainfosByAccountId(
      currentAccount.id,
    );
    setTokenMetainfo(changedTokenMetainfos);
    return true;
  };

  const addTokenMetainfos = async (tokenMetainfos: TokenModel[]): Promise<boolean> => {
    if (!currentAccount) {
      return false;
    }

    if (tokenMetainfos.length === 0) {
      return true;
    }

    const currentTokenMetainfos = await tokenService.getTokenMetainfosByAccountId(
      currentAccount.id,
    );

    const changedTokenMetainfos = tokenMetainfos
      .filter(
        (t1) =>
          !currentTokenMetainfos.find(
            (t2) => t1.tokenId === t2.tokenId && t1.networkId === t2.networkId,
          ),
      )
      .map((tokenMetainfo) => ({
        ...tokenMetainfo,
        main: false,
        display: true,
        image: getTokenImage(tokenMetainfo) ?? '',
      }));

    await tokenService.updateTokenMetainfosByAccountId(currentAccount.id, [
      ...changedTokenMetainfos,
    ]);
    return true;
  };

  const addGRC20TokenMetainfo = async ({
    tokenId,
    name,
    symbol,
    path,
    decimals,
  }: GRC20Token): Promise<boolean> => {
    const tokenMetainfo: GRC20TokenModel = {
      main: false,
      tokenId,
      networkId: currentNetwork.networkId,
      pkgPath: path,
      symbol,
      type: 'grc20',
      name,
      decimals,
      image: getTokenImageByPkgPath(path) || '',
      display: true,
    };
    return addTokenMetainfo(tokenMetainfo);
  };

  return {
    tokenLogoMap,
    tokenMetainfos,
    allTokenMetainfos,
    currentTokenMetainfos,
    getTokenAmount,
    initTokenMetainfos,
    addTokenMetainfo,
    addTokenMetainfos,
    addGRC20TokenMetainfo,
    convertDenom,
    getTokenImage,
    getTokenImageByDenom,
    getTokenImageByPkgPath,
    updateTokenMetainfos,
  };
};
