import {isHDWalletKeyring, Wallet} from 'adena-module';

/**
 * Opens a copy of the vault with `password` and reads the phrase of keyring
 * `keyringId`. Only a vault that does not open counts as a wrong password;
 * `phrase` is null when that keyring has none (a private key import).
 */
export async function readSeedPhrase(
  walletService: {deserializeWallet(password: string): Promise<Wallet>},
  password: string,
  keyringId: string | undefined,
): Promise<{opened: false} | {opened: true; phrase: string | null}> {
  let copy: Wallet;
  try {
    copy = await walletService.deserializeWallet(password);
  } catch {
    return {opened: false};
  }
  try {
    const keyring = copy.keyrings.find(item => item.id === keyringId);
    return {
      opened: true,
      phrase:
        keyring && isHDWalletKeyring(keyring) ? keyring.getMnemonic() : null,
    };
  } finally {
    copy.destroy();
  }
}
