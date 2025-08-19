import React from 'react';

import { ContractMessage, FUNCTION_NAME_MAP } from '@inject/types';
import {
  AddPackageValue,
  MsgRunValue,
} from '@repositories/transaction/response/transaction-history-query-response';

export const useMaxDepositMessage = (
  index: number,
  message: ContractMessage,
  changeMessage: (index: number, messages: ContractMessage) => void,
) => {
  const { type } = message;
  const [isOpen, setIsOpen] = React.useState(true);

  const { max_deposit } = message.value as AddPackageValue | MsgRunValue;

  const maxDeposit = React.useMemo(() => {
    return max_deposit || '';
  }, [max_deposit]);

  const functionName = React.useMemo(() => {
    return FUNCTION_NAME_MAP[type] || 'Unknown';
  }, [type]);

  const title = React.useMemo(() => {
    return makeTitle(index, functionName);
  }, [functionName, index]);

  const changeMaxDeposit = (maxDeposit: string): void => {
    changeMessage(index, {
      ...message,
      value: {
        ...message.value,
        max_deposit: maxDeposit,
      },
    });
  };

  return {
    type,
    isOpen,
    setIsOpen,
    maxDeposit,
    functionName,
    title,
    changeMaxDeposit,
  };
};

function makeTitle(index: number, functionName: string): string {
  return `${index + 1}. ${functionName}`;
}
