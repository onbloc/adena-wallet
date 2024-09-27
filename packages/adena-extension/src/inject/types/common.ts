import { WalletResponse } from '@adena-wallet/sdk';

export type AdenaResponseStatus = 'success' | 'failure';

export type AdenaResponse<D> = WalletResponse<D>;

export const ADENA_SUCCESS_CODE = 0;
