import {
  AdenaWallet,
  MultisigAccount,
  MultisigKeyring,
  Wallet,
  MultisigConfig,
  SignerPublicKeyInfo,
  generateKdfSalt,
} from 'adena-module';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';

import { QUESTIONNAIRE_EXPIRATION_MIN } from '@common/constants/storage.constant';
import { WalletError } from '@common/errors/wallet/wallet-error';
import { WalletRepository } from '@repositories/wallet';

export class WalletService {
  private _id: string;
  private walletRepository: WalletRepository;

  constructor(walletRepository: WalletRepository) {
    this._id = uuidv4();
    this.walletRepository = walletRepository;
  }

  public get id(): string {
    return this._id;
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
      const existsPassword = await this.walletRepository.existsWalletPassword();
      return !existsPassword;
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
    let salt = await this.walletRepository.getKdfSalt();
    if (!salt) {
      salt = await generateKdfSalt();
      await this.walletRepository.updateKdfSalt(salt);
    }
    const serializedWallet = await wallet.serialize(password, salt);
    await this.walletRepository.updateWalletPassword(password);
    await this.walletRepository.updateSerializedWallet(serializedWallet);
    try {
      chrome?.action?.setPopup({ popup: 'popup.html' });
    } catch (e) {
      console.error(e);
    }
  };

  public updateWallet = async (wallet: Wallet): Promise<void> => {
    const password = await this.walletRepository.getWalletPassword();
    const salt = await this.walletRepository.getKdfSalt();
    if (!salt) {
      throw new WalletError('FAILED_TO_LOAD');
    }
    const serializedWallet = await wallet.serialize(password, salt);

    await this.walletRepository.updateSerializedWallet(serializedWallet);
    try {
      chrome?.action?.setPopup({ popup: 'popup.html' });
    } catch (e) {
      console.error(e);
    }
  };

  /**
   * Add multisig account to wallet
   *
   * @param publicKey - Multisig public key (Amino encoded PubKeyMultisigThreshold)
   * @param addressBytes - Multisig address bytes (20 bytes)
   * @param multisigConfig - Multisig Config (signers, threshold)
   * @param multisigAddress - Multisig bech32 address
   * @returns The added multisig account
   * @throws Error if multisig account operations fail
   */
  public addMultisigAccount = async (
    publicKey: Uint8Array,
    addressBytes: Uint8Array,
    multisigConfig: MultisigConfig,
    multisigAddress: string,
    signerPublicKeys: SignerPublicKeyInfo[],
  ): Promise<MultisigAccount> => {
    try {
      const wallet = await this.loadWallet();

      // Check for duplicate address
      const isDuplicate = await wallet.hasAddress(multisigAddress);
      if (isDuplicate) {
        throw new Error(`Multisig account already exists: ${multisigAddress}`);
      }

      // Create multisig keyring
      const multisigKeyring = new MultisigKeyring({
        type: 'MULTISIG',
        addressBytes: Array.from(addressBytes),
        publicKey: Array.from(publicKey),
        multisigConfig,
        signerPublicKeys,
      });

      // Get account index and name
      const addedIndex = wallet.lastAccountIndex + 1;
      const multisigName = wallet.nextMultisigAccountName;

      // Create multisig account with publicKey
      const multisigAccount = await MultisigAccount.createBy(
        multisigKeyring,
        multisigName,
        addedIndex,
      );

      multisigAccount.index = addedIndex;
      multisigAccount.name = multisigName;

      // Add to wallet
      const clonedWallet = wallet.clone();
      clonedWallet.addKeyring(multisigKeyring);
      clonedWallet.addAccount(multisigAccount);

      await this.updateWallet(clonedWallet);

      return multisigAccount;
    } catch (error) {
      console.error('Failed to add multisig account:', error);
      throw error;
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
      const serializedWallet = await this.walletRepository.getSerializedWallet();
      const salt = await this.walletRepository.getKdfSalt();
      if (!salt) {
        throw new WalletError('FAILED_TO_LOAD');
      }

      const walletInstance = await AdenaWallet.deserialize(serializedWallet, password, salt);

      return walletInstance;
    } catch (e) {
      console.error(e);
      throw new WalletError('FAILED_TO_LOAD');
    }
  };

  public lockWallet = async (): Promise<void> => {
    try {
      const wallet = await this.loadWallet();
      wallet.destroy();
    } catch {
      // Wallet may not be loadable (e.g. password already cleared)
    }
    try {
      await this.walletRepository.deleteWalletPassword();
    } catch (e) {
      throw new WalletError('FAILED_TO_LOAD');
    }
  };

  public equalsPassword = async (password: string): Promise<boolean> => {
    try {
      // Trigger migration (v018: AES-CBC → XChaCha20) before deserialization
      await this.walletRepository.updateStoragePassword(password);
      await this.deserializeWallet(password);
      return true;
    } catch (e) {
      return false;
    }
  };

  public updatePassword = async (password: string): Promise<boolean> => {
    return this.walletRepository.updateWalletPassword(password);
  };

  public changePassword = async (password: string): Promise<boolean> => {
    try {
      const wallet = await this.loadWallet();
      await this.saveWallet(wallet, password);
    } catch (e) {
      console.error(e);
      return false;
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
