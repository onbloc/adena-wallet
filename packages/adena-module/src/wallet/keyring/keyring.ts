import { HDWalletKeyring } from './hd-wallet-keyring';
import { LedgerKeyring } from './ledger-keyring';
import { PrivateKeyKeyring } from './private-key-keyring';
import { Web3AuthKeyring } from './web3-auth-keyring';
import { StdSignDoc, StdSignature } from '../../amino';

export type KeyringType = 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH';

export interface Keyring {
  id: string;
  type: KeyringType;
  toData: () => KeyringData;
  sign: (
    document: StdSignDoc,
    hdPath?: number,
  ) => Promise<{
    signed: StdSignDoc;
    signature: StdSignature;
  }>;
}

export interface KeyringData {
  id?: string;
  type?: KeyringType;
  publicKey?: number[];
  privateKey?: number[];
  seed?: number[];
  mnemonic?: string;
}

export function makeKeyring(keyringData: KeyringData) {
  switch (keyringData.type) {
    case 'HD_WALLET':
      return new HDWalletKeyring(keyringData);
    case 'LEDGER':
      return new LedgerKeyring(keyringData);
    case 'PRIVATE_KEY':
      return new PrivateKeyKeyring(keyringData);
    case 'WEB3_AUTH':
      return new Web3AuthKeyring(keyringData);
    default:
      throw new Error('Invalid Account type');
  }
}
