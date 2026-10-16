import {
  Account,
  AdenaWallet,
  arrayContentEquals,
  HDWalletKeyring,
  isHDWalletKeyring,
  Keyring,
  mnemonicToEntropy,
  PrivateKeyKeyring,
  SeedAccount,
  SingleAccount,
  Wallet,
} from 'adena-module';

/** How many seed accounts the import list derives at a time (as the web). */
export const DERIVE_PAGE = 5;

export interface DerivedAccount {
  hdPath: number;
  address: string;
  /** Already in the wallet (same public key): shown, not selectable. */
  stored: boolean;
}

export type AddResult =
  | {ok: true; next: AdenaWallet; added: Account[]}
  | {ok: false; reason: 'exists' | 'nothing-selected'};

/** The wallet's keyring of the same phrase, if it was added before. */
export function findSeedKeyring(
  wallet: Wallet,
  mnemonic: string,
): HDWalletKeyring | null {
  const entropy = mnemonicToEntropy(mnemonic);
  return (
    wallet.keyrings
      .filter(isHDWalletKeyring)
      .find(keyring => arrayContentEquals(keyring.mnemonicEntropy, entropy)) ??
    null
  );
}

/**
 * Seed accounts `start`..`start + count - 1` of a phrase with their
 * addresses, as the web's Select Accounts list.
 */
export async function deriveAccounts(
  wallet: Wallet,
  keyring: HDWalletKeyring,
  prefix: string,
  start: number,
  count = DERIVE_PAGE,
): Promise<DerivedAccount[]> {
  const derived: DerivedAccount[] = [];
  for (let hdPath = start; hdPath < start + count; hdPath++) {
    const account = await SeedAccount.createBy(keyring, 'Account', hdPath);
    derived.push({
      hdPath,
      address: await account.getAddress(prefix),
      stored: wallet.accounts.some(item =>
        arrayContentEquals(item.publicKey, account.publicKey),
      ),
    });
  }
  return derived;
}

/** The web's addAccountWith: next index and number, keyring kept once. */
function attach(next: AdenaWallet, keyring: Keyring, account: Account): void {
  account.index = next.getNextAccountIndexBy(keyring);
  account.name = `Account ${next.getNextAccountNumberBy(keyring)}`;
  account.keyringId = keyring.id;
  next.addAccount(account);
  next.addKeyring(keyring);
}

async function storedAddresses(wallet: Wallet, prefix: string) {
  return new Set(
    await Promise.all(wallet.accounts.map(item => item.getAddress(prefix))),
  );
}

/**
 * A freshly generated phrase as a new keyring with its first account (the
 * web's wallet-create when a wallet exists).
 */
export async function withNewSeedPhrase(
  wallet: Wallet,
  mnemonic: string,
): Promise<AddResult> {
  if (findSeedKeyring(wallet, mnemonic)) {
    return {ok: false, reason: 'exists'};
  }
  const keyring = await HDWalletKeyring.fromMnemonic(mnemonic);
  const account = await SeedAccount.createBy(keyring, 'Account', 0);
  const next = wallet.clone();
  attach(next, keyring, account);
  return {ok: true, next, added: [account]};
}

/**
 * The chosen accounts of an imported phrase, in path order, skipping any
 * address the wallet already has. A phrase added before keeps its keyring.
 */
export async function withSeedAccounts(
  wallet: Wallet,
  mnemonic: string,
  hdPaths: number[],
  prefix: string,
): Promise<AddResult> {
  const keyring =
    findSeedKeyring(wallet, mnemonic) ??
    (await HDWalletKeyring.fromMnemonic(mnemonic));
  const seen = await storedAddresses(wallet, prefix);
  const next = wallet.clone();
  const added: Account[] = [];
  for (const hdPath of [...new Set(hdPaths)].sort((a, b) => a - b)) {
    const account = await SeedAccount.createBy(keyring, 'Account', hdPath);
    const address = await account.getAddress(prefix);
    if (seen.has(address)) {
      continue;
    }
    seen.add(address);
    attach(next, keyring, account);
    added.push(account);
  }
  return added.length > 0
    ? {ok: true, next, added}
    : {ok: false, reason: 'nothing-selected'};
}

/** `privateKeyHex` must already be validated (see core/private-key.ts). */
export async function withPrivateKeyAccount(
  wallet: Wallet,
  privateKeyHex: string,
  prefix: string,
): Promise<AddResult> {
  const keyring = await PrivateKeyKeyring.fromPrivateKeyStr(privateKeyHex);
  const account = await SingleAccount.createBy(keyring, 'Account');
  const seen = await storedAddresses(wallet, prefix);
  if (seen.has(await account.getAddress(prefix))) {
    return {ok: false, reason: 'exists'};
  }
  const next = wallet.clone();
  attach(next, keyring, account);
  return {ok: true, next, added: [account]};
}
