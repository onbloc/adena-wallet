import React, { useEffect, useMemo, useState } from 'react';

import { formatAddress } from '@common/utils/client-utils';
import { isBech32Address, reverseString } from '@common/utils/string-utils';
import ArgumentEditBox from '@components/molecules/argument-edit-box/argument-edit-box';
import {
  ContractMessage,
  EMessageType,
  FUNCTION_NAME_MAP,
  SessionAdminMessage,
} from '@inject/types';
import { MsgCallValue } from '@repositories/transaction/response/transaction-history-query-response';
import { PubKeySecp256k1 } from '@gnolang/tm2-js-client';
import { publicKeyToAddress } from 'adena-module';
import Long from 'long';

import ArrowDownIcon from '@assets/common-arrow-down-gray.svg';
import ArrowUpIcon from '@assets/common-arrow-up-gray.svg';

import IconLink from '@assets/icon-link';
import InfoTooltip from '@components/atoms/info-tooltip/info-tooltip';
import { useMaxDepositMessage } from '@hooks/wallet/transaction-message/use-max-deposit-message';
import {
  ApproveTransactionMessageArgumentsOpenerWrapper,
  ApproveTransactionMessageWrapper,
  MessageErrorText,
  MessageRowWrapper,
  RealmPathInfoWrapper,
} from './approve-transaction-message.styles';

const sendTooltipMessage = `The amount of tokens directly sent to
the realm or account. Double-check the
amount and token symbol before
sending, as it is irreversible once sent.`;

const maxDepositTooltipMessage = `The maximum GNOT deposited for
storage usage. You can leave this field
empty as the network will automatically
determine the actual amount required
for storage.`;

const isMsgCall = (type: string): boolean => type === EMessageType.VM_CALL;
const isMsgAddPkg = (type: string): boolean => type === EMessageType.VM_ADDPKG;
const isMsgRun = (type: string): boolean => type === EMessageType.VM_RUN;
const isMsgCreateSession = (type: string): boolean => type === EMessageType.AUTH_CREATE_SESSION;
const isMsgRevokeSession = (type: string): boolean => type === EMessageType.AUTH_REVOKE_SESSION;
const isMsgRevokeAllSessions = (type: string): boolean =>
  type === EMessageType.AUTH_REVOKE_ALL_SESSIONS;

function makeTitle(index: number, functionName: string): string {
  return `${index + 1}. ${functionName}`;
}

export interface ApproveTransactionMessageProps {
  index: number;
  message: ContractMessage;
  argumentKeyMap?: Record<number, string>;
  changeMessage: (index: number, messages: ContractMessage) => void;
  openScannerLink: (path: string, parameters?: { [key in string]: string }) => void;
  editable: boolean;
  errorMessage?: string;
}

const ApproveTransactionMessage: React.FC<ApproveTransactionMessageProps> = ({
  index,
  message,
  argumentKeyMap,
  changeMessage,
  openScannerLink,
  editable,
  errorMessage,
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
        editable={editable}
        errorMessage={errorMessage}
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
        editable={editable}
        errorMessage={errorMessage}
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
        editable={editable}
        errorMessage={errorMessage}
      />
    );
  }

  if (isMsgCreateSession(type)) {
    return (
      <MsgCreateSessionTransactionMessage
        index={index}
        message={message}
        changeMessage={changeMessage}
        openScannerLink={openScannerLink}
        editable={editable}
        errorMessage={errorMessage}
      />
    );
  }

  if (isMsgRevokeSession(type)) {
    return (
      <MsgRevokeSessionTransactionMessage
        index={index}
        message={message}
        changeMessage={changeMessage}
        openScannerLink={openScannerLink}
        editable={editable}
        errorMessage={errorMessage}
      />
    );
  }

  if (isMsgRevokeAllSessions(type)) {
    return (
      <MsgRevokeAllSessionsTransactionMessage
        index={index}
        message={message}
        changeMessage={changeMessage}
        openScannerLink={openScannerLink}
        editable={editable}
        errorMessage={errorMessage}
      />
    );
  }

  return (
    <DefaultTransactionMessage
      index={index}
      message={message}
      changeMessage={changeMessage}
      openScannerLink={openScannerLink}
      editable={editable}
      errorMessage={errorMessage}
    />
  );
};

