// Returns the chainGroup that owns the given bech32 address prefix.
// Falls back to 'gno' for unknown or partial input so the form keeps a
// usable default while the user is still typing.
export function inferChainGroup(address: string): string {
  if (address.startsWith('atone')) return 'atomone';
  return 'gno';
}
