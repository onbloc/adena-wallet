import {
  Account,
  AccountInfo,
  LedgerAccount,
  makeAccount,
  SeedAccount,
  SingleAccount,
} from './account';
import {
  hasPrivateKey,
  HDWalletKeyring,
  isHDWalletKeyring,
  isPrivateKeyKeyring,
  Keyring,
  KeyringData,
  LedgerKeyring,
  makeKeyring,
  Web3AuthKeyring,
} from './keyring';
import { decryptAES, encryptAES } from './wallet-crypto-util';
import { hasHDPath, isLedgerAccount, isSeedAccount } from './account/account-util';
import { LedgerConnector, StdSignature, StdSignDoc } from '../amino';
import { Bip39, Random } from '../crypto';
import { arrayToHex, hexToArray } from '../utils/data';
export interface Wallet {
  accounts: Account[];
  currentAccount: Account;
  currentKeyring: Keyring;
  hdWalletKeyring: HDWalletKeyring | undefined;
  nextAccountName: string;
  nextLedgerAccountName: string;
  nextHDPath: number;
  privateKeyStr: string;
  mnemonic: string;
  lastAccountIndex: number;
  lastLedgerAccountIndex: number;

  addAccount: (account: Account) => number;
  removeAccount: (account: Account) => boolean;
  isEmpty: () => boolean;
  hasHDWallet: () => boolean;
  hasPrivateKey: (privateKey: Uint8Array) => boolean;
  sign: (
    document: StdSignDoc,
  ) => Promise<{
    signed: StdSignDoc;
    signature: StdSignature;
  }>;
  signByAccountId: (
    accountId: string,
    document: StdSignDoc,
  ) => Promise<{
    signed: StdSignDoc;
    signature: StdSignature;
  }>;
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

export class AdenaWallet implements Wallet {
  private _accounts: Account[];

  private _keyrings: Keyring[];

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

  get currentAccount() {
    const currentAccount = this._accounts.find((account) => account.id === this._currentAccountId);
    if (!currentAccount) {
      throw new Error('Current account not found');
    }
    return currentAccount;
  }

  get currentKeyring() {
    const currentkeyringId = this.currentAccount.keyringId;
    const currentKeyring = this._keyrings.find((keyring) => keyring.id === currentkeyringId);
    if (!currentKeyring) {
      throw new Error('Current keyring not found');
    }
    return currentKeyring;
  }

  get hdWalletKeyring() {
    return this._keyrings.find(isHDWalletKeyring);
  }

  get nextAccountName() {
    const nextIndex = this.lastAccountIndex + 1;
    return `Account ${nextIndex}`;
  }

  get nextLedgerAccountName() {
    const nextIndex = this.lastLedgerAccountIndex + 1;
    return `Ledger ${nextIndex}`;
  }

  get nextHDPath() {
    const seedAccounts = this.accounts.filter(isSeedAccount);
    if (seedAccounts.length === 0) {
      return 0;
    }

    const lastHdPath = seedAccounts.reduce((account1, account2) =>
      account1.hdPath > account2.hdPath ? account1 : account2,
    ).hdPath;
    return lastHdPath + 1;
  }

  set currentAccountId(currentAccountId: string) {
    this._currentAccountId = currentAccountId;
  }

  get privateKeyStr() {
    return arrayToHex(this.getPrivateKey());
  }

  get mnemonic() {
    if (!isHDWalletKeyring(this.currentKeyring)) {
      throw new Error('Mnemonic words not found');
    }
    return this.currentKeyring.mnemonic;
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
    return this.hdWalletKeyring ? true : false;
  }

  hasPrivateKey(privateKey: Uint8Array) {
    const keyring = this._keyrings
      .filter(isPrivateKeyKeyring)
      .find((keyring) => JSON.stringify(keyring.privateKey) === JSON.stringify(privateKey));
    return keyring !== undefined;
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

  getPrivateKey() {
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

  async sign(document: StdSignDoc) {
    return this.signByAccountId(this.currentAccount.id, document);
  }

  async signByAccountId(accountId: string, document: StdSignDoc) {
    const account = this._accounts.find((account) => account.id === accountId);
    if (!account) {
      throw new Error('Account not found');
    }
    const keyring = this._keyrings.find((keyring) => (keyring.id = account.keyringId));
    if (!keyring) {
      throw new Error('Keyring not found');
    }
    if (hasHDPath(account)) {
      return keyring.sign(document, account.hdPath);
    }
    return keyring.sign(document);
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

  public static generateMnemonic(length: 12 | 15 | 18 | 21 | 24 = 12): string {
    const entropyLength = 4 * Math.floor((11 * length) / 33);
    const entropy = Random.getBytes(entropyLength);
    const mnemonic = Bip39.encode(entropy);
    return mnemonic.toString();
  }
}
