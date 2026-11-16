import { atom } from 'jotai';

import { TokenModel } from '@types';

export const tokenMetainfos = atom<TokenModel[]>([]);

export const accountTokenMetainfos = atom<TokenModel[]>([]);

export const tokenLogoMap = atom<Record<string, string | null>>({});
