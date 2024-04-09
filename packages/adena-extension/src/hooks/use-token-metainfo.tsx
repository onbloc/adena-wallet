import { useRecoilState } from 'recoil';

import { useAdenaContext } from './use-context';
import { useCurrentAccount } from './use-current-account';
import { isGRC20TokenModel, isNativeTokenModel } from '@common/validation/validation-token';
import { useNetwork } from './use-network';

import { TokenState } from '@states';
import { GRC20TokenModel, TokenModel } from '@types';

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
  initTokenMetainfos: () => Promise<void>;
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
  return `native-${denom.toLowerCase()}`;
}

function makeTokenKeyByPackagePath(packagePath: string): string {
  return `grc20-${packagePath.toLowerCase()}`;
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
  const [tokenLogoMap, setTokenLogoMap] = useRecoilState(TokenState.tokenLogoMap);
  const { currentAccount } = useCurrentAccount();
  const { currentNetwork } = useNetwork();

  const initTokenMetainfos = async (): Promise<void> => {
    if (currentAccount) {
      await tokenService.initAccountTokenMetainfos(currentAccount.id);
      const tokenMetainfos = await tokenService.getTokenMetainfosByAccountId(currentAccount.id);
      setTokenMetainfo([...tokenMetainfos]);

      const tokenLogoMap = tokenMetainfos.reduce<Record<string, string | null>>(
        (accum, current) => {
          const key = makeTokenKey(current);
          accum[key] = current.image || null;
          return accum;
        },
        {},
      );
      setTokenLogoMap(tokenLogoMap);
    }
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

  const getTokenImage = (token: TokenModel): string | null => {
    const key = makeTokenKey(token);
    return tokenLogoMap[key] || null;
  };

  const getTokenImageByDenom = (denom: string): string | null => {
    const key = makeTokenKeyByDenom(denom);
    return tokenLogoMap[key] || null;
  };

  const getTokenImageByPkgPath = (denom: string): string | null => {
    const key = makeTokenKeyByPackagePath(denom);
    return tokenLogoMap[key] || null;
  };

  const addTokenMetainfo = async (tokenMetainfo: GRC20TokenModel): Promise<boolean> => {
    if (!currentAccount) {
      return false;
    }
    const changedTokenMetainfo = {
      ...tokenMetainfo,
      image: getTokenImage(tokenMetainfo) ?? '',
    };

    const tokenMetainfos = await tokenService.getTokenMetainfosByAccountId(currentAccount.id);
    if (tokenMetainfos.find((item) => item.tokenId === changedTokenMetainfo.tokenId)) {
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
      image: '',
      display: true,
    };
    return addTokenMetainfo(tokenMetainfo);
  };

  return {
    tokenMetainfos,
    initTokenMetainfos,
    addTokenMetainfo,
    addGRC20TokenMetainfo,
    convertDenom,
    getTokenImage,
    getTokenImageByDenom,
    getTokenImageByPkgPath,
  };
};
