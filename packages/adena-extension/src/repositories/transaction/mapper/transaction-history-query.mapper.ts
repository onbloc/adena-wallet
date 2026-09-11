import { GNOT_TOKEN } from '@common/constants/token.constant';
import { parseTokenAmount } from '@common/utils/amount-utils';
import { formatAddress } from '@common/utils/client-utils';
import { registryKeyToTokenPath } from '@common/utils/grc20-token-path';
import { Grc20TokenPackage, resolveGrc20TransferEvent } from '@common/utils/grc20reg-config';
import { toHexHash } from '@common/utils/hash-utils';
import { TransactionInfo } from '@types';
import {
  AddPackageValue,
  BankSendValue,
  Event,
  MsgCallValue,
  MsgRunValue,
  TransactionResponse,
} from '../response/transaction-history-query-response';

function mapValueType(success: boolean, received?: boolean): 'DEFAULT' | 'ACTIVE' | 'BLUR' {
  if (!success) {
    return 'BLUR';
  }
  if (received) {
    return 'ACTIVE';
  }
  return 'DEFAULT';
}

function getDefaultMessage<T = any>(
  messages: {
    value: any;
  }[],
): T {
  return messages.sort((m1, m2) => {
    if (m1.value?.func === 'Approve') {
      return 1;
    }
    if (m2.value?.func === 'Approve') {
      return -1;
    }
    return 0;
  })[0] as T;
}

// Per-chain GRC20 context: the helper realm (if any) and the grc20 packages
// with the transfer-event shape each of them emits.
export interface Grc20MapperContext {
  helperPath?: string;
  tokenPackages?: Grc20TokenPackage[];
}

// A GRC20 helper `Transfer(tokenKey, to, amount)` call (pkg_path === helperPath)
// shifts the transfer args by one versus a direct token `Transfer(to, amount)`.
// Detect it and expose the token path (from args[0]) plus the arg offset so the
// downstream mapping reads to/amount from the right positions and identifies the
// token by its token path instead of the helper realm. Used only as a fallback
// when the transaction carries no GRC20 Transfer event.
function resolveTransferShape(
  messageValue: MsgCallValue,
  helperPath?: string,
): { tokenPath: string | null; argOffset: number } {
  const isHelperTransfer =
    !!helperPath && messageValue.func === 'Transfer' && messageValue.pkg_path === helperPath;
  if (!isHelperTransfer) {
    return { tokenPath: null, argOffset: 0 };
  }
  return {
    tokenPath: registryKeyToTokenPath(messageValue.args?.[0] || ''),
    argOffset: 1,
  };
}

// Every GRC20 transfer — direct, helper-routed, or MsgRun — emits the same
// `Transfer` event carrying `token` (Token.ID() = `{packagePath}.{symbol}.{sequence}`),
// `from`, `to`, and `value` (attribute keys per emitting package version).
// Reading the token identity and amount from the event is invocation-independent,
// so prefer it over parsing message args.
//
// GRC721 emits a `Transfer` carrying `token` too, but describes the item with
// `tokenId` instead of `value`, so `value` is what separates the two.
//
// One transaction can emit several transfers (e.g. a swap), so the first is not
// necessarily the interesting one: `tokenKey` picks the token whose history is
// being read, and `viewerAddress` picks the transfer the account took part in.
function attrOf(event: Event, key: string): string {
  return (event.attrs || []).find((a) => a.key === key)?.value || '';
}

interface DecodedGRC20Transfer {
  tokenId: string;
  from: string;
  to: string;
  value: string;
}

function decodeGRC20TransferEvent(
  event: Event,
  tokenPackages?: Grc20TokenPackage[],
): DecodedGRC20Transfer | null {
  const schema = resolveGrc20TransferEvent(event?.pkg_path, tokenPackages);
  if (event?.type !== schema.type) {
    return null;
  }
  const tokenId = attrOf(event, schema.tokenAttr);
  const hasValue = (event.attrs || []).some((a) => a.key === schema.valueAttr);
  if (!tokenId || !hasValue) {
    return null;
  }
  return {
    tokenId,
    from: attrOf(event, schema.fromAttr),
    to: attrOf(event, schema.toAttr),
    value: attrOf(event, schema.valueAttr),
  };
}

