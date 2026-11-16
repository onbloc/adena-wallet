import type { ChainRegistry } from 'adena-module';

// Returns the chainGroup that owns the given bech32 address prefix.
// Sorts registered chains by prefix length (longest first) so a chain
// with a longer prefix wins over one whose prefix is a substring of it.
// Falls back to 'gno' for unknown or partial input so the form keeps a
// usable default while the user is still typing.
export function inferChainGroup(address: string, chainRegistry: ChainRegistry): string {
  const matched = chainRegistry
    .listChains()
    .slice()
    .sort((a, b) => b.bech32Prefix.length - a.bech32Prefix.length)
    .find((chain) => address.startsWith(chain.bech32Prefix + '1'));
  return matched?.chainGroup ?? 'gno';
}
