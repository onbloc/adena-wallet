export type TokenType = 'NATIVE' | 'GRC20' | 'GRC721';

export interface Token {
  id: string;
  main: boolean;
  type: TokenType;
  name: string;
  symbol: string;
  decimals: number;
  denom: string;
  minimalDenom: string;
}
