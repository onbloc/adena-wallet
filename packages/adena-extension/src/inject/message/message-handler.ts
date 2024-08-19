import { HandlerMethod } from '.';
import { InjectionMessage, InjectionMessageInstance } from './message';
import { existsPopups, removePopups } from './methods';
import { InjectCore } from './methods/core';

export class MessageHandler {
  public static createHandler = (
    message: InjectionMessage | any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: InjectionMessage | any) => void,
  ): boolean => {
    try {
      if (message?.status) {
        const status = message?.status;
        switch (status) {
          case 'request':
            this.requestHandler(message, sender, sendResponse);
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
      }
    } catch (error) {
      console.error(error);
    }
    return true;
  };

  private static requestHandler = async (
    message: InjectionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void,
  ): Promise<true | undefined> => {
    let existsWallet = false;
    try {
      const core = new InjectCore();
      const currentAccountId = await core.getCurrentAccountId();
      existsWallet = currentAccountId?.length > 0;
    } catch (e) {
      existsWallet = false;
    }
    if (!existsWallet) {
      sendResponse(InjectionMessageInstance.failure('NO_ACCOUNT', {}, message.key));
      return;
    }
    const isPopup = await existsPopups();
    if (isPopup) {
      await removePopups();
    }
    switch (message.type) {
      case 'DO_CONTRACT':
        HandlerMethod.checkEstablished(message, sendResponse).then((isEstablished) => {
          if (isEstablished) {
            HandlerMethod.doContract(message, sendResponse);
          }
        });
        break;
      case 'GET_ACCOUNT':
        HandlerMethod.checkEstablished(message, sendResponse)
          .then((isEstablished) => {
            if (isEstablished) {
              HandlerMethod.getAccount(message, sendResponse);
            }
          })
          .catch(() => {
            sendResponse(
              InjectionMessageInstance.failure(
                'UNRESOLVED_TRANSACTION_EXISTS',
                message,
                message.key,
              ),
            );
          });
        break;
      case 'ADD_ESTABLISH':
        HandlerMethod.addEstablish(message, sendResponse);
        break;
      case 'CHECK_CONNECTION':
        HandlerMethod.checkEstablished(message, sendResponse, true);
        break;
      case 'ADD_NETWORK':
        HandlerMethod.checkEstablished(message, sendResponse).then((isEstablished) => {
          if (isEstablished) {
            HandlerMethod.addNetwork(message, sendResponse);
          }
        });
        break;
      case 'SWITCH_NETWORK':
        HandlerMethod.checkEstablished(message, sendResponse)
          .then((isEstablished) => {
            if (isEstablished) {
              HandlerMethod.switchNetwork(message, sendResponse);
            }
          })
          .catch(() => {
            sendResponse(
              InjectionMessageInstance.failure('UNEXPECTED_ERROR', message, message.key),
            );
          });
        break;
      case 'SIGN_AMINO':
        HandlerMethod.checkEstablished(message, sendResponse).then((isEstablished) => {
          if (isEstablished) {
            HandlerMethod.signAmino(message, sendResponse);
          }
        });
        break;
      case 'SIGN_TX':
        HandlerMethod.checkEstablished(message, sendResponse).then((isEstablished) => {
          if (isEstablished) {
            HandlerMethod.signTransaction(message, sendResponse);
          }
        });
        break;
      default:
        break;
    }
  };
}
