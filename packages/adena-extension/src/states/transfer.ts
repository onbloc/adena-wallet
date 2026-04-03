import { GasInfo, TokenModel } from '@types';
import { atom } from 'recoil';

export interface TransferInfo {
  tokenMetainfo: TokenModel;
  toAddress: string;
  transferAmount: {
    value: string;
    denom: string;
  };
  gasInfo: GasInfo | null;
  memo: string;
}

export const memorizedTransferInfo = atom<TransferInfo | null>({
  key: 'transfer/transfer-info',
  default: null,
});
