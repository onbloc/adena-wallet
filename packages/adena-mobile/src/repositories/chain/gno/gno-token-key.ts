// GRC20 identity is the registry key "{pkgPath}.{symbol}"; the symbol starts after the first "." of the last segment.
export const parseRegistryKey = (key: string): { pkgPath: string; symbol: string } | null => {
  const slash = key.lastIndexOf('/');
  const dot = key.indexOf('.', slash + 1);

  if (slash < 0 || dot < 0 || dot === key.length - 1) {
    return null;
  }

  return { pkgPath: key.slice(0, dot), symbol: key.slice(dot + 1) };
};

export const toRegistryKey = (pkgPath: string, symbol: string): string => `${pkgPath}.${symbol}`;

// On-chain token ids carry a numeric sequence: "{pkgPath}.{symbol}.{seq}".
export const stripTokenSequence = (tokenId: string): string => {
  const match = /^(.+\/[^/]+\.[^./]+)\.\d+$/.exec(tokenId);

  return match ? match[1] : tokenId;
};
