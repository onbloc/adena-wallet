import { TokenState } from "@states/index";
import { useRecoilState } from "recoil";
import { useAdenaContext } from "./use-context";
import { useCurrentAccount } from "./use-current-account";
import { TokenMetainfo } from "@states/token";

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

  const initTokenMetainfos = async () => {
    if (currentAccount) {
      await tokenService.initAccountTokenMetainfos(currentAccount.id);
      const tokenMetainfos = await tokenService.getTokenMetainfosByAccountId(currentAccount.id);
      setTokenMetainfo(tokenMetainfos);
    }
  }

  const convertDenom = (amount: string, denom: string, convertType?: 'COMMON' | 'MINIMAL'): { value: string, denom: string } => {
    if (tokenMetainfos) {
      const tokenMetainfo = tokenMetainfos.find(
        tokenMetainfo => denom.toUpperCase() === tokenMetainfo.denom.toUpperCase() || denom.toUpperCase() === tokenMetainfo.minimalDenom.toUpperCase());

      if (tokenMetainfo) {
        return balanceService.convertDenom(amount, denom, tokenMetainfo, convertType);
      }
    }

    return {
      value: amount,
      denom
    }
  }

  const getTokenImage = (denom: string) => {
    const tokenMetainfo = tokenMetainfos.find(
      tokenMetainfo =>
        denom.toUpperCase() === tokenMetainfo.denom.toUpperCase() ||
        denom.toUpperCase() === tokenMetainfo.minimalDenom.toUpperCase()
    );
    return tokenMetainfo?.image;
  }

  const addTokenMetainfo = async (tokenMetainfo: TokenMetainfo) => {
    if (!currentAccount) {
      return false;
    }

    const tokenMetainfos = await tokenService.getTokenMetainfosByAccountId(currentAccount.id);
    if (tokenMetainfos.find(item => item.tokenId === tokenMetainfo.tokenId)) {
      return false;
    }

    await tokenService.updateTokenMetainfosByAccountId(currentAccount.id, [...tokenMetainfos, tokenMetainfo]);
    const changedTokenMetainfos = await tokenService.getTokenMetainfosByAccountId(currentAccount.id);
    setTokenMetainfo(changedTokenMetainfos);
    return true;
  };

  const addGRC20TokenMetainfo = async ({
    tokenId,
    name,
    symbol,
    path,
    decimals,
    chainId,
  }: GRC20Token) => {
    const tokenMetainfo: TokenMetainfo = {
      main: false,
      tokenId,
      chainId,
      networkId: chainId,
      pkgPath: path,
      symbol,
      type: 'GRC20',
      name,
      decimals,
      denom: symbol,
      minimalDenom: symbol,
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
    getTokenImage
  };
}