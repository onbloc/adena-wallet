// Jest-only stand-in for `@web3auth/no-modal` (mapped in package.json). Its dependencies ship
// ESM that Jest's CommonJS runtime cannot load, and the Adena SDK imports it for the social
// wallet we never use. Same approach as the SDK's own tests: only what it touches at import time.
export const AUTH_CONNECTION = {
  GOOGLE: 'google',
  TWITTER: 'twitter',
  EMAIL_PASSWORDLESS: 'email_passwordless',
} as const;

export const CHAIN_NAMESPACES = {
  EIP155: 'eip155',
  SOLANA: 'solana',
  CASPER: 'casper',
  XRPL: 'xrpl',
  OTHER: 'other',
} as const;

export const CONNECTOR_STATUS = {
  NOT_READY: 'not_ready',
  READY: 'ready',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTING: 'disconnecting',
  DISCONNECTED: 'disconnected',
  ERRORED: 'errored',
} as const;

export const CONNECTOR_EVENTS = {
  ...CONNECTOR_STATUS,
  REHYDRATION_ERROR: 'rehydration_error',
} as const;

export const WALLET_CONNECTORS = {
  AUTH: 'auth',
} as const;

export class Web3AuthNoModal {
  constructor() {
    throw new Error('Web3AuthNoModal is not available in the Jest environment.');
  }
}
