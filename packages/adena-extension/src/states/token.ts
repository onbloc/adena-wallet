import { TokenModel } from '@models/token-model';
import { atom } from 'recoil';

export const tokenMetainfos = atom<TokenModel[]>({
  key: 'token/tokenMetainfos',
  default: [],
});

export const accountTokenMetainfos = atom<TokenModel[]>({
  key: 'token/accountTokenMetainfos',
  default: [],
});
