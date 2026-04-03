import {
  TokenModel,
} from '@types'
import {
  atom,
} from 'recoil'

export const tokenMetainfos = atom<TokenModel[]>({
  key: 'token/tokenMetainfos',
  default: [],
})

export const accountTokenMetainfos = atom<TokenModel[]>({
  key: 'token/accountTokenMetainfos',
  default: [],
})

export const tokenLogoMap = atom<Record<string, string | null>>({
  key: 'token/tokenLogoMap',
  default: {
  },
})
