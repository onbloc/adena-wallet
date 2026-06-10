import { WalletResponseFailureType } from '@adena-wallet/sdk';

import { InjectionMessage, InjectionMessageInstance } from './message';

export const createSessionAccountUnsupportedResponse = (
  key?: string,
): InjectionMessage =>
  InjectionMessageInstance.failure(WalletResponseFailureType.UNSUPPORTED_TYPE, {}, key);
