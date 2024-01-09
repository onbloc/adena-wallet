export type UseLinkReturn = {
  openLink: (link: string) => void;
};

const useLink = (): UseLinkReturn => {
  const openLink = (link: string): void => {
    window.open(link, '_blank');
  };
  return { openLink };
};

export default useLink;
