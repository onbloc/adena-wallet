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

// Returns the address that wallet funding flows (send from_address/caller,
// deposit/QR, copy-to-clipboard) must use. For SessionAccount this is the
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

// The one policy for "whose balance does this account actually control?".
//
// An ACTIVE session spends master funds, so its balance is the master's. Once
// revoked it can spend nothing but the key it still holds, so the balance that
// means anything is the session address's own. Non-session accounts are never
// revoked and both addresses are the same.
//
// Every surface that renders a balance must go through here, or the main screen
// and the account list will disagree about the same account.
export const selectBalanceAddress = <T extends string | null>(
  ownAddress: T,
  fundingAddress: T,
  sessionRevoked: boolean,
): T => (sessionRevoked ? ownAddress : fundingAddress);
