export interface TokenModel {
  main: boolean;
  tokenId: string;
  networkId: string;
  display: boolean;
  type: 'gno-native' | 'grc20' | 'ibc-native' | 'ibc-tokens';
  name: string;
  symbol: string;
  decimals: number;
  description?: string;
  websiteUrl?: string;
  image: string;
}

export interface NativeTokenModel extends TokenModel {
  denom: string;
}

export interface GRC20TokenModel extends TokenModel {
  pkgPath: string;
}

export interface IBCNativeTokenModel extends TokenModel {
  denom: string;
}

export interface IBCTokenModel extends TokenModel {
  denom: string;
  originChain: string;
  originDenom: string;
  originType: string;
  path: string;
  channel: string;
  port: string;
}

export interface ManageTokenInfo {
  tokenId: string;
  logo: string;
  symbol: string;
  name: string;
  display?: boolean;
  main?: boolean;
  balanceAmount: {
    value: string;
    denom: string;
  };
}

export interface TokenInfo {
  tokenId: string;
  name: string;
  symbol: string;
  path: string;
  pathInfo: string;
  decimals: number;
  chainId: string;
}

export interface AdditionalTokenProps {
  opened: boolean;
  selected: boolean;
  keyword: string;
  tokenInfos: TokenInfo[];
  selectedTokenInfo?: TokenInfo;
  onChangeKeyword: (keyword: string) => void;
  onClickOpenButton: (opened: boolean) => void;
  onClickListItem: (tokenId: string) => void;
  onClickBack: () => void;
  onClickCancel: () => void;
  onClickAdd: () => void;
}

export interface AdditionalTokenSelectBoxProps {
  opened: boolean;
  keyword: string;
  selected: boolean;
  selectedInfo: {
    name: string;
    symbol: string;
  } | null;
  tokenInfos: TokenInfo[];
  onChangeKeyword: (keyword: string) => void;
  onClickOpenButton: (opened: boolean) => void;
  onClickListItem: (tokenId: string) => void;
}

export interface MainToken {
  tokenId: string;
  logo: string;
  name: string;
  balanceAmount: {
    value: string;
    denom: string;
  };
}
