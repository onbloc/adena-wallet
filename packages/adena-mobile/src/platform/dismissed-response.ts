import type {InjectionMessage} from '@inject/message/message';

/**
 * Reply for a dApp request that was dismissed without a user decision (the
 * wallet locked, or another request replaced it). Mirrors
 * `InjectionMessageInstance.failure(UNEXPECTED_ERROR, {}, key)` without
 * importing `@adena-wallet/sdk`, whose entry point also loads Web3Auth; a test
 * pins the values to the SDK's `WalletMessageInfo.UNEXPECTED_ERROR`.
 */
export const makeDismissedResponse = (
  request: InjectionMessage,
): InjectionMessage =>
  ({
    code: 9000,
    status: 'failure',
    type: 'UNEXPECTED_ERROR',
    message: 'Adena has encountered an unexpected error.',
    data: {},
    key: request.key,
  } as unknown as InjectionMessage);
