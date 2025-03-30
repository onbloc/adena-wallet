import React from 'react';

import { ContractMessage } from '@adena-wallet/sdk';

import ApproveTransactionMessage from '../approve-transaction-message/approve-transaction-message';
import { ApproveTransactionMessageBoxWrapper } from './approve-transaction-message-box.styles';

export interface ApproveTransactionMessageBoxProps {
  messages: ContractMessage[];
  changeMessages: (messages: ContractMessage[]) => void;
}

const ApproveTransactionMessageBox: React.FC<ApproveTransactionMessageBoxProps> = ({
  messages,
  changeMessages,
}) => {
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
          changeMessage={changeMessage}
        />
      ))}
    </ApproveTransactionMessageBoxWrapper>
  );
};

export default ApproveTransactionMessageBox;
