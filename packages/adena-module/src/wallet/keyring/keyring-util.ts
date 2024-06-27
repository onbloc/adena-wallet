import { AddressKeyring } from './address-keyring';
import { HDWalletKeyring } from './hd-wallet-keyring';
import { Keyring } from './keyring';
import { LedgerKeyring } from './ledger-keyring';
import { PrivateKeyKeyring } from './private-key-keyring';
import { Web3AuthKeyring } from './web3-auth-keyring';
import { Tx, Wallet as Tm2Wallet } from '@gnolang/tm2-js-client';
import { Wallet as Tm2WalletLegacy } from '@gnolang/tm2-js-client-legacy';
import { Document, documentToTx, decodeTxMessages } from './../../utils/messages';
import {
  documentToTx as documentToTxLegacy,
  decodeTxMessages as decodeTxMessagesLegacy,
} from './../../utils/messages-legacy';

const LEGACY_NETWORKS = ['test3'];

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

export function useTm2Wallet(document: Document): typeof Tm2Wallet | typeof Tm2WalletLegacy {
  if (LEGACY_NETWORKS.includes(document.chain_id)) {
    return Tm2WalletLegacy;
  }
  return Tm2Wallet;
}

export function makeSignedTx(wallet: Tm2Wallet | Tm2WalletLegacy, document: Document): Promise<Tx> {
  const isLegacy = LEGACY_NETWORKS.includes(document.chain_id);
  const tx = isLegacy ? documentToTxLegacy(document) : documentToTx(document);
  const decodeTxMessageFunction = isLegacy ? decodeTxMessagesLegacy : decodeTxMessages;

  return wallet.signTransaction(tx, decodeTxMessageFunction);
}
