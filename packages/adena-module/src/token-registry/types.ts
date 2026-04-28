export interface TokenProfile {
  id: string;
  chainProfileId: string;
  symbol: string;
  name: string;
  decimals: number;
  iconUrl?: string;
  priceId?: string;
  origin:
    | { kind: 'cosmos-native'; denom: string }
    | { kind: 'cosmos-ibc'; ibcDenom: string; baseDenom?: string; path?: string }
    | { kind: 'cosmos-factory'; denom: string }
    | { kind: 'gno-native'; denom: string };
  tags?: ('native' | 'fee' | 'staking' | 'governance' | 'ibc' | 'hidden')[];
}

export interface TokenRegistry {
  register(token: TokenProfile): void;
  get(id: string): TokenProfile | undefined;
  list(chainProfileId?: string): TokenProfile[];
}
