import { TokenModel } from '@types';
import { atom } from 'recoil';

export interface TransferInfo {
  tokenMetainfo: TokenModel;
  toAddress: string;
  transferAmount: {
    value: string;
    denom: string;
  };
  networkFee: {
    value: string;
    denom: string;
  };
  memo: string;
}

export const memorizedTransferInfo = atom<TransferInfo | null>({
  key: 'transfer/transfer-info',
  default: null,
});
