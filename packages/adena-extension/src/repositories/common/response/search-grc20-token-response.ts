export type SearchGRC20TokenResponse = SearchGRC20Token[];

export interface SearchGRC20Token {
  pkg_path: string;
  name: string;
  symbol: string;
  decimals: number;
}