/** True when the transaction moves a GRC20 token to `address`. */
export function hasGRC20TransferTo(
  tx: TransactionResponse<any>,
  address: string,
  tokenPackages?: Grc20TokenPackage[],
): boolean {
  const events: Event[] = tx?.response?.events || [];
  return events.some((event) => decodeGRC20TransferEvent(event, tokenPackages)?.to === address);
}

function getGRC20TransferFromEvent(
  tx: TransactionResponse<any>,
  options?: { tokenKey?: string; viewerAddress?: string; tokenPackages?: Grc20TokenPackage[] },
): { tokenPath: string | null; from: string; to: string; value: string } | null {
  const events: Event[] = tx?.response?.events || [];
  const grc20Events = events
    .map((event) => decodeGRC20TransferEvent(event, options?.tokenPackages))
    .filter((decoded): decoded is DecodedGRC20Transfer => decoded !== null);

  const tokenKey = options?.tokenKey;
  const viewerAddress = options?.viewerAddress;
  const transferEvent =
    (tokenKey
      ? grc20Events.find((event) => event.tokenId.startsWith(`${tokenKey}.`))
      : undefined) ??
    (viewerAddress
      ? grc20Events.find((event) => event.from === viewerAddress || event.to === viewerAddress)
      : undefined) ??
    (!tokenKey ? grc20Events[0] : undefined);
  if (!transferEvent) {
    return null;
  }

  // token = `{packagePath}.{symbol}.{sequence}`; drop the trailing `.{sequence}`.
  const { tokenId } = transferEvent;
  const registryKey = tokenId.slice(0, tokenId.lastIndexOf('.'));
  return {
    tokenPath: registryKeyToTokenPath(registryKey) ?? registryKeyToTokenPath(tokenId),
    from: transferEvent.from,
    to: transferEvent.to,
    value: transferEvent.value,
  };
}

export function mapTransactionEdgeByAddress(
  transaction: TransactionResponse<any>,
  address: string,
  grc20?: Grc20MapperContext,
): TransactionInfo {
  if (!transaction?.messages?.length || transaction?.messages?.length > 1) {
    return mapVMTransaction(transaction, grc20, undefined, address);
  }

  const message = transaction.messages[0];
  switch (message.typeUrl) {
    case 'send':
      // send native token
      if (message.value.from_address === address) {
        return mapSendTransactionByBankMsgSend(transaction);
      }
      // receive native token
      return mapReceivedTransactionByBankMsgSend(transaction);
    case 'exec':
      // receive grc20 or grc721 token
      if (
        ['Transfer', 'TransferFrom'].includes(message.value.func) &&
        message.value.caller !== address
      ) {
        return mapReceivedTransactionByMsgCall(transaction, grc20, undefined, address);
      }
      return mapVMTransaction(transaction, grc20, undefined, address);
    default:
      return mapVMTransaction(transaction, grc20, undefined, address);
  }
}

export function mapSendTransactionByBankMsgSend(
  tx: TransactionResponse<BankSendValue>,
): TransactionInfo {
  const firstMessage = getDefaultMessage(tx.messages);
  return {
    hash: toHexHash(tx.hash),
    height: tx.block_height,
    logo: GNOT_TOKEN.denom,
    type: tx.messages.length === 1 ? 'TRANSFER' : 'MULTI_CONTRACT_CALL',
    status: tx.success ? 'SUCCESS' : 'FAIL',
    typeName: 'Send',
    title: 'Send',
    description: `To: ${formatAddress(firstMessage.value.to_address)}`,
    extraInfo: tx.messages.length > 1 ? `+${tx.messages.length - 1}` : '',
    amount: {
      value: parseTokenAmount(firstMessage.value.amount).toString(),
      denom: GNOT_TOKEN.denom,
    },
    valueType: mapValueType(tx.success),
    date: '',
    from: formatAddress(firstMessage.value.from_address),
    originFrom: firstMessage.value.from_address,
    to: formatAddress(firstMessage.value.to_address),
    originTo: firstMessage.value.to_address,
    networkFee: {
      value: tx.gas_fee.amount.toString(),
      denom: tx.gas_fee.denom,
    },
  };
}

