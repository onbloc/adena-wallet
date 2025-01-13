import { NetworkFee, TokenModel } from '@types';
import { atom } from 'recoil';

export interface TransferInfo {
  tokenMetainfo: TokenModel;
  toAddress: string;
  transferAmount: {
    value: string;
    denom: string;
  };
  networkFee: NetworkFee | null;
  memo: string;
}

export const memorizedTransferInfo = atom<TransferInfo | null>({
  key: 'transfer/transfer-info',
  default: null,
});
