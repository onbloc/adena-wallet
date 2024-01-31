import { REGISTER_PATH, SECURITY_PATH } from '@types';

export type UseLinkReturn = {
  openLink: (link: string) => void;
  openRegister: () => void;
  openSecurity: () => void;
};

const useLink = (): UseLinkReturn => {
  const openLink = (link: string): void => {
    window.open(link, '_blank');
  };
  const openRegister = (): void => {
    window.open(REGISTER_PATH, '_blank');
  };
  const openSecurity = (): void => {
    window.open(SECURITY_PATH, '_blank');
  };
  return { openLink, openRegister, openSecurity };
};

export default useLink;
