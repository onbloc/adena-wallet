import {
  GnoSocialWalletProvider,
  SocialEmailPasswordlessConfigure,
  SocialGoogleConfigure,
  SocialTwitterConfigure,
} from '@adena-wallet/sdk';
import { arrayToHex } from 'adena-module';

import { Web3AuthVerifier } from '@common/constants/web3auth.constant';
import { NetworkMetainfo } from '@types';

const SOCIAL_LOGIN_APP_NAME = 'Adena';

export type SocialProvider = 'GOOGLE' | 'EMAIL' | 'X';

// Google sends googleClientId as the login client id, and X sends authClientId
// plus the Auth0 domain through jwtParameters. The SDK's email_passwordless
// path sends neither - only the Web3Auth client id and the verifier - so email
// must not demand Auth0 values it never uses.
const REQUIRED_VERIFIER_FIELDS: Record<SocialProvider, (keyof Web3AuthVerifier)[]> = {
  GOOGLE: ['web3AuthClientId', 'verifier', 'authClientId'],
  EMAIL: ['web3AuthClientId', 'verifier'],
  X: ['web3AuthClientId', 'verifier', 'authClientId', 'domain'],
};

function getMissingVerifierFields(
  verifier: Web3AuthVerifier,
  provider: SocialProvider,
): (keyof Web3AuthVerifier)[] {
  return REQUIRED_VERIFIER_FIELDS[provider].filter((field) => !verifier[field]);
}

/**
 * Verifier values arrive from CI secrets at build time, so an unconfigured
 * provider is a normal state. Screens check this up front and keep the entry
 * point disabled instead of walking the user into a dead end.
 */
export function isVerifierConfigured(
  verifier: Web3AuthVerifier,
  provider: SocialProvider,
): boolean {
  return getMissingVerifierFields(verifier, provider).length === 0;
}

function assertConfigured(verifier: Web3AuthVerifier, provider: SocialProvider): void {
  const missingFields = getMissingVerifierFields(verifier, provider);
  if (missingFields.length > 0) {
    throw new Error(
      `Incomplete ${provider} Web3Auth verifier. Missing values: ${missingFields.join(', ')}.`,
    );
  }
}

function createBaseConfig(
  verifier: Web3AuthVerifier,
  network: NetworkMetainfo,
): Omit<SocialGoogleConfigure, 'authClientId' | 'googleClientId' | 'verifier'> {
  return {
    chainId: network.chainId,
    name: SOCIAL_LOGIN_APP_NAME,
    rpcTarget: network.rpcUrl,
    network: verifier.web3AuthNetwork,
    clientId: verifier.web3AuthClientId,
    addressPrefix: network.addressPrefix,
  };
}

export function createGoogleLoginConfig(
  verifier: Web3AuthVerifier,
  network: NetworkMetainfo,
): SocialGoogleConfigure {
  assertConfigured(verifier, 'GOOGLE');
  return {
    ...createBaseConfig(verifier, network),
    verifier: verifier.verifier,
    authClientId: verifier.authClientId || '',
    googleClientId: verifier.authClientId || '',
  };
}

export function createEmailLoginConfig(
  verifier: Web3AuthVerifier,
  network: NetworkMetainfo,
  email: string,
): SocialEmailPasswordlessConfigure {
  assertConfigured(verifier, 'EMAIL');
  return {
    ...createBaseConfig(verifier, network),
    verifier: verifier.verifier,
    // Required by the SDK type but unused on its email_passwordless path.
    authClientId: '',
    domain: '',
    email,
  };
}

export function createXLoginConfig(
  verifier: Web3AuthVerifier,
  network: NetworkMetainfo,
): SocialTwitterConfigure {
  assertConfigured(verifier, 'X');
  return {
    ...createBaseConfig(verifier, network),
    verifier: verifier.verifier,
    authClientId: verifier.authClientId || '',
    domain: verifier.domain || '',
  };
}

/**
 * Adena stores the derived key in its own vault instead of keeping the Web3Auth
 * session alive. The SDK keeps `requestPrivateKey()` internal, but the wallet it
 * builds exposes the same key through the signer.
 */
export async function requestSocialPrivateKey(provider: GnoSocialWalletProvider): Promise<string> {
  const wallet = provider.getWallet();
  if (!wallet) {
    throw new Error('Social login provider has no connected wallet.');
  }
  const privateKey = await wallet.getSigner().getPrivateKey();
  return arrayToHex(privateKey);
}
