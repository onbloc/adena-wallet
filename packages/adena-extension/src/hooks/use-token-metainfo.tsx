import { useRecoilState } from 'recoil';

import { useAdenaContext } from './use-context';
import { useCurrentAccount } from './use-current-account';
import { isGRC20TokenModel, isNativeTokenModel } from '@common/validation/validation-token';
import { useNetwork } from './use-network';

import { TokenState } from '@states';
import { GRC20TokenModel, TokenModel } from '@types';
import { Account } from 'adena-module';
import { useMemo } from 'react';

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
  currentTokenMetainfos: TokenModel[];
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
  getTokenImage: (token: TokenModel) => string | null | undefined;
  getTokenImageByDenom: (denom: string) => string | undefined;
  getTokenImageByPkgPath: (pkgPath: string) => string | undefined;
};

export const useTokenMetainfo = (): UseTokenMetainfoReturn => {
  const { balanceService, tokenService } = useAdenaContext();
  const [tokenMetainfos, setTokenMetainfo] = useRecoilState(TokenState.tokenMetainfos);
  const { currentAccount } = useCurrentAccount();
  const { currentNetwork } = useNetwork();

  const currentTokenMetainfos = useMemo(() => {
    return tokenMetainfos.filter(
      (tokenMetainfo) => tokenMetainfo.main || tokenMetainfo.networkId === currentNetwork.networkId,
    );
  }, [tokenMetainfos, currentNetwork]);

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

  const getTokenImage = (token: TokenModel): string | null | undefined => {
    if (isNativeTokenModel(token)) {
      return getTokenImageByDenom(token.symbol);
    }
    if (isGRC20TokenModel(token)) {
      return getTokenImageByPkgPath(token.pkgPath);
    }
    return null;
  };

  const getTokenImageByDenom = (denom: string): string | undefined => {
    const image = tokenService
      .getTokenMetainfos()
      .find((info) => info.symbol.toUpperCase() === denom.toUpperCase())?.image;
    if (image) {
      return image;
    }
    return tokenService
      .getTokenMetainfos()
      .find((info) => isNativeTokenModel(info) && info.denom.toUpperCase() === denom.toUpperCase())
      ?.image;
  };

  const getTokenImageByPkgPath = (pkgPath: string): string | undefined => {
    return tokenService
      .getTokenMetainfos()
      .find((info) => isGRC20TokenModel(info) && info.pkgPath === pkgPath)?.image;
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
    currentTokenMetainfos,
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
