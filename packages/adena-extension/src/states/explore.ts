import { atom } from 'jotai';

interface SiteInfo {
  symbol: string;
  name: string;
  description: string;
  logo: string;
  link: string;
  display: boolean;
  order: number;
}

export const sites = atom<Array<SiteInfo>>([]);
