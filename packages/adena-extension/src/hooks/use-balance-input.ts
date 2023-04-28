import { useCallback, useState } from 'react';
import { useAdenaContext, useWalletContext } from './use-context';
import { useCurrentAccount } from './use-current-account';
import { TokenMetainfo } from '@states/token';
import BigNumber from 'bignumber.js';
import { TokenBalance } from '@states/balance';
import { useTokenBalance } from './use-token-balance';
import { useTokenMetainfo } from './use-token-metainfo';

const NETWORK_FEE = 0.000001;

export const useBalanceInput = (tokenMetainfo: TokenMetainfo) => {
  const { balanceService } = useAdenaContext();
  const { wallet } = useWalletContext();
  const { currentAccount } = useCurrentAccount();
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [amount, setAmount] = useState('');
  const [currentBalance, setCurrentBalance] = useState<TokenBalance>();
  const [availAmountNumber, setAvailAmountNumber] = useState<BigNumber>(BigNumber(0));
  const { fetchBalanceBy } = useTokenBalance();
  const { convertDenom } = useTokenMetainfo();
  const networkFee = {
    value: `${NETWORK_FEE}`,
    denom: 'GNOT',
  };

  const updateCurrentBalance = useCallback(async () => {
    if (!currentAccount) {
      return false;
    }
    const currentBalance = await fetchBalanceBy(currentAccount, tokenMetainfo);
    setCurrentBalance(currentBalance);
    if (currentBalance.type === 'NATIVE') {
      const convnetedBalance = convertDenom(
        currentBalance.amount.value,
        currentBalance.amount.denom,
        'COMMON',
      );
      const availAmountNumber = BigNumber(convnetedBalance.value).minus(NETWORK_FEE);
      if (availAmountNumber.isGreaterThan(0)) {
        setAvailAmountNumber(availAmountNumber);
      } else {
        setAvailAmountNumber(BigNumber(0));
      }
    } else {
      setAvailAmountNumber(BigNumber(currentBalance.amount.value));
    }
    return true;
  }, [wallet, balanceService, currentAccount]);

  const clearError = useCallback(() => {
    setHasError(false);
    setErrorMessage('Invalid address');
  }, []);

  const getDescription = useCallback(() => {
    if (hasError) {
      return errorMessage;
    }
    return `Balance: ${currentBalance?.amount.value || 0} ${tokenMetainfo.denom}`;
  }, [currentBalance, hasError, errorMessage]);

  const onChangeAmount = useCallback((amount: string) => {
    const charAtFirst = amount.charAt(0);
    const charAtSecond = amount.charAt(1);
    let charAtZeroCheck: string | null = amount;
    if (Number(charAtSecond) >= 1 && charAtFirst === '0') {
      charAtZeroCheck = amount.replace(/(^0+)/, '');
    } else if (Number(charAtSecond) === 0 && charAtFirst === '0') {
      charAtZeroCheck = amount.replace(/(^0+)/, '0');
    } else if (charAtFirst === '.') {
      charAtZeroCheck = `0${amount}`;
    }
    if (charAtZeroCheck.includes('.') && charAtZeroCheck.split('.')[1].length > 6) {
      setAmount(Number(charAtZeroCheck).toFixed(6).toString());
    } else {
      setAmount(charAtZeroCheck);
    }
    clearError();
  }, []);

  const onClickMax = useCallback(() => {
    setAmount(availAmountNumber.toString());
  }, [availAmountNumber]);

  const validateBalanceInput = useCallback(() => {
    if (
      BigNumber(amount || 0).isGreaterThan(availAmountNumber) ||
      BigNumber(amount || 0).isLessThanOrEqualTo(0)
    ) {
      setHasError(true);
      setErrorMessage('Insufficient balance');
      return false;
    }
    clearError();
    return true;
  }, [availAmountNumber, amount]);

  return {
    hasError,
    amount,
    denom: tokenMetainfo.denom,
    description: getDescription(),
    networkFee,
    updateCurrentBalance,
    onChangeAmount,
    onClickMax,
    validateBalanceInput,
  };
};