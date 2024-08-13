import { useRecoilState } from 'recoil';

import { useAdenaContext } from './use-context';
import { useCurrentAccount } from './use-current-account';
import { isGRC20TokenModel, isNativeTokenModel } from '@common/validation/validation-token';
import { useNetwork } from './use-network';

import { TokenState } from '@states';
import { GRC20TokenModel, TokenModel } from '@types';
import { Account } from 'adena-module';
import { useCallback, useMemo } from 'react';
import BigNumber from 'bignumber.js';
import { useGRC20Tokens } from './use-grc20-tokens';

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
  initTokenMetainfos: () => Promise<void>;
  updateTokenMetainfos: (account: Account, tokenMetainfos: TokenModel[]) => Promise<void>;
  addTokenMetainfo: (tokenMetainfo: GRC20TokenModel) => Promise<boolean>;
  addGRC20TokenMetainfo: ({
    tokenId,
    name,
    symbol,
    path,
    decimals,
  }: GRC20Token) => Promise<boolean>;
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

  const initTokenMetainfos = async (): Promise<void> => {
    if (currentAccount) {
      await tokenService.initAccountTokenMetainfos(currentAccount.id);
      const tokenMetainfos = await tokenService.getTokenMetainfosByAccountId(currentAccount.id);
      setTokenMetainfo([...tokenMetainfos]);
    }
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
        return amount;
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
      console.log(key, tokenLogoMap);
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
    addGRC20TokenMetainfo,
    convertDenom,
    getTokenImage,
    getTokenImageByDenom,
    getTokenImageByPkgPath,
    updateTokenMetainfos,
  };
};
