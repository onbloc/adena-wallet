import { atom } from 'recoil';

export interface SiteInfo {
  symbol: string;
  name: string;
  description: string;
  logo: string;
  link: string;
  display: boolean;
  order: number;
}

export const sites = atom<Array<SiteInfo>>({
  key: 'explore/sites',
  default: [],
});