export function mapReceivedTransactionByMsgCall(
  tx: TransactionResponse<MsgCallValue>,
  grc20?: Grc20MapperContext,
  tokenKey?: string,
  viewerAddress?: string,
): TransactionInfo {
  const firstMessage = getDefaultMessage(tx.messages);
  if (firstMessage.value.func === 'TransferFrom' && tx.messages.length === 1) {
    return {
      hash: toHexHash(tx.hash),
      height: tx.block_height,
      logo: firstMessage.value.pkg_path || '',
      type: 'TRANSFER_GRC721',
      status: tx.success ? 'SUCCESS' : 'FAIL',
      typeName: 'Receive',
      title: 'Receive',
      description: `From: ${formatAddress(firstMessage.value.caller || '')}`,
      extraInfo: tx.messages.length > 1 ? `+${tx.messages.length - 1}` : '',
      amount: {
        value: firstMessage.value.args?.[2] || '0',
        denom: firstMessage.value.pkg_path || '',
      },
      to: formatAddress(firstMessage.value.args?.[1] || '', 4),
      from: formatAddress(firstMessage.value.args?.[0] || '', 4),
      originTo: firstMessage.value.caller || '',
      originFrom: firstMessage.value.args?.[0] || '',
      valueType: mapValueType(tx.success, true),
      date: '',
      networkFee: {
        value: `${tx.gas_fee.amount || '0'}`,
        denom: `${tx.gas_fee.denom}`,
      },
    };
  }

  // Prefer the GRC20 Transfer event (token/from/to/value); fall back to parsing
  // message args (with the helper arg offset) when it is absent.
  const eventInfo = getGRC20TransferFromEvent(tx, {
    tokenKey,
    viewerAddress,
    tokenPackages: grc20?.tokenPackages,
  });
  const { tokenPath, argOffset } = resolveTransferShape(firstMessage.value, grc20?.helperPath);
  const senderAddress = eventInfo?.from || firstMessage.value.caller || '';
  const receiveAmount = eventInfo?.value || firstMessage.value.args?.[argOffset + 1] || '0';
  const denom = eventInfo?.tokenPath ?? tokenPath ?? (firstMessage.value.pkg_path || '');

  return {
    hash: toHexHash(tx.hash),
    height: tx.block_height,
    logo: denom,
    type: tx.messages.length === 1 ? 'TRANSFER' : 'MULTI_CONTRACT_CALL',
    status: tx.success ? 'SUCCESS' : 'FAIL',
    typeName: 'Receive',
    title: 'Receive',
    description: `From: ${formatAddress(senderAddress)}`,
    extraInfo: tx.messages.length > 1 ? `+${tx.messages.length - 1}` : '',
    amount: {
      value: receiveAmount,
      denom,
    },
    to: formatAddress(eventInfo?.to || firstMessage.value.caller || '', 4),
    from: formatAddress(senderAddress, 4),
    originTo: eventInfo?.to || firstMessage.value.caller || '',
    originFrom: senderAddress,
    valueType: mapValueType(tx.success, true),
    date: '',
    networkFee: {
      value: `${tx.gas_fee.amount || '0'}`,
      denom: `${tx.gas_fee.denom}`,
    },
  };
}

export function mapReceivedTransactionByBankMsgSend(
  tx: TransactionResponse<BankSendValue>,
): TransactionInfo {
  const firstMessage = getDefaultMessage(tx.messages);
  return {
    hash: toHexHash(tx.hash),
    height: tx.block_height,
    logo: GNOT_TOKEN.denom,
    type: tx.messages.length === 1 ? 'TRANSFER' : 'MULTI_CONTRACT_CALL',
    status: tx.success ? 'SUCCESS' : 'FAIL',
    typeName: 'Receive',
    title: 'Receive',
    description: `From: ${formatAddress(firstMessage.value.to_address)}`,
    extraInfo: tx.messages.length > 1 ? `+${tx.messages.length - 1}` : '',
    amount: {
      value: parseTokenAmount(firstMessage.value.amount).toString(),
      denom: GNOT_TOKEN.denom,
    },
    valueType: mapValueType(tx.success, false),
    date: '',
    from: formatAddress(firstMessage.value.from_address),
    originFrom: firstMessage.value.from_address,
    to: formatAddress(firstMessage.value.to_address),
    originTo: firstMessage.value.to_address,
    networkFee: {
      value: tx.gas_fee.amount.toString(),
      denom: tx.gas_fee.denom,
    },
  };
}

