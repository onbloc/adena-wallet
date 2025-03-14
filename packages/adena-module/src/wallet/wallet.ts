import { LedgerConnector } from '@cosmjs/ledger-amino';
import {
  BroadcastTxCommitResult,
  BroadcastTxSyncResult,
  Provider,
  Tx,
  TxSignature,
} from '@gnolang/tm2-js-client';

import { Bip39, Random } from '../crypto';
import { arrayContentEquals, arrayToHex, hexToArray } from '../utils';
import { Document } from './..';
import {
  Account,
  AccountInfo,
  AirgapAccount,
  hasHDPath,
  isLedgerAccount,
  isSeedAccount,
  LedgerAccount,
  makeAccount,
  SeedAccount,
  SingleAccount,
} from './account';
import {
  AddressKeyring,
  hasPrivateKey,
  HDWalletKeyring,
  isHDWalletKeyring,
  isLedgerKeyring,
  isPrivateKeyKeyring,
  Keyring,
  KeyringData,
  LedgerKeyring,
  makeKeyring,
  Web3AuthKeyring,
} from './keyring';
import { decryptAES, encryptAES } from './wallet-crypto-util';

export interface Wallet {
  accounts: Account[];
  keyrings: Keyring[];
  currentAccount: Account;
  currentKeyring: Keyring;
  defaultHDWalletKeyring: HDWalletKeyring | null;
  nextAccountName: string;
  nextLedgerAccountName: string;
  lastAccountIndex: number;
  lastLedgerAccountIndex: number;

  addAccount: (account: Account) => number;
  removeAccount: (account: Account) => boolean;
  getPrivateKeyStr(): Promise<string>;
  getMnemonic: () => string;
  getNextHDPathBy: (keyring: Keyring) => number;
  getNextAccountIndexBy: (keyring: Keyring) => number;
  getNextAccountNumberBy: (keyring: Keyring) => number;
  getLastAccountIndexBy: (keyring: Keyring) => number;
  isEmpty: () => boolean;
  hasHDWallet: () => boolean;
  hasKeyring: (keyring: Keyring) => boolean;
  hasPrivateKey: (privateKey: Uint8Array) => boolean;
  sign: (
    provider: Provider,
    document: Document,
  ) => Promise<{
    signed: Tx;
    signature: TxSignature[];
  }>;
  signByAccountId: (
    provider: Provider,
    accountId: string,
    document: Document,
  ) => Promise<{
    signed: Tx;
    signature: TxSignature[];
  }>;
  broadcastTxSync: (
    provider: Provider,
    accountId: string,
    tx: Tx,
  ) => Promise<BroadcastTxSyncResult>;
  broadcastTxCommit: (
    provider: Provider,
    accountId: string,
    tx: Tx,
  ) => Promise<BroadcastTxCommitResult>;
  serialize: (password: string) => Promise<string>;
  clone: () => AdenaWallet;
}
export interface WalletData {
  accounts: AccountInfo[];
  keyrings: KeyringData[];
  currentAccountId?: string;
}

const defaultWalletData: WalletData = {
  accounts: [] as AccountInfo[],
  keyrings: [] as KeyringData[],
};

/**
 * AdenaWallet class provides functionalities for managing accounts, keyrings, and transactions
 * in the Adena wallet ecosystem. It supports various account types and enables operations such
 * as signing transactions, broadcasting them, serialization/deserialization, and wallet creation
 * using different methods (e.g., mnemonic, ledger, Web3Auth).
 */
export class AdenaWallet implements Wallet {
  // Private field for storing account information
  private _accounts: Account[];

  // Private field for storing keyring information
  private _keyrings: Keyring[];

  // Private field for the current account's ID
  private _currentAccountId: string | undefined;

  constructor(walletData?: WalletData) {
    const { accounts, keyrings, currentAccountId } = walletData ?? defaultWalletData;
    this._accounts = accounts.map(makeAccount);
    this._keyrings = keyrings.map(makeKeyring);
    this._currentAccountId = currentAccountId;
  }

  get accounts() {
    return this._accounts;
  }

  get keyrings() {
    return this._keyrings;
  }

  get currentAccount() {
    const currentAccount = this._accounts.find((account) => account.id === this._currentAccountId);
    if (!currentAccount) {
      throw new Error('Current account not found');
    }
    return currentAccount;
  }

  get currentKeyring() {
    const currentKeyringId = this.currentAccount.keyringId;
    const currentKeyring = this._keyrings.find((keyring) => keyring.id === currentKeyringId);
    if (!currentKeyring) {
      throw new Error('Current keyring not found');
    }
    return currentKeyring;
  }

  get nextAccountName() {
    const nextIndex = this.lastAccountIndex + 1;
    return `Account ${nextIndex}`;
  }

