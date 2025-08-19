import React from 'react';

import { EMessageType } from '@inject/types';

const functionNameMap = {
  '/bank.MsgSend': 'Transfer',
  '/vm.m_addpkg': 'AddPackage',
  '/vm.m_run': 'Run',
  '/vm.m_call': 'Call',
};

function makeTitle(index: number, functionName: string): string {
  return `${index + 1}. ${functionName}`;
}

export const useTransactionMessage = (type: EMessageType, index: number) => {
  const [isOpen, setIsOpen] = React.useState(true);

  const functionName = React.useMemo(() => {
    return functionNameMap[type] || 'Unknown';
  }, [type]);

  const title = React.useMemo(() => {
    return makeTitle(index, functionName);
  }, [functionName, index]);

  return { isOpen, setIsOpen, functionName, title };
};
