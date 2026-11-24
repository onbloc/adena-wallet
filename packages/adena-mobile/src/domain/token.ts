import { ChainFamily } from './network';

export const TokenType = {
  NATIVE: 'native',
  GRC20: 'grc20',
} as const;

export type TokenType = (typeof TokenType)[keyof typeof TokenType];

// Bundled icons resolved by the asset registry; remote URLs use imageUrl.
export type LocalTokenIcon = 'gnot' | 'atone' | 'photon';

// id: denom for native coins ("ugnot"), registry key "{pkgPath}.{symbol}" for GRC20.
export interface Token {
  id: string;
  networkId: string;
  family: ChainFamily;
  type: TokenType;
  name: string;
  symbol: string;
  decimals: number;
  denom?: string;
  pkgPath?: string;
  imageUrl?: string;
  localIcon?: LocalTokenIcon;
  description?: string;
  websiteUrl?: string;
  isNative: boolean;
}

export const TokenSource = {
  DEFAULT: 'default',
  DISCOVERED: 'discovered',
  CUSTOM: 'custom',
} as const;

export type TokenSource = (typeof TokenSource)[keyof typeof TokenSource];

export interface ManagedToken extends Token {
  visible: boolean;
  source: TokenSource;
  // Present in the bundled/curated token resources at the last refresh.
  listed?: boolean;
}

// Discovered tokens outside the curated resources; never the native coin or a token the user added.
export const isUnknownToken = (token: ManagedToken): boolean =>
  !token.isNative && token.source === TokenSource.DISCOVERED && !token.listed;

export interface TokenHolding {
  token: Token;
  // Raw integer amount in the smallest unit; undefined while unknown.
  amount?: string;
}

export interface TokenPrice {
  tokenId: string;
  networkId: string;
  // USD per whole token.
  usd: number;
  // Percent, e.g. 3.9 for +3.90%.
  change24h: number | null;
}

export const tokenPriceKey = (tokenId: string, networkId: string): string => `${tokenId}:${networkId}`;
