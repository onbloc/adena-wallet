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
  BroadcastMultisigTransactionResponse,
  CreateMultisigAccountParams,
  CreateMultisigAccountResponse,
  CreateMultisigTransactionParams,
  CreateMultisigTransactionResponse,
  DoContractResponse,
  GetAccountResponse,
  GetNetworkResponse,
  MultisigTransactionDocument,
  Signature,
  SignMultisigTransactionResponse,
  SignTxResponse,
  SwitchNetworkResponse,
  TransactionParams,
} from '@inject/types';
import { InjectionMessage, InjectionMessageInstance } from '../message';
import {
  validateTransactionDocumentFee,
  validateTransactionDocumentMessages,
  validateMultisigSigners,
  validateMultisigThreshold,
  validateChainId,
  validateFee,
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
    const result = this.validateContractMessage(params);
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

  public createMultisigAccount = (
    params: CreateMultisigAccountParams,
  ): Promise<CreateMultisigAccountResponse> => {
    const result = this.validateCreateMultisigAccount(params);
    if (result) {
      return this.sendEventMessage(result);
    }

    const eventMessage = AdenaExecutor.createEventMessage(
      WalletResponseExecuteType.CREATE_MULTISIG_ACCOUNT,
      params,
    );

    return this.sendEventMessage(eventMessage);
  };

  public createMultisigTransaction = (
    params: CreateMultisigTransactionParams,
  ): Promise<CreateMultisigTransactionResponse> => {
    const result = this.validateCreateMultisigTransaction(params);
    if (result) {
      return this.sendEventMessage(result);
    }

    const eventMessage = AdenaExecutor.createEventMessage(
      WalletResponseExecuteType.CREATE_MULTISIG_TRANSACTION,
      params,
    );

    return this.sendEventMessage(eventMessage);
  };

  public signMultisigTransaction = (
    multisigDocument: MultisigTransactionDocument,
    multisigSignatures?: Signature[],
  ): Promise<SignMultisigTransactionResponse> => {
    const result = this.validateMultisigTransaction(multisigDocument);
    if (result) {
      return this.sendEventMessage(result);
    }

    const eventMessage = AdenaExecutor.createEventMessage(
      WalletResponseExecuteType.SIGN_MULTISIG_TRANSACTION,
      { multisigDocument, multisigSignatures },
    );

    return this.sendEventMessage(eventMessage);
  };

  public broadcastMultisigTransaction = (
    multisigDocument: MultisigTransactionDocument,
    multisigSignatures?: Signature[],
  ): Promise<BroadcastMultisigTransactionResponse> => {
    const result = this.validateMultisigTransaction(multisigDocument);
    if (result) {
      return this.sendEventMessage(result);
    }

    const eventMessage = AdenaExecutor.createEventMessage(
      WalletResponseExecuteType.BROADCAST_MULTISIG_TRANSACTION,
      { multisigDocument, multisigSignatures },
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
   * Validates CreateMultisigAccountParams.
   * Verifies signers array and threshold value.
   *
   * @param params - The CreateMultisigAccountParams object to validate
   * @returns InjectionMessage on validation failure, undefined on success
   */
  private validateCreateMultisigAccount = (
    params: CreateMultisigAccountParams,
  ): InjectionMessage | undefined => {
    if (!params) {
      return InjectionMessageInstance.failure(WalletResponseFailureType.INVALID_FORMAT);
    }

    if (!validateMultisigSigners(params.signers)) {
      return InjectionMessageInstance.failure(WalletResponseFailureType.INVALID_MULTISIG_SIGNERS);
    }

    if (!validateMultisigThreshold(params.threshold, params.signers.length)) {
      return InjectionMessageInstance.failure(WalletResponseFailureType.INVALID_MULTISIG_THRESHOLD);
    }

    return undefined;
  };

  /**
   * Validates CreateMultisigDocumentParams.
   * Verifies signers array, threshold value, chain_id, fee structure, and msgs array.
   *
   * @param params - The CreateMultisigDocumentParams object to validate
   * @returns InjectionMessage on validation failure, undefined on success
   */
  private validateCreateMultisigTransaction = (
    params: CreateMultisigTransactionParams,
  ): InjectionMessage | undefined => {
    if (!params) {
      return InjectionMessageInstance.failure(WalletResponseFailureType.INVALID_FORMAT);
    }

    if (!validateChainId(params.chain_id)) {
      return InjectionMessageInstance.failure(WalletResponseFailureType.INVALID_FORMAT);
    }

    if (!validateFee(params.fee)) {
      return InjectionMessageInstance.failure(WalletResponseFailureType.INVALID_FORMAT);
    }

    if (!validateTransactionDocumentMessages(params.msgs)) {
      return InjectionMessageInstance.failure(WalletResponseFailureType.INVALID_FORMAT);
    }

    return this.validateMessages(params.msgs);
  };

  /**
   * Validates SignMultisigTransactionDocument.
   * Verifies multisig document structure, transaction data,
   * chainId, accountNumber, sequence, fee structure, and msgs array.
   *
   * @param multisigDocument - The MultisigTransactionDocument object to validate
   * @returns InjectionMessage on validation failure, undefined on success
   */
  private validateMultisigTransaction = (
    multisigDocument: MultisigTransactionDocument,
  ): InjectionMessage | undefined => {
    if (!multisigDocument) {
      return InjectionMessageInstance.failure(WalletResponseFailureType.INVALID_FORMAT, {
        message: 'Multisig document is missing.',
      });
    }

    if (!multisigDocument.tx) {
      return InjectionMessageInstance.failure(WalletResponseFailureType.INVALID_FORMAT, {
        message: 'Transaction (tx) is missing in multisig document.',
      });
    }

    if (!validateChainId(multisigDocument.chainId)) {
      return InjectionMessageInstance.failure(WalletResponseFailureType.INVALID_FORMAT, {
        message: 'Invalid or unsupported chainId.',
      });
    }

    if (!multisigDocument.accountNumber || typeof multisigDocument.accountNumber !== 'string') {
      return InjectionMessageInstance.failure(WalletResponseFailureType.INVALID_FORMAT, {
        message: 'accountNumber is missing or not a string.',
      });
    }

    if (!multisigDocument.sequence || typeof multisigDocument.sequence !== 'string') {
      return InjectionMessageInstance.failure(WalletResponseFailureType.INVALID_FORMAT, {
        message: 'sequence is missing or not a string.',
      });
    }

    if (!validateTransactionDocumentFee(multisigDocument.tx.fee)) {
      return InjectionMessageInstance.failure(WalletResponseFailureType.INVALID_FORMAT, {
        message: 'Invalid transaction fee format.',
      });
    }

    if (!validateTransactionDocumentMessages(multisigDocument.tx.msgs)) {
      return InjectionMessageInstance.failure(WalletResponseFailureType.INVALID_FORMAT, {
        message: 'Invalid or missing transaction messages (msgs).',
      });
    }

    return this.validateMessages(multisigDocument.tx.msgs);
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
    return InjectionMessageInstance.request(type, params, undefined, withNotification);
  };

  private messageHandler = (event: MessageEvent<InjectionMessage>): void => {
    if (event.origin !== window.location.origin) {
      console.warn(`Untrusted origin: ${event.origin}`);
      return;
    }

    const eventData = event.data;
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
