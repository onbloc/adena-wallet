// The mock wallet's own token model: two tokens, assumed. The agent knows no token list; a real
// wallet resolves any token itself.

export const TokenSymbol = {
  Gnot: 'GNOT',
  Gns: 'GNS',
} as const;
export type TokenSymbol = (typeof TokenSymbol)[keyof typeof TokenSymbol];

/** Decimal-string balance per token. */
export type Balances = Record<TokenSymbol, string>;

export const TOKEN_SYMBOLS = Object.values(TokenSymbol);

// Assumed for the mock; not verified against the real tokens.
export const TOKEN_DECIMALS: Record<TokenSymbol, number> = {
  [TokenSymbol.Gnot]: 6,
  [TokenSymbol.Gns]: 6,
};
