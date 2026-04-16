const addressCache = new WeakMap<object, Map<string, string>>();

/**
 * Resolve an address for the given prefix, caching the result in a module-level WeakMap.
 *
 * This keeps Account instances fully immutable (no internal mutation), which is required
 * when accounts are stored in Recoil atoms that deep-freeze their values.
 *
 * The cache lives as long as the Account instance is reachable — WeakMap entries are
 * automatically collected when the instance is GC'd.
 */
export async function resolveAddressCached(
  account: { getAddress: (prefix: string) => Promise<string> },
  prefix: string,
): Promise<string> {
  let entry = addressCache.get(account);
  if (!entry) {
    entry = new Map<string, string>();
    addressCache.set(account, entry);
  }
  const cached = entry.get(prefix);
  if (cached !== undefined) return cached;
  const address = await account.getAddress(prefix);
  entry.set(prefix, address);
  return address;
}
