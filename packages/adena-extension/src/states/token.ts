import { TokenModel } from '@types';
import { atom } from 'jotai';

export const tokenMetainfos = atom<TokenModel[]>([]);

export const accountTokenMetainfos = atom<TokenModel[]>([]);

export const tokenLogoMap = atom<Record<string, string | null>>({});
