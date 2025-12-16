import React, { useMemo } from 'react';

import { GnoArgumentInfo } from '@inject/message/methods/gno-connect';
import { ContractMessage } from '@inject/types';
import ApproveTransactionMessage from '../approve-transaction-message/approve-transaction-message';
import { ApproveTransactionMessageBoxWrapper } from './approve-transaction-message-box.styles';

export interface ApproveTransactionMessageBoxProps {
  messages: ContractMessage[];
  argumentInfos?: GnoArgumentInfo[];
  changeMessages: (messages: ContractMessage[]) => void;
  openScannerLink: (path: string, parameters?: { [key in string]: string }) => void;
  editable?: boolean;
}

const ApproveTransactionMessageBox: React.FC<ApproveTransactionMessageBoxProps> = ({
  messages,
  argumentInfos,
  changeMessages,
  openScannerLink,
  editable = true,
}) => {
  const argumentKeyMap = useMemo(() => {
    if (!argumentInfos) {
      return undefined;
    }

    return argumentInfos.reduce(
      (acc, info) => {
        acc[info.index] = info.key;
        return acc;
      },
      {} as Record<number, string>,
    );
  }, [argumentInfos]);

  const changeMessage = (index: number, message: ContractMessage): void => {
    const newMessages = [...messages];
    newMessages[index] = message;
    changeMessages(newMessages);
  };

  if (messages.length === 0) {
    return <React.Fragment />;
  }

  return (
    <ApproveTransactionMessageBoxWrapper>
      {messages.map((message, index) => (
        <ApproveTransactionMessage
          key={index}
          index={index}
          message={message}
          argumentKeyMap={argumentKeyMap}
          changeMessage={changeMessage}
          openScannerLink={openScannerLink}
          editable={editable}
        />
      ))}
    </ApproveTransactionMessageBoxWrapper>
  );
};

export default ApproveTransactionMessageBox;
