import { KeyringType } from '../keyring/keyring';
import { AirgapAccount } from './airgap-account';
import { LedgerAccount } from './ledger-account';
import { MultisigAccount, MultisigConfig, SignerPublicKeyInfo } from './multisig-account';
import { SeedAccount } from './seed-account';
import { SessionAccount } from './session-account';
import { SingleAccount } from './single-account';

export interface SessionConfig {
  masterAddress: string;
  chainId: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  expiresAt?: number;
  allowPaths?: string[];
  spendLimit?: string;
  spendPeriod?: number;
}

export interface Account {
  id: string;
  index: number;
  type: KeyringType;
  name: string;
  keyringId: string;
  publicKey: Uint8Array;
  toData: () => AccountInfo;
  getAddress: (prefix: string) => Promise<string>;
}

export interface AccountInfo {
  id?: string;
  index: number;
  type: KeyringType;
  name: string;
  keyringId: string;
  // hdPath is the BIP44 address index. account'/change default to 0 when the
  // optional fields below are absent, preserving pre-custom-path accounts.
  hdPath?: number;
  accountIndex?: number;
  changeIndex?: number;
  publicKey: number[];
  addressBytes?: number[];
  multisigConfig?: MultisigConfig;
  signerPublicKeys?: SignerPublicKeyInfo[];
  sessionConfig?: SessionConfig;
}

export function makeAccount(accountData: AccountInfo) {
  switch (accountData.type) {
    case 'HD_WALLET':
      return new SeedAccount(accountData);
    case 'LEDGER':
      return new LedgerAccount(accountData);
    case 'PRIVATE_KEY':
    case 'WEB3_AUTH':
      return new SingleAccount(accountData);
    case 'AIRGAP':
      return new AirgapAccount(accountData);
    case 'MULTISIG':
      return new MultisigAccount(accountData);
    case 'SESSION':
      return new SessionAccount(accountData);
    default:
      throw new Error('Invalid account type');
  }
}
