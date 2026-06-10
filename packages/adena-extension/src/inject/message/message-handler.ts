import { WalletResponseFailureType } from '@adena-wallet/sdk';
import { MemoryProvider } from '@common/provider/memory/memory-provider';
import { HandlerMethod } from '.';
import { CommandMessageData } from './command-message';
import { InjectionMessage, InjectionMessageInstance } from './message';
import { existsPopups, removePopups } from './methods';
import { InjectCore } from './methods/core';

const NON_POPUP_REQUEST_TYPES: ReadonlySet<string> = new Set(['GET_ACCOUNT', 'GET_NETWORK']);

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

    // Data-only queries must not tear down an open approval popup. DApps such
    // as Gnoswap poll GET_ACCOUNT in the background; calling removePopups for
    // those requests force-closes the in-flight approval popup and the user
    // sees a spurious TRANSACTION_REJECTED.
    if (!NON_POPUP_REQUEST_TYPES.has(message.type)) {
      const isPopup = await existsPopups();
      if (isPopup) {
        await removePopups();
      }
    }

    // Cast widens to `string` so extension-local Cosmos identifiers (ENABLE_COSMOS
    // etc., see plans/ADN-756/stage-02b-sdk-update.md) are recognized until the
    // SDK enum catches up.
    switch (message.type as string) {
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
        if (await HandlerMethod.rejectSessionAccountUnsupported(core, message, sendResponse)) {
          break;
        }
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
        if (await HandlerMethod.rejectSessionAccountUnsupported(core, message, sendResponse)) {
          break;
        }
        HandlerMethod.checkEstablished(core, message, sendResponse).then((isEstablished) => {
          if (isEstablished) {
            HandlerMethod.createMultisigAccount(core, message, sendResponse);
          }
        });
        break;
      case 'CREATE_MULTISIG_TRANSACTION':
        if (await HandlerMethod.rejectSessionAccountUnsupported(core, message, sendResponse)) {
          break;
        }
        HandlerMethod.checkEstablished(core, message, sendResponse).then((isEstablished) => {
          if (isEstablished) {
            HandlerMethod.createMultisigDocument(core, message, sendResponse);
          }
        });
        break;
      case 'SIGN_MULTISIG_TRANSACTION':
        if (await HandlerMethod.rejectSessionAccountUnsupported(core, message, sendResponse)) {
          break;
        }
        HandlerMethod.checkEstablished(core, message, sendResponse).then((isEstablished) => {
          if (isEstablished) {
            HandlerMethod.signMultisigDocument(core, message, sendResponse);
          }
        });
        break;
      case 'BROADCAST_MULTISIG_TRANSACTION':
        if (await HandlerMethod.rejectSessionAccountUnsupported(core, message, sendResponse)) {
          break;
        }
        HandlerMethod.checkEstablished(core, message, sendResponse)
          .then((isEstablished) => {
            if (isEstablished) {
              HandlerMethod.broadcastMultisigTransaction(core, message, sendResponse);
            }
          })
          .catch((e) => {
            console.log(e, 'e');
          });
        break;
      // Every cosmos.* handler must invoke `checkNotSessionAccountForCosmos`
      // at entry and the matching popup component must apply the same guard
      // after unlock. SessionAccount is a Gno-only sub-key, so any Cosmos
      // response would either leak the session key or fabricate a master
      // identity. New cosmos cases added below MUST follow the same pattern.
      case 'ENABLE_COSMOS':
        HandlerMethod.cosmosEnable(core, message, sendResponse);
        break;
      case 'GET_COSMOS_KEY':
        HandlerMethod.cosmosGetKey(core, message, sendResponse);
        break;
      case 'SIGN_COSMOS_AMINO':
        HandlerMethod.cosmosSignAmino(core, message, sendResponse);
        break;
      case 'SIGN_COSMOS_DIRECT':
        HandlerMethod.cosmosSignDirect(core, message, sendResponse);
        break;
      case 'SEND_COSMOS_TX':
        HandlerMethod.cosmosSendTx(core, message, sendResponse);
        break;
      default:
        break;
    }
  };
}