  get nextLedgerAccountName() {
    const nextIndex = this.lastLedgerAccountIndex + 1;
    return `Ledger ${nextIndex}`;
  }

  set currentAccountId(currentAccountId: string) {
    this._currentAccountId = currentAccountId;
  }

  get defaultHDWalletKeyring() {
    return this._keyrings.filter(isHDWalletKeyring).find((_, index) => index === 0) || null;
  }

  get lastAccountIndex() {
    const indices = this.accounts
      .filter((account) => !isLedgerAccount(account))
      .map((account) => account.index);
    return Math.max(0, ...indices);
  }

  get lastLedgerAccountIndex() {
    const indices = this.accounts.filter(isLedgerAccount).map((account) => account.index);
    return Math.max(0, ...indices);
  }

  isEmpty() {
    return this._accounts.length === 0;
  }

  hasHDWallet() {
    return !!this._keyrings.find(isHDWalletKeyring);
  }

  hasKeyring(keyring: Keyring) {
    if (isPrivateKeyKeyring(keyring)) {
      return this._keyrings.some((k) => {
        if (!isPrivateKeyKeyring(k)) {
          return false;
        }
        return arrayContentEquals(keyring.privateKey, k.privateKey);
      });
    }

    if (isHDWalletKeyring(keyring)) {
      return this._keyrings.some((k) => {
        if (!isHDWalletKeyring(k)) {
          return false;
        }
        return keyring.mnemonicEntropy === k.mnemonicEntropy;
      });
    }

    return this._keyrings.some((k) => {
      return keyring.id === k.id;
    });
  }

  hasPrivateKey(privateKey: Uint8Array) {
    const keyring = this._keyrings
      .filter(isPrivateKeyKeyring)
      .find((keyring) => JSON.stringify(keyring.privateKey) === JSON.stringify(privateKey));
    return keyring !== undefined;
  }

  async getPrivateKeyStr() {
    const privateKey = await this.getPrivateKey();
    return arrayToHex(privateKey);
  }

  getMnemonic() {
    if (!isHDWalletKeyring(this.currentKeyring)) {
      throw new Error('Mnemonic words not found');
    }
    return this.currentKeyring.getMnemonic();
  }

  getLastAccountIndexBy(keyring: Keyring) {
    const indices = this.accounts
      .filter((account) => account.keyringId === keyring.id)
      .map((account) => account.index);
    return Math.max(0, ...indices);
  }

  getNextAccountIndexBy(keyring: Keyring) {
    if (isLedgerKeyring(keyring)) {
      return this.lastLedgerAccountIndex + 1;
    }

    return this.lastAccountIndex + 1;
  }

  getNextAccountNumberBy(keyring: Keyring) {
    return this.getNextAccountIndexBy(keyring);
  }

  getNextHDPathBy(keyring: Keyring) {
    if (!isHDWalletKeyring(keyring)) {
      throw new Error('The current keyring is not an HD Wallet Keyring');
    }

    const seedAccounts = this.accounts
      .filter((account) => account.keyringId === keyring.id)
      .filter(isSeedAccount);
    if (seedAccounts.length === 0) {
      return 0;
    }

    const lastHdPath = seedAccounts.reduce((account1, account2) =>
      account1.hdPath > account2.hdPath ? account1 : account2,
    ).hdPath;

    for (let index = 0; index < lastHdPath; index += 1) {
      if (!seedAccounts.find((account) => account.hdPath === index)) {
        return index;
      }
    }
    return lastHdPath + 1;
  }

  addAccount(account: Account) {
    if (this._accounts.find((_account) => _account.id === account.id)) {
      return this._accounts.length;
    }
    return this._accounts.push(account);
  }

  removeAccount(removedAccount: Account) {
    const filteredAccounts = this._accounts.filter((account) => account.id !== removedAccount.id);
    this._accounts = filteredAccounts;

    const removedKeyringId = removedAccount.keyringId;
    const keyringUsedCount = filteredAccounts.filter(
      (account) => account.keyringId === removedKeyringId,
    ).length;
    if (keyringUsedCount === 0) {
      const filteredKeyrings = this._keyrings.filter((keyring) => keyring.id !== removedKeyringId);
      this._keyrings = filteredKeyrings;
    }
    return true;
  }

  addKeyring(keyring: Keyring) {
    if (this._keyrings.find((_keyring) => _keyring.id === keyring.id)) {
      return this._keyrings.length;
    }
    return this._keyrings.push(keyring);
  }

  async getPrivateKey() {
    if (!hasPrivateKey(this.currentKeyring)) {
      throw new Error('Current account does not have a private key');
    }
    if (isHDWalletKeyring(this.currentKeyring)) {
      if (this.currentAccount instanceof SeedAccount) {
        return this.currentKeyring.getPrivateKey(this.currentAccount.hdPath);
      }
      throw new Error('Problems with account types');
    }
    return this.currentKeyring.privateKey;
  }

