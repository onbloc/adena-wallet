import { TokenState } from "@states/index";
import { useRecoilState } from "recoil";
import { useAdenaContext } from "./use-context";
import { TokenMetainfo } from "@states/token";

export const useTokenMetainfo = (): {
  tokenMetainfos: TokenMetainfo[],
  getTokenMetainfo: () => Promise<TokenMetainfo[]>,
  convertDenom: (amount: string, denom: string, convertType?: 'COMMON' | 'MINIMAL') => { value: string, denom: string },
  getTokenImage: (denom: string) => string | undefined
} => {
  const { balanceService, tokenService } = useAdenaContext();
  const [tokenMetainfos, setTokenMetainfo] = useRecoilState(TokenState.tokenMetainfos);

  const getTokenMetainfo = async () => {
    if (tokenMetainfos.length > 0) {
      return tokenMetainfos;
    }
    return fetchTokenMetainfo();
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

  const fetchTokenMetainfo = async () => {
    const tokenMetainfos = await tokenService.fetchTokenMetainfos();
    setTokenMetainfo(tokenMetainfos);
    return tokenMetainfos;
  }

  const getTokenImage = (denom: string) => {
    const tokenMetainfo = tokenMetainfos.find(
      tokenMetainfo =>
        denom.toUpperCase() === tokenMetainfo.denom.toUpperCase() ||
        denom.toUpperCase() === tokenMetainfo.minimalDenom.toUpperCase()
    );
    return tokenMetainfo?.image;
  }

  return { tokenMetainfos, getTokenMetainfo, convertDenom, getTokenImage }
}