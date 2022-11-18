import { AccountData, Secp256k1HdWallet } from '@/amino';
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

interface WalletAccountArguments {
  index?: number;
  status?: 'ACTIVE' | 'IN_ACTIVE' | 'NONE';
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
  aminoSigner?: Secp256k1HdWallet;
}

export class WalletAccount {
  private index: number;

  private aminoSigner: Secp256k1HdWallet | undefined;

  private status: 'ACTIVE' | 'IN_ACTIVE' | 'NONE';

  private name: string;

  private accountNumber: string | undefined;

  private sequence: string | undefined;

  private address: string;

  private privateKey: string | undefined;

  private publicKey: Uint8Array | undefined;

  private cryptoAlgorithm: string | undefined;

  private balance: string;

  private histories: Array<AccountHistory>;

  private config: WalletAccountConfig;

  constructor(args: WalletAccountArguments) {
    this.index = args.index ?? 0;
    this.aminoSigner = args.aminoSigner;
    this.name = args.name ?? `Account ${this.index}`;
    this.status = args.status ?? 'NONE';
    this.accountNumber = args.accountNumber;
    this.sequence = args.sequence;
    this.address = args.address ?? '';
    this.balance = args.balance ?? '';
    this.histories = args.histories ? [...args.histories] : [];
    this.config = args.config ?? WalletAccountConfig.createConfigByTest2();
  }

  public get data() {
    return {
      index: this.index,
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
      config: this.config,
    };
  }

  public clone = () => {
    const account = new WalletAccount(this.data);
    account.setSigner(this.getSigner());
    account.setConfig(this.getConfig().clone());
    return account;
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

  public getSigner = (): Secp256k1HdWallet => {
    if (!this.aminoSigner) {
      throw Error();
    }
    return this.aminoSigner;
  };

  public getConfig = () => {
    return this.config;
  };

  public setIndex = (index: number) => {
    this.index = index;
    this.name = `Account ${this.index}`;
  };

  public setName = (name: string) => {
    this.name = name;
  };

  public setSigner = (signer: Secp256k1HdWallet) => {
    this.aminoSigner = signer;
  };

  public setConfig = (config: WalletAccountConfig) => {
    this.config = config;
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

  public static createByAminoAccount = (accountData: AccountData) => {
    const { address, algo, pubkey } = accountData;
    return new WalletAccount({
      address,
      cryptoAlgorithm: algo,
      publicKey: pubkey,
    });
  };
}
