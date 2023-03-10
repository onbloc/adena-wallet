import { CommonState, WalletState } from '@states/index';
import { useRecoilState } from 'recoil';
import { Balance } from '@states/wallet';
import { useAdenaContext } from './use-context';
import { GnoClient } from 'gno-client';
import { CommonError } from '@common/errors/common';

export const useWalletBalances = (
  gnoClient: InstanceType<typeof GnoClient> | null,
): [balances: Array<Balance>, updateBalances: () => void] => {
  const { accountService, balanceService } = useAdenaContext();

  const [balances, setBalances] = useRecoilState(WalletState.balances);
  const [state, setState] = useRecoilState(WalletState.state);
  const [currenctAccount] = useRecoilState(WalletState.currentAccount);
  const [, setCurrentBalance] = useRecoilState(WalletState.currentBalance);
  const [, setFailedNetwork] = useRecoilState(CommonState.failedNetwork);
  const [, setFailedNetworkChainId] = useRecoilState(CommonState.failedNetworkChainId);

  const updateBalances = async () => {
    if (!gnoClient) {
      console.error('Not initialize gno client');
      return;
    }

    if (!currenctAccount?.getAddress()) {
      return;
    }

    const chainId = gnoClient.chainId;
    try {
      const address = currenctAccount.getAddress();
      const tokenBalances = await balanceService.getTokenBalances(address);
      const currentAddress = await accountService.getCurrentAccountAddress();
      if (address !== currentAddress) {
        return;
      }

      if (tokenBalances.length > 0) {
        setBalances(tokenBalances as Array<Balance>);
        const mainToken = tokenBalances.find((token) => token.main);
        mainToken &&
          setCurrentBalance({
            amount: mainToken.amount,
            denom: mainToken?.amountDenom ?? '',
          });
      } else {
        setFailedNetwork(false);
        setFailedNetworkChainId(chainId);
      }
      if (state === 'LOADING' || state === 'NONE') {
        setState('FINISH');
      }
    } catch (e) {
      if (e instanceof CommonError) {
        console.log(e);
      } else {
        setFailedNetwork(true);
        if (state === 'LOADING' || state === 'NONE') {
          setState('FINISH');
        }
      }
    }
  };

  return [balances, updateBalances];
};
