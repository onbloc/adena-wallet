import React from 'react';

import { ContractMessage } from '@inject/types';
import {
  AddPackageValue,
  MsgRunValue,
} from '@repositories/transaction/response/transaction-history-query-response';

export const useTransactionMessageMaxDeposit = (
  message: ContractMessage,
  index: number,
  changeMessage: (index: number, messages: ContractMessage) => void,
) => {
  const { max_deposit } = message.value as AddPackageValue | MsgRunValue;

  const maxDeposit = React.useMemo(() => {
    return max_deposit || '';
  }, [message.value]);

  const changeMaxDeposit = React.useCallback(
    (maxDeposit: string) => {
      changeMessage(index, {
        ...message,
        value: {
          ...message.value,
          max_deposit: maxDeposit,
        },
      });
    },
    [message, index, changeMessage],
  );

  return { maxDeposit, changeMaxDeposit };
};
