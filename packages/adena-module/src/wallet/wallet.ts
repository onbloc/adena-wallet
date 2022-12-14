import { Secp256k1HdWallet, makeCosmoshubPath } from '@/amino';
import { HdPath } from '..';
import { WalletAccount, WalletAccountConfig } from './account';
import { LedgerSigner } from '@/amino/ledger/ledgerwallet';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';

interface ChainConfig {
  chainId: string;
  coinDenom: string;
  coinDecimals: number;
  coinMinimalDenom: string;
}

export class Wallet {
  private walletAccounts: Array<WalletAccount>;

  private aminoSigner: Secp256k1HdWallet|LedgerSigner;

  constructor(aminoSigner: Secp256k1HdWallet|LedgerSigner) {
    this.aminoSigner = aminoSigner;
    this.walletAccounts = [];
  }

  public clone = () => {
    const wallet = new Wallet(this.aminoSigner);
    wallet.setAccounts(wallet.walletAccounts);
    return wallet;
  };

  public initAccounts = async (names: { [key in string]: string } = {}, config?: ChainConfig) => {
    const accounts = await this.aminoSigner.getAccounts();
    const walletAccounts = accounts.map(WalletAccount.createByAminoAccount);
    walletAccounts.map((walletAccount, index) => {
      walletAccount.setIndex(index + 1);
      walletAccount.setSigner(this.aminoSigner);
      walletAccount.data.address in names &&
        walletAccount.setName(names[walletAccount.data.address]);
      config && walletAccount.setConfig(new WalletAccountConfig(config));
    });

    this.walletAccounts = [...walletAccounts];
  };

  public setAccounts = (accounts: Array<WalletAccount>) => {
    this.walletAccounts = accounts.map((account) => account.clone());
  };

  public serialize = async (password: string): Promise<string> => {
    if (this.aminoSigner instanceof LedgerSigner) {
      throw new Error('Ledger wallet cannot be serialized');
    }
    return await this.aminoSigner.serialize(password);
  };

  public getMnemonic = () => {
    if (this.aminoSigner instanceof LedgerSigner) {
      throw new Error('Ledger wallet does not have mnemonic');
    }
    return this.aminoSigner.mnemonic;
  };

  public getAccounts = () => {
    return this.walletAccounts;
  };

  public getPrivateKey = async (address: string) => {
    if (this.aminoSigner instanceof LedgerSigner) {
      throw new Error('Ledger wallet does not have private key');
    }
    const privateKey = await this.aminoSigner.getPrivkey(address);
    return privateKey;
  };

  public static createByMnemonic = async (
    seeds: string,
    accountPaths: Array<number> = [0],
  ): Promise<Wallet> => {
    const walletConfig = Wallet.createWalletConfig({ accountPaths });
    const aminoSigner = await Secp256k1HdWallet.fromMnemonic(seeds, walletConfig);
    return new Wallet(aminoSigner);
  };

  public static createByMnemonicAndPassword = async (
    seeds: string,
    password: string,
    accountPaths: Array<number> = [0],
  ): Promise<Wallet> => {
    const walletConfig = Wallet.createWalletConfig({ password, accountPaths });
    const aminoSigner = await Secp256k1HdWallet.fromMnemonic(seeds, walletConfig);
    return new Wallet(aminoSigner);
  };

  public static createByLedger = async (
    accountPaths: Array<number> = [0],
  ): Promise<Wallet> => {
    const interactiveTimeout = 120_000;
    const walletConfig = Wallet.createWalletConfig({ accountPaths });
    const ledgerTransport = await TransportWebUSB.create(interactiveTimeout, interactiveTimeout);
  
    const aminoSigner = new LedgerSigner(ledgerTransport, {
      hdPaths: walletConfig.hdPaths,
    });
    return new Wallet(aminoSigner);
  };

  public static createBySerialized = async (
    serializedKey: string,
    serializedPassword: string,
  ): Promise<Wallet> => {
    const aminoSigner = await Secp256k1HdWallet.deserialize(serializedKey, serializedPassword);
    return new Wallet(aminoSigner);
  };

  public static generateMnemonic = (length: 12 | 15 | 18 | 21 | 24 = 12): string => {
    return Secp256k1HdWallet.mnemonicGenerate(length);
  };

  public static createWalletConfig = (config?: {
    password?: string;
    accountPaths?: Array<number>;
  }) => {
    const password = config?.password ?? '';
    const accountPaths = config?.accountPaths ?? [0];
    const prefix = process.env.SIGNER_PREFIX;
    const hdPaths: Array<HdPath> = accountPaths.map(makeCosmoshubPath);

    return {
      hdPaths,
      prefix,
      bip39Password: password,
    };
  };
}
