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

const REQUIRED_VERIFIER_FIELDS: (keyof Web3AuthVerifier)[] = [
  'web3AuthClientId',
  'verifier',
  'authClientId',
];

function getMissingVerifierFields(verifier: Web3AuthVerifier): (keyof Web3AuthVerifier)[] {
  const missingFields = REQUIRED_VERIFIER_FIELDS.filter((field) => !verifier[field]);
  // X reaches Web3Auth through an Auth0 JWT verifier, so it needs the domain too.
  if (verifier.domain !== undefined && !verifier.domain) {
    return [...missingFields, 'domain'];
  }
  return missingFields;
}

/**
 * Verifier values arrive from CI secrets at build time, so an unconfigured
 * provider is a normal state. Screens check this up front and go straight to the
 * failure step instead of walking the user through the flow first.
 */
export function isVerifierConfigured(verifier: Web3AuthVerifier): boolean {
  return getMissingVerifierFields(verifier).length === 0;
}

function assertConfigured(verifier: Web3AuthVerifier, provider: string): void {
  const missingFields = getMissingVerifierFields(verifier);
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
  assertConfigured(verifier, 'Google');
  return {
    ...createBaseConfig(verifier, network),
    verifier: verifier.verifier,
    authClientId: verifier.authClientId,
    googleClientId: verifier.authClientId,
  };
}

export function createEmailLoginConfig(
  verifier: Web3AuthVerifier,
  network: NetworkMetainfo,
  email: string,
): SocialEmailPasswordlessConfigure {
  assertConfigured(verifier, 'Email');
  return {
    ...createBaseConfig(verifier, network),
    verifier: verifier.verifier,
    authClientId: verifier.authClientId,
    domain: verifier.domain || '',
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
    authClientId: verifier.authClientId,
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
