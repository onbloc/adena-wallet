import { SCANNER_URL } from '@common/constants/resource.constant';
import { makeQueryString } from '@common/utils/string-utils';
import { REGISTER_PATH, SECURITY_PATH } from '@types';
import { useNetwork } from './use-network';
import { useNetworkProfile } from './use-network-profile';

export type UseLinkReturn = {
  openLink: (link: string) => void;
  openScannerLink: (path: string, parameters?: { [key in string]: string }) => void;
  openRegister: () => void;
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
    const queryString = scannerParameters
      ? makeQueryString({ ...scannerParameters, ...parameters })
      : makeQueryString(parameters);
    const link = `${scannerUrl}${path}?${queryString}`;

    openLink(link);
  };

  const openRegister = (): void => {
    window.open(REGISTER_PATH, '_blank');
  };

  const openSecurity = (): void => {
    window.open(SECURITY_PATH, '_blank');
  };

  return { openLink, openScannerLink, openRegister, openSecurity };
};

export default useLink;
