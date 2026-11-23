export interface DappMetadata {
  name: string;
  url?: string;
  icon?: string;
}

export interface ConnectedApp {
  // Normalized callback origin, e.g. "https://app.example.com" or "exampleapp:".
  origin: string;
  name: string;
  icon?: string;
  networkId: string;
  accountId: string;
  connectedAt: number;
  lastUsedAt: number;
}

export const DappMethod = {
  CONNECT: 'connect',
  SIGN_TRANSACTION: 'sign-transaction',
  SIGN_AND_BROADCAST: 'sign-and-broadcast',
} as const;

export type DappMethod = (typeof DappMethod)[keyof typeof DappMethod];

export const DappResponseStatus = {
  SUCCESS: 'success',
  FAILURE: 'failure',
} as const;

export type DappResponseStatus = (typeof DappResponseStatus)[keyof typeof DappResponseStatus];

interface DappRequestBase {
  requestId: string;
  method: DappMethod;
  callbackUrl: string;
  callbackOrigin: string;
  dapp: DappMetadata;
  chainId?: string;
  expiresAt?: number;
  receivedAt: number;
}

export interface DappConnectRequest extends DappRequestBase {
  method: typeof DappMethod.CONNECT;
}

export interface DappTransactionRequest extends DappRequestBase {
  method: typeof DappMethod.SIGN_TRANSACTION | typeof DappMethod.SIGN_AND_BROADCAST;
  chainId: string;
  // Raw chain messages; validated by the chain adapter before review.
  messages: unknown[];
  memo: string;
  gasWanted?: string;
  gasFee?: string;
}

export type DappRequest = DappConnectRequest | DappTransactionRequest;

export interface DappResponse {
  requestId: string;
  status: DappResponseStatus;
  data?: Record<string, unknown>;
  error?: { code: string; message: string };
}
