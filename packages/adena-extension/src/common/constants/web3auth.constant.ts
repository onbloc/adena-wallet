// The same account resolves to a different key - and so a different address -
// on a different verifier. These values are public identifiers that ship inside
// the bundle; access is gated by the allowed origins on the Web3Auth, Google and
// Auth0 dashboards.

export interface Web3AuthVerifier {
  /** Client id issued by the Web3Auth dashboard project that owns the verifier. */
  web3AuthClientId: string;
  /** Web3Auth network the verifier is registered on. */
  web3AuthNetwork: 'mainnet' | 'testnet';
  /** Name of the custom verifier registered on that network. */
  verifier: string;
  /** Client id of the identity provider behind the verifier (Google OAuth, Auth0, ...). */
  authClientId: string;
  /** Auth0 domain, required by the providers Web3Auth reaches through a JWT verifier. */
  domain?: string;
}

// Accounts created before the production verifier can only be reached through
// the legacy one, so both stay selectable.
export type GoogleKeySetType = 'LEGACY' | 'PRODUCTION';

export const DEFAULT_GOOGLE_KEY_SET_TYPE: GoogleKeySetType = 'PRODUCTION';

export const GOOGLE_VERIFIERS: Record<GoogleKeySetType, Web3AuthVerifier> = {
  LEGACY: {
    web3AuthClientId: process.env.WEB3_AUTH_LEGACY_CLIENT_ID || '',
    web3AuthNetwork: 'testnet',
    verifier: process.env.GOOGLE_LEGACY_VERIFIER || '',
    authClientId: process.env.GOOGLE_LEGACY_CLIENT_ID || '',
  },

  // TODO: fill in the production verifier, or inject it through these env
  // variables. Signing in throws while any value is missing.
  PRODUCTION: {
    web3AuthClientId: process.env.WEB3_AUTH_PRODUCTION_CLIENT_ID || '',
    web3AuthNetwork: 'mainnet',
    verifier: process.env.GOOGLE_PRODUCTION_VERIFIER || '',
    authClientId: process.env.GOOGLE_PRODUCTION_CLIENT_ID || '',
  },
};

// Email and X share one Web3Auth project today, hence the shared client id.
export const EMAIL_VERIFIER: Web3AuthVerifier = {
  web3AuthClientId:
    process.env.WEB3_AUTH_EMAIL_CLIENT_ID || process.env.WEB3_AUTH_X_CLIENT_ID || '',
  web3AuthNetwork: 'mainnet',
  verifier: process.env.EMAIL_VERIFIER_NAME || '',
  authClientId: process.env.EMAIL_CLIENT_ID || '',
  domain: process.env.EMAIL_AUTH0_DOMAIN || '',
};

// TODO: fill in the X verifier. Web3Auth reaches X through an Auth0 JWT
// verifier, hence the domain.
export const X_VERIFIER: Web3AuthVerifier = {
  web3AuthClientId: process.env.WEB3_AUTH_X_CLIENT_ID || '',
  web3AuthNetwork: 'mainnet',
  verifier: process.env.X_VERIFIER_NAME || '',
  authClientId: process.env.X_CLIENT_ID || '',
  domain: process.env.X_AUTH0_DOMAIN || '',
};
