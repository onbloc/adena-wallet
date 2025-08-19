import React, { useMemo, useState } from 'react';

import { formatAddress } from '@common/utils/client-utils';
import { isBech32Address, reverseString } from '@common/utils/string-utils';
import ArgumentEditBox from '@components/molecules/argument-edit-box/argument-edit-box';
import { ContractMessage, EMessageType } from '@inject/types';
import {
  MsgCallValue,
  AddPackageValue,
  MsgRunValue,
} from '@repositories/transaction/response/transaction-history-query-response';

import ArrowDownIcon from '@assets/common-arrow-down-gray.svg';
import ArrowUpIcon from '@assets/common-arrow-up-gray.svg';

import IconLink from '@assets/icon-link';
import {
  ApproveTransactionMessageArgumentsOpenerWrapper,
  ApproveTransactionMessageWrapper,
  MessageRowWrapper,
  RealmPathInfoWrapper,
} from './approve-transaction-message.styles';

const functionNameMap = {
  '/bank.MsgSend': 'Transfer',
  '/vm.m_addpkg': 'AddPackage',
  '/vm.m_run': 'Run',
  '/vm.m_call': 'Call',
};

function isMsgCall(type: string): boolean {
  return type === EMessageType.VM_CALL;
}

function isMsgAddPkg(type: string): boolean {
  return type === EMessageType.VM_ADDPKG;
}

function isMsgRun(type: string): boolean {
  return type === EMessageType.VM_RUN;
}

function makeTitle(index: number, functionName: string): string {
  return `${index + 1}. ${functionName}`;
}

export interface ApproveTransactionMessageProps {
  index: number;
  message: ContractMessage;
  argumentKeyMap?: Record<number, string>;
  changeMessage: (index: number, messages: ContractMessage) => void;
  openScannerLink: (path: string, parameters?: { [key in string]: string }) => void;
}

const ApproveTransactionMessage: React.FC<ApproveTransactionMessageProps> = ({
  index,
  message,
  argumentKeyMap,
  changeMessage,
  openScannerLink,
}) => {
  const { type } = message;

  if (isMsgCall(type)) {
    return (
      <MsgCallTransactionMessage
        index={index}
        message={message}
        argumentKeyMap={argumentKeyMap}
        changeMessage={changeMessage}
        openScannerLink={openScannerLink}
      />
    );
  }

  if (isMsgAddPkg(type)) {
    return (
      <MsgAddPkgTransactionMessage
        index={index}
        message={message}
        changeMessage={changeMessage}
        openScannerLink={openScannerLink}
      />
    );
  }

  if (isMsgRun(type)) {
    return (
      <MsgRunTransactionMessage
        index={index}
        message={message}
        changeMessage={changeMessage}
        openScannerLink={openScannerLink}
      />
    );
  }

  return (
    <DefaultTransactionMessage
      index={index}
      message={message}
      changeMessage={changeMessage}
      openScannerLink={openScannerLink}
    />
  );
};

const DefaultTransactionMessage: React.FC<ApproveTransactionMessageProps> = ({
  index,
  message,
}) => {
  const { type } = message;
  const [isOpen, setIsOpen] = useState(true);

  const functionName = useMemo(() => {
    return functionNameMap[type] || 'Unknown';
  }, [type]);

  const title = useMemo(() => {
    return makeTitle(index, functionName);
  }, [functionName, index]);

  return (
    <ApproveTransactionMessageWrapper>
      <MessageBoxArgumentsOpener title={title} isOpen={isOpen} setIsOpen={setIsOpen} />

      {isOpen && (
        <MessageRowWrapper>
          <div className='message-row'>
            <span className='key'>Type</span>
            <span className='value'>{type}</span>
          </div>
          <div className='message-row'>
            <span className='key'>Function</span>
            <span className='value'>{functionName}</span>
          </div>
        </MessageRowWrapper>
      )}
    </ApproveTransactionMessageWrapper>
  );
};