  async sign(provider: Provider, document: Document) {
    return this.signByAccountId(provider, this.currentAccount.id, document);
  }

  async signByAccountId(provider: Provider, accountId: string, document: Document) {
    const account = this._accounts.find((account) => account.id === accountId);
    if (!account) {
      throw new Error('Account not found');
    }
    const keyring = this._keyrings.find((keyring) => keyring.id === account.keyringId);
    if (!keyring) {
      throw new Error('Keyring not found');
    }
    if (hasHDPath(account)) {
      return keyring.sign(provider, document, account.hdPath);
    }
    return keyring.sign(provider, document);
  }

  async broadcastTxSync(provider: Provider, accountId: string, signedTx: Tx) {
    const account = this._accounts.find((account) => account.id === accountId);
    if (!account) {
      throw new Error('Account not found');
    }
    const keyring = this._keyrings.find((keyring) => keyring.id === account.keyringId);
    if (!keyring) {
      throw new Error('Keyring not found');
    }
    if (hasHDPath(account)) {
      return keyring.broadcastTxSync(provider, signedTx, account.hdPath);
    }
    return keyring.broadcastTxSync(provider, signedTx);
  }

  async broadcastTxCommit(provider: Provider, accountId: string, signedTx: Tx) {
    const account = this._accounts.find((account) => account.id === accountId);
    if (!account) {
      throw new Error('Account not found');
    }
    const keyring = this._keyrings.find((keyring) => keyring.id === account.keyringId);
    if (!keyring) {
      throw new Error('Keyring not found');
    }
    if (hasHDPath(account)) {
      return keyring.broadcastTxCommit(provider, signedTx, account.hdPath);
    }
    return keyring.broadcastTxCommit(provider, signedTx);
  }

  async serialize(password: string) {
    const plain: WalletData = {
      currentAccountId: this._currentAccountId,
      accounts: this._accounts.map((account) => account.toData()),
      keyrings: this._keyrings.map((keyring) => keyring.toData()),
    };
    const serialized = JSON.stringify(plain);
    const encryptedSerialize = await encryptAES(serialized, password);
    return encryptedSerialize;
  }

  clone() {
    return new AdenaWallet({
      accounts: this._accounts.map((account) => account.toData()),
      keyrings: this._keyrings.map((keyring) => keyring.toData()),
      currentAccountId: this._currentAccountId,
    });
  }

  public static async deserialize(encryptedSerialize: string, password: string) {
    const serialized = await decryptAES(encryptedSerialize, password);
    const plain: WalletData = JSON.parse(serialized);
    return new AdenaWallet(plain);
  }

  public static async createByMnemonic(mnemonic: string, paths: Array<number> = [0]) {
    const wallet = new AdenaWallet();
    const keyring = await HDWalletKeyring.fromMnemonic(mnemonic);
    for (const path of paths) {
      const account = await SeedAccount.createBy(keyring, wallet.nextAccountName, path);
      wallet.currentAccountId = account.id;
      wallet.addAccount(account);
      wallet.addKeyring(keyring);
    }
    return wallet;
  }

  public static async createByLedger(connector: LedgerConnector, paths: Array<number> = [0]) {
    const wallet = new AdenaWallet();
    const keyring = await LedgerKeyring.fromLedger(connector);
    for (const path of paths) {
      const account = await LedgerAccount.createBy(keyring, wallet.nextLedgerAccountName, path);
      wallet.currentAccountId = account.id;
      wallet.addAccount(account);
      wallet.addKeyring(keyring);
    }
    return wallet;
  }

  public static async createByWeb3Auth(privateKeyStr: string) {
    const privateKey = hexToArray(privateKeyStr);
    const wallet = new AdenaWallet();
    const keyring = await Web3AuthKeyring.fromPrivateKey(privateKey);
    const account = await SingleAccount.createBy(keyring, wallet.nextAccountName);
    wallet.currentAccountId = account.id;
    wallet.addAccount(account);
    wallet.addKeyring(keyring);
    return wallet;
  }

  public static async createByAddress(address: string) {
    const wallet = new AdenaWallet();
    const keyring = await AddressKeyring.fromAddress(address);
    const account = await AirgapAccount.createBy(keyring, wallet.nextAccountName);
    wallet.currentAccountId = account.id;
    wallet.addAccount(account);
    wallet.addKeyring(keyring);
    return wallet;
  }

  public static generateMnemonic(length: 12 | 15 | 18 | 21 | 24 = 12): string {
    const entropyLength = 4 * Math.floor((11 * length) / 33);
    const entropy = Random.getBytes(entropyLength);
    const mnemonic = Bip39.encode(entropy);
    return mnemonic.toString();
  }
}
