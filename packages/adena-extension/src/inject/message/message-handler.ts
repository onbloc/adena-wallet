import { WalletResponseFailureType } from '@adena-wallet/sdk';
import { MemoryProvider } from '@common/provider/memory/memory-provider';
import { HandlerMethod } from '.';
import { CommandMessageData } from './command-message';
import { InjectionMessage, InjectionMessageInstance } from './message';
import { existsPopups, removePopups } from './methods';
import { InjectCore } from './methods/core';

export class MessageHandler {
  public static createHandler = (
    inMemoryProvider: MemoryProvider,
    message: InjectionMessage | CommandMessageData | any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: InjectionMessage | CommandMessageData | any) => void,
  ): boolean => {
    try {
      if (message?.status) {
        const status = message?.status;
        switch (status) {
          case 'request':
            this.requestHandler(inMemoryProvider, message, sender, sendResponse);
            break;
          case 'failure':
          case 'success':
            sendResponse(message);
            break;
          case 'common':
          case 'response':
          default:
            sendResponse(message);
            break;
        }
      } else {
        sendResponse(message);
      }
    } catch (error) {
      console.warn(error);
    }
    return true;
  };

  private static requestHandler = async (
    inMemoryProvider: MemoryProvider,
    message: InjectionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void,
  ): Promise<true | undefined> => {
    const core = new InjectCore(inMemoryProvider);

    let existsWallet = false;

    try {
      const currentAccountId = await core.getCurrentAccountId();
      existsWallet = currentAccountId?.length > 0;
    } catch (e) {
      existsWallet = false;
    }

    if (!existsWallet) {
      sendResponse(
        InjectionMessageInstance.failure(WalletResponseFailureType.NO_ACCOUNT, {}, message.key),
      );
      return;
    }

    const isPopup = await existsPopups();
    if (isPopup) {
      await removePopups();
    }

    switch (message.type) {
      case 'DO_CONTRACT':
        HandlerMethod.checkEstablished(core, message, sendResponse).then((isEstablished) => {
          if (isEstablished) {
            HandlerMethod.doContract(message, sendResponse);
          }
        });
        break;
      case 'GET_ACCOUNT':
        HandlerMethod.checkEstablished(core, message, sendResponse)
          .then((isEstablished) => {
            if (isEstablished) {
              HandlerMethod.getAccount(core, message, sendResponse);
            }
          })
          .catch(() => {
            sendResponse(
              InjectionMessageInstance.failure(
                WalletResponseFailureType.UNRESOLVED_TRANSACTION_EXISTS,
                message,
                message.key,
              ),
            );
          });
        break;
      case 'GET_NETWORK':
        HandlerMethod.checkEstablished(core, message, sendResponse)
          .then((isEstablished) => {
            if (isEstablished) {
              HandlerMethod.getNetwork(core, message, sendResponse);
            }
          })
          .catch(() => {
            sendResponse(
              InjectionMessageInstance.failure(
                WalletResponseFailureType.UNRESOLVED_TRANSACTION_EXISTS,
                message,
                message.key,
              ),
            );
          });
        break;
      case 'ADD_ESTABLISH':
        HandlerMethod.addEstablish(core, message, sendResponse);
        break;
      case 'ADD_NETWORK':
        HandlerMethod.checkEstablished(core, message, sendResponse).then((isEstablished) => {
          if (isEstablished) {
            HandlerMethod.addNetwork(core, message, sendResponse);
          }
        });
        break;
      case 'SWITCH_NETWORK':
        HandlerMethod.checkEstablished(core, message, sendResponse)
          .then((isEstablished) => {
            if (isEstablished) {
              HandlerMethod.switchNetwork(core, message, sendResponse);
            }
          })
          .catch(() => {
            sendResponse(
              InjectionMessageInstance.failure(
                WalletResponseFailureType.UNEXPECTED_ERROR,
                message,
                message.key,
              ),
            );
          });
        break;
      case 'SIGN_AMINO':
        HandlerMethod.checkEstablished(core, message, sendResponse).then((isEstablished) => {
          if (isEstablished) {
            HandlerMethod.signAmino(message, sendResponse);
          }
        });
        break;
      case 'SIGN_TX':
        HandlerMethod.checkEstablished(core, message, sendResponse).then((isEstablished) => {
          if (isEstablished) {
            HandlerMethod.signTransaction(message, sendResponse);
          }
        });
        break;
      case 'CREATE_MULTISIG_ACCOUNT':
        HandlerMethod.checkEstablished(core, message, sendResponse).then((isEstablished) => {
          if (isEstablished) {
            HandlerMethod.createMultisigAccount(message, sendResponse);
          }
        });
        break;
      case 'SIGN_DOCUMENT':
        HandlerMethod.checkEstablished(core, message, sendResponse).then((isEstablished) => {
          if (isEstablished) {
            HandlerMethod.signDocument(message, sendResponse);
          }
        });
        break;
      case 'CREATE_MULTISIG_DOCUMENT':
        HandlerMethod.checkEstablished(core, message, sendResponse).then((isEstablished) => {
          if (isEstablished) {
            HandlerMethod.createMultisigDocument(message, sendResponse);
          }
        });
      default:
        break;
    }
  };
}
