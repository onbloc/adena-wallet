import { Secp256k1HdWallet, makeCosmoshubPath } from '@/amino';
import { HdPath } from '..';
import { WalletAccount, WalletAccountConfig } from './account';

interface ChainConfig {
  chainId: string;
  coinDenom: string;
  coinDecimals: number;
  coinMinimalDenom: string;
}

export class Wallet {
  private walletAccounts: Array<WalletAccount>;

  private aminoSigner: Secp256k1HdWallet;

  constructor(aminoSigner: Secp256k1HdWallet) {
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
    return await this.aminoSigner.serialize(password);
  };

  public getMnemonic = () => {
    return this.aminoSigner.mnemonic;
  };

  public getAccounts = () => {
    return this.walletAccounts;
  };

  public getPrivateKey = async (address: string) => {
    const privateKey = await this.aminoSigner.getPrivkey(address);
    return privateKey;
  };

  /**
   * Mnemonic 문자로 지갑을 생성한다.
   *
   * @param seeds User's mnemonic words
   * @returns
   */
  public static createByMnemonic = async (
    seeds: string,
    accountPaths: Array<number> = [0],
  ): Promise<Wallet> => {
    const walletConfig = Wallet.createWalletConfig({ accountPaths });
    const aminoSigner = await Secp256k1HdWallet.fromMnemonic(seeds, walletConfig);
    return new Wallet(aminoSigner);
  };

  /**
   * Mnemonic 문자와 비밀번호로 지갑을 생성한다.
   *
   * @param seeds User's mnemonic words
   * @param password User's mnemonic password
   * @returns
   */
  public static createByMnemonicAndPassword = async (
    seeds: string,
    password: string,
    accountPaths: Array<number> = [0],
  ): Promise<Wallet> => {
    const walletConfig = Wallet.createWalletConfig({ password, accountPaths });
    const aminoSigner = await Secp256k1HdWallet.fromMnemonic(seeds, walletConfig);
    return new Wallet(aminoSigner);
  };

  /**
   * 직렬화된 지갑데이터를 역직렬화를 통해 지갑을 생성한다.
   *
   * @param serializedKey 직렬화된 지갑 데이터
   * @param serializedPassword 직렬화 시 사용된 비밀번호
   * @returns
   */
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
