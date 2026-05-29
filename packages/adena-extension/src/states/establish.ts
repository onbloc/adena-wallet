import { atom } from 'recoil';

export const establishRevisionState = atom<number>({
  key: 'establishRevision',
  default: 0,
});
