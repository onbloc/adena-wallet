import { GNOT_TOKEN } from '@common/constants/token.constant';
import { parseTokenAmount } from '@common/utils/amount-utils';
import { formatAddress } from '@common/utils/client-utils';
import { TransactionInfo } from '@types';
import {
  AddPackageValue,
  BankSendValue,
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

export function mapSendTransactionByBankMsgSend(
  tx: TransactionResponse<BankSendValue>,
): TransactionInfo {
  const firstMessage = tx.messages[0];
  return {
    hash: tx.hash,
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
): TransactionInfo {
  const firstMessage = tx.messages?.[0];
  return {
    hash: tx.hash,
    height: tx.block_height,
    logo: firstMessage.value.pkg_path || '',
    type: tx.messages.length === 1 ? 'TRANSFER' : 'MULTI_CONTRACT_CALL',
    status: tx.success ? 'SUCCESS' : 'FAIL',
    typeName: 'Receive',
    title: 'Receive',
    description: `From: ${formatAddress(firstMessage.value.caller || '')}`,
    extraInfo: tx.messages.length > 1 ? `+${tx.messages.length - 1}` : '',
    amount: {
      value: firstMessage.value.args?.[1] || '0',
      denom: firstMessage.value.pkg_path || '',
    },
    to: formatAddress(firstMessage.value.caller || '', 4),
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

export function mapReceivedTransactionByBankMsgSend(
  tx: TransactionResponse<BankSendValue>,
): TransactionInfo {
  const firstMessage = tx.messages[0];
  return {
    hash: tx.hash,
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
): TransactionInfo {
  const firstMessage = tx.messages[0];

  if (tx.messages.length > 1) {
    const isAddPackage = firstMessage.value?.__typename === 'MsgAddPackage';
    const messageValue: any = firstMessage.value;
    return {
      hash: tx.hash,
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

  if (firstMessage.value.__typename === 'MsgAddPackage') {
    return {
      hash: tx.hash,
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

  if (firstMessage.value.__typename === 'MsgCall') {
    const messageValue = firstMessage.value as MsgCallValue;
    const isTransfer = messageValue.func === 'Transfer';

    const fromAddress = messageValue.caller || '';
    const toAddress = messageValue.args?.[0] || '';
    const sendAmount = messageValue.args?.[1] || '0';

    if (isTransfer) {
      return {
        hash: tx.hash,
        height: tx.block_height,
        logo: '',
        type: 'TRANSFER',
        status: tx.success ? 'SUCCESS' : 'FAIL',
        typeName: 'Send',
        title: 'Send',
        description: `To: ${formatAddress(toAddress)}`,
        amount: {
          value: sendAmount,
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
      hash: tx.hash,
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

  return {
    hash: tx.hash,
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
