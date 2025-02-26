import BigNumber from 'bignumber.js';
import { useCallback, useEffect, useState } from 'react';

import { GAS_FEE_SAFETY_MARGIN } from '@common/constants/gas.constant';
import { GasToken, GNOT_TOKEN } from '@common/constants/token.constant';
import { DEFAULT_GAS_FEE, DEFAULT_GAS_WANTED } from '@common/constants/tx.constant';
import { MsgEndpoint } from '@gnolang/gno-js-client';
import { GasInfo, TokenBalanceType, TokenModel } from '@types';
import { Document } from 'adena-module';
import { useAdenaContext, useWalletContext } from './use-context';
import { useCurrentAccount } from './use-current-account';
import { useNetwork } from './use-network';
import { useTokenBalance } from './use-token-balance';
import { useTokenMetainfo } from './use-token-metainfo';
import { useNetworkFee } from './wallet/use-network-fee';

export type UseBalanceInputHookReturn = {
  hasError: boolean;
  amount: string;
  denom: string;
  description: string;
  gasInfo: GasInfo | null;
  setAmount: (amount: string) => void;
  updateCurrentBalance: () => Promise<boolean>;
  onChangeAmount: (amount: string) => void;
  onClickMax: () => void;
  validateBalanceInput: () => boolean;
};

export const useBalanceInput = (tokenMetainfo?: TokenModel): UseBalanceInputHookReturn => {
  const { balanceService } = useAdenaContext();
  const { wallet } = useWalletContext();
  const { currentAddress } = useCurrentAccount();
  const { currentNetwork } = useNetwork();
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [amount, setAmount] = useState('');
  const [currentBalance, setCurrentBalance] = useState<TokenBalanceType>();
  const [availAmountNumber, setAvailAmountNumber] = useState<BigNumber>(BigNumber(0));
  const { fetchBalanceBy } = useTokenBalance();
  const { convertDenom } = useTokenMetainfo();

  const [document, setDocument] = useState<Document | null>(null);
  const { currentGasInfo } = useNetworkFee(document);

  useEffect(() => {
    if (!currentAddress || !currentBalance || !tokenMetainfo) {
      return;
    }

    const amount = BigNumber(currentBalance.amount.value)
      .multipliedBy(0.9)
      .toFixed(tokenMetainfo.decimals || 6);

    setDocument(
      makeTransferDocument({
        chainId: currentNetwork.networkId,
        fromAddress: currentAddress,
        toAddress: currentAddress,
        amount: amount,
        memo: '',
      }),
    );
  }, [currentNetwork, currentAddress, currentBalance, tokenMetainfo]);

  useEffect(() => {
    if (!currentGasInfo || !currentBalance) {
      return;
    }

    if (currentBalance.type === 'gno-native') {
      const convertedBalance = convertDenom(
        currentBalance.amount.value,
        currentBalance.amount.denom,
        'COMMON',
      );

      const maxGasFeeBN = BigNumber(currentGasInfo.gasWanted)
        .multipliedBy(currentGasInfo.gasPrice * GAS_FEE_SAFETY_MARGIN)
        .shiftedBy(GasToken.decimals * -1)
        .toFixed(GasToken.decimals, BigNumber.ROUND_UP);

      const availAmountNumber = BigNumber(convertedBalance.value).minus(maxGasFeeBN);
      if (availAmountNumber.isGreaterThan(0)) {
        setAvailAmountNumber(availAmountNumber);
      } else {
        setAvailAmountNumber(BigNumber(0));
      }
    } else {
      const convertedBalanceAmount = BigNumber(currentBalance.amount.value);
      if (convertedBalanceAmount.isGreaterThan(0)) {
        setAvailAmountNumber(convertedBalanceAmount);
      } else {
        setAvailAmountNumber(BigNumber(0));
      }
    }
  }, [currentGasInfo, currentBalance]);

  const updateCurrentBalance = useCallback(async () => {
    if (!currentAddress) {
      return false;
    }

    if (!tokenMetainfo) {
      return false;
    }

    const currentBalance = await fetchBalanceBy(currentAddress, tokenMetainfo);
    setCurrentBalance(currentBalance);
    return true;
  }, [wallet, balanceService, currentAddress, tokenMetainfo]);

  const clearError = useCallback(() => {
    setHasError(false);
    setErrorMessage('Invalid address');
  }, []);

  const getDescription = useCallback(() => {
    if (hasError || !tokenMetainfo) {
      return errorMessage;
    }
    return `Balance: ${BigNumber(currentBalance?.amount.value || 0).toFormat()} ${
      tokenMetainfo.symbol
    }`;
  }, [currentBalance, hasError, errorMessage, tokenMetainfo]);

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
      setAmount(
        Number(charAtZeroCheck)
          .toFixed(tokenMetainfo?.decimals || 6)
          .toString(),
      );
    } else {
      setAmount(charAtZeroCheck);
    }
    clearError();
  }, []);

  const onClickMax = useCallback(() => {
    if (currentGasInfo) {
      setAmount(availAmountNumber.toString());
    }

    setAmount(availAmountNumber.toString());
  }, [availAmountNumber, currentGasInfo]);

  const validateBalanceInput = useCallback(() => {
    if (
      BigNumber(amount || 0).isGreaterThan(currentBalance?.amount.value || 0) ||
      BigNumber(amount || 0).isLessThanOrEqualTo(0)
    ) {
      setHasError(true);
      setErrorMessage('Insufficient balance');
      return false;
    }
    clearError();
    return true;
  }, [currentBalance, amount]);

  return {
    hasError,
    amount,
    denom: tokenMetainfo?.symbol || '',
    description: getDescription(),
    gasInfo: currentGasInfo,
    setAmount,
    updateCurrentBalance,
    onChangeAmount,
    onClickMax,
    validateBalanceInput,
  };
};

function makeTransferDocument(params: {
  chainId: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  memo: string;
}): Document {
  return {
    account_number: '0',
    sequence: '0',
    chain_id: params.chainId,
    msgs: [
      {
        type: MsgEndpoint.MSG_SEND,
        value: {
          from_address: params.fromAddress,
          to_address: params.toAddress,
          amount: `1${GNOT_TOKEN.denom}`,
        },
      },
    ],
    memo: params.memo,
    fee: {
      amount: [
        {
          denom: GasToken.denom,
          amount: DEFAULT_GAS_FEE.toString(),
        },
      ],
      gas: DEFAULT_GAS_WANTED.toString(),
    },
  };
}