const DefaultTransactionMessage: React.FC<ApproveTransactionMessageProps> = ({
  index,
  message,
  errorMessage,
}) => {
  const { type } = message;
  const [isOpen, setIsOpen] = useState(true);

  const functionName = useMemo(() => {
    return FUNCTION_NAME_MAP[type] || 'Unknown';
  }, [type]);

  const title = useMemo(() => {
    return makeTitle(index, functionName);
  }, [functionName, index]);

  return (
    <>
      <ApproveTransactionMessageWrapper hasError={!!errorMessage}>
        <MessageBoxArgumentsOpener title={title} isOpen={isOpen} setIsOpen={setIsOpen} />

        {isOpen && (
          <MessageRowWrapper>
            <div className='message-row'>
              <span className='key'>type</span>
              <span className='value'>{type}</span>
            </div>
            <div className='message-row'>
              <span className='key'>function</span>
              <span className='value'>{functionName}</span>
            </div>
          </MessageRowWrapper>
        )}
      </ApproveTransactionMessageWrapper>
      {errorMessage && <MessageErrorText>{errorMessage}</MessageErrorText>}
    </>
  );
};

const MsgCreateSessionTransactionMessage: React.FC<ApproveTransactionMessageProps> = ({
  index,
  message,
  errorMessage,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const value = message.value as SessionAdminMessage;
  const sessionKeyDisplay = useSessionKeyDisplay(value.session_key);
  const title = useMemo(() => makeTitle(index, 'Create Session'), [index]);
  const allowPaths = useMemo(() => (value.allow_paths ?? []).join(', '), [value.allow_paths]);

  return (
    <>
      <ApproveTransactionMessageWrapper hasError={!!errorMessage}>
        <MessageBoxArgumentsOpener title={title} isOpen={isOpen} setIsOpen={setIsOpen} />

        {isOpen && (
          <MessageRowWrapper>
            <SessionMessageRow label='type' value='MsgCreateSession' />
            <SessionMessageRow label='creator' value={formatSessionAddress(value.creator)} />
            <SessionMessageRow label='SessionKey' value={sessionKeyDisplay} />
            <SessionMessageRow label='ExpiresAt' value={formatUnknownValue(value.expires_at)} />
            <SessionMessageRow label='AllowPaths' value={allowPaths} />
            <SessionMessageRow label='SpendLimit' value={value.spend_limit ?? ''} />
            <SessionMessageRow label='SpendPeriod' value={formatUnknownValue(value.spend_period)} />
          </MessageRowWrapper>
        )}
      </ApproveTransactionMessageWrapper>
      {errorMessage && <MessageErrorText>{errorMessage}</MessageErrorText>}
    </>
  );
};

const MsgRevokeSessionTransactionMessage: React.FC<ApproveTransactionMessageProps> = ({
  index,
  message,
  errorMessage,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const value = message.value as SessionAdminMessage;
  const sessionKeyDisplay = useSessionKeyDisplay(value.session_key);
  const title = useMemo(() => makeTitle(index, 'Revoke Session'), [index]);

  return (
    <>
      <ApproveTransactionMessageWrapper hasError={!!errorMessage}>
        <MessageBoxArgumentsOpener title={title} isOpen={isOpen} setIsOpen={setIsOpen} />

        {isOpen && (
          <MessageRowWrapper>
            <SessionMessageRow label='type' value='MsgRevokeSession' />
            <SessionMessageRow label='creator' value={formatSessionAddress(value.creator)} />
            <SessionMessageRow label='SessionKey' value={sessionKeyDisplay} />
          </MessageRowWrapper>
        )}
      </ApproveTransactionMessageWrapper>
      {errorMessage && <MessageErrorText>{errorMessage}</MessageErrorText>}
    </>
  );
};

const MsgRevokeAllSessionsTransactionMessage: React.FC<ApproveTransactionMessageProps> = ({
  index,
  message,
  errorMessage,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const value = message.value as SessionAdminMessage;
  const title = useMemo(() => makeTitle(index, 'Revoke All Sessions'), [index]);

  return (
    <>
      <ApproveTransactionMessageWrapper hasError={!!errorMessage}>
        <MessageBoxArgumentsOpener title={title} isOpen={isOpen} setIsOpen={setIsOpen} />

        {isOpen && (
          <MessageRowWrapper>
            <SessionMessageRow label='type' value='MsgRevokeAllSessions' />
            <SessionMessageRow label='creator' value={formatSessionAddress(value.creator)} />
          </MessageRowWrapper>
        )}
      </ApproveTransactionMessageWrapper>
      {errorMessage && <MessageErrorText>{errorMessage}</MessageErrorText>}
    </>
  );
};

const SessionMessageRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className='message-row'>
    <span className='key'>{label}</span>
    <span className='value'>{value}</span>
  </div>
);

const MsgCallTransactionMessage: React.FC<ApproveTransactionMessageProps> = ({
  index,
  message,
  argumentKeyMap,
  changeMessage,
  openScannerLink,
  editable,
  errorMessage,
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
    <>
      <ApproveTransactionMessageWrapper hasError={!!errorMessage}>
        <MessageBoxArgumentsOpener title={title} isOpen={isOpen} setIsOpen={setIsOpen} />

        {isOpen && (
          <MessageRowWrapper>
            <div className='message-row'>
              <span className='key realm'>realm</span>
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
              <span className='key'>
                send
                <InfoTooltip content={sendTooltipMessage} />
              </span>
              <ArgumentEditBox
                value={sendAmount}
                onChange={(value): void => changeSendAmount(value)}
                editable={editable}
              />
            </div>
            {displayArguments.map((arg, argumentIndex) => (
              <div className='message-row argument' key={argumentIndex}>
                <span className='key'>
                  {argumentKeyMap?.[argumentIndex] || `arg${argumentIndex + 1}`}
                </span>
                <ArgumentEditBox
                  value={arg}
                  onChange={(value): void => changeArgument(argumentIndex, value)}
                  editable={editable}
                />
              </div>
            ))}
            <div className='message-row argument'>
              <span className='key'>
                max_deposit
                <InfoTooltip content={maxDepositTooltipMessage} />
              </span>
              <ArgumentEditBox
                value={maxDeposit}
                onChange={(value): void => changeMaxDeposit(value)}
                editable={editable}
              />
            </div>
          </MessageRowWrapper>
        )}
      </ApproveTransactionMessageWrapper>
      {errorMessage && <MessageErrorText>{errorMessage}</MessageErrorText>}
    </>
  );
};

const MsgAddPkgTransactionMessage: React.FC<ApproveTransactionMessageProps> = ({
  index,
  message,
  changeMessage,
  editable,
  errorMessage,
}) => {
  const { type, isOpen, setIsOpen, maxDeposit, functionName, title, changeMaxDeposit } =
    useMaxDepositMessage(index, message, changeMessage);

  return (
    <>
      <ApproveTransactionMessageWrapper hasError={!!errorMessage}>
        <MessageBoxArgumentsOpener title={title} isOpen={isOpen} setIsOpen={setIsOpen} />

        {isOpen && (
          <MessageRowWrapper>
            <div className='message-row'>
              <span className='key'>type</span>
              <span className='value'>{type}</span>
            </div>
            <div className='message-row'>
              <span className='key'>function</span>
              <span className='value'>{functionName}</span>
            </div>
            <div className='message-row argument'>
              <span className='key'>
                max_deposit
                <InfoTooltip content={maxDepositTooltipMessage} />
              </span>
              <ArgumentEditBox
                value={maxDeposit}
                onChange={(value): void => changeMaxDeposit(value)}
                editable={editable}
              />
            </div>
          </MessageRowWrapper>
        )}
      </ApproveTransactionMessageWrapper>
      {errorMessage && <MessageErrorText>{errorMessage}</MessageErrorText>}
    </>
  );
};

const MsgRunTransactionMessage: React.FC<ApproveTransactionMessageProps> = ({
  index,
  message,
  changeMessage,
  editable,
  errorMessage,
}) => {
  const { type, isOpen, setIsOpen, maxDeposit, functionName, title, changeMaxDeposit } =
    useMaxDepositMessage(index, message, changeMessage);

  return (
    <>
      <ApproveTransactionMessageWrapper hasError={!!errorMessage}>
        <MessageBoxArgumentsOpener title={title} isOpen={isOpen} setIsOpen={setIsOpen} />

        {isOpen && (
          <MessageRowWrapper>
            <div className='message-row'>
              <span className='key'>type</span>
              <span className='value'>{type}</span>
            </div>
            <div className='message-row'>
              <span className='key'>function</span>
              <span className='value'>{functionName}</span>
            </div>
            <div className='message-row argument'>
              <span className='key'>
                max_deposit
                <InfoTooltip content={maxDepositTooltipMessage} />
              </span>
              <ArgumentEditBox
                value={maxDeposit}
                onChange={(value): void => changeMaxDeposit(value)}
                editable={editable}
              />
            </div>
          </MessageRowWrapper>
        )}
      </ApproveTransactionMessageWrapper>
      {errorMessage && <MessageErrorText>{errorMessage}</MessageErrorText>}
    </>
  );
};

function useSessionKeyDisplay(sessionKey: unknown): string {
  const [address, setAddress] = useState('');
  const fallback = useMemo(() => formatCompactValue(sessionKey), [sessionKey]);

  useEffect(() => {
    let canceled = false;

    sessionKeyToAddress(sessionKey)
      .then((value) => {
        if (!canceled) {
          setAddress(value);
        }
      })
      .catch(() => {
        if (!canceled) {
          setAddress('');
        }
      });

    return () => {
      canceled = true;
    };
  }, [sessionKey]);

  return address ? formatAddress(address, 6) : fallback;
}

async function sessionKeyToAddress(sessionKey: unknown): Promise<string> {
  const publicKey = extractSessionPublicKey(sessionKey);
  if (!publicKey) {
    return '';
  }
  return publicKeyToAddress(publicKey, 'g');
}

function extractSessionPublicKey(sessionKey: unknown): Uint8Array | null {
  const direct = bytesFromUnknown(sessionKey);
  if (direct && isLikelySecp256k1PublicKey(direct)) {
    return direct;
  }

  const record = isRecord(sessionKey) ? sessionKey : null;
  const keyBytes = bytesFromUnknown(record?.key);
  if (keyBytes && isLikelySecp256k1PublicKey(keyBytes)) {
    return keyBytes;
  }

  const valueBytes = bytesFromUnknown(record?.value);
  if (!valueBytes) {
    return null;
  }

  try {
    const decoded = PubKeySecp256k1.decode(valueBytes);
    if (decoded.key && isLikelySecp256k1PublicKey(decoded.key)) {
      return decoded.key;
    }
  } catch {
    if (isLikelySecp256k1PublicKey(valueBytes)) {
      return valueBytes;
    }
  }

  return null;
}

function bytesFromUnknown(value: unknown): Uint8Array | null {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (Array.isArray(value) && value.every(isByteNumber)) {
    return Uint8Array.from(value);
  }

  if (typeof value === 'string') {
    return bytesFromBase64(value);
  }

  if (isRecord(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0 || !keys.every((key) => /^\d+$/.test(key))) {
      return null;
    }

    const sortedKeys = keys.sort((a, b) => Number(a) - Number(b));
    const values = sortedKeys.map((key) => value[key]);
    if (!values.every(isByteNumber)) {
      return null;
    }
    return Uint8Array.from(values);
  }

  return null;
}

function bytesFromBase64(value: string): Uint8Array | null {
  if (typeof atob !== 'function') {
    return null;
  }

  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

function isLikelySecp256k1PublicKey(value: Uint8Array): boolean {
  return value.length === 33 || value.length === 65;
}

function isByteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 255;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function formatSessionAddress(value: unknown): string {
  return typeof value === 'string' ? formatAddress(value, 6) : formatUnknownValue(value);
}

function formatUnknownValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const longLikeValue = formatLongLikeValue(value);
  if (longLikeValue !== null) {
    return longLikeValue;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'object' && 'toString' in value) {
    const rendered = String(value);
    return rendered === '[object Object]' ? formatCompactValue(value) : rendered;
  }

  return formatCompactValue(value);
}

function formatLongLikeValue(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const low = value.low;
  const high = value.high;
  const unsigned = value.unsigned;

  if (!Number.isInteger(low) || !Number.isInteger(high)) {
    return null;
  }

  try {
    return Long.fromValue({
      low: low as number,
      high: high as number,
      unsigned: unsigned === true,
    }).toString();
  } catch {
    return null;
  }
}

function formatCompactValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  let rendered = '';
  if (typeof value === 'string') {
    rendered = value;
  } else {
    try {
      rendered = JSON.stringify(value);
    } catch {
      rendered = String(value);
    }
  }

  if (!rendered) {
    return '';
  }

  return rendered.length > 24 ? `${rendered.slice(0, 10)}...${rendered.slice(-8)}` : rendered;
}

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
