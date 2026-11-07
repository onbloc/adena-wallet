import {MemoryProvider} from '@common/provider/memory/memory-provider';
import {MessageHandler} from '@inject/message/message-handler';
import type {InjectionMessage} from '@inject/message/message';

// Shared by every page: holds nothing secret on mobile (the session key lives
// in the in-process BackgroundMessenger), but MessageHandler requires one.
const memoryProvider = new MemoryProvider();

/** Hands an already-validated request (see page-message.ts) to the extension's MessageHandler. */
export function routeToWallet(
  message: InjectionMessage,
  nativeUrl: string,
  nativeOrigin: string,
  reply: (response: unknown) => void,
): void {
  MessageHandler.createHandler(
    memoryProvider,
    message,
    {url: nativeUrl, origin: nativeOrigin},
    reply,
  );
}
