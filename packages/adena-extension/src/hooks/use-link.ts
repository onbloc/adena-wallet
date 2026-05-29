import { SCANNER_URL } from '@common/constants/resource.constant';
import { normalizeGnoscanTxHash } from '@common/utils/gnoscan-url';
import { createRegisterUrl } from '@common/utils/register-url';
import { makeQueryString } from '@common/utils/string-utils';
import { RoutePath, SECURITY_PATH } from '@types';
import { useNetwork } from './use-network';
import { useNetworkProfile } from './use-network-profile';

export type UseLinkReturn = {
  openLink: (link: string) => void;
  openScannerLink: (path: string, parameters?: { [key in string]: string }) => void;
  openRegister: (route?: RoutePath) => void;
  openSecurity: () => void;
};

const useLink = (): UseLinkReturn => {
  const { scannerParameters } = useNetwork();
  const profile = useNetworkProfile();

  const openLink = (link: string): void => {
    window.open(link, '_blank');
  };

  const openScannerLink = (path: string, parameters: { [key in string]: string } = {}): void => {
    const scannerUrl = profile?.linkUrl || SCANNER_URL;
    // Broadcast results pass a hex tx hash; the scanner expects the base64 hash.
    const normalizedParameters = parameters.txhash
      ? { ...parameters, txhash: normalizeGnoscanTxHash(parameters.txhash) }
      : parameters;
    const queryString = scannerParameters
      ? makeQueryString({ ...scannerParameters, ...normalizedParameters })
      : makeQueryString(normalizedParameters);
    const link = `${scannerUrl}${path}?${queryString}`;

    openLink(link);
  };

  const openRegister = (route?: RoutePath): void => {
    window.open(createRegisterUrl(route), '_blank');
  };

  const openSecurity = (): void => {
    window.open(SECURITY_PATH, '_blank');
  };

  return { openLink, openScannerLink, openRegister, openSecurity };
};

export default useLink;
