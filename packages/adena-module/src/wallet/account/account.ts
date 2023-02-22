import { AccountData, OfflineAminoSigner, Secp256k1HdWallet, Secp256k1Wallet } from '@/amino';
import { LedgerSigner } from '@/amino/ledger/ledgerwallet';
import { HdPath } from '@/crypto';
import { WalletAccountConfig } from '.';

interface AccountHistory {
  height: string;
  date: string;
  hash: string;
  result: {
    status: string;
    reason: string;
  };
  type: string;
  from: string;
  to: string;
  send: string;
  func: string;
  fee: string;
}

export type SingerType = 'AMINO' | 'LEDGER';

export type AccountType = 'GOOGLE' | 'LEDGER' | 'PRIVATE_KEY' | 'SEED' | 'NONE';

export type AccountStatusType = 'ACTIVE' | 'IN_ACTIVE' | 'NONE';

interface WalletAccountArguments {
  index?: number;
  accountType: AccountType;
  signerType?: SingerType;
  status?: AccountStatusType;
  name?: string;
  accountNumber?: string;
  sequence?: string;
  address?: string;
  privateKey?: string;
  publicKey?: Uint8Array;
  cryptoAlgorithm?: string;
  balance?: string;
  histories?: Array<AccountHistory>;
  config?: WalletAccountConfig;
  signer?: Secp256k1HdWallet | LedgerSigner;
  path?: number;
}

export class WalletAccount {
  private index: number;

  private accountType: AccountType;

  private signerType: SingerType;

  private signer: OfflineAminoSigner | LedgerSigner | undefined;

  private status: AccountStatusType;

  private name: string;

  private accountNumber: string | undefined;

  private sequence: string | undefined;

  private address: string;

  private privateKey: string | undefined;

  private publicKey: Uint8Array | undefined;

  private cryptoAlgorithm: string | undefined;

  private balance: string;

  private histories: Array<AccountHistory>;

  private path: number;

  constructor(args: WalletAccountArguments) {
    this.index = args.index ?? 0;
    this.signerType = args.signerType ?? 'AMINO';
    this.signer = args.signer;
    this.name = args.name ?? `Account ${this.index}`;
    this.status = args.status ?? 'NONE';
    this.accountNumber = args.accountNumber;
    this.sequence = args.sequence;
    this.address = args.address ?? '';
    this.balance = args.balance ?? '';
    this.histories = args.histories ? [...args.histories] : [];
    this.path = args.path ?? -1;
    this.accountType = args.accountType ?? "NONE";
    this.privateKey = args.privateKey;
  }

  public get data() {
    return {
      index: this.index,
      signerType: this.signerType,
      name: this.name,
      status: this.status,
      accountNumber: this.accountNumber,
      sequence: this.sequence,
      address: this.address,
      privateKey: this.privateKey,
      publicKey: this.publicKey,
      cryptoAlgorithm: this.cryptoAlgorithm,
      balance: this.balance,
      histories: [...this.histories],
      path: this.path,
      accountType: this.accountType
    };
  }

  public clone = () => {
    const account = new WalletAccount({ ...this.data });
    try {
      account.setSigner(this.getSigner());
    } catch (e) { }
    return account;
  };

  public serialize = () => {
    return JSON.stringify(this.data);
  };

  public getAccountNumber = () => {
    return this.accountNumber;
  };

  public getSequence = () => {
    return this.sequence;
  };

  public getAddress = () => {
    return this.address;
  };

  public getSigner = (): OfflineAminoSigner | LedgerSigner => {
    if (!this.signer) {
      throw new Error("Not found signer.");
    }
    return this.signer;
  };

  public setIndex = (index: number) => {
    this.index = index;
    this.name = `Account ${this.index}`;
  };

  public setName = (name: string) => {
    this.name = name;
  };

  public setSigner = (signer: OfflineAminoSigner | LedgerSigner) => {
    this.signer = signer;
  };

  public setPath = (path: HdPath) => {
    this.path = path[-1].toNumber();
  };

  public setPrivateKey = (privateKey: Uint8Array) => {
    this.privateKey = WalletAccount.arrayToHex(privateKey);
  };

  public getPrivateKey = () => {
    if (this.privateKey) {
      return this.privateKey;
    }
    return null;
  };

  public updateByGno = (accountInfo: {
    status?: 'ACTIVE' | 'IN_ACTIVE' | 'NONE';
    address?: string;
    coins?: string;
    publicKey?: string;
    accountNumber?: string;
    sequence?: string;
  }) => {
    this.status = accountInfo.status ?? this.status;
    this.address = accountInfo.address ?? this.address;
    this.balance = accountInfo.coins ?? this.balance;
    this.accountNumber = accountInfo.accountNumber ?? this.accountNumber;
    this.sequence = accountInfo.sequence ?? this.sequence;
  };

  public initSignerByPrivateKey = async () => {
    if (this.signerType !== "AMINO") {
      return;
    }
    if (!this.privateKey) {
      return;
    }
    const decodePrivateKey = WalletAccount.hexToArray(this.privateKey);
    const signer = await Secp256k1Wallet.fromKey(decodePrivateKey, 'g');
    this.signer = signer;
  };

  public static createByAminoAccount = (accountData: AccountData, accountType?: AccountType) => {
    const { address, algo, pubkey, hdPath } = accountData;
    const path = hdPath?.at(-1)?.toNumber() ?? -1;
    return new WalletAccount({
      address,
      cryptoAlgorithm: algo,
      publicKey: pubkey,
      path,
      accountType: accountType ?? "SEED"
    });
  };

  public static createByLedgerAddress = ({
    address,
    name,
    config,
    hdPath
  }: {
    address: string;
    name?: string;
    config?: WalletAccountConfig;
    hdPath?: HdPath;
  }) => {
    const path = hdPath?.at(-1)?.toNumber() ?? -1;
    return new WalletAccount({
      address,
      signerType: 'LEDGER',
      status: 'ACTIVE',
      name: name ?? 'Ledger',
      config,
      path,
      accountType: "LEDGER"
    });
  };

  public static async createByPrivateKeyHex(privateKeyHex: string, prefix: string, name?: string) {
    const privateKey = this.hexToArray(privateKeyHex);
    const wallet = await Secp256k1Wallet.fromKey(privateKey, prefix);
    const accounts = await wallet.getAccounts();
    if (accounts.length === 0) {
      throw new Error('Not found accounts');
    }

    const account = WalletAccount.createByAminoAccount(accounts[0], "PRIVATE_KEY");
    account.setSigner(wallet);
    account.setName(name ?? 'Account');
    account.setPrivateKey(privateKey);
    return account;
  };

  public static async createByPrivateKey(privateKey: Uint8Array, prefix: string, name?: string) {
    const privateKeyHex = this.arrayToHex(privateKey);
    const account = await this.createByPrivateKeyHex(privateKeyHex, prefix, name);;
    return account;
  };

  public static deserialize(serialized: string) {
    try {
      const deserializedValue = JSON.parse(serialized);
      if (deserializedValue?.address) {
        return new WalletAccount({ ...deserializedValue });
      }
    } catch (e) {
      console.error(e);
    }
    throw new Error('Wallet Account deserialze error');
  }

  private static arrayToHex(data: Uint8Array) {
    return Buffer.from(data).toString("hex");
  }

  private static hexToArray(hex: string) {
    return Uint8Array.from(Buffer.from(hex, 'hex'))
  }
}
