import { TokenState } from "@states/index";
import { useRecoilState } from "recoil";
import { useAdenaContext } from "./use-context";
import { useCurrentAccount } from "./use-current-account";

export const useTokenMetainfo = () => {
  const { balanceService, tokenService } = useAdenaContext();
  const [tokenMetainfos, setTokenMetainfo] = useRecoilState(TokenState.tokenMetainfos);
  const [accountTokenMetainfos, setAccountTokenMetainfos] = useRecoilState(TokenState.accountTokenMetainfos);
  const { currentAccount } = useCurrentAccount();

  const initTokenMetainfos = async () => {
    if (currentAccount) {
      const tokenMetainfos = await tokenService.fetchTokenMetainfos();
      setTokenMetainfo(tokenMetainfos);
    }
  }

  const initAccountTokenMetainfos = async () => {
    if (currentAccount) {
      await tokenService.initAccountTokenMetainfos(currentAccount?.id);
      const accountTokenMetainfos = await tokenService.getAccountTokenMetainfos(currentAccount.id);
      setAccountTokenMetainfos(accountTokenMetainfos);
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

  return { tokenMetainfos, accountTokenMetainfos, initTokenMetainfos, initAccountTokenMetainfos, convertDenom, getTokenImage }
}