const MsgCallTransactionMessage: React.FC<ApproveTransactionMessageProps> = ({
  index,
  message,
  argumentKeyMap,
  changeMessage,
  openScannerLink,
}) => {
  const { func, pkg_path, args, send, max_deposit } = message.value as MsgCallValue;
  const [isOpen, setIsOpen] = useState(true);

  const functionName = useMemo(() => {
    return func || '';
  }, [func]);

  const title = useMemo(() => {
    return makeTitle(index, functionName);
  }, [functionName, index]);

  const realmPathInfo = useMemo(() => {
    if (!pkg_path) {
      return {
        path: '',
        domain: '',
        nameSpace: '',
        namespaceSubPath: '',
        contract: '',
      };
    }

    const paths = pkg_path.split('/');

    if (paths.length < 3) {
      return {
        path: pkg_path,
        domain: '',
        nameSpace: '',
        namespaceSubPath: '',
        contract: pkg_path,
      };
    }

    const domain = paths.slice(1, 2).join('/');
    const nameSpace = paths[2];
    const namespaceSubPath = paths.length > 4 ? paths.slice(3, paths.length - 1).join('/') : '';
    const contract = paths[paths.length - 1];

    return {
      path: pkg_path,
      domain,
      nameSpace,
      namespaceSubPath,
      contract,
    };
  }, [pkg_path]);

  const displayArguments = useMemo(() => {
    if (!args) {
      return [];
    }

    return args;
  }, [args]);

  const sendAmount = useMemo(() => {
    return send || '';
  }, [send]);

  const maxDeposit = useMemo(() => {
    return max_deposit || '';
  }, [max_deposit]);

  const moveGnoscan = (): void => {
    openScannerLink('/realms/details', { path: realmPathInfo.path });
  };

  const changeSendAmount = (sendAmount: string): void => {
    changeMessage(index, {
      ...message,
      value: {
        ...message.value,
        send: sendAmount,
      },
    });
  };

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

  const changeMaxDeposit = (maxDeposit: string): void => {
    const updatedValue: typeof message.value & { max_deposit: string } = {
      ...message.value,
      max_deposit: maxDeposit,
    };

    const updatedMessage: typeof message = {
      ...message,
      value: updatedValue,
    };

    changeMessage(index, updatedMessage);
  };

  return (
    <ApproveTransactionMessageWrapper>
      <MessageBoxArgumentsOpener title={title} isOpen={isOpen} setIsOpen={setIsOpen} />

      {isOpen && (
        <MessageRowWrapper>
          <div className='message-row'>
            <span className='key realm'>Realm</span>
            <span className='realm-wrapper'>
              <RealmPathInfo
                domain={realmPathInfo.domain}
                nameSpace={realmPathInfo.nameSpace}
                namespaceSubPath={realmPathInfo.namespaceSubPath}
                contract={realmPathInfo.contract}
              />
              <div className='link-wrapper' onClick={moveGnoscan}>
                <IconLink />
              </div>
            </span>
          </div>
          <div className='message-row argument'>
            <span className='key'>Max Deposit</span>
            <ArgumentEditBox
              value={maxDeposit}
              onChange={(value): void => changeMaxDeposit(value)}
            />
          </div>
          <div className='message-row argument'>
            <span className='key'>Send</span>
            <ArgumentEditBox
              value={sendAmount}
              onChange={(value): void => changeSendAmount(value)}
            />
          </div>
          {displayArguments.map((arg, argumentIndex) => (
            <div className='message-row argument' key={argumentIndex}>
              <span className='key'>
                {argumentKeyMap?.[argumentIndex] || `Arg${argumentIndex + 1}`}
              </span>
              <ArgumentEditBox
                value={arg}
                onChange={(value): void => changeArgument(argumentIndex, value)}
              />
            </div>
          ))}
        </MessageRowWrapper>
      )}
    </ApproveTransactionMessageWrapper>
  );
};

const MsgAddPkgTransactionMessage: React.FC<ApproveTransactionMessageProps> = ({
  index,
  message,
  changeMessage,
}) => {
  const { type } = message;
  const [isOpen, setIsOpen] = useState(true);
  const { max_deposit } = message.value as AddPackageValue;

  const maxDeposit = useMemo(() => {
    return max_deposit || '';
  }, [max_deposit]);

  const functionName = useMemo(() => {
    return functionNameMap[type] || 'Unknown';
  }, [type]);

  const title = useMemo(() => {
    return makeTitle(index, functionName);
  }, [functionName, index]);

  const changeMaxDeposit = (maxDeposit: string): void => {
    const updatedValue: typeof message.value & { max_deposit: string } = {
      ...message.value,
      max_deposit: maxDeposit,
    };

    const updatedMessage: typeof message = {
      ...message,
      value: updatedValue,
    };

    changeMessage(index, updatedMessage);
  };

  return (
    <ApproveTransactionMessageWrapper>
      <MessageBoxArgumentsOpener title={title} isOpen={isOpen} setIsOpen={setIsOpen} />

      {isOpen && (
        <MessageRowWrapper>
          <div className='message-row'>
            <span className='key'>Type</span>
            <span className='value'>{type}</span>
          </div>
          <div className='message-row'>
            <span className='key'>Function</span>
            <span className='value'>{functionName}</span>
          </div>
          <div className='message-row argument'>
            <span className='key'>Max Deposit</span>
            <ArgumentEditBox
              value={maxDeposit}
              onChange={(value): void => changeMaxDeposit(value)}
            />
          </div>
        </MessageRowWrapper>
      )}
    </ApproveTransactionMessageWrapper>
  );
};

