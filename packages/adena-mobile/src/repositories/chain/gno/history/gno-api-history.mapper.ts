import { fromBase64, toHex } from '@cosmjs/encoding';

import { Activity, ActivityAmount, ActivityDirection, ActivityStatus, ActivityType } from '../../../../domain/activity';
import { TransactionHistoryItem } from '../../../../infrastructure/http/onbloc-api.client';
import { stripTokenSequence } from '../gno-token-key';

const MESSAGE = {
  BANK_SEND: '/bank.MsgSend',
  VM_CALL: '/vm.m_call',
  VM_ADDPKG: '/vm.m_addpkg',
  VM_RUN: '/vm.m_run',
  SESSIONS: ['/auth.m_create_session', '/auth.m_revoke_session', '/auth.m_revoke_all_sessions'],
  PACKAGE_APPROVAL: ['/vm.m_enable_package', '/vm.m_reject_package'],
} as const;

// Older API deployments return base64 hashes.
export const toHexHash = (hash: string): string => {
  if (/^[0-9a-fA-F]{64}$/.test(hash)) {
    return hash.toLowerCase();
  }

  try {
    return toHex(fromBase64(hash));
  }
  catch {
    return hash;
  }
};

export const titleFromMessageType = (messageType?: string): string => {
  const segment = (messageType ?? '').split(/[./]/).filter(Boolean).pop()?.replace(/^m_/, '') ?? '';

  if (!segment) {
    return 'Contract Interaction';
  }

  return segment.split('_').filter(Boolean).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const toAmount = (amount?: { denom: string; value: string }, fallbackDenom = ''): ActivityAmount | undefined =>
  amount && (amount.value || amount.denom)
    ? { value: amount.value || '0', denom: stripTokenSequence(amount.denom || fallbackDenom) }
    : undefined;

// Mirrors the extension's TransactionHistoryMapper rule order.
export const mapApiHistoryItem = (item: TransactionHistoryItem, viewer: string): Activity => {
  const message = item.func?.[0];
  const messageType = message?.messageType ?? '';
  const functionTitle = message?.funcType || titleFromMessageType(messageType);
  const received = item.toAddress === viewer;
  const base = {
    hash: toHexHash(item.txHash),
    height: item.blockHeight,
    status: item.successYn ? ActivityStatus.SUCCESS : ActivityStatus.FAIL,
    networkFee: toAmount(item.fee),
    from: item.fromAddress || undefined,
    to: item.toAddress || undefined,
    timestamp: item.timestamp,
  } as const;

  if (item.messageCount > 1) {
    return {
      ...base,
      type: ActivityType.MULTI_CONTRACT_CALL,
      typeName: functionTitle,
      title: functionTitle,
      direction: received ? ActivityDirection.IN : ActivityDirection.NONE,
      extraInfo: `+${item.messageCount - 1}`,
    };
  }

  if (messageType === MESSAGE.BANK_SEND || item.isGRC20Transfer) {
    return {
      ...base,
      type: ActivityType.TRANSFER,
      typeName: received ? 'Receive' : 'Send',
      title: received ? 'Receive' : 'Send',
      direction: received ? ActivityDirection.IN : ActivityDirection.OUT,
      amount: toAmount(received ? item.amountIn : item.amountOut, 'ugnot'),
    };
  }

  if (messageType === MESSAGE.VM_CALL) {
    return {
      ...base,
      type: item.isGRC721Transfer ? 'TRANSFER_GRC721' : 'CONTRACT_CALL',
      typeName: 'Contract Interaction',
      title: functionTitle,
      direction: ActivityDirection.NONE,
      amount: toAmount(item.amountOut),
    };
  }

  if (messageType === MESSAGE.VM_ADDPKG) {
    return { ...base, type: ActivityType.ADD_PACKAGE, typeName: 'Add Package', title: 'AddPkg', direction: ActivityDirection.NONE };
  }

  if ((MESSAGE.SESSIONS as readonly string[]).includes(messageType)) {
    return { ...base, type: ActivityType.CONTRACT_CALL, typeName: 'Session Account', title: functionTitle, direction: ActivityDirection.NONE };
  }

  if ((MESSAGE.PACKAGE_APPROVAL as readonly string[]).includes(messageType)) {
    return { ...base, type: ActivityType.CONTRACT_CALL, typeName: 'Package Approval', title: functionTitle, direction: ActivityDirection.NONE };
  }

  if (messageType === MESSAGE.VM_RUN) {
    return { ...base, type: ActivityType.CONTRACT_CALL, typeName: 'Run', title: 'Run', direction: ActivityDirection.NONE, amount: toAmount(item.amountOut) };
  }

  return { ...base, type: ActivityType.CONTRACT_CALL, typeName: 'Contract Interaction', title: functionTitle, direction: ActivityDirection.NONE };
};
