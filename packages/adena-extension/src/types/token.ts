import { BaseError } from '@common/errors';
import { AddingType } from '@components/pages/additional-token/additional-token-type-selector';

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
  type: 'token';
  logo: string;
  name: string;
  display?: boolean;
  main?: boolean;
  balance: {
    value: string;
    denom: string;
  };
}

export interface ManageGRC721Info {
  tokenId: string;
  packagePath: string;
  type: 'grc721';
  isTokenUri: boolean;
  name: string;
  display?: boolean;
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
  addingType: AddingType;
  selected: boolean;
  keyword: string;
  manualTokenPath: string;
  tokenInfos: TokenInfo[];
  selectedTokenPath: string | null;
  selectedTokenInfo: TokenInfo | null;
  isLoadingManualGRC20Token: boolean;
  isLoadingSelectedGRC20Token: boolean;
  errorManualGRC20Token: BaseError | null;
  selectAddingType: (type: AddingType) => void;
  onChangeKeyword: (keyword: string) => void;
  onChangeManualTokenPath: (keyword: string) => void;
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

export interface GRC721CollectionModel {
  tokenId: string;
  networkId: string;
  display: boolean;
  type: 'grc721';
  packagePath: string;
  name: string;
  symbol: string;
  image: string | null;
  isTokenUri: boolean;
  isMetadata: boolean;
}

export interface GRC721Model {
  tokenId: string;
  networkId: string;
  type: 'grc721';
  packagePath: string;
  name: string;
  symbol: string;
  isTokenUri: boolean;
  isMetadata: boolean;
  metadata: GRC721MetadataModel | null;
}

export interface GRC721MetadataModel {
  name: string;
  image: string;
  imageData: string;
  externalUrl: string;
  description: string;
  backgroundColor: string;
  animationUrl: string;
  youtubeUrl: string;
  attributes: {
    displayType: string;
    traitType: string;
    value: string;
  }[];
}