export function mapVMTransaction(
  tx: TransactionResponse<AddPackageValue | MsgRunValue | MsgCallValue>,
  grc20?: Grc20MapperContext,
  tokenKey?: string,
  viewerAddress?: string,
): TransactionInfo {
  const firstMessage = getDefaultMessage(tx.messages);

  if (tx.messages.length > 1) {
    const isAddPackage = isAddPackageValue(firstMessage.value);
    const messageValue: any = firstMessage.value;
    return {
      hash: toHexHash(tx.hash),
      height: tx.block_height,
      logo: '',
      type: 'MULTI_CONTRACT_CALL',
      status: tx.success ? 'SUCCESS' : 'FAIL',
      typeName: isAddPackage ? 'Add Package' : messageValue?.func || '',
      title: isAddPackage ? 'AddPkg' : messageValue?.func || '',
      extraInfo: `+${tx.messages.length - 1}`,
      amount: {
        value: '',
        denom: '',
      },
      to: undefined,
      from: undefined,
      originTo: '',
      originFrom: '',
      valueType: mapValueType(tx.success),
      date: '',
      networkFee: {
        value: `${tx.gas_fee.amount || '0'}`,
        denom: `${tx.gas_fee.denom}`,
      },
    };
  }

  if (firstMessage.value === 'MsgAddPackage') {
    return {
      hash: toHexHash(tx.hash),
      height: tx.block_height,
      logo: '',
      type: 'ADD_PACKAGE',
      status: tx.success ? 'SUCCESS' : 'FAIL',
      typeName: 'Add Package',
      title: 'AddPkg',
      extraInfo: tx.messages.length > 1 ? `+${tx.messages.length - 1}` : '',
      amount: {
        value: '0',
        denom: GNOT_TOKEN.denom,
      },
      valueType: mapValueType(tx.success),
      date: '',
      networkFee: {
        value: `${tx.gas_fee.amount || '0'}`,
        denom: `${tx.gas_fee.denom}`,
      },
    };
  }

  if (isMsgCallValue(firstMessage.value)) {
    const messageValue = firstMessage.value as MsgCallValue;
    const isTransfer = messageValue.func === 'Transfer';
    const isTransferGRC721 = messageValue.func === 'TransferFrom';

    if (isTransfer) {
      // Prefer the GRC20 Transfer event (token/from/to/value); fall back to
      // parsing message args (with the helper arg offset) when it is absent.
      const eventInfo = getGRC20TransferFromEvent(tx, {
        tokenKey,
        viewerAddress,
        tokenPackages: grc20?.tokenPackages,
      });
      const { tokenPath, argOffset } = resolveTransferShape(messageValue, grc20?.helperPath);
      const fromAddress = eventInfo?.from || messageValue.caller || '';
      const toAddress = eventInfo?.to || messageValue.args?.[argOffset] || '';
      const sendAmount = eventInfo?.value || messageValue.args?.[argOffset + 1] || '0';
      const denom = eventInfo?.tokenPath ?? tokenPath ?? (messageValue.pkg_path || '');

      return {
        hash: toHexHash(tx.hash),
        height: tx.block_height,
        logo: denom,
        type: 'TRANSFER',
        status: tx.success ? 'SUCCESS' : 'FAIL',
        typeName: 'Send',
        title: 'Send',
        description: `To: ${formatAddress(toAddress)}`,
        amount: {
          value: sendAmount,
          denom,
        },
        valueType: mapValueType(tx.success),
        date: '',
        from: formatAddress(fromAddress),
        originFrom: fromAddress,
        to: formatAddress(toAddress),
        originTo: toAddress,
        networkFee: {
          value: tx.gas_fee.amount.toString(),
          denom: tx.gas_fee.denom,
        },
      };
    }

    if (isTransferGRC721) {
      const fromAddress = messageValue.args?.[0] || '';
      const toAddress = messageValue.args?.[1] || '';

      return {
        hash: toHexHash(tx.hash),
        height: tx.block_height,
        logo: firstMessage.value.pkg_path || '',
        type: 'TRANSFER_GRC721',
        status: tx.success ? 'SUCCESS' : 'FAIL',
        typeName: 'Send',
        title: 'Send',
        description: `To: ${formatAddress(toAddress)}`,
        amount: {
          value: messageValue.args?.[2] || '0',
          denom: messageValue.pkg_path || '',
        },
        valueType: mapValueType(tx.success),
        date: '',
        from: formatAddress(fromAddress),
        originFrom: fromAddress,
        to: formatAddress(toAddress),
        originTo: toAddress,
        networkFee: {
          value: tx.gas_fee.amount.toString(),
          denom: tx.gas_fee.denom,
        },
      };
    }

    return {
      hash: toHexHash(tx.hash),
      height: tx.block_height,
      logo: '',
      type: 'CONTRACT_CALL',
      status: tx.success ? 'SUCCESS' : 'FAIL',
      typeName: 'Contract Interaction',
      title: messageValue.func || '',
      amount: {
        value: messageValue.send ? parseTokenAmount(messageValue.send).toString() : '0',
        denom: GNOT_TOKEN.denom,
      },
      valueType: mapValueType(tx.success),
      date: '',
      networkFee: {
        value: `${tx.gas_fee.amount || '0'}`,
        denom: `${tx.gas_fee.denom}`,
      },
    };
  }

  // MsgRun: a GRC20 transfer routed through the registry's non-crossing
  // `Transfer(0, cur, tokenKey, to, amount)` wrapper (the path taken when the
  // chain has no GRC20 helper realm) carries no func/args, so the emitted
  // Transfer event is the only description of what moved.
  const runTransfer = getGRC20TransferFromEvent(tx, { tokenKey, viewerAddress });
  if (runTransfer?.tokenPath) {
    const fromAddress = runTransfer.from || (firstMessage.value as MsgRunValue).caller || '';
    // The event names both parties, so the direction is only known once the
    // viewer is: the same transaction is a send for one side and a receive for
    // the other.
    const isReceive =
      !!viewerAddress && runTransfer.to === viewerAddress && runTransfer.from !== viewerAddress;

    return {
      hash: toHexHash(tx.hash),
      height: tx.block_height,
      logo: runTransfer.tokenPath,
      type: 'TRANSFER',
      status: tx.success ? 'SUCCESS' : 'FAIL',
      typeName: isReceive ? 'Receive' : 'Send',
      title: isReceive ? 'Receive' : 'Send',
      description: isReceive
        ? `From: ${formatAddress(fromAddress)}`
        : `To: ${formatAddress(runTransfer.to)}`,
      amount: {
        value: runTransfer.value || '0',
        denom: runTransfer.tokenPath,
      },
      valueType: mapValueType(tx.success, isReceive),
      date: '',
      from: formatAddress(fromAddress),
      originFrom: fromAddress,
      to: formatAddress(runTransfer.to),
      originTo: runTransfer.to,
      networkFee: {
        value: `${tx.gas_fee.amount || '0'}`,
        denom: `${tx.gas_fee.denom}`,
      },
    };
  }

  return {
    hash: toHexHash(tx.hash),
    height: tx.block_height,
    logo: '',
    type: 'CONTRACT_CALL',
    status: tx.success ? 'SUCCESS' : 'FAIL',
    typeName: 'Contract Interaction',
    title: 'Message Run',
    amount: {
      value: '0',
      denom: GNOT_TOKEN.denom,
    },
    valueType: mapValueType(tx.success),
    date: '',
    networkFee: {
      value: `${tx.gas_fee.amount || '0'}`,
      denom: `${tx.gas_fee.denom}`,
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isAddPackageValue(value: any): value is AddPackageValue {
  return value.creator !== undefined && value.package !== undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isMsgCallValue(value: any): value is MsgCallValue {
  return value.caller !== undefined && value.pkg_path !== undefined;
}
