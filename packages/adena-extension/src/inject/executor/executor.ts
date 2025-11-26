import {
  WalletResponse,
  WalletResponseExecuteType,
  WalletResponseFailureType,
  WalletResponseStatus,
  WalletResponseType,
} from '@adena-wallet/sdk';
import { v4 as uuidv4 } from 'uuid';

import {
  validateDoContractRequest,
  validateTransactionMessageOfAddPkg,
  validateTransactionMessageOfBankSend,
  validateTransactionMessageOfRun,
  validateTransactionMessageOfVmCall,
} from '@common/validation/validation-message';
import {
  AddEstablishResponse,
  AddNetworkParams,
  AddNetworkResponse,
  DoContractResponse,
  GetAccountResponse,
  GetNetworkResponse,
  SignedDocument,
  SignTxResponse,
  SwitchNetworkResponse,
  TransactionParams,
} from '@inject/types';
import { InjectionMessage, InjectionMessageInstance } from '../message';
import {
  validateSignatures,
  validateSignedDocumentFee,
  validateSignedDocumentFields,
  validateSignedDocumentMessages,
} from '@common/validation';

type Params = { [key in string]: any };

export class AdenaExecutor {
  private eventKey;

  private isListen;

  private eventMessage: InjectionMessage | undefined;

  private resolver: ((message: WalletResponse<unknown>) => void) | undefined;

  private messages: {
    [key in string]: { request: InjectionMessage; response: InjectionMessage | undefined };
  } = {};

  private static instance: AdenaExecutor | undefined = new AdenaExecutor();

  constructor() {
    this.eventKey = uuidv4();
    this.isListen = false;
  }

  public static getInstance = (): AdenaExecutor => {
    if (!AdenaExecutor.instance) {
      AdenaExecutor.instance = new AdenaExecutor();
    }
    if (!AdenaExecutor.instance.isListen) {
      AdenaExecutor.instance.listen();
    }
    return AdenaExecutor.instance;
  };

  public addEstablish = (name?: string): Promise<AddEstablishResponse> => {
    const eventMessage = AdenaExecutor.createEventMessage(WalletResponseExecuteType.ADD_ESTABLISH, {
      name: name ?? 'Unknown',
    });
    return this.sendEventMessage<Record<string, never>>(eventMessage);
  };

  public doContract = (
    params: TransactionParams,
    withNotification: boolean,
  ): Promise<DoContractResponse> => {
    const result = this.validateContractMessage(params);
    if (result) {
      return this.sendEventMessage(result);
    }

    const eventMessage = AdenaExecutor.createEventMessage(
      WalletResponseExecuteType.DO_CONTRACT,
      params,
      withNotification,
    );
    return this.sendEventMessage(eventMessage);
  };

  public getAccount = (): Promise<GetAccountResponse> => {
    const eventMessage = AdenaExecutor.createEventMessage(WalletResponseExecuteType.GET_ACCOUNT);
    return this.sendEventMessage(eventMessage);
  };

  public getNetwork = (): Promise<GetNetworkResponse> => {
    const eventMessage = AdenaExecutor.createEventMessage(WalletResponseExecuteType.GET_NETWORK);
    return this.sendEventMessage(eventMessage);
  };

  public signAmino = (params: TransactionParams): Promise<WalletResponse<unknown>> => {
    console.log('시작 2! signAmino 실행됨!@!@!');
    const result = this.validateContractMessage(params);
    console.log(result, '시작 2-2');
    if (result) {
      return this.sendEventMessage(result);
    }
    const eventMessage = AdenaExecutor.createEventMessage(
      WalletResponseExecuteType.SIGN_AMINO,
      params,
    );
    return this.sendEventMessage(eventMessage);
  };

  public signTx = (params: TransactionParams): Promise<SignTxResponse> => {
    console.log(params, '시작 2! signTx 실행됨!');
    const result = this.validateContractMessage(params);
    if (result) {
      return this.sendEventMessage(result);
    }
    const eventMessage = AdenaExecutor.createEventMessage(
      WalletResponseExecuteType.SIGN_TX,
      params,
    );
    return this.sendEventMessage(eventMessage);
  };

  public signDocument = (signedDocument: SignedDocument) => {
    console.log(signedDocument, '시작 2! signDocument 실행됨!@!@!');

    const result = this.validateSignedDocument(signedDocument);
    console.log(result, 'target SignDocument');
    if (result) {
      return this.sendEventMessage(result);
    }

    const eventMessage = AdenaExecutor.createEventMessage(
      'SIGN_DOCUMENT' as WalletResponseType,
      signedDocument,
    );

    return this.sendEventMessage(eventMessage);
  };

  public addNetwork = (chain: AddNetworkParams): Promise<AddNetworkResponse> => {
    const eventMessage = AdenaExecutor.createEventMessage(WalletResponseExecuteType.ADD_NETWORK, {
      ...chain,
    });
    return this.sendEventMessage(eventMessage);
  };

  public switchNetwork = (chainId: string): Promise<SwitchNetworkResponse> => {
    const eventMessage = AdenaExecutor.createEventMessage(
      WalletResponseExecuteType.SWITCH_NETWORK,
      { chainId },
    );
    return this.sendEventMessage(eventMessage);
  };

