import { TokenSymbol } from '../constants';

export const TOKEN_SYMBOLS = Object.values(TokenSymbol);

// Assumed for the mock; not verified against the real tokens.
export const TOKEN_DECIMALS: Record<TokenSymbol, number> = {
  [TokenSymbol.Gnot]: 6,
  [TokenSymbol.Gns]: 6,
};
