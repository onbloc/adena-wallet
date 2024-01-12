import { Any, MsgAddPackage, MsgCall, MsgSend } from '@gnolang/gno-js-client';
import { AddressKeyring } from './address-keyring';
import { HDWalletKeyring } from './hd-wallet-keyring';
import { Keyring } from './keyring';
import { LedgerKeyring } from './ledger-keyring';
import { PrivateKeyKeyring } from './private-key-keyring';
import { Web3AuthKeyring } from './web3-auth-keyring';

export function isHDWalletKeyring(keyring: Keyring): keyring is HDWalletKeyring {
  return keyring.type === 'HD_WALLET';
}

export function isLedgerKeyring(keyring: Keyring): keyring is LedgerKeyring {
  return keyring.type === 'LEDGER';
}

export function isPrivateKeyKeyring(keyring: Keyring): keyring is PrivateKeyKeyring {
  return keyring.type === 'PRIVATE_KEY';
}

export function isWeb3AuthKeyring(keyring: Keyring): keyring is Web3AuthKeyring {
  return keyring.type === 'WEB3_AUTH';
}

export function isAddressKeyring(keyring: Keyring): keyring is AddressKeyring {
  return keyring.type === 'AIRGAP';
}

export function hasPrivateKey(
  keyring: Keyring,
): keyring is HDWalletKeyring | PrivateKeyKeyring | Web3AuthKeyring {
  if (isHDWalletKeyring(keyring)) {
    return true;
  }
  if (isPrivateKeyKeyring(keyring)) {
    return true;
  }
  if (isWeb3AuthKeyring(keyring)) {
    return true;
  }
  return false;
}

export enum MsgEndpoint {
  MSG_SEND = '/bank.MsgSend',
  MSG_ADD_PKG = '/vm.m_addpkg',
  MSG_CALL = '/vm.m_call',
}

export const decodeTxMessages = (messages: Any[]): any[] => {
  return messages.map((m: Any) => {
    switch (m.typeUrl) {
      case MsgEndpoint.MSG_CALL:
        return {
          '@type': m.typeUrl,
          ...MsgCall.decode(m.value),
        };
      case MsgEndpoint.MSG_SEND:
        return {
          '@type': m.typeUrl,
          ...MsgSend.decode(m.value),
        };
      case MsgEndpoint.MSG_ADD_PKG:
        return {
          '@type': m.typeUrl,
          ...MsgAddPackage.decode(m.value),
        };
      default:
        throw new Error(`unsupported message type ${m.typeUrl}`);
    }
  });
};
