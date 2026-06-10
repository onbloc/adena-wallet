import { Account, isSessionAccount } from 'adena-module';

// Returns the address that should be exposed to dApps. For SessionAccount this
// is the master account address (the session address is kept internal to the
// wallet). For every other account type this is the regular derived address.
export const getDappVisibleAddress = async (
  account: Account,
  addressPrefix: string,
): Promise<string> => {
  if (isSessionAccount(account)) {
    return account.getMasterAddress();
  }
  return account.getAddress(addressPrefix);
};

// Returns the address that wallet funding flows (balance queries, send
// from_address/caller, deposit/QR) must use. For SessionAccount this is the
// master Gno address because session keys never hold balances of their own and
// every Gno transaction signed by a session still consumes master funds. For
// every other account type this is the regular derived address.
export const getWalletFundingAddress = async (
  account: Account,
  addressPrefix: string,
): Promise<string> => {
  if (isSessionAccount(account)) {
    return account.getMasterAddress();
  }
  return account.getAddress(addressPrefix);
};
