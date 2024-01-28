import { WEB_BASE_PATH } from '@types';

export type UseLinkReturn = {
  openLink: (link: string) => void;
  openWebLink: (link: string) => void;
};

const useLink = (): UseLinkReturn => {
  const openLink = (link: string): void => {
    window.open(link, '_blank');
  };
  const openWebLink = (link: string): void => {
    window.open(WEB_BASE_PATH + link, '_blank');
  };
  return { openLink, openWebLink };
};

export default useLink;
