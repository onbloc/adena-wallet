import { WalletError } from '@common/errors/wallet/wallet-error';
import { Wallet } from 'adena-module';
import { WalletAccountRepository, WalletRepository } from '@repositories/wallet';
import { encryptSha256Password } from '@common/utils/crypto-utils';

export class WalletService {

  private walletRepository: WalletRepository;

  private walletAccountRepository: WalletAccountRepository;

  constructor(walletRepository: WalletRepository, walletAccountRepository: WalletAccountRepository) {
    this.walletRepository = walletRepository;
    this.walletAccountRepository = walletAccountRepository;
  }

  public existsWallet = () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return this.walletRepository.getSerializedWallet()
      .then(() => true)
      .catch(() => false);
  };

  /**
   * This function creates a wallet instance.
   *
   * @param parmas Parameters
   * - mnemonic: mnemonic seeds
   * - password: wallet's password
   * @returns Wallet
   */
  public createWallet = async ({ mnemonic, password }: { mnemonic: string; password: string }) => {
    const wallet = await this.createWalletByMnemonic(mnemonic);
    await this.saveWallet(wallet, password);
    return wallet;
  };

  /**
   * This function loads a wallet instance.
   *
   * @returns Wallet
   */
  public loadWallet = async () => {
    const isExists = await this.existsWallet();
    if (!isExists) {
      throw new WalletError("NOT_FOUND_SERIALIZED");
    }
    const password = await this.walletRepository.getWalletPassword();
    const walletInstance = await this.deserializeWallet(password);
    return walletInstance;
  };

  /**
   * This function loads a wallet instance with the password.
   *
   * @param password wallet's password
   * @returns Wallet
   */
  public loadWalletWithPassword = async (password: string) => {
    const isExists = await this.existsWallet();
    if (!isExists) {
      throw new WalletError("NOT_FOUND_SERIALIZED");
    }
    const walletInstance = await this.deserializeWallet(password);
    await this.walletRepository.updateWalletPassword(password);
    return walletInstance;
  };

  /**
   * This function checks if the wallet is locked.
   *
   * @returns boolean
   */
  public isLocked = async () => {
    try {
      const password = await this.walletRepository.getWalletPassword();
      return password === '';
    } catch (e) {
      return true;
    }
  };

  public loadWalletPassword = async () => {
    return await this.walletRepository.getWalletPassword();
  };

  /**
   * This function creates a wallet with mnemonic seeds.
   *
   * @params Parameters
   * - mnemonic mnemonic seeds
   * - accountPaths (Optional) account path's numbers
   * @throws WalletError 'FAILED_TO_CREATE'
   * @returns Wallet
   */
  public createWalletByMnemonic = async (mnemonic: string, accountPaths?: Array<number>) => {
    try {
      if (accountPaths) {
        await this.walletAccountRepository.updateAccountPath(Math.max(...accountPaths ?? [0]));
      }
      const currentAccountPath = await this.walletAccountRepository.getAccountPath();
      const wallet = await Wallet.createByMnemonic(mnemonic, [currentAccountPath]);
      return wallet;
    } catch (e) {
      throw new WalletError('FAILED_TO_CREATE');
    }
  };

  /**
   * This function serializes the wallet with a password.
   *
   * @param wallet Wallet instance
   * @param password wallet's password
   */
  public saveWallet = async (
    wallet: InstanceType<typeof Wallet>,
    password: string,
  ) => {
    const serializedWallet = await wallet.serialize(password);
    await this.walletRepository.updateSerializedWallet(serializedWallet);
    await this.walletRepository.updateWalletPassword(password);
  };

  /**
   * This function deserializes the wallet with the password.
   *
   * @throws WalletError 'FAILED_TO_LOAD'
   * @returns Wallet
   */
  public deserializeWallet = async (password: string) => {
    try {
      const serializedWallet = await this.walletRepository.getSerializedWallet();
      const walletInstance = await Wallet.createBySerialized(serializedWallet, password);
      return walletInstance;
    } catch (e) {
      throw new WalletError('FAILED_TO_LOAD');
    }
  };

  public lockWallet = async () => {
    try {
      await this.walletRepository.deleteWalletPassword();
    } catch (e) {
      throw new WalletError('FAILED_TO_LOAD');
    }
  };

  public equalsPassowrd = async (password: string) => {
    try {
      const storedPassword = await this.walletRepository.getEncryptedPassword();
      const encryptedPassword = encryptSha256Password(password);
      return storedPassword === encryptedPassword;
    } catch (e) {
      return false;
    }
  };

  public updatePassowrd = async (password: string) => {
    await this.walletRepository.updateWalletPassword(password);
    return true;
  };

  public changePassowrd = async (password: string) => {
    try {
      const wallet = await this.loadWallet();
      await this.saveWallet(wallet, password);
    } catch (e) {
      await this.walletRepository.updateWalletPassword(password);
    }
    return true;
  };

  public clear = async () => {
    await this.walletRepository.deleteSerializedWallet();
    await this.walletRepository.deleteWalletPassword();
    return true;
  }
}

