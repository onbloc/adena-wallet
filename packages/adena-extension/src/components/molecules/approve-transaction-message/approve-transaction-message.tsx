import React, { useMemo, useState } from 'react';

import { ContractMessage } from '@inject/types';
import { MsgCallValue } from '@repositories/transaction/response/transaction-history-query-response';

import {
  ApproveTransactionMessageArgumentsOpenerWrapper,
  ApproveTransactionMessageWrapper,
} from './approve-transaction-message.styles';

import ArrowDownIcon from '@assets/common-arrow-down-gray.svg';
import ArrowUpIcon from '@assets/common-arrow-up-gray.svg';
import ArgumentEditBox from '../argument-edit-box/argument-edit-box';

const functionNameMap = {
  '/bank.MsgSend': 'Transfer',
  '/vm.m_addpkg': 'AddPackage',
  '/vm.m_run': 'Run',
  '/vm.m_call': 'Call',
};

export interface ApproveTransactionMessageProps {
  index: number;
  message: ContractMessage;
  changeMessage: (index: number, messages: ContractMessage) => void;
}

const ApproveTransactionMessage: React.FC<ApproveTransactionMessageProps> = ({
  index,
  message,
  changeMessage,
}) => {
  const { type } = message;

  if (type === '/vm.m_call') {
    return (
      <MsgCallTransactionMessage index={index} message={message} changeMessage={changeMessage} />
    );
  }

  return (
    <DefaultTransactionMessage index={index} message={message} changeMessage={changeMessage} />
  );
};

const DefaultTransactionMessage: React.FC<ApproveTransactionMessageProps> = ({ message }) => {
  const { type } = message;

  const functionName = useMemo(() => {
    return functionNameMap[type] || 'Unknown';
  }, [type]);

  return (
    <ApproveTransactionMessageWrapper>
      <div className='row'>
        <span className='key'>Type</span>
        <span className='value'>{type}</span>
      </div>
      <div className='row'>
        <span className='key'>Function</span>
        <span className='value'>{functionName}</span>
      </div>
    </ApproveTransactionMessageWrapper>
  );
};

const MsgCallTransactionMessage: React.FC<ApproveTransactionMessageProps> = ({
  index,
  message,
  changeMessage,
}) => {
  const { func, pkg_path, args } = message.value as MsgCallValue;
  const [isOpen, setIsOpen] = useState(false);

  const functionName = useMemo(() => {
    return func;
  }, [func]);

  const displayArguments = useMemo(() => {
    if (!isOpen) {
      return [];
    }

    return args || [];
  }, [args, isOpen]);

  const hasArgument = useMemo(() => {
    if (!args) {
      return false;
    }

    return args.length > 0;
  }, [args]);

  const changeArgument = (argumentIndex: number, value: string): void => {
    if (!args) {
      return;
    }

    const newArgs = [...args];
    newArgs[argumentIndex] = value;
    changeMessage(index, {
      ...message,
      value: {
        ...message.value,
        args: newArgs,
      },
    });
  };

  return (
    <ApproveTransactionMessageWrapper>
      <div className='row'>
        <span className='key'>Realm</span>
        <span className='value'>{pkg_path}</span>
      </div>

      <div className='row'>
        <span className='key'>Function</span>
        <span className='value'>{functionName}</span>
      </div>

      {displayArguments.map((arg, argumentIndex) => (
        <div className='row argument' key={argumentIndex}>
          <span className='key'>{`Arg${argumentIndex + 1}`}</span>
          <ArgumentEditBox
            value={arg}
            onChange={(value): void => changeArgument(argumentIndex, value)}
          />
        </div>
      ))}

      {hasArgument && <MessageBoxArgumentsOpener isOpen={isOpen} setIsOpen={setIsOpen} />}
    </ApproveTransactionMessageWrapper>
  );
};

const MessageBoxArgumentsOpener: React.FC<{
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}> = ({ isOpen, setIsOpen }) => {
  const description = isOpen ? 'Hide Arguments' : 'Show Arguments';

  const toggleIsOpen = (): void => {
    setIsOpen(!isOpen);
  };

  return (
    <ApproveTransactionMessageArgumentsOpenerWrapper onClick={toggleIsOpen}>
      <div className='description-wrapper'>
        <span className='description'>{description}</span>
        <img className='arrow-icon' src={isOpen ? ArrowUpIcon : ArrowDownIcon} alt='arrow-icon' />
      </div>
    </ApproveTransactionMessageArgumentsOpenerWrapper>
  );
};

export default ApproveTransactionMessage;
