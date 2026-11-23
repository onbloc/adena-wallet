export const ActivityType = {
  TRANSFER: 'TRANSFER',
  TRANSFER_GRC721: 'TRANSFER_GRC721',
  ADD_PACKAGE: 'ADD_PACKAGE',
  CONTRACT_CALL: 'CONTRACT_CALL',
  MULTI_CONTRACT_CALL: 'MULTI_CONTRACT_CALL',
} as const;

export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

export const ActivityStatus = {
  SUCCESS: 'SUCCESS',
  FAIL: 'FAIL',
} as const;

export type ActivityStatus = (typeof ActivityStatus)[keyof typeof ActivityStatus];

export const ActivityDirection = {
  IN: 'in',
  OUT: 'out',
  NONE: 'none',
} as const;

export type ActivityDirection = (typeof ActivityDirection)[keyof typeof ActivityDirection];

export const ActivityFilterKind = {
  ALL: 'all',
  NATIVE: 'native',
  GRC20: 'grc20',
} as const;

export type ActivityFilterKind = (typeof ActivityFilterKind)[keyof typeof ActivityFilterKind];

export interface ActivityAmount {
  // Raw integer amount in the smallest unit of `denom`.
  value: string;
  // Native denom ("ugnot"), GRC20 registry key or GRC721 package path.
  denom: string;
}

export interface Activity {
  hash: string;
  height?: number;
  type: ActivityType;
  typeName?: string;
  title: string;
  status: ActivityStatus;
  direction: ActivityDirection;
  amount?: ActivityAmount;
  networkFee?: ActivityAmount;
  extraInfo?: string;
  from?: string;
  to?: string;
  // ISO-8601; filled from the block time when the source omits it.
  timestamp?: string;
}

export type ActivityFilter
  = | { kind: typeof ActivityFilterKind.ALL }
    | { kind: typeof ActivityFilterKind.NATIVE; denom: string }
    | { kind: typeof ActivityFilterKind.GRC20; tokenId: string; pkgPath: string };
