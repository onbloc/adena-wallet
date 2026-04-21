import { TokenProfile } from '../types';

export const UGNOT: TokenProfile = {
  id: 'gnoland1:ugnot',
  chainProfileId: 'gnoland1',
  symbol: 'GNOT',
  name: 'Gno',
  decimals: 6,
  iconUrl: '/assets/icons/gnoland.svg',
  origin: { kind: 'gno-native', denom: 'ugnot' },
  tags: ['native', 'fee', 'staking'],
  priceId: 'gnoland',
};

export const UATONE: TokenProfile = {
  id: 'atomone-1:uatone',
  chainProfileId: 'atomone-1',
  symbol: 'ATONE',
  name: 'AtomOne',
  decimals: 6,
  iconUrl: '/assets/icons/atone.svg',
  origin: { kind: 'cosmos-native', denom: 'uatone' },
  tags: ['native', 'staking', 'governance'],
  priceId: 'atomone',
};

export const UPHOTON: TokenProfile = {
  id: 'atomone-1:uphoton',
  chainProfileId: 'atomone-1',
  symbol: 'PHOTON',
  name: 'Photon',
  decimals: 6,
  iconUrl: '/assets/icons/photon.svg',
  origin: { kind: 'cosmos-native', denom: 'uphoton' },
  tags: ['native', 'fee'],
  priceId: 'photon',
};

export const ALL_TOKENS: TokenProfile[] = [UGNOT, UATONE, UPHOTON];
