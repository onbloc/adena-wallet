export type NativeTokenResponse = NativeTokenInfo[];
export type GRC20TokenResponse = GRC20TokenInfo[];

interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  description?: string;
  website_url?: string;
  image: string;
}

interface NativeTokenInfo extends TokenInfo {
  denom: string;
}

interface GRC20TokenInfo extends TokenInfo {
  pkg_path: string;
  // Direct MsgCall shape into the token realm. Absent means MsgRun fallback.
  routes?: unknown;
}

export interface TokenMetaResponse {
  items: {
    tokenType?: string;
    path: string;
    name: string;
    symbol: string;
    decimals: number;
    logoUrl: string | null;
  }[];
}

export interface AccountAsset {
  address: string;
  amount: string;
  decimals: number;
  logoUrl: string | null;
  name: string;
  packagePath: string;
  symbol: string;
  tokenType: string;
  // Opaque on-chain value (`{packagePath}.{symbol}.{sequence}`) — not the wallet's tokenId.
  tokenId: string;
  // Canonical `{packagePath}.{symbol}` key, maps to the wallet tokenId. Absent on older API versions.
  tokenKey?: string;
}

export interface AccountAssetsResponse {
  data: {
    address: string;
    assets: AccountAsset[];
  };
}