const MsgRunTransactionMessage: React.FC<ApproveTransactionMessageProps> = ({
  index,
  message,
  changeMessage,
}) => {
  const { type } = message;
  const [isOpen, setIsOpen] = useState(true);
  const { max_deposit } = message.value as MsgRunValue;

  const maxDeposit = useMemo(() => {
    return max_deposit || '';
  }, [max_deposit]);

  const functionName = useMemo(() => {
    return functionNameMap[type] || 'Unknown';
  }, [type]);

  const title = useMemo(() => {
    return makeTitle(index, functionName);
  }, [functionName, index]);

  const changeMaxDeposit = (maxDeposit: string): void => {
    const updatedValue: typeof message.value & { max_deposit: string } = {
      ...message.value,
      max_deposit: maxDeposit,
    };

    const updatedMessage: typeof message = {
      ...message,
      value: updatedValue,
    };

    changeMessage(index, updatedMessage);
  };

  return (
    <ApproveTransactionMessageWrapper>
      <MessageBoxArgumentsOpener title={title} isOpen={isOpen} setIsOpen={setIsOpen} />

      {isOpen && (
        <MessageRowWrapper>
          <div className='message-row'>
            <span className='key'>Type</span>
            <span className='value'>{type}</span>
          </div>
          <div className='message-row'>
            <span className='key'>Function</span>
            <span className='value'>{functionName}</span>
          </div>
          <div className='message-row argument'>
            <span className='key'>Max Deposit</span>
            <ArgumentEditBox
              value={maxDeposit}
              onChange={(value): void => changeMaxDeposit(value)}
            />
          </div>
        </MessageRowWrapper>
      )}
    </ApproveTransactionMessageWrapper>
  );
};

const MessageBoxArgumentsOpener: React.FC<{
  title: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}> = ({ title, isOpen, setIsOpen }) => {
  const toggleIsOpen = (): void => {
    setIsOpen(!isOpen);
  };

  return (
    <ApproveTransactionMessageArgumentsOpenerWrapper onClick={toggleIsOpen}>
      <div className='title-wrapper'>
        <span className='title'>{title}</span>
        <img className='arrow-icon' src={isOpen ? ArrowUpIcon : ArrowDownIcon} alt='arrow-icon' />
      </div>
    </ApproveTransactionMessageArgumentsOpenerWrapper>
  );
};

export default ApproveTransactionMessage;

const RealmPathInfo: React.FC<{
  domain: string;
  nameSpace: string;
  namespaceSubPath: string;
  contract: string;
}> = ({ domain, nameSpace, namespaceSubPath, contract }) => {
  const displayDomain = useMemo(() => {
    return reverseString(domain);
  }, [domain]);

  const displayNamespacePath = useMemo(() => {
    const displayNamespace = isBech32Address(nameSpace) ? formatAddress(nameSpace, 4) : nameSpace;

    if (namespaceSubPath.length > 0) {
      return reverseString(`${displayNamespace}/${namespaceSubPath}`);
    }

    return reverseString(displayNamespace);
  }, [nameSpace, namespaceSubPath]);

  const displayContractPath = useMemo(() => {
    return reverseString(contract);
  }, [contract]);

  if (!domain && !displayNamespacePath && !contract) {
    return <RealmPathInfoWrapper />;
  }

  return (
    <RealmPathInfoWrapper>
      {displayContractPath && <span className='contract-path'>{displayContractPath}</span>}
      {displayContractPath && <span className='contract-path'>/</span>}
      {displayNamespacePath && <span className='namespace-path'>{displayNamespacePath}</span>}
      {displayNamespacePath && <span className='namespace-path'>/</span>}
      {displayDomain && <span className='domain-path'>{displayDomain}</span>}
    </RealmPathInfoWrapper>
  );
};
