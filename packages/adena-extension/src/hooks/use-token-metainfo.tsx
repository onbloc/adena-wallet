import { TokenState } from "@states/index";
import { useRecoilState } from "recoil";
import { useAdenaContext } from "./use-context";
import { useCurrentAccount } from "./use-current-account";
import { GRC20TokenModel, TokenModel, isGRC20TokenModel, isNativeTokenModel } from "@models/token-model";
import { useNetwork } from "./use-network";

interface GRC20Token {
  tokenId: string;
  name: string;
  symbol: string;
  path: string;
  decimals: number;
  chainId: string;
}

export const useTokenMetainfo = () => {
  const { balanceService, tokenService } = useAdenaContext();
  const [tokenMetainfos, setTokenMetainfo] = useRecoilState(TokenState.tokenMetainfos);
  const { currentAccount } = useCurrentAccount();
  const { currentNetwork } = useNetwork();

  const initTokenMetainfos = async () => {
    if (currentAccount) {
      await tokenService.initAccountTokenMetainfos(currentAccount.id);
      const tokenMetainfos = await tokenService.getTokenMetainfosByAccountId(currentAccount.id);
      setTokenMetainfo([...tokenMetainfos]);
    }
  }

  const convertDenom = (amount: string, denom: string, convertType?: 'COMMON' | 'MINIMAL'): { value: string, denom: string } => {
    if (tokenMetainfos) {
      const tokenMetainfo = tokenMetainfos
        .filter(isNativeTokenModel)
        .find(
          tokenMetainfo => denom.toUpperCase() === tokenMetainfo.symbol.toUpperCase() || denom.toUpperCase() === tokenMetainfo.denom.toUpperCase());

      if (tokenMetainfo) {
        return balanceService.convertDenom(amount, denom, tokenMetainfo, convertType);
      }
    }

    return {
      value: amount,
      denom
    }
  }

  const getTokenImage = (token: TokenModel) => {
    if (isNativeTokenModel(token)) {
      return getTokenImageByDenom(token.symbol);
    }
    if (isGRC20TokenModel(token)) {
      return getTokenImageByPkgPath(token.pkgPath);
    }
    return null;
  }

  const getTokenImageByDenom = (denom: string) => {
    const image = tokenService.getTokenMetainfos().find(info => info.symbol.toUpperCase() === denom.toUpperCase())?.image;
    if (image) {
      return image;
    }
    return tokenService.getTokenMetainfos().find(info => isNativeTokenModel(info) && info.denom.toUpperCase() === denom.toUpperCase())?.image;
  }

  const getTokenImageByPkgPath = (pkgPath: string) => {
    return tokenService.getTokenMetainfos().find(info => isGRC20TokenModel(info) && info.pkgPath === pkgPath)?.image;
  }

  const addTokenMetainfo = async (tokenMetainfo: GRC20TokenModel) => {
    if (!currentAccount) {
      return false;
    }
    const changedTokenMetainfo = {
      ...tokenMetainfo,
      image: getTokenImage(tokenMetainfo) ?? ''
    };

    const tokenMetainfos = await tokenService.getTokenMetainfosByAccountId(currentAccount.id);
    if (tokenMetainfos.find(item => item.tokenId === changedTokenMetainfo.tokenId)) {
      return false;
    }

    await tokenService.updateTokenMetainfosByAccountId(currentAccount.id, [...tokenMetainfos, changedTokenMetainfo]);
    const changedTokenMetainfos = await tokenService.getTokenMetainfosByAccountId(currentAccount.id);
    setTokenMetainfo(changedTokenMetainfos);
    return true;
  };

  const addGRC20TokenMetainfo = async ({
    tokenId,
    name,
    symbol,
    path,
    decimals
  }: GRC20Token) => {
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
      display: true
    }
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
    getTokenImageByPkgPath
  };
}