import { AccountData, Secp256k1HdWallet } from '@/amino';
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

interface WalletAccountArguments {
  index?: number;
  signerType?: 'AMINO' | 'LEDGER';
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
  signer?: Secp256k1HdWallet | LedgerSigner;
  path?: number;
}

export class WalletAccount {
  private index: number;

  private signerType: 'AMINO' | 'LEDGER';

  private signer: Secp256k1HdWallet | LedgerSigner | undefined;

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
    this.config = args.config ?? WalletAccountConfig.createConfigByTest2();
    this.path = args.path ?? -1;
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
      config: this.config,
      path: this.path
    };
  }

  public clone = () => {
    const account = new WalletAccount(this.data);
    try {
      account.setSigner(this.getSigner());
      account.setConfig(this.getConfig()?.clone());
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

  public getSigner = (): Secp256k1HdWallet | LedgerSigner => {
    if (!this.signer) {
      throw Error();
    }
    return this.signer;
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

  public setSigner = (signer: Secp256k1HdWallet | LedgerSigner) => {
    this.signer = signer;
  };

  public setPath = (path: HdPath) => {
    this.path = path[-1].toNumber();
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
    const { address, algo, pubkey, hdPath } = accountData;
    const path = hdPath.at(-1)?.toNumber() ?? -1;
    return new WalletAccount({
      address,
      cryptoAlgorithm: algo,
      publicKey: pubkey,
      path
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
      path
    });
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
}
