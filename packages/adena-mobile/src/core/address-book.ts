import {AddressBookValidationError} from '@common/errors/validation/address-book-validation-error';
import {
  validateAlreadyAddress,
  validateAlreadyAddressByAccounts,
  validateAlreadyName,
} from '@common/validation/validation-address-book';
import type {AddressBookItem} from '@repositories/wallet/wallet-address';
import {
  Account,
  Chain,
  ChainRegistry,
  fromBech32,
  isSessionAccount,
} from 'adena-module';

export type {AddressBookItem};

/** The extension's label limit on the add/edit address screen. */
export const ADDRESS_LABEL_LIMIT = 23;

export const CHAIN_LABELS: Record<string, string> = {
  gno: 'Gno.land',
  atomone: 'AtomOne',
};

/** As the extension's address input: letters and digits only, lower case. */
export function sanitizeAddressInput(text: string): string {
  return text.replace(/\W|\s/g, '').toLowerCase();
}

/**
 * The registered chain whose prefix the address carries, or null. Stricter
 * than the extension, which saves any well-formed bech32 address: an entry the
 * wallet can never send to only invites a mistaken pick later.
 */
export function chainOfAddress(
  address: string,
  registry: ChainRegistry,
): Chain | null {
  let prefix: string;
  try {
    prefix = fromBech32(address).prefix;
  } catch {
    return null;
  }
  return (
    registry.listChains().find(chain => chain.bech32Prefix === prefix) ?? null
  );
}

export type AddressBookEntryError = {
  field: 'name' | 'address';
  message: string;
};

/** The extension's save checks, in its order; the first failure wins. */
export async function validateAddressBookEntry(
  entry: AddressBookItem,
  all: AddressBookItem[],
  accounts: Account[],
  registry: ChainRegistry,
  isAdd: boolean,
): Promise<AddressBookEntryError | null> {
  const chain = chainOfAddress(entry.address, registry);
  if (!chain) {
    return {field: 'address', message: 'Invalid address'};
  }
  const checks: Array<[AddressBookEntryError['field'], () => unknown]> = [
    ['address', () => validateAlreadyAddress(entry, all, isAdd)],
    [
      'address',
      () =>
        validateAlreadyAddressByAccounts(
          entry,
          accounts,
          isAdd,
          chain.bech32Prefix,
        ),
    ],
    ['name', () => validateAlreadyName(entry, all, isAdd)],
  ];
  for (const [field, check] of checks) {
    try {
      await check();
    } catch (error) {
      if (error instanceof AddressBookValidationError) {
        return {field, message: error.message};
      }
      throw error;
    }
  }
  return null;
}

export interface RecipientCandidate {
  id: string;
  name: string;
  address: string;
  /** Another account of this wallet rather than a saved address. */
  own: boolean;
}

/**
 * The extension's recipient list: the wallet's other accounts, then saved
 * addresses on the same chain. Session accounts never appear: they hold no
 * funds and anything sent there would be stuck.
 */
export async function recipientCandidates(
  addressBook: AddressBookItem[],
  accounts: Account[],
  prefix: string,
  currentAddress: string | null,
): Promise<RecipientCandidate[]> {
  const own: RecipientCandidate[] = [];
  for (const account of accounts) {
    if (isSessionAccount(account)) {
      continue;
    }
    const address = await account.getAddress(prefix);
    if (address !== currentAddress) {
      own.push({id: account.id, name: account.name, address, own: true});
    }
  }
  const saved = addressBook
    .filter(item => item.address !== currentAddress)
    .filter(item => {
      try {
        return fromBech32(item.address).prefix === prefix;
      } catch {
        return false;
      }
    })
    .map(item => ({
      id: item.id,
      name: item.name,
      address: item.address,
      own: false,
    }));
  return [...own, ...saved];
}
