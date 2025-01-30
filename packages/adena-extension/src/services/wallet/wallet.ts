import { AdenaWallet, Wallet } from 'adena-module';
import dayjs from 'dayjs';

import { QUESTIONNAIRE_EXPIRATION_MIN } from '@common/constants/storage.constant';
import { WalletError } from '@common/errors/wallet/wallet-error';
import { encryptSha256Password } from '@common/utils/crypto-utils';
import { WalletRepository } from '@repositories/wallet';

export class WalletService {
  private walletRepository: WalletRepository;

  constructor(walletRepository: WalletRepository) {
    this.walletRepository = walletRepository;
  }

  public existsWallet = (): Promise<boolean> => {
    return this.walletRepository
      .getSerializedWallet()
      .then((serializedWallet) => !!serializedWallet)
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
  public createWallet = async ({
    mnemonic,
    password,
  }: {
    mnemonic: string;
    password: string;
  }): Promise<AdenaWallet> => {
    const wallet = await this.createWalletByMnemonic(mnemonic);
    await this.saveWallet(wallet, password);
    return wallet;
  };

  /**
   * This function loads a wallet instance.
   *
   * @returns Wallet
   */
  public loadWallet = async (): Promise<AdenaWallet> => {
    const isExists = await this.existsWallet();
    if (!isExists) {
      throw new WalletError('NOT_FOUND_SERIALIZED');
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
  public loadWalletWithPassword = async (password: string): Promise<AdenaWallet> => {
    const isExists = await this.existsWallet();
    if (!isExists) {
      throw new WalletError('NOT_FOUND_SERIALIZED');
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
  public isLocked = async (): Promise<boolean> => {
    try {
      const password = await this.walletRepository.getWalletPassword();
      return password === '';
    } catch (e) {
      return true;
    }
  };

  public loadWalletPassword = async (): Promise<string> => {
    return this.walletRepository.getWalletPassword();
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
  public createWalletByMnemonic = async (
    mnemonic: string,
    accountPaths?: Array<number>,
  ): Promise<AdenaWallet> => {
    try {
      const wallet = await AdenaWallet.createByMnemonic(mnemonic, accountPaths);
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
  public saveWallet = async (wallet: Wallet, password: string): Promise<void> => {
    const serializedWallet = await wallet.serialize(password);
    await this.walletRepository.updateWalletPassword(password);
    await this.walletRepository.updateSerializedWallet(serializedWallet);
    try {
      chrome?.action?.setPopup({ popup: 'popup.html' });
    } catch (e) {
      console.error(e);
    }
  };

  public updateWallet = async (wallet: Wallet): Promise<void> => {
    let password = await this.walletRepository.getWalletPassword();
    const serializedWallet = await wallet.serialize(password);
    password = '';

    await this.walletRepository.updateSerializedWallet(serializedWallet);
    try {
      chrome?.action?.setPopup({ popup: 'popup.html' });
    } catch (e) {
      console.error(e);
    }
  };

  /**
   * This function deserializes the wallet with the password.
   *
   * @throws WalletError 'FAILED_TO_LOAD'
   * @returns Wallet
   */
  public deserializeWallet = async (password: string): Promise<AdenaWallet> => {
    try {
      await this.walletRepository.updateWalletPassword(password);
      const serializedWallet = await this.walletRepository.getSerializedWallet();
      const walletInstance = await AdenaWallet.deserialize(serializedWallet, password);
      return walletInstance;
    } catch (e) {
      throw new WalletError('FAILED_TO_LOAD');
    }
  };

  public lockWallet = async (): Promise<void> => {
    try {
      await this.walletRepository.deleteWalletPassword();
    } catch (e) {
      throw new WalletError('FAILED_TO_LOAD');
    }
  };

  public equalsPassword = async (password: string): Promise<boolean> => {
    try {
      const storedPassword = await this.walletRepository.getEncryptedPassword();
      if (storedPassword !== '') {
        const encryptedPassword = encryptSha256Password(password);
        return storedPassword === encryptedPassword;
      }

      // For migration
      const isWallet = await this.existsWallet();
      if (isWallet) {
        const wallet = await this.deserializeWallet(password);
        if (wallet) {
          await this.updatePassword(password);
          return true;
        }
      }
    } catch (e) {
      return false;
    }
    return false;
  };

  public updatePassword = async (password: string): Promise<boolean> => {
    await this.walletRepository.updateWalletPassword(password);
    return true;
  };

  public changePassword = async (password: string): Promise<boolean> => {
    try {
      const wallet = await this.loadWallet();
      await this.saveWallet(wallet, password);
    } catch (e) {
      await this.walletRepository.updateWalletPassword(password);
    }
    return true;
  };

  public isSkipQuestionnaire = async (): Promise<boolean> => {
    const expiredDate = await this.walletRepository.getQuestionnaireExpiredDate();
    if (!expiredDate) {
      return false;
    }
    const currentTime = dayjs().unix();
    return expiredDate > currentTime;
  };

  public updateQuestionnaireExpiredDate = async (): Promise<void> => {
    const expiredDateTime = dayjs().add(QUESTIONNAIRE_EXPIRATION_MIN, 'minute').unix();
    await this.walletRepository.updatedQuestionnaireExpiredDate(expiredDateTime);
  };

  public isSkipWalletGuide = async (hasWallet: boolean): Promise<boolean> => {
    const confirmDate = hasWallet
      ? await this.walletRepository.getAddAccountGuideConfirmDate()
      : await this.walletRepository.getWalletCreationGuideConfirmDate();
    return !!confirmDate;
  };

  public updateWalletGuideConfirmDate = async (hasWallet: boolean): Promise<void> => {
    const confirmDate = dayjs().unix();
    const updateGuideConfirmDate = hasWallet
      ? this.walletRepository.updateAddAccountGuideConfirmDate.bind(this.walletRepository)
      : this.walletRepository.updateWalletCreationGuideConfirmDate.bind(this.walletRepository);
    await updateGuideConfirmDate(confirmDate);
  };

  public clear = async (): Promise<boolean> => {
    await this.walletRepository.deleteSerializedWallet();
    await this.walletRepository.deleteWalletPassword();
    try {
      chrome?.action?.setPopup({ popup: '' });
    } catch (e) {
      console.error(e);
    }
    return true;
  };
}