  /**
   * Validates an array of transaction messages.
   * Calls appropriate validation functions based on each message type to verify the format.
   *
   * @param messages - Array of transaction messages to validate
   * @returns InjectionMessage on validation failure, undefined on success
   */
  private validateMessages = (messages: any[]): InjectionMessage | undefined => {
    for (const message of messages) {
      switch (message.type) {
        case '/bank.MsgSend':
          if (!validateTransactionMessageOfBankSend(message)) {
            return InjectionMessageInstance.failure(WalletResponseFailureType.INVALID_FORMAT);
          }
          break;
        case '/vm.m_call':
          if (!validateTransactionMessageOfVmCall(message)) {
            return InjectionMessageInstance.failure(WalletResponseFailureType.INVALID_FORMAT);
          }
          break;
        case '/vm.m_addpkg':
          if (!validateTransactionMessageOfAddPkg(message)) {
            return InjectionMessageInstance.failure(WalletResponseFailureType.INVALID_FORMAT);
          }
          break;
        case '/vm.m_run':
          if (!validateTransactionMessageOfRun(message)) {
            return InjectionMessageInstance.failure(WalletResponseFailureType.INVALID_FORMAT);
          }
          break;
        default:
          return InjectionMessageInstance.failure(WalletResponseFailureType.UNSUPPORTED_TYPE);
      }
    }
    return undefined;
  };

  /**
   * Validates a signed document (SignedDocument).
   * Verifies the existence and format of required fields (chain_id, account_number, sequence, memo),
   * fee structure (gas and amount array), signatures array, and msgs array, then validates the included messages as well.
   *
   * @param signedDocument - The signed document object to validate
   * @returns InjectionMessage on validation failure, undefined on success
   */
  private validateSignedDocument = (
    signedDocument: SignedDocument,
  ): InjectionMessage | undefined => {
    console.log('new validation code');
    if (!signedDocument) {
      return InjectionMessageInstance.failure(WalletResponseFailureType.INVALID_FORMAT);
    }

    if (!validateSignedDocumentFields(signedDocument)) {
      return InjectionMessageInstance.failure(WalletResponseFailureType.INVALID_FORMAT);
    }

    if (!Array.isArray(signedDocument.signatures)) {
      return InjectionMessageInstance.failure(WalletResponseFailureType.INVALID_FORMAT);
    }

    if (!validateSignatures(signedDocument.signatures)) {
      return InjectionMessageInstance.failure(WalletResponseFailureType.INVALID_FORMAT);
    }

    if (!validateSignedDocumentFee(signedDocument.fee)) {
      return InjectionMessageInstance.failure(WalletResponseFailureType.INVALID_FORMAT);
    }

    if (!validateSignedDocumentMessages(signedDocument.msgs)) {
      return InjectionMessageInstance.failure(WalletResponseFailureType.INVALID_FORMAT);
    }

    return this.validateMessages(signedDocument.msgs);
  };

  private validateContractMessage = (params: TransactionParams): InjectionMessage | undefined => {
    if (!validateDoContractRequest(params)) {
      return InjectionMessageInstance.failure(WalletResponseFailureType.INVALID_FORMAT);
    }

    return this.validateMessages(params.messages);
  };

  private sendEventMessage = <T = unknown>(
    eventMessage: InjectionMessage,
  ): Promise<WalletResponse<T>> => {
    console.log(eventMessage, '시작 5!');
    this.listen();
    this.eventMessage = {
      ...eventMessage,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      key: this.eventKey,
    };

    try {
      window.postMessage(this.eventMessage, window.location.origin);
    } catch (error) {
      console.warn(error);
    }
    this.messages[this.eventKey] = {
      request: this.eventMessage,
      response: undefined,
    };

    return new Promise<WalletResponse<T>>((resolver) => {
      this.resolver = resolver as (message: WalletResponse<unknown>) => void;
    }).finally(() => this.unlisten());
  };

  private listen = (): void => {
    console.log('listen');
    if (this.isListen) {
      return;
    }
    this.isListen = true;
    window.addEventListener('message', this.messageHandler, true);
  };

  public unlisten = (): void => {
    this.isListen = false;
    window.removeEventListener('message', this.messageHandler, true);
  };

  private static createEventMessage = (
    type: WalletResponseType,
    params?: Params,
    withNotification?: boolean,
  ): InjectionMessage => {
    console.log('시작 3!', type, params);
    return InjectionMessageInstance.request(type, params, undefined, withNotification);
  };

  private messageHandler = (event: MessageEvent<InjectionMessage>): void => {
    console.log(event, 'messageHandler event');
    if (event.origin !== window.location.origin) {
      console.warn(`Untrusted origin: ${event.origin}`);
      return;
    }

    const eventData = event.data;
    console.log(eventData, 'eventData');
    if (eventData.status) {
      const { key, status, data, code, message, type } = eventData;
      if (key === this.eventKey) {
        switch (eventData.status) {
          case 'response':
            break;
          case 'success':
            this.unlisten();
            this.resolver &&
              this.resolver({
                status: status as WalletResponseStatus,
                data,
                code,
                message,
                type,
              });
            break;
          case 'failure':
            this.unlisten();
            this.resolver &&
              this.resolver({
                status: status as WalletResponseStatus,
                data,
                code,
                message,
                type,
              });
            break;
          default:
            break;
        }
      }
    }
  };
}
