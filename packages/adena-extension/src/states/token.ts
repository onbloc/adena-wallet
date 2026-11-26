import { TokenModel } from '@types';
import { atom } from 'jotai';

export const tokenMetainfos = atom<TokenModel[]>([]);
